import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = join(import.meta.dirname, "..");
const distDir = join(rootDir, "dist");
const contentDir = join(rootDir, "src", "docs", "content");
const baseHtml = readFileSync(join(distDir, "index.html"), "utf8");

function withMeta(html: string, title: string, description: string, urlPath: string): string {
  const fullUrl = `https://textjs.org${urlPath}`;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${fullUrl}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${description}$2`);
}

function writeRoute(routePath: string, title: string, description: string): void {
  const dir = join(distDir, ...routePath.split("/").filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), withMeta(baseHtml, title, description, routePath));
}

writeRoute("/docs", "Documentation | Text.js", "Learn how to build full-stack interactive React 19 apps inside browser DevTools console.log.");
writeRoute("/playground", "Playground | Text.js", "Pick a Text.js demo, open the DevTools console and press a few keys.");
writeRoute("/opencode", "OpenCode in the Console | Text.js", "OpenCode Lite coding-agent TUI running inside browser DevTools console.log.");

// Showcase was folded into the Playground.
mkdirSync(join(distDir, "showcase"), { recursive: true });
writeFileSync(
  join(distDir, "showcase", "index.html"),
  '<!doctype html><meta charset="utf-8"><title>Playground | Text.js</title><link rel="canonical" href="https://textjs.org/playground"><meta http-equiv="refresh" content="0; url=/playground"><script>location.replace("/playground"+location.hash)</script>\n',
);

for (const entry of readdirSync(contentDir)) {
  if (!entry.endsWith(".md")) continue;
  const slug = entry.slice(0, -3);
  const label = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  writeRoute(
    `/docs/${slug}`,
    `${label} | Text.js Docs`,
    `Text.js documentation — ${label}.`,
  );
}

writeFileSync(join(distDir, "404.html"), baseHtml);
writeFileSync(join(distDir, "CNAME"), "textjs.org\n");
writeFileSync(join(distDir, ".nojekyll"), "");
