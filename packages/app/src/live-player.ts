/**
 * The frame player: the entire browser bundle of a server-rendered console
 * route (`export const runtime = "server"`). No React, no Yoga, no route
 * modules: it applies cell deltas streamed from the server to a `CellGrid`,
 * logs them with the same `CssConsoleDriver` (and the same ~15fps pacing) as
 * the client renderer, and forwards keyboard, paste, wheel, focus, resize and
 * Back / Forward to the server.
 */

import {
  CssConsoleDriver,
  InputEngine,
  ViewportController,
  type ConsoleTarget,
  type InputEvent,
} from "@textjs/core";
import { CellGrid } from "@textjs/core/internal";
import { isAppPath, LIVE_PATH, LIVE_SESSION_HEADER, LiveFrameDecoder, parseLiveBanner, type LiveBanner, type LiveInput, type LiveServerMessage } from "./live-protocol";

export interface FramePlayerConfig {
  /** Mount point (`""` or `"/console"`). */
  basePath: string;
  viewport?: { width?: number; height?: number; responsive?: boolean };
  /** Shown in the page's status line. */
  title?: string;
  /**
   * @experimental The live endpoint URL, which may be on another origin
   * (default `basePath` + `/__textjs/live`).
   */
  endpoint?: string;
  /**
   * @experimental `fetch` credentials for the stream and input requests
   * (default `"same-origin"`, which sends no cookies to another origin).
   */
  credentials?: RequestCredentials;
  /**
   * @experimental The input engine to forward from. The caller owns it: the
   * player neither attaches nor detaches it. Default: a new engine the player
   * attaches to the page.
   */
  input?: InputEngine;
  /**
   * @experimental The app path to open, `pathname + search` without
   * `basePath` (default: the page's location).
   */
  path?: string;
  /**
   * @experimental Mirror the session onto the page (default `true`): the
   * server's title and URL changes, Back / Forward, document loads, the
   * status line and `data-textjs-live`. `false` leaves the host page's
   * `document`, `history` and `location` alone; navigation stays inside the
   * session.
   */
  syncDocument?: boolean;
  /** @experimental A prerendered shell already painted (default: `window.__TEXTJS_SHELL__` is set). */
  shell?: boolean;
  /** @experimental When the shell painted, from `performance.now()` (default: `window.__TEXTJS_SHELL_AT__`). */
  shellPaintedAt?: number;
  /** @experimental Install the `window.text` console API (default `true`). */
  registerGlobal?: boolean;
}

export interface FramePlayerCoreOptions {
  console?: ConsoleTarget;
  /** Push earlier frames above the console top (default: on for the global console). */
  curtain?: boolean;
  /** A prerendered shell already cleared the console and painted (skip the first clear). */
  shell?: boolean;
  /** Minimum ms between frames (default 66; 110 after a frame that cleared). */
  frameInterval?: number;
  /** Paint scheduler (default: timers + `requestAnimationFrame`). `null` paints only on `paint()`. */
  schedule?: ((cb: () => void, delay: number) => void) | null;
  now?: () => number;
  /**
   * When the shell's frame was logged (`performance.now()`): the first server
   * frame then respects the post-clear pacing window the shell's clear opened.
   */
  shellPaintedAt?: number;
}

const DEFAULT_FRAME_INTERVAL = 66;
const POST_CLEAR_INTERVAL = 110;

/** Decode + paint, independent of the network (tests drive it directly). */
export class FramePlayerCore {
  readonly buffer = new CellGrid(0, 0);
  readonly driver: CssConsoleDriver;
  private readonly decoder = new LiveFrameDecoder();
  private readonly interval: number;
  private readonly postClear: number;
  private readonly schedule: ((cb: () => void, delay: number) => void) | null;
  private readonly now: () => number;
  private scheduled = false;
  private lastEmit = -Infinity;
  private lastCleared = false;
  private hidden = false;
  private pendingWhileHidden = false;
  frames = 0;
  bytes = 0;

  constructor(options: FramePlayerCoreOptions = {}) {
    this.driver = new CssConsoleDriver({ console: options.console, curtain: options.curtain, initialClear: options.shell !== true });
    this.interval = options.frameInterval ?? DEFAULT_FRAME_INTERVAL;
    this.postClear = options.frameInterval ?? POST_CLEAR_INTERVAL;
    this.now = options.now ?? (() => performance.now());
    this.schedule = options.schedule === undefined ? defaultSchedule : options.schedule;
    if (options.shell === true && options.shellPaintedAt !== undefined) {
      this.lastEmit = options.shellPaintedAt;
      this.lastCleared = true;
    }
  }

