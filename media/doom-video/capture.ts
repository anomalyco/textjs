// Films textjs.org/doom (a local production build) in Chrome for Testing with the real DevTools frontend, as
// media/learn does: the page and DevTools are separate pages of one browser, each recorded with a CDP screencast
// at full device resolution. The engine's sound calls and frame draws are logged from the page for the audio.
//
//   bun media/doom-video/capture.ts <a|b|c> [--until seconds]
//
// Writes out/capture/<cut>/: dt/*.jpg and page/*.jpg (+ frames.json with epoch timestamps), log.json, meta.json.
import { chromium, type CDPSession, type Page } from "playwright-core";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { CLIP, LAYOUTS, type Layout } from "./lib/layouts";
import { chromiumPath, OUT, serveSite } from "./lib/site";

const cut = process.argv[2] as keyof typeof LAYOUTS;
const layout: Layout | undefined = LAYOUTS[cut];
if (!layout) throw new Error("usage: capture.ts <a|b|c> [--until seconds]");
const untilArg = process.argv.indexOf("--until");
/** Game seconds to film, counted from Doom's first tic (the title screen). */
const UNTIL = untilArg > 0 ? Number(process.argv[untilArg + 1]) : CLIP.to + 0.6;
const BROWSER_CHROME = 88;
const dir = join(OUT, "capture", cut);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const port: number = await new Promise((r) => {
  const s = createServer();
  s.listen(0, "127.0.0.1", () => {
    const p = (s.address() as { port: number }).port;
    s.close(() => r(p));
  });
});
const site = serveSite();
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  headless: false,
  args: ["--headless=new", `--remote-debugging-port=${port}`, "--remote-allow-origins=*", "--hide-scrollbars", "--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required", `--force-device-scale-factor=${layout.dpr}`],
});

const pageSize = { width: layout.page.w, height: layout.page.h };
const sctx = await browser.newContext({ viewport: pageSize, deviceScaleFactor: layout.dpr, colorScheme: "dark" });
await sctx.addInitScript(
  ({ dock, dtW, dtH, chrome }) => {
    localStorage.setItem("textjs:browser-chrome", String(chrome));
    // DevTools is a separate page here; tell the page where it's docked, as the video shows it.
    const side = dock === "side";
    Object.defineProperty(window, "outerWidth", { get: () => window.innerWidth + (side ? dtW + 1 : 0), configurable: true });
    Object.defineProperty(window, "outerHeight", { get: () => window.innerHeight + chrome + (side ? 0 : dtH), configurable: true });

    // Text.js's hidden keyboard textarea and the site's "Console size" select have neither id nor name, which DevTools
    // flags as Issues in its toolbar. Name them so the toolbar stays clean.
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes) {
          const els = n instanceof Element ? [n, ...n.querySelectorAll("input,textarea,select")] : [];
          for (const el of els) if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && !el.id && !el.getAttribute("name")) el.setAttribute("name", "textjs-film");
        }
    }).observe(document, { childList: true, subtree: true });

    // Log the engine's sound calls and frame draws (epoch ms) by wrapping doom.wasm's imports. Nothing is printed.
    const log: unknown[][] = [];
    (window as unknown as { __doomLog: unknown[][] }).__doomLog = log;
    const T = (): number => performance.timeOrigin + performance.now();
    const instantiate = WebAssembly.instantiate;
    (WebAssembly as { instantiate: unknown }).instantiate = async function (src: BufferSource, imports?: Record<string, Record<string, (...a: number[]) => unknown>>) {
      if (!imports?.sound || !imports.ui) return instantiate.call(WebAssembly, src, imports as WebAssembly.Imports);
      const s = imports.sound;
      const ui = imports.ui;
      let mem: WebAssembly.Memory | null = null;
      let fw = 0;
      let fh = 0;
      const loading = imports.loading!;
      const wrapped = {
        ...imports,
        loading: {
          ...loading,
          onGameInit: (w: number, h: number) => {
            fw = w;
            fh = h;
            return loading.onGameInit!(w, h);
          },
        },
        sound: {
          ...s,
          startSound: (lump: number, p: number, n: number, ch: number, vol: number, sep: number) => {
            log.push([T(), "start", lump, ch, vol, sep]);
            return s.startSound!(lump, p, n, ch, vol, sep);
          },
          updateSound: (ch: number, vol: number, sep: number) => {
            log.push([T(), "update", ch, vol, sep]);
            return s.updateSound!(ch, vol, sep);
          },
          stopSound: (ch: number) => {
            log.push([T(), "stop", ch]);
            return s.stopSound!(ch);
          },
        },
        ui: {
          ...ui,
          drawFrame: (p: number) => {
            // A cheap signature of the frame: the mean of a sparse grid of pixels, per channel.
            let r = 0;
            let g = 0;
            let b = 0;
            if (mem && fw > 0) {
              const px = new Uint32Array(mem.buffer, p, fw * fh);
              for (let y = 0; y < 10; y++)
                for (let x = 0; x < 16; x++) {
                  const c = px[Math.floor(((y + 0.5) * fh) / 10) * fw + Math.floor(((x + 0.5) * fw) / 16)] as number;
                  r += (c >>> 16) & 0xff;
                  g += (c >>> 8) & 0xff;
                  b += c & 0xff;
                }
              r = Math.round(r / 160);
              g = Math.round(g / 160);
              b = Math.round(b / 160);
            }
            const out = ui.drawFrame!(p);
            log.push([T(), "draw", r, g, b]);
            return out;
          },
        },
      };
      const res = (await instantiate.call(WebAssembly, src, wrapped as unknown as WebAssembly.Imports)) as unknown as WebAssembly.WebAssemblyInstantiatedSource;
      const ex = res.instance.exports as Record<string, unknown>;
      mem = ex.memory as WebAssembly.Memory;
      const exports: Record<string, unknown> = { ...ex };
      const tick = ex.tickGame as () => void;
      exports.tickGame = () => {
        log.push([T(), "tick"]);
        return tick();
      };
      return { module: res.module, instance: { exports } };
    };
  },
  { dock: layout.dock, dtW: layout.dt.w, dtH: layout.dt.h, chrome: BROWSER_CHROME },
);

