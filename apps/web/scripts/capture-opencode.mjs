// Run against a local static preview, using the real Chrome DevTools frontend
// (same two-context protocol as bench/devtools/bidi-shot.ts). No persistent
// browser profile, remote site, or OpenCode service traffic is permitted.
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT || fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url)));
const base = new URL(process.env.BASE || "http://127.0.0.1:3000");
if (!["localhost", "127.0.0.1"].includes(base.hostname) || ["4096", "49374"].includes(base.port)) throw Error("Use a local static website preview");
const out = resolve(process.argv[2] ?? fileURLToPath(new URL("../../opencode-console/.text/captures/console", import.meta.url)));
await mkdir(out, { recursive: true });
const listener = createServer();
await new Promise((r) => listener.listen(0, "127.0.0.1", r));
const port = listener.address().port;
await new Promise((r) => listener.close(r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || chromium.executablePath(), headless: false,
  args: ["--headless=new", `--remote-debugging-port=${port}`, "--remote-allow-origins=*"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  await page.route("**/*", (r) => {
    const u = new URL(r.request().url());
    return u.origin === base.origin && !/\/(?:__opencode|api)\//.test(u.pathname) ? r.continue() : r.abort();
  });
  await page.addInitScript(() => {
    const log = console.log.bind(console);
    console.log = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("%c")) window.capture = args;
      log(...args);
    };
  });
  await page.goto(new URL("/opencode", base).href);
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
  const target = targets.find((t) => t.url === page.url() && t.type === "page");
  const dt = await browser.newPage({ viewport: { width: 1050, height: 740 } });
  await dt.goto(`http://127.0.0.1:${port}/devtools/inspector.html?ws=127.0.0.1:${port}/devtools/page/${target.id}&panel=console`);
  await dt.locator("#tab-console").click();
  const screencast = dt.locator('button[aria-label="Toggle screencast"].toggled');
  if (await screencast.count()) await screencast.click();
  await page.mouse.click(640, 600);
  const capture = async (label, needle) => {
    // Playwright keeps each page focused; a blurred page would log the "Click the page" bar into the capture.
    if (!(await page.evaluate(() => document.hasFocus()))) throw Error(`${label}: the page lost focus`);
    await page.waitForFunction((n) => window.capture?.[0].replace(/%c/g, "").includes(n), needle);
    await dt.locator(".console-message-text").filter({ hasText: needle }).last().waitFor({ state: "visible" });
    await page.waitForTimeout(150); // DT paints on its own 50ms throttle.
    const args = await page.evaluate(() => window.capture);
    const text = args[0].replace(/%%|%c/g, (m) => m === "%%" ? "%" : "").replace(/[\u200b\u2060]/g, "").replace(/^\n/, "");
    await writeFile(resolve(out, `${label}.txt`), text.split("\n").map((s) => s.trimEnd()).join("\n") + "\n");
    await writeFile(resolve(out, `${label}.json`), JSON.stringify(args));
    await dt.locator("#console-messages").screenshot({ path: resolve(out, `${label}.png`) });
  };
  for (const [w, h] of [[120, 40], [100, 32], [80, 24]]) {
    await page.evaluate(([w, h]) => window.text.resize(w, h), [w, h]);
    await page.waitForTimeout(250);
    await capture(`home-${w}x${h}`, "Ask anything");
    await page.keyboard.press("Control+p");
    await capture(`commands-${w}x${h}`, "Switch model");
    await page.keyboard.press("Escape");
  }
  await page.keyboard.press("Control+x");
  await page.keyboard.press("l");
  await capture("sessions-80x24", "Fix flaky SSE reconnect test");
  await page.keyboard.press("Enter");
  await capture("session-80x24", "Fix flaky SSE reconnect test");
  console.log(`Captured DevTools screenshots and console.log arguments in ${out}`);
} finally {
  await browser.close();
}
