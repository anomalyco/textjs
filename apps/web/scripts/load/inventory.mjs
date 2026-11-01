// Request inventory: every request a first visit makes on the main pages, classified by what
// serves it (static Pages asset, Pages Function, the curl Worker, R2, third party).
//
//   node scripts/load/inventory.mjs                      # live textjs.org
//   BASE=https://load-test.textjs-avg.pages.dev node scripts/load/inventory.mjs
//   JSON=out.json node scripts/load/inventory.mjs        # also write the raw rows
//
// Safe to point at production: one fresh browser context per page, no clicks except the
// Learn video's play button, loopback is blocked (the OpenCode demo must never reach a real
// server) and the Coffee demo is only loaded, never driven (no sign in, no cart, no orders).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = process.env.BASE ?? "https://textjs.org";
const origin = new URL(base);
const PAGES = (process.env.PAGES ?? "/,/playground,/opencode,/coffee,/learn/routing,/docs/routing,/store").split(",");

/** What serves a request, from its URL and the response's headers. */
export function classify(url, headers = {}) {
  const u = new URL(url);
  if (u.protocol === "data:" || u.protocol === "blob:") return "inline";
  if (u.hostname === "media.textjs.org") return "r2";
  if (u.hostname !== origin.hostname) return "third-party";
  if (u.pathname === "/") return origin.hostname === "textjs.org" ? "worker+function" : "function";
  if (u.pathname.startsWith("/api/terminal/") && /^\/api\/terminal\/(dev|prod)\/api\//.test(u.pathname)) return "function→terminal.shop";
  if (u.pathname.startsWith("/api/terminal") || u.pathname === "/terminal/callback") return "function";
  return headers["cf-cache-status"] === "HIT" ? "static (edge HIT)" : "static";
}

const browser = await chromium.launch({ headless: true });
const rows = [];
for (const path of PAGES) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.route((url) => /^(127\.0\.0\.1|localhost|\[::1\]|0\.0\.0\.0)$/.test(url.hostname), (r) => r.abort());
  // Belt and braces: the Coffee demo may read the catalogue, never write.
  await page.route(/\/api\/terminal\//, (r) => (r.request().method() === "GET" ? r.continue() : r.abort()));
  const seen = [];
  page.on("requestfinished", async (req) => {
    const res = await req.response().catch(() => null);
    const headers = res ? await res.allHeaders().catch(() => ({})) : {};
    const sizes = await req.sizes().catch(() => ({ responseBodySize: 0 }));
    seen.push({ page: path, method: req.method(), url: req.url(), type: req.resourceType(), status: res?.status() ?? 0, cache: headers["cf-cache-status"] ?? "", cc: headers["cache-control"] ?? "", bytes: sizes.responseBodySize, kind: classify(req.url(), headers), timing: headers["server-timing"]?.replace(/\n/g, " ") ?? "" });
  });
  page.on("requestfailed", (req) => seen.push({ page: path, method: req.method(), url: req.url(), type: req.resourceType(), status: 0, cache: "", cc: "", bytes: 0, kind: classify(req.url()), timing: `failed: ${req.failure()?.errorText}` }));
  await page.goto(new URL(path, base).toString(), { waitUntil: "load" });
  await page.waitForTimeout(path === "/coffee" ? 5000 : 2500);
  if (path.startsWith("/learn/")) {
    const play = page.locator("video").first();
    if (await play.count()) {
      await play.scrollIntoViewIfNeeded();
      await play.evaluate((v) => v.play().catch(() => undefined));
      await page.waitForTimeout(5000);
      await play.evaluate((v) => v.pause());
    }
  }
  await page.waitForTimeout(500);
  rows.push(...seen);
  await context.close();
}
await browser.close();

if (process.env.JSON) writeFileSync(process.env.JSON, JSON.stringify(rows, null, 2));
const short = (u) => {
  const x = new URL(u);
  return (x.hostname === origin.hostname ? "" : x.hostname) + x.pathname.replace(/^(\/assets\/[^-./]+)[^/]*?(\.[a-z0-9]+)$/i, "$1-…$2") + (x.search ? "?…" : "");
};
for (const path of PAGES) {
  const mine = rows.filter((r) => r.page === path);
  const kb = mine.reduce((s, r) => s + r.bytes, 0) / 1024;
  console.log(`\n## ${path}  (${mine.length} requests, ${kb.toFixed(0)} KB transferred)`);
  for (const r of mine) console.log(`${String(r.status).padEnd(4)}${r.method.padEnd(5)}${r.kind.padEnd(24)}${(r.cache || "-").padEnd(8)}${String(Math.round(r.bytes / 1024)).padStart(6)} KB  ${short(r.url)}  ${r.cc ? `[${r.cc}]` : ""}`);
}
