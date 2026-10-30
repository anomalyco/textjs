/**
 * Live sessions for server-rendered console routes: one React root per
 * browser tab, rendered on the server, streamed to the frame player as cell
 * deltas over server-sent events. Input comes back as JSON POSTs.
 *
 * - `GET  /__textjs/live?path=&cols=&rows=` opens (or, with `Last-Event-ID` /
 *   `sid`, resumes) a session and streams {@link LiveServerMessage}s.
 * - `POST /__textjs/live` with `x-textjs-live: <sid>` and a JSON array of
 *   {@link LiveInput}s.
 *
 * Frames are paced like the client renderer (≥ `frameIntervalMs` apart) and
 * coalesced: each frame is diffed against what this connection was last sent,
 * so a slow socket (`write()` returning `false`) just skips intermediate
 * states until `drain`. Disconnected sessions survive `reconnectGraceMs`, then
 * unmount. Session ids are 192-bit random capabilities; requests must be
 * same-origin; only routes in the app manifest can be rendered.
 */

import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { LIVE_PATH, LIVE_PROTOCOL_VERSION, LIVE_SESSION_HEADER, LiveFrameEncoder, MAX_COLS, MAX_ROWS, parseLiveInput, sseEvent, type LiveInput, type LiveServerMessage } from "../live-protocol";
import type { LiveApp, LiveAppOptions, RouteRuntime } from "./live-app";
import { readRequestBody } from "./http";

export type LiveAppInit = Omit<LiveAppOptions, "routes" | "theme" | "defaultTitle">;

export interface LiveServerOptions {
  /** Mount a session's app (binds the route manifest, theme and title). */
  createApp(init: LiveAppInit): Promise<LiveApp>;
  /** Which runtime renders `pathname` (client routes are handed back to the browser). */
  runtimeOf(pathname: string): RouteRuntime;
  /** Prefix for hrefs sent to the browser. */
  basePath?: string;
  /** Concurrent sessions (default 256). */
  maxSessions?: number;
  /** How long a disconnected session waits to be resumed (default 30s). */
  reconnectGraceMs?: number;
  /** Minimum ms between frames per connection (default 66, the client renderer's pacing). */
  frameIntervalMs?: number;
  /** SSE comment interval keeping proxies from idling the stream out (default 15s). */
  heartbeatMs?: number;
  /** Forward render errors to the browser console (dev). */
  exposeErrors?: boolean;
  log?(message: string): void;
  onError?(error: unknown): void;
}

const MAX_BODY = 512 * 1024;
const MAX_EVENTS = 1024;
const SID_RE = /^[A-Za-z0-9_-]{32}$/;