const page = await sctx.newPage();
const consoleTypes = new Map<string, number>();
page.on("console", (m) => consoleTypes.set(m.type(), (consoleTypes.get(m.type()) ?? 0) + 1));
page.on("pageerror", (e) => console.error("page error:", e.message));
const scdp = await sctx.newCDPSession(page);
await scdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
const run = Math.random().toString(36).slice(2);
await page.goto(`${site.origin}/doom?__film=${run}`, { waitUntil: "load" });
const targets = (await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())) as Array<{ id: string; url: string; type: string }>;
const target = targets.find((t) => t.type === "page" && t.url.includes(run));
if (!target) throw new Error("page target not found");

const dctx = await browser.newContext({ viewport: { width: layout.dt.w, height: layout.dt.h }, deviceScaleFactor: layout.dpr, colorScheme: "dark" });
await dctx.addInitScript(() => {
  try {
    localStorage.setItem("chrome-theme-colors", "false");
    localStorage.setItem("uiTheme", '"dark"');
    localStorage.setItem("screencastEnabled", "false");
  } catch {}
});
const dt = await dctx.newPage();
await dt.goto(`http://127.0.0.1:${port}/devtools/inspector.html?ws=127.0.0.1:${port}/devtools/page/${target.id}&panel=console`);
await dt.locator("#tab-console").click({ timeout: 15_000 });
const cast = dt.locator('button[aria-label="Toggle screencast"].toggled');
if ((await cast.count()) > 0) await cast.click().catch(() => {});
// Park the pointer on the empty console below the frame, so no tab or button shows a hover state.
await dt.mouse.move(layout.dt.w - 6, layout.dt.h - 6);
await dt.waitForTimeout(800);
// Reload so the app's first frame (and its console.clear) lands in the attached console.
consoleTypes.clear();
await page.reload({ waitUntil: "load" });
await dt.waitForFunction(
  () => {
    const find = (root: Document | ShadowRoot): boolean => {
      if (root.querySelector(".console-message-text")) return true;
      for (const el of root.querySelectorAll("*")) if (el.shadowRoot && find(el.shadowRoot)) return true;
      return false;
    };
    return find(document);
  },
  undefined,
  { timeout: 20_000 },
);
await page.waitForTimeout(1000);
// A click on the page starts Doom and its audio, as a visitor's first click does. Pick a spot that isn't a link or button.
const spot = await page.evaluate(() => {
  const interactive = 'a[href],button,input,textarea,select,label,summary,[contenteditable],[role=button],[tabindex]:not([tabindex="-1"]),[data-textjs-interactive]';
  for (let y = innerHeight - 12; y > 0; y -= 16)
    for (let x = innerWidth - 12; x > 0; x -= 16) {
      const el = document.elementFromPoint(x, y);
      if (el && el.closest(interactive) === null) return { x, y };
    }
  return null;
});
if (!spot) throw new Error("no blank spot to click on the page");
await page.mouse.click(spot.x, spot.y);

