import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { OgCard } from "../src/og";
import { renderOgImages, type OgImage } from "./og/render";

const rootDir = join(import.meta.dirname, "..");
// Tests point these at a temporary build.
const distDir = process.env.TEXTJS_WEB_DIST ?? join(rootDir, "dist");
const ssrDir = process.env.TEXTJS_WEB_SSR ?? join(rootDir, "node_modules", ".cache", "textjs-ssr");
const baseHtml = readFileSync(join(distDir, "index.html"), "utf8");

interface ServerEntry {
  ROUTES: ReadonlyArray<{ path: string; title: string; description: string; canonical?: string; noindex?: boolean }>;
  NOT_FOUND_PATH: string;
  PREFIT_MIRRORS_SCRIPT: string;
  PREFIT_MIRRORS_WHILE_PARSING_SCRIPT: string;
  render(pathname: string): Promise<string>;
  renderRss(): string;
  humansTxt(date: string): string;
  llmsTxt(): string;
  statusApi(): Record<string, string>;
  renderHomeAnsi(): Promise<string>;
  ogCards(routes: ServerEntry["ROUTES"], notFoundPath: string): Promise<OgCard[]>;
}

const server = (await import(pathToFileURL(join(ssrDir, "entry-server.js")).href)) as ServerEntry;

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

async function withMarkup(html: string, routePath: string): Promise<string> {
  const markup = await server.render(routePath);
  const root = '<div id="root"></div>';
  if (!html.includes(root)) throw new Error("index.html is missing the #root mount point");
  const mirrors = markup.includes("mirror-scale");
  const prefit = mirrors ? `<script>${server.PREFIT_MIRRORS_SCRIPT}</script>` : "";
  const watch = mirrors ? `<script>${server.PREFIT_MIRRORS_WHILE_PARSING_SCRIPT}</script>` : "";
  // A page that marks its fold holds first paint until everything above it is parsed (Chrome
  // 124+), so a long page arriving in several chunks never paints a half-built hero.
  const fold = markup.includes('id="fold"') ? '<link rel="expect" href="#fold" blocking="render">\n  </head>' : "</head>";
  return html.replace("</head>", fold).replace(root, `${watch}<div id="root" data-route="${escapeAttr(routePath)}">${markup}</div>${prefit}`);
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
writeFileSync(join(distDir, "CNAME"), "textjs.org\n");
writeFileSync(join(distDir, ".nojekyll"), "");
rmSync(ssrDir, { recursive: true, force: true });