/** `true` unless the request is (or claims to be) from another site. */
export function isSameOriginRequest(req: IncomingMessage): boolean {
  const site = req.headers["sec-fetch-site"];
  if (site !== undefined && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.origin;
  if (origin === undefined || origin === "null") return origin === undefined;
  try {
    const host = new URL(origin).host;
    // Behind a proxy that rewrites Host. A cross-site page can't set this header without a preflight.
    const forwarded = req.headers["x-forwarded-host"];
    return host === req.headers.host || (typeof forwarded === "string" && forwarded.split(",")[0]?.trim() === host);
  } catch {
    return false;
  }
}

function newSessionId(): string {
  return randomBytes(24).toString("base64url");
}

function intParam(v: string | null, lo: number, hi: number, fallback: number): number {
  const n = v === null ? Number.NaN : Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
}

function safePath(p: string | null): string {
  if (p === null || !p.startsWith("/") || p.startsWith("//") || p.length > 2048 || /[\u0000-\u001f\\]/.test(p)) return "/";
  return p;
}

function pathOf(href: string): string {
  const q = href.search(/[?#]/);
  return q < 0 ? href : href.slice(0, q);
}

export class LiveSession {
  readonly id: string;
  app: LiveApp | null = null;
  private stream: ServerResponse | null = null;
  private readonly encoder = new LiveFrameEncoder();
  private dirty = true;
  private blocked = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private grace: ReturnType<typeof setTimeout> | null = null;
  private lastSent = -Infinity;
  private title: string | null = null;
  disposed = false;
  /** Frames and bytes written (telemetry, tests). */
  framesSent = 0;
  bytesSent = 0;

  constructor(
    private readonly server: LiveServer,
    private readonly interval: number,
  ) {
    this.id = newSessionId();
  }

  get connected(): boolean {
    return this.stream !== null;
  }

  attach(res: ServerResponse, resumed: boolean): void {
    if (this.grace !== null) clearTimeout(this.grace);
    this.grace = null;
    const prev = this.stream;
    this.stream = res;
    // Newest connection wins (a duplicated stream or a reconnect racing the old socket).
    if (prev !== null && prev !== res) prev.end();
    this.blocked = false;
    this.encoder.reset();
    this.dirty = true;
    this.lastSent = -Infinity;
    this.write(sseEvent({ t: "hello", v: LIVE_PROTOCOL_VERSION, sid: this.id, resumed }, this.id));
    if (this.title !== null) this.write(sseEvent({ t: "title", title: this.title }));
    res.on("close", () => this.detach(res));
    this.schedule();
  }

  private detach(res: ServerResponse): void {
    if (this.stream !== res) return;
    this.stream = null;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    if (!this.disposed) this.grace = setTimeout(() => this.server.dispose(this), this.server.reconnectGraceMs);
  }

  /** Send a non-frame message (written immediately, in order with frames). */
  send(message: LiveServerMessage): void {
    if (message.t === "title") this.title = message.title;
    if (this.stream !== null) this.write(sseEvent(message));
  }

  markDirty(): void {
    this.dirty = true;
    this.schedule();
  }

  private schedule(): void {
    if (this.stream === null || this.timer !== null || this.blocked || !this.dirty || this.app === null) return;
    const wait = Math.max(0, this.lastSent + this.interval - performance.now());
    this.timer = setTimeout(this.flush, wait);
  }

  /** Encode the delta since the last frame this connection received and write it. */
  readonly flush = (): void => {
    this.timer = null;
    if (this.stream === null || this.blocked || !this.dirty || this.app === null) return;
    this.dirty = false;
    const frame = this.encoder.encode(this.app.buffer);
    if (frame === null) return;
    this.lastSent = performance.now();
    this.framesSent++;
    this.write(sseEvent(frame));
  };

  heartbeat(): void {
    if (this.stream !== null && !this.blocked) this.write(": ♥\n\n");
  }

  private write(chunk: string): void {
    const res = this.stream;
    if (res === null || res.writableEnded) return;
    this.bytesSent += chunk.length;
    if (res.write(chunk) || this.blocked) return;
    this.blocked = true;
    res.once("drain", () => {
      if (this.stream !== res) return;
      this.blocked = false;
      this.schedule();
    });
  }

  input(events: readonly LiveInput[]): void {
    const app = this.app;
    if (app === null) return;
    for (const e of events) app.input(e);
  }

  close(): void {
    this.disposed = true;
    if (this.timer !== null) clearTimeout(this.timer);
    if (this.grace !== null) clearTimeout(this.grace);
    this.timer = null;
    this.grace = null;
    const res = this.stream;
    this.stream = null;
    res?.end();
    this.app?.dispose();
    this.app = null;
  }
}

export class LiveServer {
  readonly sessions = new Map<string, LiveSession>();
  readonly reconnectGraceMs: number;
  private readonly options: LiveServerOptions;
  private readonly maxSessions: number;
  private readonly interval: number;
  private readonly heartbeatTimer: ReturnType<typeof setInterval>;
  private readonly basePath: string;

  constructor(options: LiveServerOptions) {
    this.options = options;
    this.maxSessions = options.maxSessions ?? 256;
    this.reconnectGraceMs = options.reconnectGraceMs ?? 30_000;
    this.interval = options.frameIntervalMs ?? 66;
    this.basePath = options.basePath ?? "";
    this.heartbeatTimer = setInterval(() => {
      for (const s of this.sessions.values()) s.heartbeat();
    }, options.heartbeatMs ?? 15_000);
    (this.heartbeatTimer as { unref?: () => void }).unref?.();
  }

  /**
   * Handle `GET` / `POST` on {@link LIVE_PATH}. `url` is the request URL with
   * `basePath` already stripped. Returns `false` for other requests.
   */
  async handle(req: IncomingMessage, res: ServerResponse, url: string): Promise<boolean> {
    const q = url.indexOf("?");
    const pathname = q < 0 ? url : url.slice(0, q);
    if (pathname !== LIVE_PATH) return false;
    if (!isSameOriginRequest(req)) {
      res.statusCode = 403;
      res.end();
      return true;
    }
    if (req.method === "GET") await this.openStream(req, res, new URLSearchParams(q < 0 ? "" : url.slice(q + 1)));
    else if (req.method === "POST") await this.receiveInput(req, res);
    else {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, POST");
      res.end();
    }
    return true;
  }

  private startStream(res: ServerResponse): void {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.flushHeaders?.();
    res.write("retry: 1000\n\n");
  }

  private async openStream(req: IncomingMessage, res: ServerResponse, params: URLSearchParams): Promise<void> {
    const lastId = req.headers["last-event-id"];
    const resumeId = (typeof lastId === "string" ? lastId : null) ?? params.get("sid");
    const existing = resumeId !== null && SID_RE.test(resumeId) ? this.sessions.get(resumeId) : undefined;
    if (existing && !existing.disposed) {
      this.startStream(res);
      existing.attach(res, true);
      return;
    }
    const href = safePath(params.get("path"));
    if (this.options.runtimeOf(pathOf(href)) === "client") {
      // Not a server route: let the browser load it as a document.
      this.startStream(res);
      res.end(sseEvent({ t: "load", href: this.basePath + href }));
      return;
    }
    if (this.sessions.size >= this.maxSessions) {
      res.statusCode = 503;
      res.setHeader("Retry-After", "5");
      res.end();
      return;
    }
    const session = new LiveSession(this, this.interval);
    this.sessions.set(session.id, session);
    let closedEarly = false;
    res.once("close", () => {
      closedEarly = session.app === null;
    });
    try {
      session.app = await this.options.createApp({
        path: href,
        cols: intParam(params.get("cols"), 1, MAX_COLS, 120),
        rows: intParam(params.get("rows"), 1, MAX_ROWS, 36),
        focused: params.get("focused") !== "0",
        onFrame: () => session.markDirty(),
        onNavigate: (to, action, runtime) => {
          if (runtime === "client") {
            // The browser loads the client route as a new document; this session is done.
            session.send({ t: "load", href: this.basePath + to });
            setTimeout(() => this.dispose(session), 0);
          } else session.send({ t: "url", href: this.basePath + to, replace: action === "replace" || action === "pop" });
        },
        onTitle: (title) => session.send({ t: "title", title }),
        onError: (error) => {
          this.options.onError?.(error);
          if (this.options.exposeErrors) session.send({ t: "error", message: error instanceof Error ? error.message : String(error) });
        },
      });
    } catch (error) {
      this.dispose(session);
      this.options.onError?.(error);
      if (!res.headersSent) res.statusCode = 500;
      res.end();
      return;
    }
    if (closedEarly || session.disposed) {
      this.dispose(session);
      return;
    }
    this.startStream(res);
    session.attach(res, false);
    this.options.log?.(` ◇ live session ${session.id.slice(0, 6)}… ${href} (${this.sessions.size} open)`);
  }

  private async receiveInput(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const sid = req.headers[LIVE_SESSION_HEADER];
    const type = req.headers["content-type"] ?? "";
    if (typeof sid !== "string" || !SID_RE.test(sid) || !type.startsWith("application/json")) {
      res.statusCode = 400;
      res.end();
      return;
    }
    const session = this.sessions.get(sid);
    if (!session || session.disposed) {
      res.statusCode = 410;
      res.end();
      return;
    }
    const raw = await readRequestBody(req, MAX_BODY);
    if (raw === null) {
      res.statusCode = 413;
      res.setHeader("Connection", "close");
      res.end();
      req.destroy();
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    if (!Array.isArray(body) || body.length > MAX_EVENTS) {
      res.statusCode = 400;
      res.end();
      return;
    }
    const events: LiveInput[] = [];
    for (const item of body) {
      const e = parseLiveInput(item);
      if (e) events.push(e);
    }
    try {
      session.input(events);
    } catch (error) {
      this.options.onError?.(error);
    }
    res.statusCode = 204;
    res.end();
  }

  dispose(session: LiveSession): void {
    if (this.sessions.get(session.id) === session) this.sessions.delete(session.id);
    session.close();
  }

  /** Re-render every session (dev: a route module changed). */
  forEachApp(fn: (app: LiveApp) => void): void {
    for (const s of this.sessions.values()) if (s.app) fn(s.app);
  }

  close(): void {
    clearInterval(this.heartbeatTimer);
    for (const s of [...this.sessions.values()]) this.dispose(s);
  }
}
