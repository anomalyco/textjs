// Headless E2E for live examples: clicking one (in the docs, or Home's Components section) runs it
// in the REAL console (the latest console.log frame), the on-page preview mirrors that frame, keys
// drive it, and Esc, a click elsewhere or navigating returns the console to the Docs view (or the
// Home counter). Touch devices keep the sandbox.
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
// ── Home: the Components section runs its selected tab in the console ───────
const homeView = (f) => f.includes("React 19 in console.log") && !f.includes("Components ›");
const kit = page.locator(".kit-live");
const kitBadge = () => kit.locator(".kit-live-badge").innerText();
/** The Components mirror's painted rows. */
const kitRows = () =>
  kit.evaluate((el) => {
    const mirrors = el.querySelectorAll(".kit-stage [data-textjs-mirror]");
    const live = mirrors[mirrors.length - 1];
    return live ? live.innerText.replace(/[\u200b\u2060]/g, "") : "";
  });
async function kitSamePicture(name) {
  const c = await consoleRows(76, 16);
  const p = lines(await kitRows()).slice(0, 16);
  check(name, c.length === p.length && c.every((l, i) => l === p[i]), `console:\n${c.join("\n")}\npage:\n${p.join("\n")}`);
}
/** The hero mirror's painted rows. */
const heroRows = () =>
  page.locator(".split-console").evaluate((el) => {
    const mirrors = el.querySelectorAll("[data-textjs-mirror]");
    const live = mirrors[mirrors.length - 1];
    return live ? live.innerText.replace(/[\u200b\u2060]/g, "") : "";
  });

await page.goto(`${base}/`);
await settle(1200);
check("Home: console starts on the counter", homeView(await last()), await last());
await kit.scrollIntoViewIfNeeded();
await settle(400);
const kitBefore = await kit.boundingBox();
await kit.locator(".kit-stage").click();
await settle(500);
f = await last();
check("Home: clicking the Components example runs it in the real console", lines(f)[0]?.includes("▼ Text.js › Components › Table") && f.includes("space select"), f);
check("Home: console grid is the stage's 76×(16+1)", lines(f).length === 17 && Math.max(...f.split("\n").map((l) => [...l].length)) === 76, `${lines(f).length} rows, ${Math.max(...f.split("\n").map((l) => [...l].length))} cols`);
check("Home: the section says it's live in your console", (await kitBadge()).includes("Live in your console"), await kitBadge());
await kitSamePicture("Home: the section shows the same frame as DevTools");
const kitAfter = await kit.boundingBox();
check("Home: no layout shift when switching to the mirror", Math.abs(kitAfter.height - kitBefore.height) < 0.5, `${kitBefore.height} → ${kitAfter.height}`);

await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await settle(300);
f = await last();
check("Home: keys drive the Table in the console", /opened \w+/.test(f), f);
await kitSamePicture("Home: the mirror follows the keystrokes");
if (out) {
  await kit.screenshot({ path: join(out, "page-home-table.png") });
  await shootConsole(join(out, "console-home-table.png"));
  writeFileSync(join(out, "console-home-table.txt"), f);
}

// Switching tabs on the page switches the console.
await kit.getByRole("tab", { name: "useKeymap" }).click();
await settle(400);
f = await last();
check("Home: switching to useKeymap switches the console", lines(f)[0]?.includes("Components › Keymap") && f.includes("count = 0"), f);
await page.keyboard.press("ArrowUp");
await page.keyboard.press("ArrowUp");
await settle(300);
f = await last();
check("Home: the keymap counter responds to ↑ in the console", f.includes("count = 2"), f);
await page.keyboard.press("Control+k");
await settle(300);
f = await last();
check("Home: Ctrl+K opens the example's command palette", f.includes("Show a toast"), f);
await page.keyboard.press("Escape");
await settle(250);
f = await last();
check("Home: Esc the palette uses keeps the example", lines(f)[0]?.includes("Components › Keymap") && !f.includes("Show a toast"), f);
await kitSamePicture("Home: useKeymap mirror matches DevTools");
await kit.getByRole("tab", { name: "Controls" }).click();
await settle(400);
f = await last();
check("Home: switching to Controls switches the console", lines(f)[0]?.includes("Components › Controls") && f.includes("Web Analytics"), f);
const edgeLine = (s) => lines(s).find((l) => l.includes("Edge runtime"));
const edge0 = edgeLine(f);
await page.keyboard.press("Tab");
await page.keyboard.press("Space");
await settle(300);
f = await last();
check("Home: Tab and Space work in Controls", edgeLine(f) !== edge0, `${edge0}\n${edgeLine(f)}`);
if (out) {
  await kit.screenshot({ path: join(out, "page-home-controls.png") });
  await shootConsole(join(out, "console-home-controls.png"));
}

await page.keyboard.press("Escape");
await settle(300);
f = await last();
check("Home: Esc returns the console to the counter", homeView(f), f);
check("Home: the section is back to its own sandbox", (await kitBadge()).trim() === "Live" && (await kit.locator("[data-console-bypass]").count()) === 1, await kitBadge());

// Clicking a tab while the section isn't engaged stays on the page.
await kit.getByRole("tab", { name: "Charts" }).click();
await settle(300);
check("Home: tabs alone don't take over the console", homeView(await last()), await last());

// Keyboard: Run in console, then Back to counter.
await kit.getByRole("button", { name: "Run in console", exact: true }).focus();
await page.keyboard.press("Enter");
await settle(400);
f = await last();
check("Home: Run in console (keyboard) runs Charts", lines(f)[0]?.includes("Components › Charts"), f);
await kit.getByRole("button", { name: "Back to counter" }).click();
await settle(300);
check("Home: Back to counter returns the console to the counter", homeView(await last()), await last());

// A click elsewhere on the page returns it too.
await kit.locator(".kit-stage").click();
await settle(400);
await page.locator(".kit-index code").first().click();
await settle(300);
check("Home: click elsewhere returns the console to the counter", homeView(await last()), await last());

// The hero keeps mirroring the counter; clicking it while an example runs returns the console to it.
await kit.locator(".kit-stage").click();
await settle(400);
check("Home: the hero mirror keeps the counter while an example runs", (await heroRows()).includes("React 19 in console.log"), await heroRows());
await page.locator(".split-console").scrollIntoViewIfNeeded();
await settle(400);
check("Home: scrolling the example out of view returns the console to the counter", homeView(await last()), await last());
await kit.scrollIntoViewIfNeeded();
await kit.locator(".kit-stage").click();
await settle(400);
await page.locator(".split-console").click();
await settle(400);
f = await last();
check("Home: clicking the hero returns the console to the counter", homeView(f), f);
const h0 = await last();
await page.keyboard.press("ArrowUp");
await settle(300);
check("Home: …and the hero's keys reach the counter", (await last()) !== h0 && homeView(await last()), await last());
if (out) await page.locator(".split-console").screenshot({ path: join(out, "page-home-hero.png") });

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
await mobile.goto(`${base}/`);
await mobile.waitForTimeout(1200);
await mobile.locator(".kit-stage").scrollIntoViewIfNeeded();
await mobile.locator(".kit-stage").tap();
await mobile.waitForTimeout(400);
const mh = await mobile.evaluate(() => window.__frames[window.__frames.length - 1] ?? "");
check("mobile: tapping the Components example keeps it on the page", !mh.includes("Components ›") && (await mobile.locator(".kit-live.in-console").count()) === 0, mh.slice(0, 400));
check("mobile: no Run in console button on Home", !(await mobile.locator(".kit-foot .preview-run").isVisible()));

await browser.close();
process.exit(failures ? 1 : 0);
