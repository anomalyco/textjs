// Locale flows in a built site, per locale: lang/dir, hydration without errors, links that keep the locale, the
// footer picker, the suggestion banner and its dismissal, the localized 404, the Learn caption tracks and layout
// shift on home, docs and Learn.
//
//   TEXTJS_LOCALES=ja,de,zh-CN bun run build && bun run preview -- --port 4173 --strictPort
//   BASE=http://localhost:4173 LOCALES=ja,de,zh-CN node scripts/e2e-i18n.mjs
//
// Every other loopback port is blocked, so a local OpenCode server is never reached.
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const port = new URL(base).port;
const locales = (process.env.LOCALES ?? "ja").split(",").map((code) => ({ code, path: code.toLowerCase() }));
const browser = await chromium.launch({ headless: true });
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

async function context(browserLocale, viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ locale: browserLocale, viewport });
  await ctx.route(/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//, (route) => (new URL(route.request().url()).port === port ? route.continue() : route.abort()));
  return ctx;
}

async function open(path, browserLocale = "en-US") {
  const ctx = await context(browserLocale);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  return { page, context: ctx, errors };
}

const PAD_KEEP = new Set(["DevTools", "Safari", "Web", "Ctrl", "Shift", "Enter", "Esc", "Space"]);

/** The pad's translatable text: text nodes, labels and titles, and the touch-device note. */
function padStrings(page) {
  return page.evaluate(() => {
    const pad = document.querySelector("[data-textjs-focus-pad]");
    if (!pad) return ["no pad"];
    const skip = ".tx-pad-top, .pad-slot-top, .tx-pad-banner, .tx-pad-touch, style, kbd";
    const out = [];
    const walker = document.createTreeWalker(pad, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!n.parentElement?.closest(skip)) out.push(n.textContent ?? "");
    for (const el of pad.querySelectorAll("[aria-label], [title]")) if (!el.closest(skip)) out.push(el.getAttribute("aria-label") ?? "", el.getAttribute("title") ?? "");
    for (const el of pad.querySelectorAll(".tx-pad-touch h2, .tx-pad-touch p")) out.push(el.textContent ?? "");
    return [...new Set(out.map((s) => s.trim()).filter(Boolean))];
  });
}

/** The English pad's strings before and after it loses focus, to catch untranslated lines in alphabetic locales. */
const englishPad = new Map();
async function padText(path) {
  if (englishPad.has(path)) return englishPad.get(path);
  const { page, context } = await open(path, "en-US");
  const open_ = await padStrings(page);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForSelector('[data-textjs-focus-pad]:not([data-state="open"])', { timeout: 3000 }).catch(() => {});
  const result = { open: open_, next: await padStrings(page) };
  await context.close();
  englishPad.set(path, result);
  return result;
}

