// Layout-shift audit: loads every route cold (cache disabled, throttled network + CPU), sums CLS,
// lists the shifting nodes, records a filmstrip of the first ~1.5s, then measures client navigations.
//
//   bun run build && bun run preview -- --port 4173 --strictPort
//   BASE=http://localhost:4173 OUT=/tmp/cls node scripts/cls.mjs
//
// Env: BASE, OUT (screenshots), WIDTH/HEIGHT (viewport), THROTTLE=0 to disable throttling, ROUTES=/a,/b (empty: navigations only), FILMSTRIP=0.
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const out = process.env.OUT ?? "cls-out";
const width = Number(process.env.WIDTH ?? 1440);
const height = Number(process.env.HEIGHT ?? 900);
const throttle = process.env.THROTTLE !== "0";
const filmstrip = process.env.FILMSTRIP !== "0";
const docs = readdirSync(fileURLToPath(new URL("../src/docs/content/", import.meta.url))).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)).sort();
const routes = process.env.ROUTES !== undefined ? process.env.ROUTES.split(",").filter(Boolean) : ["/", "/docs", ...docs.map((d) => `/docs/${d}`), "/playground", "/opencode", "/does-not-exist"];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const port = new URL(base).port;

const observe = () => {
  window.__cls = { value: 0, entries: [] };
  window.__clsRects = true;
  const describe = (n) => {
    if (!n || n.nodeType !== 1) return n ? n.nodeName : "?";
    const el = n;
    const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls}`;
  };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__cls.entries.push({ t: Math.round(e.startTime), v: e.value, input: e.hadRecentInput, src: (e.sources ?? []).map((s) => `${describe(s.node)}${window.__clsRects ? ` [${s.previousRect.y},${s.previousRect.height}→${s.currentRect.y},${s.currentRect.height} parent ${describe(s.node?.parentElement)}]` : ""}`) });
      if (!e.hadRecentInput) window.__cls.value += e.value;
    }
  }).observe({ type: "layout-shift", buffered: true });
};

async function newPage() {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port, (r) => r.abort());
  await page.addInitScript(observe);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  if (throttle) {
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  return { context, page, cdp };
}

const slug = (r) => (r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "_"));
const results = [];

for (const route of routes) {
  const { context, page, cdp } = await newPage();
  const frames = [];
  if (filmstrip) {
    await cdp.send("Page.enable");
    cdp.on("Page.screencastFrame", async (f) => {
      frames.push(f);
      await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => undefined);
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 60, maxWidth: Math.round(width / 2), maxHeight: Math.round(height / 2), everyNthFrame: 1 });
  }
  const t0 = Date.now();
  await page.goto(base + route, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(2500);
  if (filmstrip) await cdp.send("Page.stopScreencast").catch(() => undefined);
  const cls = await page.evaluate(() => window.__cls);
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`).join(", "));
  results.push({ route, cls: cls.value, entries: cls.entries.filter((e) => !e.input), fonts });
  if (filmstrip && frames.length > 0) {
    const dir = join(out, slug(route));
    mkdirSync(dir, { recursive: true });
    const start = frames[0].metadata.timestamp;
    for (const f of frames) {
      const ms = Math.round((f.metadata.timestamp - start) * 1000);
      if (ms > 4000) break;
      writeFileSync(join(dir, `${String(ms).padStart(5, "0")}ms.jpg`), Buffer.from(f.data, "base64"));
    }
  }
  console.log(`${route.padEnd(36)} CLS ${cls.value.toFixed(4)}  (${Date.now() - t0}ms)`);
  for (const e of cls.entries.filter((x) => !x.input)) console.log(`    @${e.t}ms +${e.v.toFixed(4)}  ${e.src.join(", ")}`);
  await context.close();
}

// Client-side navigations (synthetic clicks, so they are not excluded as "recent input").
{
  const { context, page } = await newPage();
  await page.goto(`${base}/`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(1500);
  const hops = ["/docs", "/docs/routing", "/docs/styling", "/playground", "/opencode", "/docs", "/docs/turbolog-engine", "/", "/playground", "/"];
  for (const href of hops) {
    await page.evaluate(() => {
      window.__cls.value = 0;
      window.__cls.entries = [];
    });
    const ok = await page.evaluate((h) => {
      const a = document.querySelector(`a[href="${h}"]`);
      if (!a) return false;
      a.click();
      return true;
    }, href);
    await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => window.__cls);
    const h = await page.evaluate(() => [...document.querySelectorAll(".mirror-scale")].map((m) => m.style.height).join(" "));
    console.log(`nav → ${href.padEnd(30)} CLS ${ok ? cls.value.toFixed(4) : "(no link)"}${h ? `  mirror ${h}` : ""}`);
    for (const e of cls.entries) console.log(`    @${e.t}ms +${e.v.toFixed(4)}  ${e.src.join(", ")}`);
    results.push({ route: `nav→${href}`, cls: cls.value, entries: cls.entries });
  }
  await context.close();
}

writeFileSync(join(out, "results.json"), JSON.stringify(results, null, 2));
await browser.close();
