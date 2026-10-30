// Headless E2E for live docs examples: clicking one runs it in the REAL console (the latest
// console.log frame), the on-page preview mirrors that frame, keys drive it, and Esc, a click
// elsewhere or navigating returns the console to the Docs view. Touch devices keep the sandbox.
//
//   bun run build && bun run preview   (or: bun run dev)
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:3000 OUT=/tmp/examples node scripts/e2e-examples.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = process.env.BASE ?? "http://localhost:3000";
const port = new URL(base).port;
const out = process.env.OUT ?? "";
if (out) mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });

const capture = () => {
  window.__frames = [];
  window.__raw = null;
  const orig = console.log.bind(console);
  console.log = (...a) => {
    if (typeof a[0] === "string" && a[0].includes("%c")) {
      window.__frames.push(a[0].replace(/%c/g, "").replace(/%%/g, "%").replace(/[\u200b\u2060]/g, ""));
      window.__raw = a.map(String);
    }
    return orig(...a);
  };
};
// Never reach a real local OpenCode server from tests.
const isolate = (page) => page.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port, (r) => r.abort());

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(capture);
await isolate(page);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// Frames start with a newline (each console.log begins on its own line).
const last = () => page.evaluate(() => (window.__frames[window.__frames.length - 1] ?? "").replace(/^\n/, ""));
const settle = (ms = 250) => page.waitForTimeout(ms);
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n${detail}`}`);
  if (!ok) failures++;
};
const lines = (s) => s.split("\n").map((l) => l.trimEnd());
const docsView = (f) => f.includes("/ Search") && !f.includes("esc back to docs");
const preview = (id) => page.locator(`[data-preview="${id}"]`);
const liveLabel = (id) => preview(id).locator(".preview-head .live").innerText();

/** The on-page mirror's painted rows (the overlay above the blank placeholder grid). */
const pageRows = (id) =>
  preview(id).evaluate((el) => {
    const mirrors = el.querySelectorAll(".preview-stage [data-textjs-mirror]");
    const live = mirrors[mirrors.length - 1];
    return live ? live.innerText.replace(/[\u200b\u2060]/g, "") : "";
  });

/** The example's cells of the latest console frame: header row dropped, cropped to the preview grid. */
async function consoleRows(cols, rows) {
  const f = await last();
  return lines(f)
    .slice(1, 1 + rows)
    .map((l) => [...l].slice(0, cols).join("").trimEnd());
}

async function samePicture(id, cols, rows, name) {
  const c = await consoleRows(cols, rows);
  const p = lines(await pageRows(id)).slice(0, rows);
  const same = c.length === p.length && c.every((l, i) => l === p[i]);
  check(name, same, `console:\n${c.join("\n")}\npage:\n${p.join("\n")}`);
}

/** Render the captured console.log call (format + CSS args) like DevTools does, for a screenshot. */
async function shootConsole(file) {
  const raw = await page.evaluate(() => window.__raw);
  if (!raw) return;
  const shot = await browser.newPage({ viewport: { width: 1100, height: 500 } });
  await shot.setContent(`<body style="margin:0;background:#202124;padding:12px"><pre id="o" style="margin:0;font:12px/14px Menlo,monospace"></pre></body>`);
  await shot.evaluate(([format, ...args]) => {
    const o = document.getElementById("o");
    const parts = format.split("%c");
    o.append(document.createTextNode(parts[0].replace(/%%/g, "%")));
    parts.slice(1).forEach((p, i) => {
      const s = document.createElement("span");
      s.style.cssText = args[i] ?? "";
      s.textContent = p.replace(/%%/g, "%");
      o.append(s);
    });
  }, raw);
  await shot.locator("#o").screenshot({ path: file });
  await shot.close();
}

// ── Layout docs: modal (72×14), scrollbox, layout ───────────────────────────
await page.goto(`${base}/docs/components-layout`);
await settle(1200);
check("console starts on the Docs view", docsView(await last()), await last());
check("examples offer Run in console", (await preview("modal").getByRole("button", { name: "Run in console", exact: true }).count()) === 1);

const modal = preview("modal");
await modal.scrollIntoViewIfNeeded();
await settle(400);
const clsBefore = await modal.boundingBox();
await modal.locator(".preview-stage").click();
await settle(500);
let f = await last();
check("click: the real console runs the example", lines(f)[0]?.includes("▼ Docs › Layout › Modal") && f.includes("Switch theme"), f);
check("console grid is the example's 72×(14+1)", lines(f).length === 15 && Math.max(...f.split("\n").map((l) => [...l].length)) === 72, `${lines(f).length} rows, ${Math.max(...f.split("\n").map((l) => [...l].length))} cols`);
check("preview says it's live in your console", (await liveLabel("modal")).includes("Live in your console"), await liveLabel("modal"));
await samePicture("modal", 72, 14, "page preview shows the same frame as DevTools");
const clsAfter = await modal.boundingBox();
check("no layout shift when switching to the mirror", Math.abs(clsAfter.height - clsBefore.height) < 0.5, `${clsBefore.height} → ${clsAfter.height}`);

