// Play the /doom preset in the real DevTools frontend (two-context protocol, like
// apps/web/scripts/capture-opencode.mjs): boot, start E1M1 from the menu, walk, turn, shoot, open a door.
// Saves console screenshots, a WebM of the console and per-frame stats to OUT.
// Usage: BASE=http://127.0.0.1:5391 OUT=/tmp/doom node bench/doom/capture.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT || fileURLToPath(new URL("../devtools/node_modules/playwright-core/index.mjs", import.meta.url)));
const base = new URL(process.env.BASE || "http://127.0.0.1:5391");
if (!["localhost", "127.0.0.1"].includes(base.hostname) || ["4096", "49374"].includes(base.port)) throw Error("Use a local preview");
const out = resolve(process.env.OUT || "bench/doom/out/capture");
const [cols, rows] = (process.env.GRID || "90x34").split("x").map(Number);
await mkdir(out, { recursive: true });
const listener = createServer();
await new Promise((r) => listener.listen(0, "127.0.0.1", r));
const port = listener.address().port;
await new Promise((r) => listener.close(r));
const browser = await chromium.launch({
  executablePath: process.env.CHROME || chromium.executablePath(),
  headless: false,
  args: [...(process.env.HEADED ? [] : ["--headless=new"]), `--remote-debugging-port=${port}`, "--remote-allow-origins=*"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  await page.addInitScript(() => {
    const log = console.log.bind(console);
    window.__frames = [];
    console.log = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("%c")) {
        let bytes = 0;
        for (const a of args) bytes += typeof a === "string" ? a.length : 0;
        const t0 = performance.now();
        log(...args);
        window.__frames.push({ t: t0, bytes, spans: args.length - 1, logMs: performance.now() - t0 });
        return;
      }
      log(...args);
    };
  });
  await page.goto(new URL("/doom", base).href);
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
  const target = targets.find((t) => t.url === page.url() && t.type === "page");
  const dtCtx = await browser.newContext({ viewport: { width: Math.ceil(cols * 7.4) + 120, height: rows * 14 + 140 }, recordVideo: { dir: out, size: { width: Math.ceil(cols * 7.4) + 120, height: rows * 14 + 140 } } });
  const dt = await dtCtx.newPage();
  await dt.goto(`http://127.0.0.1:${port}/devtools/inspector.html?ws=127.0.0.1:${port}/devtools/page/${target.id}&panel=console`);
  await dt.locator("#tab-console").click();
  const screencast = dt.locator('button[aria-label="Toggle screencast"].toggled');
  if (await screencast.count()) await screencast.click();
    await page.waitForFunction(() => typeof window.text?.resize === "function", null, { timeout: 30_000 });
  await sleep(1200);
  await page.mouse.click(640, 640);
  await page.evaluate(([c, r]) => window.text.resize(c, r), [cols, rows]);
  let shot = 0;
  const snap = async (label) => {
    await sleep(250);
    await dt.locator("#console-messages").screenshot({ path: resolve(out, `${String(++shot).padStart(2, "0")}-${label}.png`) });
    // The engine's own 320×200 frame at the same moment, for comparison (dev builds expose it).
    const raw = await page.evaluate(() => (window.__doom ? Array.from(window.__doom.source.data) : null));
    if (raw) await writeFile(resolve(out, `${String(shot).padStart(2, "0")}-${label}.rgba`), Buffer.from(new Uint32Array(raw).buffer));
  };
  const hold = async (key, ms) => {
    await page.keyboard.down(key);
    await sleep(ms);
    await page.keyboard.up(key);
  };
  await page.waitForFunction(() => window.__frames.length > 20, null, { timeout: 60_000 });
  await sleep(4000);
  await snap("attract-demo");
  await page.keyboard.press("Enter");
  await snap("menu");
  await page.keyboard.press("Enter"); // New Game
  await sleep(300);
  await page.keyboard.press("Enter"); // Episode 1
  await sleep(300);
  await snap("skill");
  await page.keyboard.press("Enter"); // Hurt me plenty
  await sleep(1500);
  await snap("e1m1-start");
  const statsFrom = await page.evaluate(() => window.__frames.length);
  await hold("ArrowUp", 1200);
  await snap("walked-forward");
  await hold("ArrowLeft", 500);
  await snap("turned-left");
  await hold("KeyF", 400);
  await snap("fire");
  await hold("ArrowRight", 900);
  await hold("ArrowUp", 900);
  await page.keyboard.press("Space");
  await sleep(1200);
  await snap("use");
  await page.keyboard.down("ShiftLeft");
  await hold("KeyW", 1500);
  await page.keyboard.up("ShiftLeft");
  await snap("run");
  await page.keyboard.press("Digit2");
  await sleep(400);
  await page.keyboard.press("Tab");
  await sleep(600);
  await snap("automap");
  await page.keyboard.press("Tab");
  await sleep(10_000);
  const stats = await page.evaluate(([from]) => {
    const f = window.__frames.slice(from);
    const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * p)] ?? 0;
    const dur = (f[f.length - 1].t - f[0].t) / 1000;
    return {
      frames: f.length,
      fps: +(f.length / dur).toFixed(1),
      payloadKB: { p50: +(pct(f.map((x) => x.bytes), 0.5) / 1024).toFixed(0), p95: +(pct(f.map((x) => x.bytes), 0.95) / 1024).toFixed(0) },
      spans: { p50: pct(f.map((x) => x.spans), 0.5), p95: pct(f.map((x) => x.spans), 0.95) },
      consoleLogMs: { p50: +pct(f.map((x) => x.logMs), 0.5).toFixed(2), p95: +pct(f.map((x) => x.logMs), 0.95).toFixed(2) },
      renderer: window.text.stats(),
    };
  }, [statsFrom]);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await writeFile(resolve(out, "stats.json"), JSON.stringify({ grid: `${cols}x${rows}`, ...stats, errors }, null, 2));
  console.log(JSON.stringify(stats));
  await dtCtx.close();
} finally {
  await browser.close();
}
