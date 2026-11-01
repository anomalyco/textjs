/**
 * Review sheets for the Open Graph images in `dist/og` (run `bun run build` first):
 *
 * - brand/og-preview.png: fifteen representative cards.
 * - brand/og-unfurls.png: three of them as X and Slack show them, at their real sizes, to check
 *   nothing important sits under X's domain label or gets lost when scaled down.
 *
 *   bun scripts/og/preview.ts
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { contactSheet } from "./sheet";
import { BASE_CSS, CHROMIUM_ARGS, escapeHtml, OG_FONTS, OG_ORIGIN } from "./template";

const WEB_DIR = join(import.meta.dirname, "..", "..");
const DIST = join(WEB_DIR, "dist");
const BRAND = join(WEB_DIR, "..", "..", "brand");

const files = new Map(readdirSync(join(DIST, "og")).map((f) => [f.replace(/\.(png|jpg)$/, ""), join(DIST, "og", f)]));
const file = (slug: string): string => {
  const f = files.get(slug);
  if (!f) throw new Error(`preview: dist/og/${slug}.* not found; run bun run build`);
  return f;
};

/** Title and description as the page's own meta tags have them. */
function pageMeta(path: string): { title: string; description: string } {
  const html = readFileSync(join(DIST, path === "/" ? "index.html" : `${path.slice(1)}.html`), "utf8");
  const get = (key: string): string => new RegExp(`<meta\\s+property="og:${key}"\\s+content="([^"]*)"`).exec(html)?.[1] ?? "";
  return { title: get("title").replace(/&amp;/g, "&").replace(/&quot;/g, '"'), description: get("description").replace(/&amp;/g, "&").replace(/&quot;/g, '"') };
}

const PREVIEW = [
  ["home", "Home"],
  ["docs-routing", "Docs"],
  ["learn-layout", "Learn chapter"],
  ["blog-text-js-1-0", "Blog post"],
  ["changelog", "Changelog"],
  ["status", "Status"],
  ["playground-streaming", "Playground demo"],
  ["opencode", "OpenCode"],
  ["coffee", "Coffee (terminal.shop)"],
  ["enterprise", "Enterprise"],
  ["store", "Store"],
  ["store-console-tee", "Store product"],
  ["errors", "Error codes"],
  ["errors-TX014", "Error code"],
  ["404", "404"],
] as const;

await contactSheet(
  join(BRAND, "og-preview.png"),
  PREVIEW.map(([slug, label]) => ({ file: file(slug), label: `${label} · /og/${slug}` })),
  3,
  600,
  `Open Graph images, 1200×630, one per page (${PREVIEW.length} of ${files.size})`,
);
console.log("brand/og-preview.png");

const UNFURLS = [
  ["home", "/"],
  ["docs-routing", "/docs/routing"],
  ["learn-layout", "/learn/layout"],
] as const;

const imgUrl = (slug: string): string => `/img/${slug}`;
const cards = UNFURLS.map(([slug, path]) => {
  const { title, description } = pageMeta(path);
  // X: large image card, 516px wide in the timeline, 1.91:1, 16px corners, domain label over the bottom left.
  const x = `<div class="x"><img src="${imgUrl(slug)}"><span class="x-domain">textjs.org</span></div>`;
  // Slack: an attachment with the site name, linked title, description and the image at up to 360px wide.
  const slack = `<div class="slack"><div class="bar"></div><div class="body"><div class="sl-site">Text.js</div><div class="sl-title">${escapeHtml(title)}</div><div class="sl-desc">${escapeHtml(description)}</div><img src="${imgUrl(slug)}"></div></div>`;
  return `<div class="pair"><div><div class="cap">X · ${escapeHtml(path)}</div>${x}</div><div><div class="cap">Slack · ${escapeHtml(path)}</div>${slack}</div></div>`;
}).join("");

const html = `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
html, body { width: 1040px; height: auto; overflow: visible; background: #fff; color: #0f1419; font-family: "Geist", "Geist OG"; }
h1 { font-size: 24px; font-weight: 600; padding: 28px 32px 0; letter-spacing: -0.02em; }
.pair { display: grid; grid-template-columns: 516px 420px; gap: 40px; padding: 24px 32px; align-items: start; }
.cap { font-family: "Geist Mono", "Geist Mono OG"; font-size: 13px; color: #536471; margin-bottom: 8px; }
.x { position: relative; width: 516px; height: 270px; border-radius: 16px; overflow: hidden; border: 1px solid #cfd9de; }
.x img { width: 100%; height: 100%; object-fit: cover; display: block; }
.x-domain { position: absolute; left: 12px; bottom: 12px; padding: 0 4px; border-radius: 4px; background: rgba(0,0,0,0.77); color: #fff; font-size: 13px; line-height: 20px; outline: 1px dashed rgba(255,80,80,0.8); }
.slack { display: flex; gap: 12px; width: 420px; font-size: 15px; line-height: 1.4; }
.slack .bar { width: 4px; border-radius: 2px; background: #dddddd; flex-shrink: 0; }
.slack .sl-site { font-weight: 700; font-size: 15px; }
.slack .sl-title { color: #1264a3; font-weight: 700; }
.slack .sl-desc { color: #1d1c1d; margin-bottom: 8px; }
.slack img { width: 360px; border-radius: 8px; display: block; border: 1px solid #ddd; }
</style><h1>Unfurl check: X large image card and Slack, at their display sizes</h1><p style="padding:6px 32px 0;font-size:14px;color:#536471">The dashed outline marks the domain label X draws over the image.</p>${cards}`;

const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
try {
  const page = await browser.newPage({ viewport: { width: 1040, height: 800 }, deviceScaleFactor: 2 });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== OG_ORIGIN) return route.abort();
    if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: html });
    const font = OG_FONTS[url.pathname];
    if (font) return route.fulfill({ contentType: "font/woff2", body: readFileSync(join(WEB_DIR, font)) });
    const m = /^\/img\/(.+)$/.exec(url.pathname);
    if (!m) return route.abort();
    const f = file(m[1] as string);
    return route.fulfill({ contentType: f.endsWith(".jpg") ? "image/jpeg" : "image/png", body: readFileSync(f) });
  });
  await page.goto(`${OG_ORIGIN}/`, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((i) => i.decode()));
  });
  writeFileSync(join(BRAND, "og-unfurls.png"), await page.screenshot({ fullPage: true, type: "png" }));
  console.log("brand/og-unfurls.png");
} finally {
  await browser.close();
}
