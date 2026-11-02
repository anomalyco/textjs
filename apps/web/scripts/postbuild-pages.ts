import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { OgCard } from "../src/og";
import type { Route } from "../src/router";
import { inlineScriptHashes, withScriptHashes } from "./csp";
import { renderOgImages, type OgImage } from "./og/render";

const rootDir = join(import.meta.dirname, "..");
// Tests point these at a temporary build.
const distDir = process.env.TEXTJS_WEB_DIST ?? join(rootDir, "dist");
const ssrDir = process.env.TEXTJS_WEB_SSR ?? join(rootDir, "node_modules", ".cache", "textjs-ssr");
const baseHtml = readFileSync(join(distDir, "index.html"), "utf8");

interface ManifestChunk {
  file: string;
  src?: string;
  imports?: string[];
  css?: string[];
}

const manifestPath = join(distDir, ".vite", "manifest.json");
const manifest: Record<string, ManifestChunk> | null = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, ManifestChunk>)
  : null;

interface ServerEntry {
  ROUTES: ReadonlyArray<{ path: string; title: string; description: string; canonical?: string; noindex?: boolean }>;
  NOT_FOUND_PATH: string;
  PREFIT_MIRRORS_SCRIPT: string;
  PREFIT_MIRRORS_WHILE_PARSING_SCRIPT: string;
  ROUTE_MANIFEST_SRC: Record<Exclude<Route["name"], "not-found">, string>;
  matchRoute(pathname: string): Route;
  learnVideo(slug: string): { poster: string } | null;
  render(pathname: string): Promise<string>;
  renderRss(): string;
  humansTxt(date: string): string;
  llmsTxt(): string;
  statusApi(): Record<string, string>;
  renderHomeAnsi(): Promise<string>;
  ogCards(routes: ServerEntry["ROUTES"], notFoundPath: string): Promise<OgCard[]>;
}

const server = (await import(pathToFileURL(join(ssrDir, "entry-server.js")).href)) as ServerEntry;

/** Collect JS modulepreloads and CSS files needed by a route's dynamic chunk. */
function routeAssets(routePath: string): { css: string[]; js: string[] } {
  if (!manifest) return { css: [], js: [] };
  const route = server.matchRoute(routePath);
  if (route.name === "not-found") return { css: [], js: [] };
  const srcKey = server.ROUTE_MANIFEST_SRC[route.name];
  if (!srcKey || !manifest[srcKey]) return { css: [], js: [] };

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
  return { css: [...css], js: [...js] };
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
function withRouteHeadHints(html: string, routePath: string, markup: string): string {
  const { css, js } = routeAssets(routePath);
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
  const route = server.matchRoute(routePath);
  if (route.name === "learn" && route.slug && server.learnVideo(route.slug)) {
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

async function withMarkup(html: string, routePath: string): Promise<string> {
  const markup = await server.render(routePath);
  const root = '<div id="root"></div>';
  if (!html.includes(root)) throw new Error("index.html is missing the #root mount point");
  const mirrors = markup.includes("mirror-scale");
  const prefit = mirrors ? `<script>${server.PREFIT_MIRRORS_SCRIPT}</script>` : "";
  const watch = mirrors ? `<script>${server.PREFIT_MIRRORS_WHILE_PARSING_SCRIPT}</script>` : "";
  const hinted = withRouteHeadHints(html, routePath, markup);
  // A page that marks its fold holds first paint until everything above it is parsed (Chrome
  // 124+), so a long page arriving in several chunks never paints a half-built hero.
  const fold = markup.includes('id="fold"') ? '<link rel="expect" href="#fold" blocking="render">\n  </head>' : "</head>";
  return hinted.replace("</head>", fold).replace(root, `${watch}<div id="root" data-route="${escapeAttr(routePath)}">${markup}</div>${prefit}`);
}

function withNoindex(html: string): string {
  return html.replace(/\s*<link\s+rel="canonical"[^>]*>/, "").replace(/(<meta name="viewport"[^>]*>)/, '$1\n    <meta name="robots" content="noindex" />');
}

async function routeHtml(routePath: string, title: string, description: string, canonical = routePath, noindex = false): Promise<string> {
  const meta = withMeta(baseHtml, title, description, canonical);
  return withMarkup(noindex ? withNoindex(meta) : meta, routePath);
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

const pages = new Map<string, string>();
for (const r of server.ROUTES) pages.set(r.path, await routeHtml(r.path, r.title, r.description, r.canonical, r.noindex));
const notFound = withNoindex(baseHtml.replace(/<title>[^<]*<\/title>/, "<title>404: This page could not be found | Text.js</title>"));
const notFoundHtml = await withMarkup(notFound, server.NOT_FOUND_PATH);

// Open Graph cards run the console companion for each route, so they render after the pages.
const ogStarted = performance.now();
const { images, stats } = await renderOgImages(await server.ogCards(server.ROUTES, server.NOT_FOUND_PATH), distDir);
console.log(`og: ${stats.cards} images (${stats.rendered} rendered, ${stats.cached} cached), ${(stats.bytes / 1024 / 1024).toFixed(1)} MB in ${Math.round(performance.now() - ogStarted)}ms`);
const imageFor = (routePath: string): OgImage => {
  const image = images.get(routePath);
  if (!image) throw new Error(`og: no image for ${routePath}`);
  return image;
};
for (const [path, html] of pages) writeHtml(path, withImage(html, imageFor(path)));

mkdirSync(join(distDir, "blog"), { recursive: true });
writeFileSync(join(distDir, "blog", "rss.xml"), server.renderRss());
writeFileSync(join(distDir, "humans.txt"), server.humansTxt(new Date().toISOString().slice(0, 10)));
writeFileSync(join(distDir, "llms.txt"), server.llmsTxt());
mkdirSync(join(distDir, "api", "v2"), { recursive: true });
for (const [name, body] of Object.entries(server.statusApi())) writeFileSync(join(distDir, "api", "v2", name), body);
// `curl textjs.org` (functions/index.ts).
writeFileSync(join(distDir, "home.ansi"), await server.renderHomeAnsi());

writeFileSync(join(distDir, "404.html"), withImage(notFoundHtml, imageFor(server.NOT_FOUND_PATH)));

// Allow exactly the inline scripts the pages ship (OS detection, mirror prefit, ?debug=scroll) by hash.
const headersPath = join(distDir, "_headers");
if (existsSync(headersPath)) writeFileSync(headersPath, withScriptHashes(readFileSync(headersPath, "utf8"), inlineScriptHashes(distDir)));
writeFileSync(join(distDir, "CNAME"), "textjs.org\n");
writeFileSync(join(distDir, ".nojekyll"), "");
rmSync(join(distDir, ".vite"), { recursive: true, force: true });
rmSync(ssrDir, { recursive: true, force: true });
