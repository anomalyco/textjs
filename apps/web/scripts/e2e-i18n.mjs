// Locale flows in a built site: lang/dir, hydration without errors, links that keep the locale, the footer picker,
// the suggestion banner and its dismissal, and the localized 404.
//
//   TEXTJS_LOCALES=en,ja bun run build && bun run preview -- --port 4173 --strictPort
//   BASE=http://localhost:4173 node scripts/e2e-i18n.mjs
import { chromium } from "playwright-core";

const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true });
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

/** Only the site under test: never a local OpenCode bridge or another dev server. */
const guard = (context) => context.route(/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//, (r) => (new URL(r.request().url()).origin === new URL(base).origin ? r.continue() : r.abort()));

async function open(path, locale = "en-US") {
  const context = await browser.newContext({ locale, viewport: { width: 1280, height: 900 } });
  await guard(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  return { page, context, errors };
}

try {
  {
    const { page, context, errors } = await open("/ja/docs/routing", "ja-JP");
    check((await page.getAttribute("html", "lang")) === "ja", "/ja/docs/routing has lang=ja");
    check((await page.textContent("h1"))?.includes("ルーティング"), "the title is translated");
    check((await page.locator(".locale-suggestion").count()) === 0, "no banner when the browser language matches");
    // Client navigation keeps the prefix and stays in the SPA.
    await page.evaluate(() => (window.__spa = true));
    await page.click('.docs-sidebar a[href="/ja/docs/installation"], aside a[href="/ja/docs/installation"]');
    await page.waitForURL("**/ja/docs/installation");
    // The page's Markdown is its own chunk; a click without a hover first waits for it.
    await page.locator("h1.docs-title", { hasText: "インストール" }).waitFor();
    check(await page.evaluate(() => window.__spa === true), "a docs link navigates client-side within /ja");
    check((await page.getAttribute("html", "lang")) === "ja", "still Japanese after navigating");
    // The heading anchor keeps its English id.
    await page.goto(`${base}/ja/docs/installation#open-the-console`, { waitUntil: "networkidle" });
    check((await page.locator("#open-the-console").count()) === 1, "#open-the-console exists on the Japanese page");
    // Picker: switch to English, same page.
    const select = page.locator(".locale-menu select");
    check((await select.count()) === 1, "the footer picker shows on a locale page");
    await Promise.all([page.waitForURL(`${base}/docs/installation#open-the-console`), select.selectOption("en")]);
    check((await page.getAttribute("html", "lang")) === "en", "the picker loads the English page");
    check((await page.locator(".locale-menu").count()) === 0, "no picker on English pages while Japanese is a draft");
    check(errors.length === 0, `no console errors (${errors.join(" | ")})`);
    await context.close();
  }
  {
    const { page, context, errors } = await open("/ja/docs", "en-US");
    const banner = page.locator(".locale-suggestion");
    await banner.waitFor({ timeout: 5000 }).catch(() => {});
    check((await banner.count()) === 1, "an English browser on /ja is offered English");
    check((await banner.locator(".locale-suggestion-body").getAttribute("lang")) === "en", "the offer is written in English");
    await banner.locator(".locale-suggestion-close").click();
    check((await banner.count()) === 0, "dismissing hides it");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    check((await page.locator(".locale-suggestion").count()) === 0, "and it stays dismissed");
    check(errors.length === 0, `no console errors (${errors.join(" | ")})`);
    await context.close();
  }
  // The banner never covers the footer's picker, status line or copyright, even scrolled to the very end.
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    for (const path of ["/ja", "/ja/docs/routing"]) {
      const context = await browser.newContext({ locale: "en-US", viewport: { width, height } });
      await guard(context);
      const page = await context.newPage();
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      await page.locator(".locale-suggestion").waitFor({ timeout: 5000 }).catch(() => {});
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(200);
      const overlaps = await page.evaluate(() => {
        const banner = document.querySelector(".locale-suggestion")?.getBoundingClientRect();
        if (!banner) return ["no banner"];
        return [".locale-menu", ".footer-status", ".tx-copyright p", ".footer nav"]
          .flatMap((sel) => [...document.querySelectorAll(sel)].map((el) => [sel, el.getBoundingClientRect()]))
          .filter(([, r]) => r.width > 0 && r.left < banner.right && r.right > banner.left && r.top < banner.bottom && r.bottom > banner.top)
          .map(([sel]) => sel);
      });
      check(overlaps.length === 0, `banner covers nothing in the footer at ${width}px on ${path} (${overlaps.join(", ")})`);
      await context.close();
    }
  }
  // The focus pad is Japanese in every state: its lines, its labels for screen readers, the size control and the
  // demo's keys. Names (the picker, the chapter title), keycaps and browser names stay as written.
  for (const path of ["/ja/playground", "/ja/learn/getting-started"]) {
    const { page, context, errors } = await open(path, "ja-JP");
    const english = () =>
      page.evaluate(() => {
        const pad = document.querySelector("[data-textjs-focus-pad]");
        if (!pad) return ["no pad"];
        const keep = new Set(["DevTools", "Safari", "Web", "Ctrl", "Shift", "Enter", "Esc", "Space"]);
        const skip = ".tx-pad-top, .pad-slot-top, .tx-pad-banner, .tx-pad-touch, style, kbd";
        const out = [];
        const walker = document.createTreeWalker(pad, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!n.parentElement?.closest(skip)) out.push(n.textContent ?? "");
        for (const el of pad.querySelectorAll("[aria-label], [title]")) if (!el.closest(skip)) out.push(el.getAttribute("aria-label") ?? "", el.getAttribute("title") ?? "");
        for (const el of pad.querySelectorAll(".tx-pad-touch h2, .tx-pad-touch p")) out.push(el.textContent ?? "");
        return [...new Set(out.join(" ").match(/[A-Za-z]{2,}/g) ?? [])].filter((w) => !keep.has(w));
      });
    const open_ = await english();
    check(open_.length === 0, `${path}: the pad's first step is Japanese (${open_.join(" ")})`);
    // Losing focus to DevTools: the click step, or the live one (the demo's keys) when the console has the keyboard.
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.waitForSelector('[data-textjs-focus-pad]:not([data-state="open"])', { timeout: 3000 }).catch(() => {});
    const state = await page.getAttribute("[data-textjs-focus-pad]", "data-state");
    const next = await english();
    check(state !== "open" && next.length === 0, `${path}: the ${state} step is Japanese (${next.join(" ")})`);
    check(errors.length === 0, `${path}: hydrates with no console errors (${errors.join(" | ")})`);
    await context.close();
  }
  {
    const { page, context } = await open("/ja/no-such-page", "ja-JP");
    check((await page.getAttribute("html", "lang")) === "ja", "an unknown /ja path gets the Japanese 404");
    check((await page.textContent("h1"))?.includes("404"), "with the 404 heading");
    await context.close();
  }
  {
    const { page, context, errors } = await open("/docs/routing", "ja-JP");
    await page.waitForTimeout(800);
    check((await page.locator(".locale-suggestion").count()) === 0, "English pages don't offer a draft locale");
    check(errors.length === 0, `no console errors on English (${errors.join(" | ")})`);
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exit(1);
}
