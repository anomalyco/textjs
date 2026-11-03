import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { cpSync } from "node:fs";
import { localePath, parseLocaleSet, SOURCE_LOCALE, type Locale } from "../src/i18n/locales";
import type { OgCard } from "../src/og";
import type { Route } from "../src/router";
import { captionsPath } from "../src/learn/video";
import { inlineScriptHashes, withScriptHashes } from "./csp";
import { assembleCaptions } from "./i18n/captions";
import { captionSources, readCaptions, translatedCaptions } from "./i18n/sources";
import type { UnitsManifest } from "./i18n/vite-plugin";
import { renderOgImages, type OgImage } from "./og/render";

const rootDir = join(import.meta.dirname, "..");
// Tests point these at a temporary build.
const distDir = process.env.TEXTJS_WEB_DIST ?? join(rootDir, "dist");
const ssrDir = process.env.TEXTJS_WEB_SSR ?? join(rootDir, "node_modules", ".cache", "textjs-ssr");
/** Locale builds from scripts/build.ts: `<dir>/<code>/client` and `<dir>/<code>/ssr`. */
const localesDir = process.env.TEXTJS_WEB_LOCALES ?? join(rootDir, "node_modules", ".cache", "textjs-locales");
/** A page whose translated share of catalog strings or document blocks is lower than this is English: canonical to English, no hreflang, no sitemap. */
const MIN_COVERAGE = 0.7;

interface ManifestChunk {
  file: string;
  src?: string;
  imports?: string[];
  css?: string[];
}


interface PrerenderRoute {
  path: string;
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
}

interface ServerEntry {
  ROUTES: ReadonlyArray<PrerenderRoute>;
  NOT_FOUND_PATH: string;
  PREFIT_MIRRORS_SCRIPT: string;
  PREFIT_MIRRORS_WHILE_PARSING_SCRIPT: string;
  ROUTE_MANIFEST_SRC: Record<Exclude<Route["name"], "not-found">, string>;
  matchRoute(pathname: string): Route;
  learnVideo(slug: string): { poster: string } | null;
  render(pathname: string): Promise<string>;
  titleFor(route: Route): string;
  renderRss(): string;
  humansTxt(date: string): string;
  llmsTxt(): string;
  statusApi(): Record<string, string>;
  renderHomeAnsi(): Promise<string>;
  ogCards(routes: ServerEntry["ROUTES"], notFoundPath: string): Promise<OgCard[]>;
}

/** One locale's build: its server entry, HTML shell and client manifest. */
interface Build {
  locale: Locale;
  server: ServerEntry;
  baseHtml: string;
  manifest: Record<string, ManifestChunk> | null;
  units: UnitsManifest | null;
}

function readJson<T>(file: string): T | null {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : null;
}

async function loadBuild(locale: Locale, clientDir: string, serverDir: string): Promise<Build> {
  return {
    locale,
    server: (await import(pathToFileURL(join(serverDir, "entry-server.js")).href)) as ServerEntry,
    baseHtml: readFileSync(join(clientDir, "index.html"), "utf8"),
    manifest: readJson(join(clientDir, ".vite", "manifest.json")),
    units: readJson(join(clientDir, ".i18n", "units.json")),
  };
}

const builds: Build[] = [await loadBuild(SOURCE_LOCALE, distDir, ssrDir)];
for (const locale of parseLocaleSet(process.env.TEXTJS_LOCALES)) {
  const dir = join(localesDir, locale.code);
  if (locale.status === "source") continue;
  if (!existsSync(join(dir, "client", "index.html"))) throw new Error(`${locale.code}: no build in ${dir} (run scripts/build.ts)`);
  builds.push(await loadBuild(locale, join(dir, "client"), join(dir, "ssr")));
  // Hashed chunks from every build share dist/assets; chunks that don't differ by locale have the same name.
  cpSync(join(dir, "client", "assets"), join(distDir, "assets"), { recursive: true, force: false });
}

