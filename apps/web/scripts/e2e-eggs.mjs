// Headless checks for the site easter eggs: logo menu, ⌘K, console.log status, inspect button,
// certificate print and LinkedIn link.
//
//   bun run build && bun run preview
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:4173 OUT=/tmp/eggs node scripts/e2e-eggs.mjs
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const out = process.env.OUT ?? "";
if (out) mkdirSync(out, { recursive: true });
const shot = async (target, name) => out && (await target.screenshot({ path: join(out, `${name}.png`) }));

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n  ${detail}`}`);
  if (!ok) failures++;
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
// Never reach a real local server (OpenCode bridge, dev servers) from tests: only the preview port.
const port = new URL(base).port;
await context.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port, (r) => r.abort());
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const logs = [];
page.on("console", (m) => logs.push(m.text()));

// ── #2 logo menu ──
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const before = logs.length;
await page.locator(".header .wordmark").click({ button: "right" });
const menu = page.locator('[role="menu"][aria-label="Logo"]');
check("right-click opens the logo menu", await menu.isVisible());
check("first item has focus", (await page.evaluate(() => document.activeElement?.textContent)) === "Copy Logo as SVG");
check("menu labels", (await menu.locator('[role="menuitem"]').allTextContents()).join("|") === "Copy Logo as SVG|Copy Wordmark as SVG|Copy Logo as console.log");
await shot(page, "logo-menu");
await page.keyboard.press("ArrowDown");
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
check("the item reads Copied", (await menu.locator('[role="menuitem"]').nth(2).textContent()) === "Copied");
const clip = await page.evaluate(() => navigator.clipboard.readText());
check("clipboard holds one console.log call", clip.startsWith('console.log("%c') && clip.endsWith(");"), clip.slice(0, 80));
// Paste it into this page's console: one message, the banner.
const n = logs.length;
await page.evaluate((code) => new Function(code)(), clip);
await page.waitForTimeout(100);
check("pasted call logs the banner once", logs.length === n + 1 && logs[n].includes("█████"), logs.slice(n).join("\n"));
await page.waitForTimeout(1600);
check("Copied reverts after 1.5s", (await menu.locator('[role="menuitem"]').nth(2).textContent()) === "Copy Logo as console.log");
await page.keyboard.press("Escape");
check("Esc closes and refocuses the logo", !(await menu.isVisible()) && (await page.evaluate(() => document.activeElement?.classList.contains("wordmark"))));
await page.locator(".header .wordmark").click({ button: "right" });
await page.mouse.click(600, 600);
check("outside click closes", !(await menu.isVisible()));
await page.locator(".header .wordmark").click({ button: "right", modifiers: ["Shift"] });
check("Shift+right-click keeps the native menu", !(await menu.isVisible()));
await page.keyboard.press("Escape");
check("nothing logged unprompted (besides the visitor's paste and frames)", logs.slice(before).filter((l) => !l.includes("%c") && !l.includes("█")).length === 0, logs.slice(before).join("\n"));

// ── #4 inspect button ──
const inspect = page.locator(".hero .dt-inspect");
const box = await inspect.boundingBox();
await inspect.click();
await page.waitForTimeout(300);
check("inspect is pressed", (await inspect.getAttribute("aria-pressed")) === "true");
check("wireframe on in the store and renderer", await page.evaluate(() => window.text?.renderer?.wireframe === true));
check("clicking inspect didn't engage console input", !(await page.locator(".dt-log.engaged").count()));
const box2 = await inspect.boundingBox();
check("inspect button keeps its 30px box", box.width === 30 && box2.width === 30 && box.height === box2.height);
await shot(page.locator(".hero .split"), "inspect-on");
await page.evaluate(() => window.text.wireframe());
await page.waitForTimeout(200);
check("text.wireframe() turns the button off too", (await inspect.getAttribute("aria-pressed")) === "false");

// ── #1 globals.css ──
await page.locator('.file-tabs button:has-text("app/globals.css")').click();
const code = await page.locator(".split-code pre.code").innerText();
check("app/globals.css is empty with line 1", code.trim() === "1", JSON.stringify(code));
await shot(page.locator(".split-code"), "globals-css");

