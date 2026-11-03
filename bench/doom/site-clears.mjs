// Count console.clear() calls and console.log payload on /doom (attract mode) in headless Chromium.
// Usage: BASE=http://127.0.0.1:5391 SECONDS=30 node bench/doom/site-clears.mjs
import { fileURLToPath } from "node:url";

const { chromium } = await import(
  process.env.PLAYWRIGHT ||
    fileURLToPath(
      new URL(
        "../devtools/node_modules/playwright-core/index.mjs",
        import.meta.url,
      ),
    )
);
const base = new URL(process.env.BASE || "http://127.0.0.1:5391");
if (
  !["localhost", "127.0.0.1"].includes(base.hostname) ||
  ["4096", "49374"].includes(base.port)
)
  throw Error("Use a local preview");
const seconds = Number(process.env.SECONDS || 30);
const [cols, rows] = (process.env.GRID || "120x40").split("x").map(Number);
const browser = await chromium.launch({
  executablePath: process.env.CHROME || chromium.executablePath(),
  headless: true,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    const log = console.log.bind(console);
    const clear = console.clear.bind(console);
    window.__logs = [];
    window.__clears = [];
    console.clear = () => {
      window.__clears.push(performance.now());
      clear();
    };
    console.log = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("%c")) {
        let chars = 0;
        let urls = 0;
        let urlChars = 0;
        let images = 0;
        const pngs = [];
        for (const a of args) {
          if (typeof a !== "string") continue;
          chars += a.length;
          for (const m of a.matchAll(/url\("([^"]*)"\)/g)) {
            urls++;
            urlChars += m[1].length;
            for (const p of m[1].matchAll(/base64,([A-Za-z0-9+/=]+)/g)) {
              images++;
              pngs.push(p[1].length);
            }
          }
        }
        const t0 = performance.now();
        log(...args);
        window.__logs.push({
          t: t0,
          chars,
          urls,
          urlChars,
          images,
          pngs,
          logMs: performance.now() - t0,
        });
        return;
      }
      log(...args);
    };
  });
  await page.goto(new URL("/doom", base).href);
  await page.waitForFunction(
    () => typeof window.text?.resize === "function",
    null,
    { timeout: 30_000 },
  );
  await page.evaluate(([c, r]) => window.text.resize(c, r), [cols, rows]);
  await page.mouse.click(640, 400);
  await page.waitForFunction(
    () => window.__logs.filter((l) => l.images > 0).length > 20,
    null,
    { timeout: 60_000 },
  );
  await sleep(3000);
  const from = await page.evaluate(() => {
    return {
      logs: window.__logs.length,
      clears: window.__clears.length,
      t: performance.now(),
    };
  });
  await sleep(seconds * 1000);
  const stats = await page.evaluate(
    ([from]) => {
      const f = window.__logs.slice(from.logs);
      const clears = window.__clears.slice(from.clears);
      const dur = (performance.now() - from.t) / 1000;
      const sum = (a) => a.reduce((s, x) => s + x, 0);
      const visual = sum(f.map((x) => Math.max(1, x.images)));
      const full = f.map((x) => x.pngs[0] ?? 0);
      const delta = f.flatMap((x) => x.pngs.slice(1));
      return {
        seconds: +dur.toFixed(1),
        clears: clears.length,
        clearsPer30s: +((clears.length * 30) / dur).toFixed(1),
        logs: f.length,
        logsPerSecond: +(f.length / dur).toFixed(1),
        visualFramesPerSecond: +(visual / dur).toFixed(1),
        imagesPerLog: +(visual / f.length).toFixed(2),
        urlsPerLog: +(sum(f.map((x) => x.urls)) / f.length).toFixed(2),
        charsPerLog: Math.round(sum(f.map((x) => x.chars)) / f.length),
        urlCharsPerLog: Math.round(sum(f.map((x) => x.urlChars)) / f.length),
        charsPerVisualFrame: Math.round(sum(f.map((x) => x.chars)) / visual),
        fullPngB64Mean: Math.round(sum(full) / full.length),
        deltaPngB64Mean: Math.round(sum(delta) / Math.max(1, delta.length)),
        logsPerClear: +(f.length / Math.max(1, clears.length)).toFixed(1),
        renderer: window.text.stats(),
      };
    },
    [from],
  );
  console.log(JSON.stringify({ ...stats, errors }, null, 1));
} finally {
  await browser.close();
}
