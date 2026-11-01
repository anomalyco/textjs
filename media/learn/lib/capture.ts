/**
 * Films a live scene: the app page and the real DevTools frontend (`/devtools/inspector.html?ws=…`, opened as a
 * regular page attached to the app's target, as in bench/devtools), each recorded with a CDP screencast while
 * scripted actions (keys, clicks, file writes) fire at the narration's cue times. The stage composites the footage
 * into its own frames, so this is the only real-time step.
 */
import { chromium, type Browser, type CDPSession, type Page } from "playwright-core";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromiumPath } from "./env";
import { freePort, server, type AppServer } from "./servers";
import type { Box, CaptureData, CaptureStream } from "../stage/types";

export interface LiveAction {
  /** Cue reference (`"enter1"`, `"enter1+0.4"`) or seconds. */
  at: string | number;
  /** Playwright key name, e.g. `"Enter"`, `"r"`, `"ArrowDown"`. */
  key?: string;
  /** CSS selector on the app page to click. */
  click?: string;
  /** Write a project file (starter only): Fast Refresh picks it up. */
  write?: { file: string; content: string };
  /** Type an expression into the DevTools console prompt and run it (Enter). */
  prompt?: string;
  /** CSS selector in DevTools to click (the last match), e.g. a logged object to expand it. */
  dtClick?: string;
}

export interface Measure {
  in: "dt" | "site";
  /** Text inside the latest console frame (dt) or the page (site). */
  text?: string;
  /** A CSS selector on the app page. */
  selector?: string;
  /** The whole latest console frame. */
  frame?: boolean;
  /** When to measure (cue reference); default: right before the scene ends. */
  at?: string | number;
}

export interface LiveSpec {
  server: "site" | "starter";
  path: string;
  /** The page's CSS width, and the heights of the page and the docked DevTools below it. */
  width?: number;
  pageHeight?: number;
  devtoolsHeight?: number;
  /** localStorage for the app page. */
  storage?: Record<string, string>;
  /** Scroll this selector to the top of the page region before filming… */
  scroll?: string;
  /** …leaving this much room above it (e.g. for a sticky header; default 24). */
  scrollMargin?: number;
  /** Files to write before filming (starter only). */
  files?: Record<string, string>;
  /** Also take a still of the page before DevTools opens (full window height, undocked). */
  before?: boolean;
  actions?: LiveAction[];
  measure?: Record<string, Measure>;
}

const DT_DPR = 3;
const SITE_DPR = 2;
const BROWSER_CHROME = 88;

export async function withBrowser<T>(fn: (b: Browser, port: number) => Promise<T>): Promise<T> {
  const port = await freePort();
  const browser = await chromium.launch({
    executablePath: chromiumPath(),
    headless: false,
    args: ["--headless=new", `--remote-debugging-port=${port}`, "--remote-allow-origins=*", "--hide-scrollbars", "--force-color-profile=srgb"],
  });
  try {
    return await fn(browser, port);
  } finally {
    await browser.close();
  }
}

