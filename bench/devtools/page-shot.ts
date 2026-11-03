/**
 * Real-DevTools screenshots of any page's console frame.
 *
 *   bun bench/devtools/page-shot.ts --url=https://textjs.org/coffee [--out=<dir>] [--dpr=1,2] [--wait=4000] [--headed]
 *     [--mutate="padding-right:1px;"]   append CSS to every background span in DevTools before measuring
 *
 * Same two-window setup as `bidi-shot.ts`: the page runs in one window and the
 * bundled DevTools frontend inspects it with the Console panel open. For each
 * device pixel ratio it saves `page-<dpr>x.png` of the console and reports the
 * rows where console background shows through between the frame's spans
 * (hairlines), with the x positions in CSS px.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { chromium } from "playwright-core";

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, "").split("=");
  return [k as string, v.length ? v.join("=") : "true"];
}));
const url = args.get("url") ?? "https://textjs.org/coffee";
const outDir = args.get("out") ?? join(tmpdir(), "textjs-page-shots");
const dprs = (args.get("dpr") ?? "1,2").split(",").map(Number);
const wait = Number(args.get("wait") ?? 4000);
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

const port = await freePort();
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  headless: false,
  args: [...(args.has("headed") ? [] : ["--headless=new"]), `--remote-debugging-port=${port}`, "--remote-allow-origins=*", "--window-size=1300,900"],
});

try {
  const results = [];
  for (const dpr of dprs) {
    const page = await (await browser.newContext({ viewport: { width: 900, height: 500 } })).newPage();
    const runId = `shot${Date.now().toString(36)}`;
    const target_ = new URL(url);
    target_.hash = runId;
    await page.goto(target_.toString());
    const targets = (await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())) as Array<{ id: string; url: string; type: string }>;
    const target = targets.find((t) => t.type === "page" && t.url.includes(runId));
    if (!target) throw new Error("page target not found");

    const dt = await (await browser.newContext({ viewport: { width: 1200, height: 820 }, deviceScaleFactor: dpr })).newPage();
    await dt.goto(`http://127.0.0.1:${port}/devtools/inspector.html?ws=127.0.0.1:${port}/devtools/page/${target.id}&panel=console`);
    await dt.locator("#tab-console").click({ timeout: 15_000 });
    const screencast = dt.locator('button[aria-label="Toggle screencast"].toggled');
    if ((await screencast.count()) > 0) await screencast.click().catch(() => {});
    await dt.waitForSelector("#console-messages");
    await page.bringToFront();
    await page.waitForTimeout(wait);
    await dt.bringToFront();
    await dt.waitForTimeout(500);
    const mutate = args.get("mutate");
    if (mutate) {
      await dt.evaluate((css) => {
        const all: Element[] = [];
        const walk = (root: Document | ShadowRoot) => {
          for (const el of root.querySelectorAll("*")) {
            all.push(el);
            if (el.shadowRoot) walk(el.shadowRoot);
          }
        };
        walk(document);
        const msg = all.filter((e) => e.classList.contains("console-message-text")).pop();
        for (const s of msg?.querySelectorAll(":scope > span") ?? []) {
          const el = s as HTMLElement;
          if (el.style.backgroundColor) el.style.cssText += css;
        }
      }, mutate);
      await dt.waitForTimeout(300);
    }
    const file = join(outDir, `page-${dpr}x.png`);
    await dt.locator("#console-messages").screenshot({ path: file });
    const shot = await dt.screenshot();
    const res = await dt.evaluate(
      async ([b64]) => {
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
        if (msg === undefined) return { rows: 0, hairlinePx: NaN, hairlines: [] as Array<{ row: number; x: number[]; text: string }> };
        const bgOf = (el: Element) => getComputedStyle(el).backgroundColor;
        const rows = new Map<number, Array<{ r: DOMRect; t: string; bg: string }>>();
        for (const s of msg.querySelectorAll(":scope > span")) {
          for (const r of s.getClientRects()) {
            if (r.width === 0) continue;
            const k = Math.round(r.top);
            const list = rows.get(k) ?? [];
            list.push({ r, t: s.textContent ?? "", bg: bgOf(s) });
            rows.set(k, list);
          }
        }
        // Console background: the message's own pixels beside the frame.
        const mr = msg.getBoundingClientRect();
        const hairlines: Array<{ row: number; x: number[]; text: string }> = [];
        let hairlinePx = 0;
        let ri = 0;
        for (const [, rs] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
          rs.sort((a, b) => a.r.left - b.r.left);
          const first = rs[0]!.r;
          const last = rs[rs.length - 1]!.r;
          const y = Math.round(((first.top + first.bottom) / 2) * dpr);
          const bi = (y * img.width + Math.min(img.width - 2, Math.round(Math.max(last.right, mr.right) * dpr) + 24)) * 4;
          const xs: number[] = [];
          for (let x = Math.ceil(first.left * dpr) + 1; x < Math.floor(last.right * dpr) - 1; x++) {
            const i = (y * img.width + x) * 4;
            // Only between two spans that both paint a background (a gap inside a blank-bg span is the console colour by design).
            if (px[i] === px[bi] && px[i + 1] === px[bi + 1] && px[i + 2] === px[bi + 2]) {
              const cx = x / dpr;
              const inside = rs.find((s) => s.r.left <= cx && cx < s.r.right);
              if (inside && inside.bg === "rgba(0, 0, 0, 0)") continue;
              xs.push(+cx.toFixed(2));
            }
          }
          if (xs.length) {
            const near = rs
              .filter((s) => xs.some((x) => Math.abs(s.r.left - x) < 2 || Math.abs(s.r.right - x) < 2))
              .map((s) => `${JSON.stringify(s.t.slice(0, 12))}@${s.r.left.toFixed(3)}-${s.r.right.toFixed(3)}`);
            hairlines.push({ row: ri, x: xs, text: near.join(" | ") });
          }
          hairlinePx += xs.length;
          ri++;
        }
        return { rows: ri, hairlinePx, hairlines };
      },
      [shot.toString("base64")] as const,
    );
    results.push({ dpr, file, ...res });
    await page.context().close();
    await dt.context().close();
  }
  console.log(JSON.stringify({ url, browser: browser.version(), results }, null, 2));
} finally {
  await browser.close();
}
