// Docs in a built site, in English and in a locale. Each page's Markdown is its own chunk: a page loads only its
// own, hovering a link fetches the next one, and a click renders it at once with no layout shift. ⌘K finds pages
// and headings by their shown title and by their English name, labels them in the page's language, and Enter
// opens the result client-side.
//
//   TEXTJS_LOCALES=ja bun run build && bun run preview -- --port 4173 --strictPort
//   BASE=http://localhost:4173 node scripts/e2e-docs.mjs
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const port = new URL(base).port;
const browser = await chromium.launch({ headless: true });
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

async function open(path) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port, (r) => r.abort());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  const docChunks = [];
  page.on("request", (r) => {
    if (/\/assets\/doc-[\w-]+\.js$/.test(r.url())) docChunks.push(new URL(r.url()).pathname);
  });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => (window.__spa = true));
  return { page, context, errors, docChunks };
}

/** Opens ⌘K, types `query` and returns the results as `label | sub | group`. */
async function search(page, query) {
  if ((await page.locator(".kbar").count()) === 0) await page.keyboard.press("Meta+k");
  const input = page.locator(".kbar-input input");
  await input.waitFor();
  await input.fill(query);
  await page.waitForTimeout(150);
  return page.locator(".kbar-item").evaluateAll((items) =>
    items.map((b) => {
      const spans = b.querySelectorAll(":scope > span");
      return { label: spans[1]?.textContent ?? "", sub: spans[2]?.textContent ?? "" };
    }),
  );
}

const first = (results) => results[0] ?? { label: "", sub: "" };

/** Hover a sidebar link, then click it: the next page's Markdown is fetched on hover and the click renders it at once. */
async function navigation(prefix) {
  const { page, context, errors, docChunks } = await open(`${prefix}/docs/routing`);
  const own = docChunks.length;
  check(own >= 1 && own <= 2, `${prefix || "en"}: the page loads its own Markdown only (${docChunks.join(", ")})`);
  const link = page.locator(`.docs-sidebar a[href="${prefix}/docs/caching"]`);
  const fetched = page.waitForResponse((r) => /\/assets\/doc-[\w-]+\.js$/.test(r.url()), { timeout: 5000 }).catch(() => null);
  await link.hover();
  await fetched;
  await page.waitForTimeout(100);
  check(docChunks.length > own, `${prefix || "en"}: hovering a link fetches that page's Markdown`);
  const ms = await page.evaluate(async (href) => {
    const a = document.querySelector(`.docs-sidebar a[href="${href}"]`);
    const before = document.querySelector("h1.docs-title")?.textContent;
    const t0 = performance.now();
    a.click();
    // A loaded page renders in the click's own task.
    await new Promise((r) => requestAnimationFrame(r));
    return document.querySelector("h1.docs-title")?.textContent !== before ? performance.now() - t0 : -1;
  }, `${prefix}/docs/caching`);
  check(ms >= 0 && ms < 100, `${prefix || "en"}: a hovered page renders on the next frame (${ms.toFixed(0)}ms)`);
  check((await page.locator(".docs-toc a").count()) > 3 && (await page.locator(".docs-main .prose h2").count()) > 3, `${prefix || "en"}: content and table of contents follow`);
  // Going to a page nobody hovered keeps the old one until its Markdown arrives, then swaps without shifting.
  await page.evaluate((href) => document.querySelector(`.docs-nav a.next`)?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })), "");
  await page.waitForFunction(() => /\/docs\/deploying$/.test(location.pathname) && document.querySelector("h1.docs-title")?.textContent !== "");
  await page.locator("h1.docs-title").filter({ hasNotText: /^$/ }).waitFor();
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForURL(`**${prefix}/docs/caching`);
  await page.waitForTimeout(200);
  check((await page.locator(".docs-main .prose h2").count()) > 3, `${prefix || "en"}: Back shows the previous page`);
  check((await page.evaluate(() => window.__cls)) === 0, `${prefix || "en"}: no layout shift (${await page.evaluate(() => window.__cls)})`);
  check(await page.evaluate(() => window.__spa === true), `${prefix || "en"}: all of it client-side`);
  check(errors.length === 0, `${prefix || "en"}: no console errors (${errors.join(" | ")})`);
  await context.close();
}

try {
  await navigation("");
  await navigation("/ja");
  {
    const { page, context, errors } = await open("/ja/docs");
    let r = await search(page, "コンソールを開く");
    check(first(r).label === "コンソールを開く" && first(r).sub === "インストール", `/ja: コンソールを開く finds the translated heading (${JSON.stringify(first(r))})`);
    r = await search(page, "open the console");
    check(r.some((x) => x.label === "コンソールを開く"), `/ja: "open the console" finds it by its English id (${JSON.stringify(r.slice(0, 3))})`);
    check(!r.some((x) => x.label === "Open the console"), "/ja: no English heading labels");
    r = await search(page, "routing");
    check(r.some((x) => x.label === "ルーティング"), `/ja: "routing" finds ルーティング (${JSON.stringify(r.slice(0, 3))})`);
    r = await search(page, "ルーティング");
    check(first(r).label === "ルーティング", `/ja: ルーティング ranks the page first (${JSON.stringify(first(r))})`);
    r = await search(page, "safari");
    check(first(r).label === "FirefoxとSafari" || /Safari/.test(first(r).label), `/ja: the safari alias labels the heading as shown (${JSON.stringify(first(r))})`);
    r = await search(page, "usePathname");
    check(r.some((x) => /usePathname/.test(x.label)), `/ja: an API name still finds its heading (${JSON.stringify(r.slice(0, 2))})`);
    // Enter opens the first result client-side, with its Markdown loaded and the anchor in view.
    await search(page, "コンソールを開く");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/ja/docs/installation#open-the-console");
    await page.locator("#open-the-console").waitFor();
    check(await page.evaluate(() => window.__spa === true), "/ja: the result opens client-side");
    check((await page.textContent("h1"))?.includes("インストール"), "/ja: the new page's title shows");
    check((await page.locator(".docs-toc a").first().textContent()) !== "", "/ja: the table of contents follows");
    check(errors.length === 0, `/ja: no console errors (${errors.join(" | ")})`);
    await context.close();
  }
  {
    const { page, context, errors } = await open("/docs");
    let r = await search(page, "open the console");
    check(first(r).label === "Open the console" && first(r).sub === "Installation", `en: "open the console" (${JSON.stringify(first(r))})`);
    r = await search(page, "routing");
    check(first(r).label === "Routing", `en: "routing" ranks Routing first (${JSON.stringify(first(r))})`);
    r = await search(page, "open");
    check(r.length > 0 && !r.some((x) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(x.label + x.sub)), "en: no Japanese labels");
    r = await search(page, "safari");
    check(first(r).label === "Firefox and Safari", `en: the safari alias (${JSON.stringify(first(r))})`);
    await search(page, "turbolog");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/docs/turbolog-engine");
    await page.locator("h1.docs-title", { hasText: "The Turbolog Engine" }).waitFor();
    check(await page.evaluate(() => window.__spa === true), "en: the result opens client-side");
    check((await page.locator(".docs-toc a").count()) > 3, "en: the table of contents follows");
    check(errors.length === 0, `en: no console errors (${errors.join(" | ")})`);
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nall passed");
