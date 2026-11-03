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

async function open(path, locale = "en-US") {
  const context = await browser.newContext({ locale, viewport: { width: 1280, height: 900 } });
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