// ── #5–7 search ──
await page.keyboard.press("Meta+k");
const input = page.locator(".kbar input");
await input.fill("div");
await page.waitForTimeout(100);
check("⌘K div → TX003 first", (await page.locator(".kbar-item").first().innerText()).includes("TX003: Unknown host element"));
await shot(page.locator(".kbar"), "search-div");
await input.fill("");
await input.evaluate((el) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  set.call(el, "\u25B2 Vercel");
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
check("pasted up-triangle flips", (await input.inputValue()) === "\u25BC Vercel", await input.inputValue());
await input.fill(":q");
check(":q shows no results first", (await page.locator(".kbar-list").innerText()).includes("No results"));
await input.press("Enter");
check(":q + Enter closes", !(await page.locator(".kbar").isVisible()));
check("still on /", new URL(page.url()).pathname === "/");

// ── #3 console.log status ──
const footer = page.locator(".footer-status");
const visibleLabel = () => footer.evaluate((el) => [...el.querySelectorAll(".footer-status-label > span")].find((s) => getComputedStyle(s).visibility === "visible")?.textContent);
check("footer: operational", (await visibleLabel()) === "All systems operational");
const w0 = (await footer.boundingBox()).width;
// A forwarding wrapper (Sentry/extension shape) must not trip it.
await page.evaluate(() => {
  const orig = console.log;
  console.log = function (...args) {
    return orig.apply(console, args);
  };
  window.dispatchEvent(new Event("focus"));
});
await page.waitForTimeout(100);
check("forwarding wrapper: still operational", (await visibleLabel()) === "All systems operational");
await page.keyboard.press("ArrowUp");
// The skeptic's experiment.
await page.evaluate(() => {
  console.log = () => {};
  window.dispatchEvent(new Event("focus"));
});
await page.waitForTimeout(100);
check("console.log = () => {}: major outage", (await visibleLabel()) === "Major outage");
check("footer link width unchanged", Math.abs((await footer.boundingBox()).width - w0) < 0.5);
check("red dot", await footer.locator(".dot-red").count() === 1);
await footer.scrollIntoViewIfNeeded();
await shot(page.locator(".footer"), "footer-outage");
await footer.click();
await page.waitForURL(/\/status$/);
await page.waitForTimeout(300);
check("/status banner: Major outage", (await page.locator(".st-banner strong").innerText()) === "Major outage");
const row = page.locator(".st-component").first();
check("console.log row: Major outage", (await row.locator(".st-state").innerText()) === "Major outage");
check("console.log detail", (await row.locator(".st-axis-mid").innerText()) === "console.log was reassigned in this tab. Reload to restore.");
check("today's bar is red", (await row.locator(".st-bar").last().getAttribute("class")).includes("st-bar-outage"));
await shot(page.locator(".st-banner, .st-components").first(), "status-banner-outage");
await shot(page.locator(".st-components"), "status-components-outage");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(300);
check("reload restores operational", (await page.locator(".st-banner strong").innerText()) === "All systems operational");

// ── #9 TX000 ──
await page.goto(`${base}/errors/TX000`, { waitUntil: "networkidle" });
check("TX000 title", (await page.title()) === "TX000: Success | Text.js");
await shot(page.locator("article.tx-errors"), "tx000");

// ── #14/#15 certificate ──
await page.goto(`${base}/learn/certificate`, { waitUntil: "networkidle" });
const li = page.locator(".learn-reset a");
check("LinkedIn hidden while incomplete", (await li.evaluate((el) => getComputedStyle(el).visibility)) === "hidden");
const key = "textjs:learn";
const chapters = await page.evaluate(() => [...document.querySelectorAll(".learn-nav a, nav a")].map((a) => a.getAttribute("href")).filter((h) => h && /^\/learn\/[^/]+$/.test(h) && h !== "/learn/certificate"));
await page.evaluate(
  ([k, done]) => localStorage.setItem(k, JSON.stringify({ done, last: null, name: "Ada Lovelace", completedAt: "2026-11-01T12:00:00.000Z" })),
  [key, [...new Set(chapters)].map((h) => h.slice(7))],
);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(300);
const complete = await page.locator(".learn-cert:not(.pending)").count();
check("course complete from storage", complete === 1, `key ${key}, chapters ${chapters.length}`);
if (complete) {
  check("LinkedIn visible", (await li.evaluate((el) => getComputedStyle(el).visibility)) === "visible");
  check("LinkedIn href", (await li.getAttribute("href")) === "https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=Learn%20Text.js&organizationName=Text.js&issueYear=2026&issueMonth=11&certUrl=https%3A%2F%2Ftextjs.org%2Flearn%2Fcertificate");
  await shot(page.locator(".learn-reset"), "linkedin");
  await page.emulateMedia({ media: "print" });
  const visible = await page.evaluate(() => [...document.body.querySelectorAll("*")].filter((el) => el.getClientRects().length > 0 && el.children.length === 0 && el.textContent.trim()).map((el) => el.tagName.toLowerCase()));
  check("print shows only the certificate", visible.length === 1 && visible[0] === "pre", visible.join(","));
  const pre = await page.locator(".learn-cert pre").evaluate((el) => ({ w: el.getBoundingClientRect().width, color: getComputedStyle(el).color }));
  check("certificate fits A4 at 12pt (≤ 7.27in)", pre.w <= 7.27 * 96, String(pre.w));
  check("black on white", pre.color === "rgb(0, 0, 0)");
  if (out) {
    await page.pdf({ path: join(out, "certificate-a4.pdf"), format: "A4" });
    await page.pdf({ path: join(out, "certificate-letter.pdf"), format: "Letter" });
  }
  await page.emulateMedia({ media: "screen" });
}

check("no page errors", errors.length === 0, errors.join("\n"));
await browser.close();
console.log(failures ? `\n${failures} failed` : "\nall egg checks passed");
process.exit(failures ? 1 : 0);