/** Box of `text` in the latest console frame, or of the whole frame; deep through DevTools' shadow roots. */
function measureInDevTools(page: Page, m: Measure): Promise<Box | null> {
  return page.evaluate(({ text, frame }) => {
    const all: Element[] = [];
    const walk = (root: Document | ShadowRoot): void => {
      for (const el of root.querySelectorAll("*")) {
        all.push(el);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(document);
    const msg = all.filter((e) => e.classList.contains("console-message-text")).pop();
    if (!msg) return null;
    const nodes: Text[] = [];
    const tw = document.createTreeWalker(msg, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) nodes.push(n as Text);
    const range = document.createRange();
    const union = (rects: DOMRect[]): { x: number; y: number; w: number; h: number } | null => {
      const rs = rects.filter((r) => r.width > 1 && r.height > 1);
      if (!rs.length) return null;
      const x = Math.min(...rs.map((r) => r.left));
      const y = Math.min(...rs.map((r) => r.top));
      return { x, y, w: Math.max(...rs.map((r) => r.right)) - x, h: Math.max(...rs.map((r) => r.bottom)) - y };
    };
    if (frame || !text) {
      range.setStart(nodes[0]!, 0);
      const last = nodes[nodes.length - 1]!;
      range.setEnd(last, last.length);
      return union([...range.getClientRects()]);
    }
    let joined = "";
    const starts: number[] = [];
    for (const n of nodes) {
      starts.push(joined.length);
      joined += n.data;
    }
    // Cells keep their spaces as no-break spaces; match them as plain spaces.
    joined = joined.replace(/\u00a0/g, " ");
    const at = joined.lastIndexOf(text);
    if (at < 0) return null;
    const locate = (i: number): [Text, number] => {
      let k = starts.length - 1;
      while (k > 0 && starts[k]! > i) k--;
      return [nodes[k]!, i - starts[k]!];
    };
    const [sn, so] = locate(at);
    const [en, eo] = locate(at + text.length - 1);
    range.setStart(sn, so);
    range.setEnd(en, eo + 1);
    return union([...range.getClientRects()]);
  }, { text: m.text, frame: m.frame });
}

function measureInPage(page: Page, m: Measure): Promise<Box | null> {
  return page.evaluate(({ selector, text }) => {
    let el: Element | null = selector ? document.querySelector(selector) : null;
    if (!el && text) {
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) if (n.textContent?.includes(text)) { el = n.parentElement; break; }
    }
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, { selector: m.selector, text: m.text });
}

async function screencast(page: Page, session: CDPSession, dir: string, url: string, css: { w: number; h: number }, dpr: number): Promise<{ stream: CaptureStream; stop: () => Promise<void>; setZero: (t0: number) => void; poke: () => void }> {
  mkdirSync(dir, { recursive: true });
  const raw: Array<{ time: number; file: string }> = [];
  let t0 = 0;
  // Screencast frames arrive at 1× (device-independent pixels), too soft for close-ups. Each one only signals that
  // the page changed: a full-resolution screenshot (at the page's device scale) is taken for it, coalescing
  // changes that arrive while one is being taken.
  let busy = false;
  let last = "";
  let pending: number | null = null;
  let pumping: Promise<void> = Promise.resolve();
  const pump = async (): Promise<void> => {
    while (pending !== null) {
      const time = pending;
      pending = null;
      // CDP screenshots come back at 1× unless the clip asks for the device scale; clips are in page coordinates.
      const vp = ((await session.send("Page.getLayoutMetrics").catch(() => null)) as { cssVisualViewport?: { pageX: number; pageY: number } } | null)?.cssVisualViewport;
      const shot = (await session
        .send("Page.captureScreenshot", { format: "jpeg", quality: 93, optimizeForSpeed: true, clip: { x: vp?.pageX ?? 0, y: vp?.pageY ?? 0, width: css.w, height: css.h, scale: dpr } })
        .catch(() => null)) as { data: string } | null;
      if (!shot) continue;
      // Taking a screenshot can itself produce a screencast frame; keep only real changes.
      if (shot.data === last) continue;
      last = shot.data;
      const file = `${String(raw.length).padStart(5, "0")}.jpg`;
      raw.push({ time, file });
      writeFileSync(join(dir, file), Buffer.from(shot.data, "base64"));
    }
    busy = false;
  };
  const kick = (time: number): void => {
    if (pending === null) pending = time;
    if (!busy) {
      busy = true;
      pumping = pump();
    }
  };
  session.on("Page.screencastFrame", (f) => {
    void session.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    kick(f.metadata.timestamp ?? Date.now() / 1000);
  });
  await session.send("Page.startScreencast", { format: "jpeg", quality: 30, maxWidth: css.w, maxHeight: css.h, everyNthFrame: 1 });
  const stream: CaptureStream = { css, dpr, frames: [] };
  return {
    stream,
    setZero: (t) => (t0 = t),
    // A screenshot can land just before a paint that then raises no further screencast frame; after an action,
    // look again a few times (unchanged screenshots are dropped).
    poke: () => {
      for (const ms of [120, 300, 600, 1000]) setTimeout(() => kick(Date.now() / 1000), ms);
    },
    async stop() {
      await session.send("Page.stopScreencast").catch(() => {});
      await pumping;
      // Frames before the scene starts collapse onto t = 0 (only the latest one matters).
      let firstIdx = 0;
      for (let i = 0; i < raw.length; i++) if (raw[i]!.time <= t0) firstIdx = i;
      stream.frames = raw.slice(firstIdx).map((r, i) => ({ t: i === 0 ? 0 : Math.max(0, r.time - t0), src: `${url}/${r.file}` }));
      void page;
    },
  };
}

/**
 * Films one live scene. `cue` resolves cue references to scene seconds; `duration` is the scene length.
 * Writes frames to `dir` (served at `url`) and returns what the stage needs.
 */
export async function captureLive(spec: LiveSpec, opts: { dir: string; url: string; duration: number; cue: (ref: string | number) => number; log?: (s: string) => void }): Promise<CaptureData> {
  const app: AppServer = await server(spec.server);
  const width = spec.width ?? 1280;
  const pageH = spec.pageHeight ?? 360;
  const dtH = spec.devtoolsHeight ?? 520;
  rmSync(opts.dir, { recursive: true, force: true });
  mkdirSync(opts.dir, { recursive: true });
  if (spec.files) for (const [f, c] of Object.entries(spec.files)) app.write(f, c);
  if (spec.files) await Bun.sleep(800);

  return withBrowser(async (browser, port) => {
    const sctx = await browser.newContext({ viewport: { width, height: pageH }, deviceScaleFactor: SITE_DPR, colorScheme: "dark" });
    await sctx.addInitScript(
      ({ dtH, chrome, storage }) => {
        for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
        localStorage.setItem("textjs:browser-chrome", String(chrome));
        // DevTools is a separate page here; tell the app it's docked below, as the video shows it.
        const w = window as unknown as { __dock: number };
        w.__dock = dtH;
        Object.defineProperty(window, "outerHeight", { get: () => window.innerHeight + chrome + w.__dock, configurable: true });
        Object.defineProperty(window, "outerWidth", { get: () => window.innerWidth, configurable: true });
      },
      { dtH, chrome: BROWSER_CHROME, storage: spec.storage ?? {} },
    );
    const site = await sctx.newPage();
    const scdp = await sctx.newCDPSession(site);
    await scdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    const run = Math.random().toString(36).slice(2);
    const sep = spec.path.includes("?") ? "&" : "?";
    const pageUrl = `${app.origin}${spec.path}${sep}__film=${run}`;

    let before: string | undefined;
    if (spec.before) {
      await site.setViewportSize({ width, height: pageH + dtH });
      await site.addInitScript(() => ((window as unknown as { __dock: number }).__dock = 0));
      await site.goto(pageUrl, { waitUntil: "load" });
      await site.waitForTimeout(2500);
      await site.screenshot({ path: join(opts.dir, "before.png") });
      before = `${opts.url}/before.png`;
      await site.setViewportSize({ width, height: pageH });
      await site.evaluate((h) => {
        (window as unknown as { __dock: number }).__dock = h;
        dispatchEvent(new Event("resize"));
      }, dtH);
      await site.addInitScript((h) => ((window as unknown as { __dock: number }).__dock = h), dtH);
    }

    await site.goto(pageUrl, { waitUntil: "load" });
    const targets = (await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())) as Array<{ id: string; url: string; type: string }>;
    const target = targets.find((t) => t.type === "page" && t.url.includes(run));
    if (!target) throw new Error("App page target not found");

    const dctx = await browser.newContext({ viewport: { width, height: dtH }, deviceScaleFactor: DT_DPR, colorScheme: "dark" });
    await dctx.addInitScript(() => {
      try {
        // Neutral DevTools chrome (no tinted toolbar), dark theme, no target screencast pane.
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
    // Reload so the app's first frame (and its console.clear) lands in an attached console.
    await dt.waitForTimeout(800);
    await site.reload({ waitUntil: "load" });
    if (spec.scroll) {
      await site.evaluate(
        ({ sel, margin }) => {
          const el = document.querySelector(sel);
          if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - margin, behavior: "instant" as ScrollBehavior });
        },
        { sel: spec.scroll, margin: spec.scrollMargin ?? 24 },
      );
    }
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
    await site.waitForTimeout(1800);

    const dcdp = await dctx.newCDPSession(dt);
    const siteCast = await screencast(site, scdp, join(opts.dir, "site"), `${opts.url}/site`, { w: width, h: pageH }, SITE_DPR);
    const dtCast = await screencast(dt, dcdp, join(opts.dir, "dt"), `${opts.url}/dt`, { w: width, h: dtH }, DT_DPR);
    await Bun.sleep(600);

    const boxes: CaptureData["boxes"] = {};
    const measure = async (name: string, m: Measure): Promise<void> => {
      const box = m.in === "dt" ? await measureInDevTools(dt, m) : await measureInPage(site, m);
      if (box) boxes[name] = { ...box, in: m.in };
      else opts.log?.(`capture: ${name} not found (${JSON.stringify(m)})`);
    };

    type Event = { at: number; run: () => Promise<void> };
    const events: Event[] = [];
    for (const a of spec.actions ?? []) {
      const at = opts.cue(a.at);
      events.push({
        at,
        run: async () => {
          if (a.key) await site.keyboard.press(a.key);
          if (a.click) {
            const b = await measureInPage(site, { in: "site", selector: a.click });
            if (b) await site.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
            else opts.log?.(`capture: click target ${a.click} not found`);
          }
          if (a.write) app.write(a.write.file, a.write.content);
          if (a.prompt) {
            await dt.locator(".console-prompt-editor-container").click();
            await dt.keyboard.type(a.prompt, { delay: 28 });
            // Close any autocomplete suggestion so Enter runs the expression.
            await dt.keyboard.press("End");
            await dt.keyboard.press("Enter");
          }
          if (a.dtClick) await dt.locator(a.dtClick).last().click({ force: true, timeout: 3000 }).catch((err) => opts.log?.(`capture: dtClick ${a.dtClick} failed: ${String(err).split("\n")[0]}`));
          siteCast.poke();
          dtCast.poke();
        },
      });
    }
    for (const [name, m] of Object.entries(spec.measure ?? {})) {
      events.push({ at: m.at === undefined ? opts.duration - 0.3 : opts.cue(m.at), run: () => measure(name, m) });
    }
    events.sort((a, b) => a.at - b.at);

    const t0 = Date.now() / 1000;
    siteCast.setZero(t0);
    dtCast.setZero(t0);
    for (const e of events) {
      const wait = t0 + e.at - Date.now() / 1000;
      if (wait > 0) await Bun.sleep(wait * 1000);
      await e.run();
    }
    const rest = t0 + opts.duration + 0.5 - Date.now() / 1000;
    if (rest > 0) await Bun.sleep(rest * 1000);
    await siteCast.stop();
    await dtCast.stop();
    return { site: siteCast.stream, dt: dtCast.stream, boxes, ...(before ? { before } : {}) } as CaptureData;
  });
}