try {
  for (const { code, path: p } of locales) {
    {
      const { page, context, errors } = await open(`/${p}/docs/routing`, code);
      check((await page.getAttribute("html", "lang")) === code, `/${p}/docs/routing has lang=${code}`);
      check((await page.getAttribute("html", "dir")) === "ltr", `/${p}/docs/routing has dir=ltr`);
      check(!/^Routing$/.test(((await page.textContent("h1")) ?? "").trim()), `${code}: the title is translated`);
      check((await page.locator(".locale-suggestion").count()) === 0, `${code}: no banner when the browser language matches`);
      // Client navigation keeps the prefix and stays in the SPA.
      await page.evaluate(() => (window.__spa = true));
      const routingTitle = await page.textContent("h1.docs-title");
      await page.click(`.docs-sidebar a[href="/${p}/docs/installation"], aside a[href="/${p}/docs/installation"]`);
      await page.waitForURL(`**/${p}/docs/installation`);
      // The page's Markdown is its own chunk; a click without a hover first waits for it.
      await page.waitForFunction((t) => document.querySelector("h1.docs-title")?.textContent !== t, routingTitle);
      check(await page.evaluate(() => window.__spa === true), `${code}: a docs link navigates client-side within /${p}`);
      check((await page.getAttribute("html", "lang")) === code, `${code}: lang kept after navigating`);
      const header = await page.$$eval("header a[href^='/']", (as) => as.map((a) => a.getAttribute("href")));
      check(header.length > 0 && header.every((h) => h === `/${p}` || h.startsWith(`/${p}/`) || /^\/(api|og|assets|fonts)\b|rss\.xml$/.test(h)), `${code}: header links keep the /${p} prefix (${header.filter((h) => !h.startsWith(`/${p}`)).join(" ")})`);
      // The heading anchor keeps its English id.
      await page.goto(`${base}/${p}/docs/installation#open-the-console`, { waitUntil: "networkidle" });
      check((await page.locator("#open-the-console").count()) === 1, `${code}: #open-the-console exists`);
      // Picker: switch to English, same page.
      const select = page.locator(".locale-menu select");
      check((await select.count()) === 1, `${code}: the footer picker shows on a locale page`);
      await Promise.all([page.waitForURL(`${base}/docs/installation#open-the-console`), select.selectOption("en")]);
      check((await page.getAttribute("html", "lang")) === "en", `${code}: the picker loads the English page`);
      check((await page.locator(".locale-menu").count()) === 0, `${code}: no picker on English pages while ${code} is a draft`);
      check(errors.length === 0, `${code}: no console errors (${errors.join(" | ")})`);
      await context.close();
    }
    {
      const { page, context, errors } = await open(`/${p}/docs`, "en-US");
      const banner = page.locator(".locale-suggestion");
      await banner.waitFor({ timeout: 5000 }).catch(() => {});
      check((await banner.count()) === 1, `an English browser on /${p} is offered English`);
      check((await banner.locator(".locale-suggestion-body").getAttribute("lang")) === "en", `${code}: the offer is written in English`);
      await banner.locator(".locale-suggestion-close").click();
      check((await banner.count()) === 0, `${code}: dismissing hides it`);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      check((await page.locator(".locale-suggestion").count()) === 0, `${code}: and it stays dismissed`);
      check(errors.length === 0, `${code}: no console errors (${errors.join(" | ")})`);
      await context.close();
    }
    // The banner never covers the footer's picker, status line or copyright, even scrolled to the very end.
    for (const [width, height] of [[390, 844], [1440, 900]]) {
      for (const path of [`/${p}`, `/${p}/docs/routing`]) {
        const ctx = await context("en-US", { width, height });
        const page = await ctx.newPage();
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
        // Nothing is wider than the viewport (long German compounds, unbroken CJK runs).
        const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(wide <= 0, `no horizontal overflow at ${width}px on ${path} (${wide}px)`);
        await ctx.close();
      }
    }
    {
      const { page, context } = await open(`/${p}/no-such-page`, code);
      check((await page.getAttribute("html", "lang")) === code, `an unknown /${p} path gets the ${code} 404`);
      check((await page.textContent("h1"))?.includes("404"), `${code}: with the 404 heading`);
      await context.close();
    }
    // The focus pad is translated in every state: its lines, its labels for screen readers, the size control and the
    // demo's keys. Names (the picker, the chapter title), keycaps and browser names stay as written.
    for (const path of ["/playground", "/learn/getting-started"]) {
      const english = await padText(`${path}`, "en-US");
      const { page, context, errors } = await open(`/${p}${path}`, code);
      const leftover = async () => {
        const text = await padStrings(page);
        // CJK: no English words at all; alphabetic locales: no English line verbatim.
        return /^(ja|ko|zh)/.test(code) ? [...new Set(text.join(" ").match(/[A-Za-z]{2,}/g) ?? [])].filter((w) => !PAD_KEEP.has(w)) : text.filter((s) => s.length > 12 && english.open.concat(english.next).includes(s));
      };
      const first = await leftover();
      check(first.length === 0, `/${p}${path}: the pad's first step is translated (${first.join(" | ")})`);
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await page.waitForSelector('[data-textjs-focus-pad]:not([data-state="open"])', { timeout: 3000 }).catch(() => {});
      const state = await page.getAttribute("[data-textjs-focus-pad]", "data-state");
      const next = await leftover();
      check(state !== "open" && next.length === 0, `/${p}${path}: the ${state} step is translated (${next.join(" | ")})`);
      check(errors.length === 0, `/${p}${path}: hydrates with no console errors (${errors.join(" | ")})`);
      await context.close();
    }
    {
      // Learn: a caption track in the page's language, served from this origin and translated, on by default.
      const { page, context, errors } = await open(`/${p}/learn/routing`, code);
      const tracks = await page.$$eval("video track", (ts) => ts.map((t) => ({ lang: t.srclang, src: t.getAttribute("src") })));
      const own = tracks.find((t) => t.lang === code);
      check(Boolean(own) && own.src.startsWith("/captions/learn/"), `${code}: Learn chapter has a same-origin ${code} caption track (${tracks.map((t) => t.lang).join(", ")})`);
      if (own) {
        const vtt = await page.evaluate(async (src) => (await fetch(src)).text(), own.src);
        const english = await page.evaluate(async (src) => (await fetch(src)).text(), tracks.find((t) => t.lang === "en")?.src ?? "");
        check(vtt.startsWith("WEBVTT") && vtt !== english, `${code}: the ${code} captions are translated`);
      }
      check((await page.locator(".learn-video-cc[aria-pressed='true'], .learn-video-cc[aria-checked='true']").count()) === 1, `${code}: captions start on`);
      check(errors.length === 0, `${code}: no console errors on Learn (${errors.join(" | ")})`);
      await context.close();
    }
    // Layout shift on a cold load of the pages a visitor lands on.
    for (const path of [`/${p}`, `/${p}/docs/routing`, `/${p}/learn`]) {
      const ctx = await context(code);
      const page = await ctx.newPage();
      await page.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const cls = await page.evaluate(() => window.__cls);
      check(cls === 0, `CLS 0 on ${path} (${cls.toFixed(4)})`);
      await ctx.close();
    }
  }
  {
    const { page, context, errors } = await open("/docs/routing", locales[0].code);
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
