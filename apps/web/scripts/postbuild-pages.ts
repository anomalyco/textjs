import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = join(import.meta.dirname, "..");
const distDir = join(rootDir, "dist");
const ssrDir = join(rootDir, "node_modules", ".cache", "textjs-ssr");
const baseHtml = readFileSync(join(distDir, "index.html"), "utf8");

interface ServerEntry {
  ROUTES: ReadonlyArray<{ path: string; title: string; description: string; canonical?: string; noindex?: boolean }>;
  NOT_FOUND_PATH: string;
  REDIRECTS: Readonly<Record<string, string>>;
  matchRoute(pathname: string): unknown;
  titleFor(route: unknown): string;
  PREFIT_MIRRORS_SCRIPT: string;
  PREFIT_MIRRORS_WHILE_PARSING_SCRIPT: string;
  render(pathname: string): Promise<string>;
  renderRss(): string;
  humansTxt(date: string): string;
  llmsTxt(): string;
  statusApi(): Record<string, string>;
  renderHomeAnsi(): Promise<string>;
}

const server = (await import(pathToFileURL(join(ssrDir, "entry-server.js")).href)) as ServerEntry;

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
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

async function writeRoute(routePath: string, title: string, description: string, canonical = routePath, noindex = false): Promise<void> {
  const meta = withMeta(baseHtml, title, description, canonical);
  const html = await withMarkup(noindex ? withNoindex(meta) : meta, routePath);
  writeHtml(routePath, html);
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

for (const r of server.ROUTES) await writeRoute(r.path, r.title, r.description, r.canonical, r.noindex);

mkdirSync(join(distDir, "blog"), { recursive: true });
writeFileSync(join(distDir, "blog", "rss.xml"), server.renderRss());
writeFileSync(join(distDir, "humans.txt"), server.humansTxt(new Date().toISOString().slice(0, 10)));
writeFileSync(join(distDir, "llms.txt"), server.llmsTxt());
mkdirSync(join(distDir, "api", "v2"), { recursive: true });
for (const [name, body] of Object.entries(server.statusApi())) writeFileSync(join(distDir, "api", "v2", name), body);
// `curl textjs.org` (functions/index.ts).
writeFileSync(join(distDir, "home.ansi"), await server.renderHomeAnsi());

// Retired paths (router.tsx REDIRECTS), for hosts that skip public/_redirects and vercel.json.
for (const [from, to] of Object.entries(server.REDIRECTS)) {
  const title = escapeAttr(server.titleFor(server.matchRoute(to)));
  writeHtml(
    from,
    `<!doctype html><meta charset="utf-8"><title>${title}</title><link rel="canonical" href="https://textjs.org${to}"><meta http-equiv="refresh" content="0; url=${to}"><script>location.replace(${JSON.stringify(to)}+location.hash)</script>\n`,
  );
}

const notFound = withNoindex(baseHtml.replace(/<title>[^<]*<\/title>/, "<title>404: This page could not be found | Text.js</title>"));
writeFileSync(join(distDir, "404.html"), await withMarkup(notFound, server.NOT_FOUND_PATH));
writeFileSync(join(distDir, "CNAME"), "textjs.org\n");
writeFileSync(join(distDir, ".nojekyll"), "");
rmSync(ssrDir, { recursive: true, force: true });