const dcdp = await dctx.newCDPSession(dt);
const streams = [record(dt, dcdp, join(dir, "dt"), layout.dt, layout.dpr)];
if (layout.filmPage) streams.push(record(page, scdp, join(dir, "page"), layout.page, layout.dpr));
await Promise.all(streams.map((s) => s.ready));

const firstTick = (): Promise<number | null> => page.evaluate(() => ((window as unknown as { __doomLog: unknown[][] }).__doomLog.find((e) => e[1] === "tick")?.[0] as number) ?? null);
let t0: number | null = null;
for (let i = 0; i < 300 && t0 === null; i++) {
  t0 = await firstTick();
  if (t0 === null) await Bun.sleep(100);
}
if (t0 === null) throw new Error("Doom never started");
console.error(`doom started; filming ${UNTIL}s`);
await Bun.sleep(Math.max(0, t0 + UNTIL * 1000 + 500 - Date.now()));
for (const s of streams) await s.stop();

const log = await page.evaluate(() => (window as unknown as { __doomLog: unknown[][] }).__doomLog);
const hint = await dt.evaluate(() => {
  const texts: string[] = [];
  const walk = (root: Document | ShadowRoot): void => {
    for (const el of root.querySelectorAll(".console-message-text")) texts.push(el.textContent ?? "");
    for (const el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot);
  };
  walk(document);
  return { messages: texts.length, focusHint: texts.some((t) => /click the page/i.test(t)) };
});
writeFileSync(join(dir, "log.json"), JSON.stringify({ t0, events: log }));
writeFileSync(
  join(dir, "meta.json"),
  JSON.stringify({ cut, layout, t0, until: UNTIL, consoleCalls: Object.fromEntries(consoleTypes), consoleNow: hint, streams: streams.map((s) => ({ name: s.name, frames: s.frames.length })) }, null, 2),
);
console.log(JSON.stringify({ cut, consoleCalls: Object.fromEntries(consoleTypes), consoleNow: hint, streams: streams.map((s) => [s.name, s.frames.length]) }));
await browser.close();
site.stop();

/** Records a page with a CDP screencast at full device resolution; frames.json keeps each frame's epoch time (ms). */
function record(p: Page, cdp: CDPSession, out: string, css: { w: number; h: number }, dpr: number) {
  mkdirSync(out, { recursive: true });
  const frames: Array<{ t: number; file: string }> = [];
  const writes: Promise<number>[] = [];
  const name = out.split("/").pop() as string;
  cdp.on("Page.screencastFrame", (f: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
    void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    const file = `${String(frames.length).padStart(5, "0")}.jpg`;
    frames.push({ t: (f.metadata.timestamp ?? Date.now() / 1000) * 1000, file });
    writes.push(Bun.write(join(out, file), Buffer.from(f.data, "base64")));
  });
  const ready = cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: css.w * dpr, maxHeight: css.h * dpr, everyNthFrame: 1 });
  void p;
  return {
    name,
    frames,
    ready,
    async stop() {
      await cdp.send("Page.stopScreencast").catch(() => {});
      await Promise.all(writes);
      writeFileSync(join(out, "frames.json"), JSON.stringify(frames));
    },
  };
}