  /** Stop / restart painting (`text.pause()`: select and copy freely). */
  paused = false;

  /** Apply a server frame. Returns `false` when the delta didn't match the buffer (a reconnect will resync). */
  applyFrame(msg: Extract<LiveServerMessage, { t: "f" }>, size = 0): boolean {
    this.bytes += size;
    const ok = this.decoder.apply(this.buffer, msg);
    if (ok) this.requestPaint();
    return ok;
  }

  private banner: LiveBanner | null = null;

  /** Draw the server's focus hint over the frame's last row in the console only (`null` removes it). */
  setBanner(banner: unknown): void {
    const next = parseLiveBanner(banner);
    const cur = this.banner;
    if (next === cur || (next !== null && cur !== null && next.text === cur.text && next.fg === cur.fg && next.bg === cur.bg)) return;
    this.banner = next;
    this.driver._setBanner(next, () => this.requestPaint());
    this.requestPaint();
  }

  /**
   * A new or resumed stream began. Drop the old stream's banner: the server resends one that still
   * applies right after `hello`, and sends nothing when focus came back while the stream was down.
   */
  startStream(): void {
    this.setBanner(null);
  }

  setHidden(hidden: boolean): void {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    if (!hidden && this.pendingWhileHidden) {
      this.pendingWhileHidden = false;
      this.requestPaint();
    }
  }

  requestPaint(): void {
    if (this.hidden || this.paused) {
      this.pendingWhileHidden = true;
      return;
    }
    if (this.scheduled || this.schedule === null) return;
    this.scheduled = true;
    const wait = this.lastEmit + (this.lastCleared ? this.postClear : this.interval) - this.now();
    this.schedule(() => {
      this.scheduled = false;
      this.paint();
    }, wait > 1 ? wait : 0);
  }

  /** Emit a frame now if any cell changed (one `console.log`, zero calls otherwise). */
  paint(): boolean {
    if (this.buffer.width === 0 || this.buffer.height === 0) return false;
    const r = this.driver.render(this.buffer);
    if (r.skipped) return false;
    this.lastEmit = this.now();
    this.lastCleared = r.cleared === true;
    this.frames++;
    return true;
  }
}

function defaultSchedule(cb: () => void, delay: number): void {
  if (delay > 0 || typeof requestAnimationFrame !== "function") setTimeout(cb, delay);
  else requestAnimationFrame(cb);
}

export interface FramePlayer {
  readonly core: FramePlayerCore;
  /** Close the stream and stop forwarding input. */
  dispose(): void;
}

declare global {
  interface Window {
    /** Set by a prerendered shell once it painted (`1`, or its `performance.now()` timestamp). */
    __TEXTJS_SHELL__?: number;
    __TEXTJS_SHELL_AT__?: number;
  }
}

function readConfig(doc: Document): FramePlayerConfig {
  const el = doc.getElementById("__textjs-live");
  try {
    return { basePath: "", ...(el?.textContent ? (JSON.parse(el.textContent) as Partial<FramePlayerConfig>) : {}) };
  } catch {
    return { basePath: "" };
  }
}

const STUB_GUARD_KEY = "textjs:server-route";
const LOAD_GUARD_KEY = "textjs:live-load";

/** Same-origin app path or `null` (never follow `//host`, `/\\host`, `javascript:` or other origins). */
export function safeHref(href: unknown, base = ""): string | null {
  if (typeof href !== "string" || !isAppPath(href)) return null;
  return base && href !== base && !href.startsWith(`${base}/`) && !href.startsWith(`${base}?`) ? null : href;
}

/** Read Server-Sent Events from a `fetch()` body (the session id travels in a header, never the URL). */
async function readEvents(body: ReadableStream<Uint8Array>, onData: (data: string) => void): Promise<void> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += dec.decode(value, { stream: true }).replace(/\r\n?/g, "\n");
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = block
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(l.startsWith("data: ") ? 6 : 5))
        .join("\n");
      if (data) onData(data);
    }
  }
}

