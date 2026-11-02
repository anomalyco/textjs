// Crash reports end to end: every page in the sitemap (and a run of client navigations) loads the
// reporter and sends nothing; the test-only route `/__textjs/throw` sends exactly one report with no
// query string, cookie or user agent in it; a chunk that fails to load after a deploy reloads the
// page once, never twice, while a failed prefetch or reporter import never reloads. Reports are
// intercepted in the browser and never reach a server.
//
//   bun run build && bun run preview -- --port 4173 --strictPort
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:4173 node scripts/e2e-reports.mjs
//
// Env: ROUTES=/a,/b limits the sitemap pass; CONCURRENCY (default 4).
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const port = new URL(base).port;
const concurrency = Number(process.env.CONCURRENCY ?? 4);
const browser = await chromium.launch({ headless: true });

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : `\n    ${detail}`}`);
  if (!ok) failures++;
};

/** A page whose crash reports are recorded (and answered 204) instead of sent. */
async function newPage({ abortChunk = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await context.addCookies([{ name: "e2e_cookie", value: "must-not-be-sent", url: base }]);
  const page = await context.newPage();
  // Never reach a real local OpenCode server (or anything else on loopback but the preview).
  await page.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port, (r) => r.abort());
  const reports = [];
  await page.route(`${base}/api/errors`, async (r) => {
    const req = r.request();
    reports.push({ body: JSON.parse(req.postData() ?? "null"), headers: await req.allHeaders(), url: req.url() });
    await r.fulfill({ status: 204 });
  });
  if (abortChunk) {
    await page.route(abortChunk.pattern, (r) => {
      if (abortChunk.times-- > 0) return r.abort();
      return r.fallback();
    });
  }
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  return { context, page, reports, pageErrors };
}

const reporterLoaded = (page, ms = 15_000) =>
  page
    .waitForFunction(() => performance.getEntriesByType("resource").some((e) => /\/assets\/reporter-[^/]+\.js$/.test(e.name)), null, { timeout: ms })
    .then(() => true)
    .catch(() => false);

// 1. Every page in the sitemap, cold, sends zero reports.
{
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  const all = [...sitemap.matchAll(/<loc>https:\/\/textjs\.org([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
  const routes = process.env.ROUTES ? process.env.ROUTES.split(",").filter(Boolean) : [...all, "/does-not-exist"];
  const noisy = [];
  const notLoaded = [];
  const queue = [...routes];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let route = queue.shift(); route !== undefined; route = queue.shift()) {
        const { context, page, reports, pageErrors } = await newPage();
        await page.goto(base + route, { waitUntil: "load", timeout: 60_000 });
        if (!(await reporterLoaded(page))) notLoaded.push(route);
        await page.waitForTimeout(1500);
        if (reports.length > 0 || pageErrors.length > 0) noisy.push(`${route}: ${reports.map((r) => `${r.body.kind} ${r.body.message}`).concat(pageErrors).join(" | ")}`);
        await context.close();
      }
    }),
  );
  check(`${routes.length} pages load the reporter`, notLoaded.length === 0, notLoaded.join(", "));
  check(`${routes.length} pages send zero reports`, noisy.length === 0, noisy.join("\n    "));
}

// 2. Client navigations send zero reports.
{
  const { context, page, reports } = await newPage();
  await page.goto(`${base}/`, { waitUntil: "load" });
  await reporterLoaded(page);
  const hops = ["/docs", "/docs/routing", "/playground", "/opencode", "/coffee", "/playground/snake", "/learn", "/errors", "/blog", "/changelog", "/store", "/status", "/enterprise", "/"];
  const missing = [];
  for (const href of hops) {
    const ok = await page.evaluate((h) => {
      const a = document.querySelector(`a[href="${h}"]`);
      a?.click();
      return Boolean(a);
    }, href);
    if (!ok) missing.push(href);
    await page.waitForTimeout(1000);
  }
  check(`${hops.length} client navigations send zero reports`, reports.length === 0, reports.map((r) => r.body.message).join(" | "));
  if (missing.length) console.log(`    (no link on the page for ${missing.join(", ")})`);
  await context.close();
}

// 3. A thrown error sends exactly one report, without the query string, cookies or user agent.
{
  const { context, page, reports } = await newPage();
  await page.goto(`${base}/__textjs/throw?email=jane@example.com#frag`, { waitUntil: "load" });
  await reporterLoaded(page);
  await page.waitForTimeout(2500);
  check("the test route shows the crash screen", (await page.locator('[role="alert"]').count()) === 1);
  check("a thrown error sends exactly one report", reports.length === 1, `${reports.length} reports: ${JSON.stringify(reports.map((r) => r.body))}`);
  const r = reports[0];
  if (r) {
    const raw = JSON.stringify(r.body);
    check("the report is a boundary catch with our stack", r.body.kind === "boundary" && r.body.message === "Error: Text.js test route threw on purpose" && r.body.stack.length > 0 && r.body.stack.every((f) => f.includes("/assets/")), raw);
    check("the report has a route, release, browser and viewport bucket", r.body.route === "/404" && /^[\w.+-]+$/.test(r.body.release) && r.body.release !== "dev" && /^Chrome \d+$/.test(r.body.browser) && r.body.viewport === "md", raw);
    const keys = Object.keys(r.body).sort().join(",");
    check("only the documented fields, and no query string, email or user agent", keys === "browser,code,kind,message,os,release,route,stack,v,viewport" && !/jane|email=|frag|Mozilla|AppleWebKit/.test(raw), raw);
    check("the report is sent to /api/errors without cookies", r.url === `${base}/api/errors` && !("cookie" in r.headers), JSON.stringify(r.headers));
    check("Referer is the origin only", r.headers.referer === `${base}/`, `referer: ${r.headers.referer}`);
  }
  await context.close();
}

