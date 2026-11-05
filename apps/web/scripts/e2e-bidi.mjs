// Right-to-left text in a built site. `@textjs/core` loads its bidi engine as a chunk of its own (`bidi-[hash].js`)
// the first time text needs it, so pages without right-to-left text never request it, even with the console companion
// running. On /docs/internationalization, /ar/… and /he/…, the Bidirectional text example's in-page preview loads it
// and repaints, and Run in console shows the example in the console companion, in display order every time.
//
//   TEXTJS_LOCALES=ar,he bun run build && bun run preview -- --port 4173 --strictPort
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:4173 bun scripts/e2e-bidi.mjs
//
// Run it with Bun: the expected display order comes from `reorderLine` in the repo's `@textjs/core`.
// Every other loopback port is blocked, so a local OpenCode server is never reached.
import { fileURLToPath } from "node:url";
import { reorderLine } from "../../../packages/core/src/index.ts";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const port = new URL(base).port;
const browser = await chromium.launch({ headless: true });
const BIDI_CHUNK = /\/assets\/bidi-(?!engine-)[\w-]+\.js$/;
/** Two lines of the example, and how they display. */
const EXAMPLE = ["שלום עולם! זהו טקסט בעברית.", "مرحبا بالعالم! هذا نص عربي."];
const DISPLAY = EXAMPLE.map((line) => reorderLine(line, "auto", { shape: true }));

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    ${detail}`}`);
  if (!ok) failures++;
};

async function open(path) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__frames = 0;
    const log = console.log;
    console.log = function (...a) {
      if (typeof a[0] === "string" && a[0].includes("%c")) window.__frames++;
      return log.apply(this, a);
    };
  });
  await page.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port, (r) => r.abort());
  const bidi = [];
  page.on("request", (r) => {
    if (BIDI_CHUNK.test(new URL(r.url()).pathname)) bidi.push(r.url());
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  return { context, page, bidi, errors };
}

/** Waits for the console companion's first frame, then lets it settle. */
async function booted(page) {
  const ok = await page.waitForFunction(() => window.__frames > 0, null, { timeout: 8000 }).then(
    () => true,
    () => false,
  );
  await page.waitForTimeout(1500);
  return ok;
}

const consoleText = (page) => page.evaluate(() => window.text?.renderer?.buffer?.toPlainString() ?? "");

// Left-to-right pages: the companion on Home and a docs page never request the engine.
for (const path of ["/", "/docs/routing"]) {
  const { context, page, bidi, errors } = await open(path);
  await page.keyboard.press("F12");
  check(`${path}: F12 boots the companion`, await booted(page));
  check(`${path}: the bidi chunk isn't requested`, bidi.length === 0, bidi.join(" "));
  check(`${path}: no page errors`, errors.length === 0, errors.join(" | "));
  await context.close();
}

// The Bidirectional text example, in English, Arabic and Hebrew.
for (const prefix of ["", "/ar", "/he"]) {
  const path = `${prefix}/docs/internationalization`;
  const { context, page, bidi, errors } = await open(path);
  const preview = page.locator('[data-preview="bidi"]');
  await preview.scrollIntoViewIfNeeded();
  const shown = await page
    .waitForFunction((want) => want.every((w) => (document.querySelector('[data-preview="bidi"] .preview-stage')?.textContent ?? "").includes(w)), DISPLAY, { timeout: 8000 })
    .then(
      () => true,
      () => false,
    );
  const stage = (await preview.locator(".preview-stage").textContent()) ?? "";
  check(`${path}: the preview shows the Hebrew and Arabic lines in display order`, shown, stage.slice(0, 600));
  check(`${path}: and not in logical order`, EXAMPLE.every((l) => !stage.includes(l)), stage.slice(0, 600));
  await preview.locator(".preview-run").click();
  check(`${path}: Run in console boots the companion`, await booted(page));
  const text = await consoleText(page);
  check(`${path}: the console shows the lines in display order`, DISPLAY.every((l) => text.includes(l)), text);
  check(`${path}: and not in logical order`, EXAMPLE.every((l) => !text.includes(l)), text);
  check(`${path}: the bidi chunk is requested once`, bidi.length === 1, bidi.join(" "));
  check(`${path}: no page errors`, errors.length === 0, errors.join(" | "));
  await context.close();
}

await browser.close();
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
