/**
 * Real-DevTools check that chart glyphs keep frames on the cell grid when the
 * console font lacks them.
 *
 *   bun bench/devtools/glyph-shot.ts [--out=<dir>] [--browser=chrome|edge] [--chrome=<path>] [--headed] [--check]
 *
 * Same two-window setup as `bidi-shot.ts`. Logs `glyph-client.ts`'s frame of
 * eighth blocks, quadrants, braille, ▶ and ✓ in the default console font stack
 * and in Consolas alone (Windows 10 has no Cascadia Mono), each with and without
 * stand-ins, and reports how far every row's right edge lands from the top
 * border's (drift), which fonts DevTools drew each row with, and which glyphs
 * every candidate font draws off the cell. `--check` exits 1 when a frame with
 * stand-ins drifts by more than 1px.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { chromium } from "playwright-core";

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, "").split("=");
  return [k as string, v.length ? v.join("=") : "true"];
}));
const outDir = args.get("out") ?? join(tmpdir(), "textjs-glyph-shots");
mkdirSync(outDir, { recursive: true });

const DEFAULT_STACK = '"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace';
const CONSOLAS = "Consolas,monospace";
const FAMILIES = [DEFAULT_STACK, CONSOLAS, '"Cascadia Mono"', '"Lucida Console"', '"Courier New"', '"MS Gothic"', '"Segoe UI Symbol"', "Menlo"];

function chromiumPath(): string {
  const given = args.get("chrome");
  if (given) return given;
  const windows =
    args.get("browser") === "edge"
      ? ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"]
      : ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"];
  for (const p of windows) if (existsSync(p)) return p;
  const cache = join(homedir(), "Library", "Caches", "ms-playwright");
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)))) {
      for (const sub of ["chrome-mac-arm64", "chrome-mac"]) {
        const p = join(cache, dir, sub, "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing");
        if (existsSync(p)) return p;
      }
    }
  }
  const sys = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(sys)) return sys;
  throw new Error("No Chrome found (pass --chrome=<path>)");
}

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => resolve(port));
    });
  });
}

const build = await Bun.build({ entrypoints: [fileURLToPath(new URL("./glyph-client.ts", import.meta.url))], target: "browser", format: "esm" });
if (!build.success || !build.outputs[0]) throw new Error(build.logs.map((l) => l.message).join("\n"));
const bundle = await build.outputs[0].text();
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(req) {
    if (new URL(req.url).pathname === "/bundle.js") return new Response(bundle, { headers: { "content-type": "application/javascript; charset=utf-8" } });
    return new Response(`<!doctype html><meta charset="utf-8"><title>glyphs</title><div id="status">loading</div><script type="module" src="/bundle.js"></script>`, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
});

const port = await freePort();
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  headless: false,
  args: [...(args.has("headed") ? [] : ["--headless=new"]), `--remote-debugging-port=${port}`, "--remote-allow-origins=*", "--window-size=1100,800"],
});

let failed = false;
try {
  const page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
  const runId = Date.now().toString(36);
  await page.goto(`http://127.0.0.1:${server.port}/?run=${runId}`);
  await page.waitForFunction(() => window.__glyphReady === true);
  const targets = (await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())) as Array<{ id: string; url: string; type: string }>;
  const target = targets.find((t) => t.type === "page" && t.url.includes(runId));
  if (!target) throw new Error("page target not found");

  const dt = await (await browser.newContext({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: 1 })).newPage();
  await dt.goto(`http://127.0.0.1:${port}/devtools/inspector.html?ws=127.0.0.1:${port}/devtools/page/${target.id}&panel=console`);
  await dt.locator("#tab-console").click({ timeout: 15_000 });
  const screencast = dt.locator('button[aria-label="Toggle screencast"].toggled');
  if ((await screencast.count()) > 0) await screencast.click().catch(() => {});
  await dt.waitForSelector("#console-messages");
  const cdp = await dt.context().newCDPSession(dt);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");

  const widths = await page.evaluate((f) => window.__glyphWidths?.(f), FAMILIES);

  /** Each row's right edge relative to the top border's, and the fonts DevTools drew it with. */
  const measure = async () => {
    const rows = await dt.evaluate(() => {
      const all: Element[] = [];
      const walk = (root: Document | ShadowRoot) => {
        for (const el of root.querySelectorAll("*")) {
          all.push(el);
          if (el.shadowRoot) walk(el.shadowRoot);
        }
      };
      walk(document);
      const msg = all.filter((e) => e.classList.contains("console-message-text")).pop();
      if (msg === undefined) return [];
      const byTop = new Map<number, { right: number; text: string; spans: number[] }>();
      const spans = [...msg.querySelectorAll(":scope > span")];
      (window as { __glyphSpans?: Element[] }).__glyphSpans = spans;
      spans.forEach((s, i) => {
        for (const r of s.getClientRects()) {
          if (r.width === 0) continue;
          const k = Math.round(r.top);
          const row = byTop.get(k) ?? { right: 0, text: "", spans: [] };
          row.right = Math.max(row.right, r.right);
          row.spans.push(i);
          byTop.set(k, row);
        }
      });
      const text = (msg as HTMLElement).innerText.split("\n");
      return [...byTop.entries()].sort((a, b) => a[0] - b[0]).map(([, r], i) => ({ right: r.right, text: text[i] ?? "", spans: r.spans }));
    });
    const ref = rows[0]?.right ?? 0;
    await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
    const out = [];
    for (const r of rows) {
      const fonts = new Map<string, number>();
      for (const i of r.spans) {
        const { result } = await cdp.send("Runtime.evaluate", { expression: `window.__glyphSpans[${i}]` });
        if (!result.objectId) continue;
        const { nodeId } = await cdp.send("DOM.requestNode", { objectId: result.objectId });
        const { fonts: f } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
        for (const x of f) fonts.set(x.familyName, (fonts.get(x.familyName) ?? 0) + x.glyphCount);
      }
      out.push({ drift: +(r.right - ref).toFixed(2), text: r.text.trim().slice(0, 48), fonts: Object.fromEntries(fonts) });
    }
    const drift = Math.max(...out.map((r) => Math.abs(r.drift)));
    return { drift: +drift.toFixed(2), rows: out };
  };

  const frames: Record<string, unknown> = {};
  for (const [name, family, standIns] of [
    ["default-stand-ins", DEFAULT_STACK, true],
    ["consolas-raw", CONSOLAS, false],
    ["consolas-stand-ins", CONSOLAS, true],
  ] as const) {
    await page.evaluate(([f, s]) => window.__glyphEmit?.(f, s), [family, standIns] as const);
    await dt.waitForTimeout(800);
    await dt.locator("#console-messages").screenshot({ path: join(outDir, `glyphs-${name}.png`) });
    const m = await measure();
    frames[name] = m;
    console.log(`${name}: drift ${m.drift}px`);
    if (args.has("check") && standIns && m.drift > 1) failed = true;
  }
  const report = { browser: browser.version(), platform: process.platform, fontWidths: widths, frames };
  writeFileSync(join(outDir, "glyphs.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  server.stop(true);
}
if (failed) {
  console.error("A frame with stand-ins drifted by more than 1px");
  process.exit(1);
}
