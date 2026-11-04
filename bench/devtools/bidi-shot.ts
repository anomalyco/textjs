/**
 * Real-DevTools screenshots of bidirectional text.
 *
 *   bun bench/devtools/bidi-shot.ts [--out=<dir>] [--headed] [--dump]
 *
 * Same two-window setup as `run.ts`: the page renders `bidi-client.ts` and the
 * bundled DevTools frontend inspects it with the Console panel open. Writes
 * `bidi-both.png` (unpinned vs shipping frames) and `bidi-pinned.png`, then
 * measures, in the DevTools DOM, where the frame's right border lands on every
 * row so cell-grid drift from RTL glyph advances is reported in pixels.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { chromium } from "playwright-core";

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k as string, v ?? "true"];
}));
const outDir = args.get("out") ?? join(tmpdir(), "textjs-bidi-shots");
mkdirSync(outDir, { recursive: true });

function chromiumPath(): string {
  const cache = join(homedir(), "Library", "Caches", "ms-playwright");
  for (const dir of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)))) {
    for (const sub of ["chrome-mac-arm64", "chrome-mac"]) {
      const p = join(cache, dir, sub, "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing");
      if (existsSync(p)) return p;
    }
  }
  const sys = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(sys)) return sys;
  throw new Error("No Chromium found (install with `bunx playwright install chromium`)");
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

const build = await Bun.build({ entrypoints: [fileURLToPath(new URL("./bidi-client.ts", import.meta.url))], target: "browser", format: "esm" });
if (!build.success || !build.outputs[0]) throw new Error(build.logs.map((l) => l.message).join("\n"));
const bundle = await build.outputs[0].text();
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(req) {
    if (new URL(req.url).pathname === "/bundle.js") return new Response(bundle, { headers: { "content-type": "application/javascript; charset=utf-8" } });
    if (new URL(req.url).pathname === "/yoga.wasm") return new Response(Bun.file(fileURLToPath(new URL("../../packages/core/yoga.wasm", import.meta.url))), { headers: { "content-type": "application/wasm" } });
    return new Response(`<!doctype html><meta charset="utf-8"><title>bidi</title><div id="status">loading</div><script type="module" src="/bundle.js"></script>`, {
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

try {
  const page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
  const runId = Date.now().toString(36);
  await page.goto(`http://127.0.0.1:${server.port}/?run=${runId}`);
  await page.waitForFunction(() => window.__bidiReady === true);
  const targets = (await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())) as Array<{ id: string; url: string; type: string }>;
  const target = targets.find((t) => t.type === "page" && t.url.includes(runId));
  if (!target) throw new Error("page target not found");

  const dt = await (await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 2 })).newPage();
  await dt.goto(`http://127.0.0.1:${port}/devtools/inspector.html?ws=127.0.0.1:${port}/devtools/page/${target.id}&panel=console`);
  await dt.locator("#tab-console").click({ timeout: 15_000 });
  const screencast = dt.locator('button[aria-label="Toggle screencast"].toggled');
  if ((await screencast.count()) > 0) await screencast.click().catch(() => {});
  await dt.waitForSelector("#console-messages");

  const fonts = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D;
    c.font = '12px "SF Mono",Menlo,"Cascadia Mono",Consolas,monospace';
    const w = (s: string) => c.measureText(s).width / [...s].length;
    return { latin: w("MMMMMMMMMM"), hebrew: w("שלוםעולםאב"), arabicForms: w("\ufee3\ufeae\ufea3\ufe92\ufe8e\ufe91\ufe8e\ufedf\ufecc\ufe8e"), box: w("──────────") };
  });

  /**
   * Per frame (console message): the right border's x on every row relative to
   * the frame's left corner, and device
   * pixels (console background colour) between a row's first and last span, i.e. hairline gaps.
   */
  const measure = async (label: string) => {
    const shot = await dt.screenshot();
    return dt.evaluate(
      async ([b64, label]) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const canvas = new OffscreenCanvas(img.width, img.height);
        const g = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
        g.drawImage(img, 0, 0);
        const px = g.getImageData(0, 0, img.width, img.height).data;
        const dpr = img.width / window.innerWidth;
        const all: Element[] = [];
        const walk = (root: Document | ShadowRoot) => {
          for (const el of root.querySelectorAll("*")) {
            all.push(el);
            if (el.shadowRoot) walk(el.shadowRoot);
          }
        };
        walk(document);
        const msg = all.filter((e) => e.classList.contains("console-message-text")).pop();
        if (msg === undefined) return { label, rows: 0, drift: NaN, hairlinePx: NaN, hairlineRows: [] as number[] };
        const rows = new Map<number, DOMRect[]>();
        for (const s of msg.querySelectorAll(":scope > span")) {
          const r = s.getBoundingClientRect();
          const k = Math.round(r.top);
          const list = rows.get(k) ?? [];
          list.push(r);
          rows.set(k, list);
        }
        const rights: number[] = [];
        const hairlineRows: number[] = [];
        let hairlinePx = 0;
        let left = Infinity;
        let ri = 0;
        for (const [, rs] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
          const first = rs[0] as DOMRect;
          const last = rs[rs.length - 1] as DOMRect;
          left = Math.min(left, first.left);
          rights.push(last.right);
          const y = Math.round(((first.top + first.bottom) / 2) * dpr);
          // Console background, sampled just right of the frame on the same row.
          const bi = (y * img.width + Math.round(last.right * dpr) + 24) * 4;
          let n = 0;
          for (let x = Math.ceil(first.left * dpr) + 1; x < Math.floor(last.right * dpr) - 1; x++) {
            const i = (y * img.width + x) * 4;
            if (px[i] === px[bi] && px[i + 1] === px[bi + 1] && px[i + 2] === px[bi + 2]) n++;
          }
          if (n > 0) hairlineRows.push(ri);
          hairlinePx += n;
          ri++;
        }
        // Each row's right edge relative to the border rows (row 0 is the top border).
        const ref = rights[0] ?? 0;
        const rowOffsets = rights.map((r) => +(r - ref).toFixed(3));
        return { label, rows: rights.length, drift: +(Math.max(...rights) - Math.min(...rights)).toFixed(3), hairlinePx, hairlineRows, rowOffsets };
      },
      [shot.toString("base64"), label] as const,
    );
  };

  const results = [];
  for (const mode of ["unpinned", "nofit", "latin", "pinned"] as const) {
    await page.evaluate((m) => window.__bidiEmit?.(m), mode);
    await dt.waitForTimeout(600);
    await dt.locator("#console-messages").screenshot({ path: join(outDir, `bidi-${mode}.png`) });
    results.push(await measure(mode));
  }
  await page.evaluate(() => window.__bidiEmit?.("both"));
  await dt.waitForTimeout(600);
  await dt.locator("#console-messages").screenshot({ path: join(outDir, "bidi-both.png") });

  if (args.has("dump")) {
    const html = await dt.evaluate(() => {
      const all: Element[] = [];
      const walk = (root: Document | ShadowRoot) => {
        for (const el of root.querySelectorAll("*")) {
          all.push(el);
          if (el.shadowRoot) walk(el.shadowRoot);
        }
      };
      walk(document);
      const msg = all.filter((e) => e.classList.contains("console-message-text")).pop();
      const spans = [...(msg?.querySelectorAll("span") ?? [])].filter((s) => /replied|42|عدة/.test(s.textContent ?? "") || /replied/.test(s.nextElementSibling?.textContent ?? ""));
      const geo = spans.map((s) => {
        const r = s.getBoundingClientRect();
        const cs = getComputedStyle(s);
        return { t: (s.textContent ?? "").slice(0, 12), left: r.left, right: r.right, w: r.width, ws: cs.whiteSpace, uni: cs.unicodeBidi, dir: cs.direction, ff: cs.fontFamily };
      });
      const p = msg?.parentElement ? getComputedStyle(msg.parentElement) : null;
      return JSON.stringify({ geo, parentWs: p?.whiteSpace, msgWs: msg ? getComputedStyle(msg).whiteSpace : "" }, null, 1) + "\n" + (msg?.outerHTML ?? "");
    });
    await Bun.write(join(outDir, "message.html"), html);
  }
  console.log(JSON.stringify({ outDir, browser: browser.version(), fontAdvancePx: fonts, frames: results }, null, 2));
} finally {
  await browser.close();
  server.stop(true);
}