await page.keyboard.press("ArrowDown");
await settle(150);
await page.keyboard.press("Enter");
await settle(300);
f = await last();
check("keys typed on the page drive the console example", f.includes("ran: theme") && !f.includes("Switch theme"), f);
await samePicture("modal", 72, 14, "page mirror follows the keystrokes");
if (out) {
  await modal.screenshot({ path: join(out, "page-modal.png") });
  await shootConsole(join(out, "console-modal.png"));
  writeFileSync(join(out, "console-modal.txt"), f);
}

await page.keyboard.press("Escape");
await settle(300);
f = await last();
check("Esc (unused by the example) returns the console to the Docs view", docsView(f), f);
check("preview is back to its own sandbox", (await liveLabel("modal")).trim() === "Live" && (await modal.locator("[data-console-bypass]").count()) === 1, await liveLabel("modal"));

// Esc the example consumes stays with it.
await modal.locator(".preview-stage").click();
await settle(400);
await page.keyboard.press("Escape");
await settle(250);
f = await last();
check("Esc the example handles (closing its modal) keeps the example", f.includes("Docs › Layout › Modal") && !f.includes("Switch theme"), f);

// Activating another example switches the console to it.
const scroll = preview("scrollbox");
await scroll.locator(".preview-stage").click();
await settle(400);
f = await last();
check("clicking another example switches the console", lines(f)[0]?.includes("Docs › Layout › ScrollBox"), f);
check("only one preview is live in the console", (await page.locator(".preview.in-console").count()) === 1 && (await liveLabel("modal")).trim() === "Live");

// Clicking elsewhere on the page hands the console back to the docs.
await page.locator("h1").first().click();
await settle(300);
check("click elsewhere returns the console to the Docs view", docsView(await last()), await last());

// Keyboard: the Run in console button.
const run = preview("layout").getByRole("button", { name: "Run in console", exact: true });
await run.focus();
await page.keyboard.press("Enter");
await settle(400);
f = await last();
check("Run in console (keyboard) runs the example", lines(f)[0]?.includes("Docs › Layout › Layout"), f);
await preview("layout").getByRole("button", { name: "Back to docs" }).click();
await settle(300);
check("Back to docs button returns the console to the Docs view", docsView(await last()), await last());

// Navigating away while an example runs.
await preview("layout").locator(".preview-stage").click();
await settle(300);
await page.evaluate(() => {
  history.pushState(null, "", "/docs/styling");
  dispatchEvent(new PopStateEvent("popstate"));
});
await settle(500);
f = await last();
check("navigating to another page returns the console to the docs", docsView(f), f);

// Introduction: the counter responds to its keys in the real console.
await page.goto(`${base}/docs`);
await settle(1200);
await preview("counter").locator(".preview-stage").click();
await settle(400);
const c0 = await last();
await page.keyboard.press("ArrowUp");
await page.keyboard.press("ArrowUp");
await settle(300);
const c1 = await last();
check("counter example responds to ↑ in the real console", c1.includes("Docs › Introduction › Counter") && c1 !== c0, c1);
await samePicture("counter", 72, 16, "counter: page mirror matches DevTools");
if (out) {
  await preview("counter").screenshot({ path: join(out, "page-counter.png") });
  await shootConsole(join(out, "console-counter.png"));
}
check("no page errors", errors.length === 0, errors.join("\n"));

// ── Touch devices keep the in-page sandbox ──────────────────────────────────
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const mobile = await ctx.newPage();
await mobile.addInitScript(capture);
await isolate(mobile);
await mobile.goto(`${base}/docs/components-layout`);
await mobile.waitForTimeout(1200);
await mobile.locator('[data-preview="modal"] .preview-stage').tap();
await mobile.waitForTimeout(400);
const mf = await mobile.evaluate(() => window.__frames[window.__frames.length - 1] ?? "");
check("mobile: tapping an example keeps it on the page", !mf.includes("Docs ›") && (await mobile.locator(".preview.in-console").count()) === 0, mf.slice(0, 400));
check("mobile: no Run in console button", !(await mobile.locator('[data-preview="modal"] .preview-run').isVisible()));

await browser.close();
process.exit(failures ? 1 : 0);