/** Collect JS modulepreloads and CSS files needed by a route's dynamic chunk (`entry`: the entry's own files). */
function routeAssets(build: Build, routePath: string): { css: string[]; js: string[]; entry: string[]; own?: string } {
  const { manifest, server } = build;
  if (!manifest) return { css: [], js: [], entry: [] };
  const route = server.matchRoute(routePath);
  if (route.name === "not-found") return { css: [], js: [], entry: [] };
  const srcKey = server.ROUTE_MANIFEST_SRC[route.name];
  if (!srcKey || !manifest[srcKey]) return { css: [], js: [], entry: [] };

  const visited = new Set<string>();
  const css = new Set<string>();
  const js = new Set<string>();
  const entryFiles = new Set<string>();
  const indexEntry = manifest["index.html"];
  if (indexEntry) {
    entryFiles.add(indexEntry.file);
    for (const c of indexEntry.css ?? []) css.add(c);
    for (const imp of indexEntry.imports ?? []) {
      if (manifest[imp]) entryFiles.add(manifest[imp]!.file);
    }
  }

  const walk = (key: string): void => {
    if (visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk) return;
    for (const c of chunk.css ?? []) css.add(c);
    if (!entryFiles.has(chunk.file)) js.add(chunk.file);
    for (const imp of chunk.imports ?? []) walk(imp);
  };
  walk(srcKey);
  return { css: [...css], js: [...js], entry: [...entryFiles], own: manifest[srcKey]?.file };
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Points the page's Open Graph and Twitter image tags at its own card. */
function withImage(html: string, image: OgImage): string {
  const src = escapeAttr(`https://textjs.org${image.url}`);
  const alt = escapeAttr(image.alt);
  return html
    .replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/, `$1${src}$2`)
    .replace(/(<meta\s+property="og:image:width"\s+content=")[^"]*(")/, `$1${image.width}$2`)
    .replace(/(<meta\s+property="og:image:height"\s+content=")[^"]*(")/, `$1${image.height}$2`)
    .replace(/(<meta\s+property="og:image:alt"\s+content=")[^"]*(")/, `$1${alt}$2`)
    .replace(/(<meta\s+name="twitter:card"\s+content=")[^"]*(")/, `$1summary_large_image$2`)
    .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")(\s*\/>)/, `$1${src}$2$3\n    <meta name="twitter:image:alt" content="${alt}" />`);
}

/** `lang`, `dir` and the feed link of a locale's pages. */
function withLocale(html: string, locale: Locale): string {
  if (locale === SOURCE_LOCALE) return html;
  return html
    .replace(/<html lang="en"/, `<html lang="${locale.code}" dir="${locale.dir}"`)
    .replace(/(<link rel="alternate" type="application\/rss\+xml"[^>]*href=")https:\/\/textjs\.org\/blog\/rss\.xml(")/, `$1https://textjs.org${localePath(locale, "/blog/rss.xml")}$2`);
}

function withMeta(html: string, title: string, description: string, urlPath: string): string {
  const fullUrl = `https://textjs.org${urlPath}`;
  const t = escapeAttr(title);
  let out = html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${fullUrl}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${fullUrl}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${t}$2`);
  if (description) {
    const d = escapeAttr(description);
    out = out
      .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${d}$2`)
      .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${d}$2`)
      .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${d}$2`);
  }
  return out;
}

/**
 * Place render-blocking stylesheets ahead of font preloads and scripts, preload any
 * high-priority LCP image, and modulepreload this route's lazy chunk so hydration resolves with zero waterfall.
 */
function withRouteHeadHints(build: Build, html: string, routePath: string, markup: string): string {
  const { css, js } = routeAssets(build, routePath);
  let out = html;
  const earlyLinks: string[] = css.map((f) => `<link rel="stylesheet" crossorigin href="/${f}">`);
  const priorityImg = /<img\s+[^>]*fetchpriority="high"[^>]*>/i.exec(markup)?.[0];
  if (priorityImg) {
    const attr = (name: string): string | undefined => new RegExp(`\\b${name}="([^"]*)"`, "i").exec(priorityImg)?.[1];
    const src = attr("src");
    const srcset = attr("srcset");
    const sizes = attr("sizes");
    if (src && srcset && sizes) {
      earlyLinks.push(`<link rel="preload" as="image" href="${src}" imagesrcset="${srcset}" imagesizes="${sizes}" fetchpriority="high">`);
    } else if (src) {
      earlyLinks.push(`<link rel="preload" as="image" href="${src}" fetchpriority="high">`);
    }
  }
  if (earlyLinks.length > 0) {
    if (css.length > 0) out = out.replace(/\s*<link rel="stylesheet"[^>]*>/g, "");
    // Place stylesheets & priority image preloads after the inline @font-face and the inline head script (before
    // module scripts). A classic script after a stylesheet waits for it, and the head script must run at once.
    const styleEnd = out.indexOf("</style>");
    const scriptEnd = out.indexOf("</script>", styleEnd);
    if (styleEnd < 0 || scriptEnd < 0) throw new Error("index.html is missing the inline head <style> and <script>");
    const at = scriptEnd + "</script>".length;
    out = `${out.slice(0, at)}\n    ${earlyLinks.join("\n    ")}${out.slice(at)}`;
  }
  const extraHead: string[] = [];
  const route = build.server.matchRoute(routePath);
  if (route.name === "learn" && route.slug && build.server.learnVideo(route.slug)) {
    extraHead.push('<link rel="preconnect" href="https://media.textjs.org" crossorigin>');
  }
  for (const f of js) {
    extraHead.push(`<link rel="modulepreload" crossorigin href="/${f}">`);
  }
  if (extraHead.length > 0) {
    out = out.replace("</head>", `  ${extraHead.join("\n    ")}\n  </head>`);
  }
  return out;
}

async function withMarkup(build: Build, html: string, routePath: string): Promise<string> {
  const { server } = build;
  const markup = await server.render(routePath);
  const root = '<div id="root"></div>';
  if (!html.includes(root)) throw new Error("index.html is missing the #root mount point");
  const mirrors = markup.includes("mirror-scale");
  const prefit = mirrors ? `<script>${server.PREFIT_MIRRORS_SCRIPT}</script>` : "";
  const watch = mirrors ? `<script>${server.PREFIT_MIRRORS_WHILE_PARSING_SCRIPT}</script>` : "";
  const hinted = withRouteHeadHints(build, html, routePath, markup);
  // A page that marks its fold holds first paint until everything above it is parsed (Chrome
  // 124+), so a long page arriving in several chunks never paints a half-built hero.
  const fold = markup.includes('id="fold"') ? '<link rel="expect" href="#fold" blocking="render">\n  </head>' : "</head>";
  return hinted.replace("</head>", fold).replace(root, `${watch}<div id="root" data-route="${escapeAttr(routePath)}">${markup}</div>${prefit}`);
}

/** Each locale's pages: revalidated HTML, its `Content-Language`, and `noindex` while it's a draft. Disjoint paths, as `_headers` requires. */
export function withLocaleHeaders(headers: string, locales: readonly Locale[]): string {
  const rules: string[] = [];
  for (const l of locales) {
    if (l === SOURCE_LOCALE) continue;
    for (const path of [`/${l.path}`, `/${l.path}/*`]) {
      rules.push(path, "  Cache-Control: public, max-age=0, must-revalidate", "  Cross-Origin-Resource-Policy: same-origin", `  Content-Language: ${l.code}`);
      if (l.status !== "live") rules.push("  X-Robots-Tag: noindex");
      rules.push("");
    }
  }
  return rules.length ? `${headers.trimEnd()}\n\n${rules.join("\n")}` : headers;
}

function withNoindex(html: string): string {
  return html.replace(/\s*<link\s+rel="canonical"[^>]*>/, "").replace(/(<meta name="viewport"[^>]*>)/, '$1\n    <meta name="robots" content="noindex" />');
}

/** `hreflang` alternates at the end of `<head>`, after everything the page needs to render. */
function withAlternates(html: string, alternates: ReadonlyArray<{ code: string; path: string }>): string {
  if (alternates.length < 2) return html;
  const links = alternates.map((a) => `<link rel="alternate" hreflang="${a.code}" href="https://textjs.org${a.path}" />`);
  const fallback = alternates.find((a) => a.code === SOURCE_LOCALE.code);
  if (fallback) links.push(`<link rel="alternate" hreflang="x-default" href="https://textjs.org${fallback.path}" />`);
  return html.replace("</head>", `  ${links.join("\n    ")}\n  </head>`);
}

/**
 * `/` → `index.html`, `/docs/routing` → `docs/routing.html`: Cloudflare Pages serves `<route>.html`
 * at the slash-less URL with a 200 (and redirects `/docs/routing.html` there), whereas
 * `<route>/index.html` would cost every visit a 308 to `/docs/routing/`.
 */
function writeHtml(routePath: string, html: string): void {
  const parts = routePath.split("/").filter(Boolean);
  const file = parts.length === 0 ? join(distDir, "index.html") : `${join(distDir, ...parts)}.html`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

/**
 * Whether a locale's version of a route is translated: content of its own (the route's chunk strings, or its
 * document) is translated, and both the strings on the page and its document are at least MIN_COVERAGE
 * translated. Strings shared by every page (header, footer, page titles) don't make a page translated on their own.
 */
function translated(build: Build, route: PrerenderRoute): boolean {
  if (build.locale === SOURCE_LOCALE) return true;
  const units = build.units;
  if (!units) return false;
  const { js, entry, own } = routeAssets(build, route.path);
  const sum = (files: Iterable<string>): { translated: number; total: number } => {
    const out = { translated: 0, total: 0 };
    for (const f of new Set(files)) {
      const u = units.chunks[f];
      if (u) {
        out.translated += u.translated;
        out.total += u.total;
      }
    }
    return out;
  };
  const ratio = (u: { translated: number; total: number } | undefined): number | null => (u && u.total > 0 ? u.translated / u.total : null);
  const page = ratio(sum([...entry, ...js]));
  const doc = ratio(units.documents[documentId(build, route.path) ?? ""]);
  const ownStrings = ratio(sum(own ? [own] : []));
  const ownContent = doc ?? ownStrings;
  return ownContent !== null && ownContent >= MIN_COVERAGE && Math.min(page ?? 1, doc ?? 1) >= MIN_COVERAGE;
}

/** The translated document a route renders, if any (`docs/routing`). */
function documentId(build: Build, routePath: string): string | undefined {
  const r = build.server.matchRoute(routePath);
  if (r.name === "docs") return `docs/${r.slug}`;
  if (r.name === "blog-post") return `blog/${r.slug}`;
  if (r.name === "learn" && r.slug) return `learn/${r.slug}`;
  if (r.name === "changelog") return "changelog";
  return undefined;
}

const indexable = (b: Build): boolean => b.locale === SOURCE_LOCALE || b.locale.status === "live";

// Pass 1: which locale versions of each page are translated enough to be offered as alternates.
const covered = new Map<string, Set<Build>>();
for (const build of builds) {
  for (const r of build.server.ROUTES) {
    // Only canonical URLs take part (/docs/introduction is /docs).
    if (r.noindex || (r.canonical && r.canonical !== r.path) || !indexable(build) || !translated(build, r)) continue;
    const set = covered.get(r.path) ?? new Set<Build>();
    set.add(build);
    covered.set(r.path, set);
  }
}

// Pass 2: every page of every locale.
const pages = new Map<string, string>();
const sitemaps = new Map<Locale, string[]>();
const ogCardList: OgCard[] = [];
for (const build of builds) {
  const { locale, server } = build;
  const notFoundPath = localePath(locale, server.NOT_FOUND_PATH);
  for (const r of server.ROUTES) {
    const path = localePath(locale, r.path);
    const target = r.canonical ?? r.path;
    const isCanonical = target === r.path;
    const own = covered.get(target)?.has(build) ?? false;
    // A page mostly in English points search engines at the English page.
    const canonical = own || locale === SOURCE_LOCALE ? localePath(locale, target) : target;
    const noindex = r.noindex || !indexable(build);
    // hreflang and the sitemap list canonical URLs only.
    const alternates = own && isCanonical ? builds.filter((b) => covered.get(target)?.has(b)).map((b) => ({ code: b.locale.code, path: localePath(b.locale, target) })) : [];
    let html = withLocale(withMeta(build.baseHtml, r.title, r.description, canonical), locale);
    if (noindex) html = withNoindex(html);
    pages.set(path, withAlternates(await withMarkup(build, html, path), alternates));
    if (!noindex && own && isCanonical && locale !== SOURCE_LOCALE) sitemaps.set(locale, [...(sitemaps.get(locale) ?? []), canonical]);
  }
  const notFound = withNoindex(withLocale(build.baseHtml.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(server.titleFor({ name: "not-found" }))}</title>`), locale));
  pages.set(notFoundPath, await withMarkup(build, notFound, notFoundPath));
  for (const card of await server.ogCards(server.ROUTES, server.NOT_FOUND_PATH)) {
    if (locale === SOURCE_LOCALE) ogCardList.push(card);
    else ogCardList.push({ ...card, path: localePath(locale, card.path), slug: `${locale.path}-${card.slug}`, lang: locale.code, dir: locale.dir });
  }
}

// Open Graph cards run the console companion for each route, so they render after the pages.
const ogStarted = performance.now();
const { images, stats } = await renderOgImages(ogCardList, distDir);
console.log(`og: ${stats.cards} images (${stats.rendered} rendered, ${stats.cached} cached), ${(stats.bytes / 1024 / 1024).toFixed(1)} MB in ${Math.round(performance.now() - ogStarted)}ms`);
const imageFor = (routePath: string): OgImage => {
  const image = images.get(routePath);
  if (!image) throw new Error(`og: no image for ${routePath}`);
  return image;
};
for (const build of builds) {
  const notFoundPath = localePath(build.locale, build.server.NOT_FOUND_PATH);
  const html = pages.get(notFoundPath) as string;
  pages.delete(notFoundPath);
  const file = build.locale === SOURCE_LOCALE ? join(distDir, "404.html") : join(distDir, build.locale.path, "404.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, withImage(html, imageFor(notFoundPath)));
}
for (const [path, html] of pages) writeHtml(path, withImage(html, imageFor(path)));

for (const build of builds) {
  if (build.locale === SOURCE_LOCALE) continue;
  const dir = join(distDir, build.locale.path, "blog");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "rss.xml"), build.server.renderRss());
}
const server = (builds[0] as Build).server;
mkdirSync(join(distDir, "blog"), { recursive: true });
writeFileSync(join(distDir, "blog", "rss.xml"), server.renderRss());
writeFileSync(join(distDir, "humans.txt"), server.humansTxt(new Date().toISOString().slice(0, 10)));
writeFileSync(join(distDir, "llms.txt"), server.llmsTxt());
mkdirSync(join(distDir, "api", "v2"), { recursive: true });
for (const [name, body] of Object.entries(server.statusApi())) writeFileSync(join(distDir, "api", "v2", name), body);
// `curl textjs.org` (functions/index.ts).
writeFileSync(join(distDir, "home.ansi"), await server.renderHomeAnsi());

// Learn captions, same-origin: English as recorded, and each built locale's translation (src/learn/video.ts links them).
for (const { slug, file } of captionSources()) {
  const english = readFileSync(file, "utf8");
  const write = (lang: string, vtt: string): void => {
    const out = join(distDir, captionsPath(slug, lang).slice(1));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, vtt);
  };
  write("en", english);
  for (const build of builds) {
    const { code } = build.locale;
    if (build.locale !== SOURCE_LOCALE && translatedCaptions(code).includes(slug)) write(code, assembleCaptions(english, readCaptions(code, slug), code).vtt);
  }
}

// Per-locale sitemaps (indexable, translated pages of live locales), listed in robots.txt next to the English one.
if (sitemaps.size > 0) {
  const robots = join(distDir, "robots.txt");
  let lines = readFileSync(robots, "utf8").trimEnd();
  for (const [locale, paths] of sitemaps) {
    const name = `sitemap-${locale.path}.xml`;
    const urls = paths.map((p) => `  <url><loc>https://textjs.org${p}</loc></url>`).join("\n");
    writeFileSync(join(distDir, name), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    lines += `\nSitemap: https://textjs.org/${name}`;
  }
  writeFileSync(robots, `${lines}\n`);
}

// Allow exactly the inline scripts the pages ship (OS detection, mirror prefit, ?debug=scroll) by hash.
const headersPath = join(distDir, "_headers");
writeFileSync(headersPath, withLocaleHeaders(withScriptHashes(readFileSync(headersPath, "utf8"), inlineScriptHashes(distDir)), builds.map((b) => b.locale)));
writeFileSync(join(distDir, "CNAME"), "textjs.org\n");
writeFileSync(join(distDir, ".nojekyll"), "");
rmSync(join(distDir, ".vite"), { recursive: true, force: true });
rmSync(ssrDir, { recursive: true, force: true });