// 4. A chunk from a previous deploy: one reload, then the page works and the reload is reported.
{
  const { context, page, reports } = await newPage({ abortChunk: { pattern: /\/assets\/Docs-[^/]+\.js$/, times: 1 } });
  let loads = 0;
  page.on("load", () => loads++);
  await page.goto(`${base}/`, { waitUntil: "load" });
  await reporterLoaded(page);
  await page.evaluate(() => document.querySelector('a[href="/docs"]')?.click());
  await page.waitForTimeout(1500);
  await reporterLoaded(page);
  await page.waitForTimeout(2500);
  check("a failed chunk reloads the page once", loads === 2, `${loads} loads`);
  check("after the reload the docs render", new URL(page.url()).pathname === "/docs" && (await page.locator("main h1").count()) > 0, page.url());
  check("the reload is reported once", reports.length === 1 && reports[0].body.kind === "chunk" && reports[0].body.message.startsWith("Reloaded after a chunk failed to load"), JSON.stringify(reports.map((r) => r.body)));
  await context.close();
}

// 5. A chunk that's really missing: still only one reload, and the failure is reported.
{
  const { context, page, reports } = await newPage({ abortChunk: { pattern: /\/assets\/Docs-[^/]+\.js$/, times: Infinity } });
  let loads = 0;
  page.on("load", () => loads++);
  await page.goto(`${base}/`, { waitUntil: "load" });
  await reporterLoaded(page);
  await page.evaluate(() => document.querySelector('a[href="/docs"]')?.click());
  await page.waitForTimeout(2000);
  await reporterLoaded(page);
  await page.waitForTimeout(4000);
  check("a missing chunk never reloads twice", loads === 2, `${loads} loads`);
  const kinds = reports.map((r) => r.body.kind);
  check("both the reload and the failure after it are reported", reports.length === 2 && kinds.every((k) => k === "chunk") && reports.some((r) => r.body.message.startsWith("Reloaded")), JSON.stringify(reports.map((r) => r.body)));
  await context.close();
}

// 6. A reporter that fails to load (it's optional) never reloads the page.
{
  const { context, page, reports, pageErrors } = await newPage({ abortChunk: { pattern: /\/assets\/reporter-[^/]+\.js$/, times: Infinity } });
  let loads = 0;
  page.on("load", () => loads++);
  await page.goto(`${base}/docs/routing`, { waitUntil: "load" });
  await page.waitForTimeout(6000);
  const tried = await page.evaluate(() => performance.getEntriesByType("resource").some((e) => /\/assets\/reporter-/.test(e.name)));
  check("a failed reporter import causes zero reloads", tried && loads === 1 && reports.length === 0 && pageErrors.length === 0, `tried ${tried}, ${loads} loads, ${reports.length} reports, errors: ${pageErrors.join(" | ")}`);
  await context.close();
}

// 7. Hover prefetches that fail never navigate or print uncaught errors; one chunk report per page.
{
  const { context, page, reports, pageErrors } = await newPage({ abortChunk: { pattern: /\/assets\/(Docs|Learn)-[^/]+\.js$/, times: Infinity } });
  let loads = 0;
  page.on("load", () => loads++);
  await page.goto(`${base}/`, { waitUntil: "load" });
  await reporterLoaded(page);
  await page.locator('a[href="/docs"]').first().hover();
  await page.waitForTimeout(1500);
  await page.locator('a[href="/learn"]').first().hover();
  await page.waitForTimeout(2500);
  check("failed hover prefetches cause zero reloads", loads === 1 && new URL(page.url()).pathname === "/", `${loads} loads at ${page.url()}`);
  check("and no uncaught errors", pageErrors.length === 0, pageErrors.join(" | "));
  check("and one chunk report for the page", reports.length === 1 && reports[0].body.kind === "chunk", JSON.stringify(reports.map((r) => r.body)));
  await context.close();
}

await browser.close();
console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
