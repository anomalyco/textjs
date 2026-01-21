/**
 * The frame player: the entire browser bundle of a server-rendered console
 * route (`export const runtime = "server"`). No React, no Yoga, no route
 * modules: it applies cell deltas streamed from the server to a `CellBuffer`,
 * logs them with the same `CssConsoleDriver` (and the same ~15fps pacing) as
 * the client renderer, and forwards keyboard, paste, wheel, focus, resize and
 * Back / Forward to the server.
 */

import {
  CellBuffer,
  CssConsoleDriver,
  InputEngine,
  ViewportController,
  type ConsoleTarget,
  type InputEvent,
} from "@textjs/core";
import { LIVE_PATH, LIVE_SESSION_HEADER, LiveFrameDecoder, type LiveInput, type LiveServerMessage } from "./live-protocol";

export interface FramePlayerConfig {
  /** Mount point (`""` or `"/console"`). */
  basePath: string;
  viewport?: { width?: number; height?: number; responsive?: boolean };
  /** Shown in the page's status line. */
  title?: string;
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
}

const DEFAULT_FRAME_INTERVAL = 66;
const POST_CLEAR_INTERVAL = 110;

/** Decode + paint, independent of the network (tests drive it directly). */
export class FramePlayerCore {
  readonly buffer = new CellBuffer(0, 0);
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
  }

  /** Apply a server frame. Returns `false` when the delta didn't match the buffer (a reconnect will resync). */
  applyFrame(msg: Extract<LiveServerMessage, { t: "f" }>, size = 0): boolean {
    this.bytes += size;
    const ok = this.decoder.apply(this.buffer, msg);
    if (ok) this.requestPaint();
    return ok;
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
    if (this.hidden) {
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
    /** Set by a prerendered shell once it painted. */
    __TEXTJS_SHELL__?: number;
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

/** Boot the player on a server-rendered route's page. */
export function bootFramePlayer(config: FramePlayerConfig = readConfig(document)): FramePlayer {
  const base = config.basePath;
  const endpoint = `${base}${LIVE_PATH}`;
  const core = new FramePlayerCore({ shell: window.__TEXTJS_SHELL__ === 1 });
  const vp = config.viewport ?? {};
  const viewport = new ViewportController({ width: vp.width ?? 120, height: vp.height ?? 36, responsive: vp.responsive ?? true });
  const engine = new InputEngine();
  const status = document.querySelector<HTMLElement>("[data-textjs-status]");
  const setStatus = (s: string): void => {
    if (status) status.textContent = s;
    document.documentElement.dataset.textjsLive = s;
  };

  let sid: string | null = null;
  let es: EventSource | null = null;
  let retry = 500;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let queue: LiveInput[] = [];
  let inFlight = false;

  const appPath = (): string => {
    const p = location.pathname;
    const stripped = base && (p === base || p.startsWith(`${base}/`)) ? p.slice(base.length) || "/" : p;
    return stripped + location.search;
  };

  const flushInput = (): void => {
    if (inFlight || queue.length === 0 || sid === null || disposed) return;
    const batch = queue;
    queue = [];
    inFlight = true;
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", [LIVE_SESSION_HEADER]: sid },
      body: JSON.stringify(batch),
      credentials: "same-origin",
    })
      .catch(() => undefined)
      .finally(() => {
        inFlight = false;
        flushInput();
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

  const onMessage = (e: MessageEvent<string>): void => {
    let msg: LiveServerMessage;
    try {
      msg = JSON.parse(e.data) as LiveServerMessage;
    } catch {
      return;
    }
    switch (msg.t) {
      case "f":
        if (!core.applyFrame(msg, e.data.length)) reconnect();
        break;
      case "hello":
        sid = msg.sid;
        retry = 500;
        setStatus("live");
        // The stream URL may be stale after a native reconnect; resend what the server can't see.
        send({ type: "resize", cols: viewport.cols, rows: viewport.rows });
        send({ type: "focus", focused: engine.focused && document.visibilityState !== "hidden" });
        break;
      case "url":
        if (msg.replace) history.replaceState(null, "", msg.href);
        else history.pushState(null, "", msg.href);
        break;
      case "title":
        document.title = msg.title;
        break;
      case "load":
        disposed = true;
        es?.close();
        location.assign(msg.href);
        break;
      case "error":
        console.error(`▼ Text.js (server): ${msg.message}`);
        break;
    }
  };

  const connect = (): void => {
    if (disposed) return;
    const q = new URLSearchParams({
      path: appPath(),
      cols: String(viewport.cols),
      rows: String(viewport.rows),
      focused: engine.focused ? "1" : "0",
    });
    if (sid) q.set("sid", sid);
    setStatus(sid ? "reconnecting" : "connecting");
    const source = new EventSource(`${endpoint}?${q}`);
    es = source;
    source.onmessage = onMessage;
    source.onerror = () => {
      // CONNECTING: the browser retries on its own (resuming via Last-Event-ID).
      if (source.readyState === EventSource.CLOSED && es === source) scheduleReconnect();
      else setStatus("reconnecting");
    };
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

  /** Drop the stream and resume the session with a fresh keyframe. */
  const reconnect = (): void => {
    es?.close();
    es = null;
    scheduleReconnect();
  };

  const offInput = engine.onAny((event: InputEvent) => {
    if (event.type === "focus") send({ type: "focus", focused: event.focused && document.visibilityState !== "hidden" });
    else send(event as LiveInput);
  });
  engine.attach();
  const offViewport = viewport.subscribe((size) => send({ type: "resize", cols: size.cols, rows: size.rows }));
  const onPop = (): void => send({ type: "nav", href: appPath() });
  const onVisibility = (): void => {
    const hidden = document.visibilityState === "hidden";
    core.setHidden(hidden);
    send({ type: "focus", focused: !hidden && document.hasFocus() });
  };
  window.addEventListener("popstate", onPop);
  document.addEventListener("visibilitychange", onVisibility);
  core.setHidden(document.visibilityState === "hidden");
  connect();

  const player: FramePlayer = {
    core,
    dispose() {
      disposed = true;
      es?.close();
      if (retryTimer !== null) clearTimeout(retryTimer);
      offInput();
      engine.detach();
      offViewport();
      viewport.dispose();
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
  (window as unknown as { text?: unknown }).text = {
    stats: () => ({ cols: core.buffer.width, rows: core.buffer.height, frames: core.frames, bytes: core.bytes, runtime: "server" }),
    copyText: () => core.buffer.toPlainString(true).replace(/\n+$/, ""),
    resize: (cols: number, rows: number) => viewport.setSize(cols, rows),
    responsive: (on = true) => viewport.setResponsive(on),
  };
  return player;
}
