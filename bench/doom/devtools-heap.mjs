// Retained memory per logged sprite character on /doom: the page's V8 heap and the real DevTools frontend's,
// sampled after a forced GC against the characters logged since the last console.clear().
// The slope is what each extra byte of SPRITE_MAX_BYTES would keep alive in each process.
// Usage: BASE=http://localhost:5391 SECONDS=40 node bench/doom/devtools-heap.mjs
import { createServer } from "node:net";
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
const base = new URL(process.env.BASE || "http://localhost:5391");
if (
  !["localhost", "127.0.0.1"].includes(base.hostname) ||
  ["4096", "49374"].includes(base.port)
)
  throw Error("Use a local preview");
const seconds = Number(process.env.SECONDS || 40);
const listener = createServer();
await new Promise((r) => listener.listen(0, "127.0.0.1", r));
const port = listener.address().port;
await new Promise((r) => listener.close(r));
const browser = await chromium.launch({
  executablePath: process.env.CHROME || chromium.executablePath(),
  headless: false,
  args: [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    "--remote-allow-origins=*",
  ],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block",
  });
  await page.addInitScript(() => {
    const log = console.log.bind(console);
    const clear = console.clear.bind(console);
    window.__since = 0;
    window.__clears = 0;
    console.clear = () => {
      window.__since = 0;
      window.__clears++;
      clear();
    };
    console.log = (...args) => {
      for (const a of args)
        if (typeof a === "string") window.__since += a.length;
      log(...args);
    };
  });
  await page.goto(new URL("/doom", base).href);
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) =>
    r.json(),
  );
  const target = targets.find((t) => t.url === page.url() && t.type === "page");
  const dtCtx = await browser.newContext({
    viewport: { width: 1000, height: 700 },
  });
  const dt = await dtCtx.newPage();
  await dt.goto(
    `http://127.0.0.1:${port}/devtools/inspector.html?ws=127.0.0.1:${port}/devtools/page/${target.id}&panel=console`,
  );
  await dt.locator("#tab-console").click();
  await page.waitForFunction(
    () => typeof window.text?.resize === "function",
    null,
    { timeout: 30_000 },
  );
  await page.evaluate(() => window.text.resize(120, 40));
  await page.mouse.click(640, 400);
  await sleep(6000);
  const pcdp = await page.context().newCDPSession(page);
  const dcdp = await dtCtx.newCDPSession(dt);
  const heap = async (cdp) => {
    await cdp.send("HeapProfiler.collectGarbage");
    return (await cdp.send("Runtime.getHeapUsage")).usedSize;
  };
  const samples = [];
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const since0 = await page.evaluate(() => window.__since);
    const [p, d] = [await heap(pcdp), await heap(dcdp)];
    const since1 = await page.evaluate(() => window.__since);
    if (since1 >= since0)
      samples.push({ since: (since0 + since1) / 2, page: p, devtools: d });
    await sleep(700);
  }
  const fit = (key) => {
    const n = samples.length;
    const mx = samples.reduce((s, x) => s + x.since, 0) / n;
    const my = samples.reduce((s, x) => s + x[key], 0) / n;
    let num = 0;
    let den = 0;
    for (const x of samples) {
      num += (x.since - mx) * (x[key] - my);
      den += (x.since - mx) ** 2;
    }
    const slope = num / den;
    let ssr = 0;
    let sst = 0;
    for (const x of samples) {
      ssr += (x[key] - (my + slope * (x.since - mx))) ** 2;
      sst += (x[key] - my) ** 2;
    }
    return { bytesPerChar: +slope.toFixed(2), r2: +(1 - ssr / sst).toFixed(2) };
  };
  const clears = await page.evaluate(() => window.__clears);
  console.log(
    JSON.stringify(
      {
        samples: samples.length,
        clears,
        page: fit("page"),
        devtools: fit("devtools"),
      },
      null,
      1,
    ),
  );
  if (process.env.RAW)
    for (const s of samples)
      console.log(
        Math.round(s.since / 1e3),
        (s.page / 1e6).toFixed(1),
        (s.devtools / 1e6).toFixed(1),
      );
  await dtCtx.close();
} finally {
  await browser.close();
}