/** Boot the player on a server-rendered route's page. */
export function bootFramePlayer(config: FramePlayerConfig = readConfig(document)): FramePlayer {
  const base = config.basePath;
  const endpoint = config.endpoint ?? `${base}${LIVE_PATH}`;
  const credentials = config.credentials ?? "same-origin";
  const sync = config.syncDocument !== false;
  if (sync) {
    try {
      // We reached the server route: the client stub's reload guard has done its job.
      sessionStorage.removeItem(STUB_GUARD_KEY);
    } catch {
      // storage blocked
    }
  }
  const core = new FramePlayerCore({ shell: config.shell ?? window.__TEXTJS_SHELL__ !== undefined, shellPaintedAt: config.shellPaintedAt ?? window.__TEXTJS_SHELL_AT__ });
  const vp = config.viewport ?? {};
  const viewport = new ViewportController({ width: vp.width ?? 120, height: vp.height ?? 36, responsive: vp.responsive ?? true });
  const engine = config.input ?? new InputEngine();
  const status = sync ? document.querySelector<HTMLElement>("[data-textjs-status]") : null;
  const setStatus = (s: string): void => {
    if (!sync) return;
    if (status) status.textContent = s;
    document.documentElement.dataset.textjsLive = s;
  };

  let sid: string | null = null;
  let stream: AbortController | null = null;
  let retry = 500;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let queue: LiveInput[] = [];
  let inFlight = false;

  // Our position in the browser's history, so Back / Forward map onto the server's entries.
  const stateIndex = (): number => {
    const st = history.state as { textjsIdx?: unknown } | null;
    return typeof st?.textjsIdx === "number" ? st.textjsIdx : 0;
  };
  let index = sync ? stateIndex() : 0;
  if (sync && (history.state as { textjsIdx?: unknown } | null)?.textjsIdx === undefined) history.replaceState({ ...(history.state ?? {}), textjsIdx: index }, "");
  let expectedPops = 0;

  /** `pathname + search` without `basePath`. */
  const toAppPath = (pathname: string, search: string): string => {
    const stripped = base && (pathname === base || pathname.startsWith(`${base}/`)) ? pathname.slice(base.length) || "/" : pathname;
    return stripped + search;
  };
  const appPath = (): string => toAppPath(location.pathname, location.search);
  // Where the session is, for new sessions after a reconnect.
  let current = config.path ?? appPath();

  const flushInput = (): void => {
    if (inFlight || queue.length === 0 || sid === null || disposed) return;
    const batch = queue.splice(0, 64);
    inFlight = true;
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", [LIVE_SESSION_HEADER]: sid },
      body: JSON.stringify(batch),
      credentials,
    })
      .then((res) => {
        // The session expired (grace period, server restart): start a new one.
        if (res.status === 410) {
          sid = null;
          reconnect();
        } else if (res.status === 429) queue.unshift(...batch);
      })
      .catch(() => undefined)
      .finally(() => {
        inFlight = false;
        if (queue.length > 0) setTimeout(flushInput, 0);
      });
  };

  const send = (event: LiveInput): void => {
    const last = queue[queue.length - 1];
    if (event.type === "wheel" && last?.type === "wheel") {
      last.deltaX += event.deltaX;
      last.deltaY += event.deltaY;
      last.rows += event.rows;
      last.cols += event.cols;
    } else if (event.type === "resize" && last?.type === "resize") queue[queue.length - 1] = event;
    else queue.push(event);
    queueMicrotask(flushInput);
  };

  const stop = (): void => {
    disposed = true;
    stream?.abort();
    core.setBanner(null);
    setStatus("unavailable");
  };
  /** Load `href` as a document, at most once per URL every few seconds (middleware might keep bouncing the stream). */
  const load = (href: string): void => {
    if (!sync) {
      // Only a document load could show it, and the page isn't ours to navigate.
      console.error(`▼ Text.js (server): ${href} needs a page load, so it can't open here`);
      stop();
      return;
    }
    const target = new URL(href, location.href).href;
    try {
      const last = sessionStorage.getItem(LOAD_GUARD_KEY);
      const at = last ? Number(last.slice(0, last.indexOf(" "))) : 0;
      if (last && last.slice(last.indexOf(" ") + 1) === target && target === location.href && Date.now() - at < 3000) {
        stop();
        return;
      }
      sessionStorage.setItem(LOAD_GUARD_KEY, `${Date.now()} ${target}`);
    } catch {
      // storage blocked
    }
    disposed = true;
    stream?.abort();
    location.assign(href);
  };

  const onMessage = (data: string): void => {
    let msg: LiveServerMessage;
    try {
      msg = JSON.parse(data) as LiveServerMessage;
    } catch {
      return;
    }
    switch (msg.t) {
      case "f":
        if (!core.applyFrame(msg, data.length)) reconnect();
        break;
      case "hello":
        core.startStream();
        sid = msg.sid;
        retry = 500;
        setStatus("live");
        // The stream URL may be stale after a reconnect; resend what the server can't see.
        send({ type: "resize", cols: viewport.cols, rows: viewport.rows });
        send({ type: "focus", focused: engine.focused && document.visibilityState !== "hidden" });
        break;
      case "url": {
        const href = safeHref(msg.href, base);
        if (href === null) break;
        const url = new URL(href, "http://x");
        current = toAppPath(url.pathname, url.search);
        if (!sync || href === location.pathname + location.search + location.hash) break;
        if (msg.replace) history.replaceState({ textjsIdx: index }, "", href);
        else history.pushState({ textjsIdx: ++index }, "", href);
        break;
      }
      case "go":
        if (sync && Number.isInteger(msg.delta) && msg.delta !== 0) {
          expectedPops++;
          history.go(msg.delta);
        }
        break;
      case "title":
        if (sync) document.title = msg.title;
        break;
      case "banner":
        core.setBanner(msg.banner);
        break;
      case "load": {
        const href = safeHref(msg.href, base);
        if (href !== null) load(href);
        break;
      }
      case "error":
        console.error(`▼ Text.js (server): ${msg.message}`);
        break;
    }
  };

  const connect = (): void => {
    if (disposed) return;
    const q = new URLSearchParams({
      path: current,
      cols: String(viewport.cols),
      rows: String(viewport.rows),
      focused: engine.focused ? "1" : "0",
    });
    setStatus(sid ? "reconnecting" : "connecting");
    const ctrl = new AbortController();
    stream = ctrl;
    const headers: Record<string, string> = { accept: "text/event-stream" };
    if (sid) headers[LIVE_SESSION_HEADER] = sid;
    fetch(`${endpoint}${endpoint.includes("?") ? "&" : "?"}${q}`, { headers, credentials, cache: "no-store", signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error(`live stream: ${res.status}`);
        await readEvents(res.body, onMessage);
        throw new Error("live stream ended");
      })
      .catch(() => {
        if (stream === ctrl && !disposed) scheduleReconnect();
      });
  };

  const scheduleReconnect = (): void => {
    if (disposed || retryTimer !== null) return;
    setStatus("reconnecting");
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, retry);
    retry = Math.min(retry * 2, 10_000);
  };

  /** Drop the stream and resume the session (or open a new one) with a fresh keyframe. */
  const reconnect = (): void => {
    const s = stream;
    stream = null;
    s?.abort();
    scheduleReconnect();
  };

  const offInput = engine.onAny((event: InputEvent) => {
    if (event.type === "focus") send({ type: "focus", focused: event.focused && document.visibilityState !== "hidden" });
    else send(event as LiveInput);
  });
  if (!config.input) engine.attach();
  const offViewport = viewport.subscribe((size) => send({ type: "resize", cols: size.cols, rows: size.rows }));
  const onPop = (): void => {
    const next = stateIndex();
    const delta = next - index;
    index = next;
    current = appPath();
    // The server asked for this move (`router.back()`): it is already there.
    if (expectedPops > 0) {
      expectedPops--;
      return;
    }
    send(delta !== 0 ? { type: "nav", href: appPath(), delta } : { type: "nav", href: appPath() });
  };
  const onVisibility = (): void => {
    const hidden = document.visibilityState === "hidden";
    core.setHidden(hidden);
    send({ type: "focus", focused: !hidden && document.hasFocus() });
  };
  if (sync) window.addEventListener("popstate", onPop);
  document.addEventListener("visibilitychange", onVisibility);
  core.setHidden(document.visibilityState === "hidden");
  connect();

  const player: FramePlayer = {
    core,
    dispose() {
      disposed = true;
      core.driver._setBanner(null);
      stream?.abort();
      if (retryTimer !== null) clearTimeout(retryTimer);
      offInput();
      if (!config.input) engine.detach();
      offViewport();
      viewport.dispose();
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
  const HELP = `▼ Text.js console API (server-rendered route)
  text.resize(cols, rows)   pin the console grid
  text.responsive(on)       follow the docked DevTools size
  text.pause() / resume()   freeze output (select & copy freely)
  text.stats()              frames, bytes, grid size
  text.copyText()           copy the current frame as plain text
  text.help()               this message`;
  const stats = () => ({ cols: core.buffer.width, rows: core.buffer.height, frames: core.frames, bytes: core.bytes, paused: core.paused, runtime: "server" as const });
  if (config.registerGlobal === false) return player;
  (window as unknown as { text?: unknown }).text = {
    stats,
    copyText: () => {
      const text = core.buffer.toPlainString(true).replace(/\n+$/, "");
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => undefined);
      return text;
    },
    resize: (cols: number, rows: number) => {
      viewport.setSize(cols, rows);
      return stats();
    },
    responsive: (on = true) => {
      viewport.setResponsive(on);
      return stats();
    },
    pause: () => {
      core.paused = true;
    },
    resume: () => {
      core.paused = false;
      core.requestPaint();
    },
    help: () => {
      console.log(HELP);
      return HELP;
    },
  };
  return player;
}
