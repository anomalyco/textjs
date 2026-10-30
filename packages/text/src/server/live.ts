/**
 * Live sessions for server-rendered console routes: one React root per
 * browser tab, rendered on the server, streamed to the frame player as cell
 * deltas over server-sent events. Input comes back as JSON POSTs.
 *
 * - `GET  /__textjs/live?path=&cols=&rows=` opens (or, with `Last-Event-ID` /
 *   `x-textjs-live: <sid>`, resumes) a session and streams {@link LiveServerMessage}s.
 * - `POST /__textjs/live` with `x-textjs-live: <sid>` and a JSON array of
 *   {@link LiveInput}s.
 *
 * Frames are paced like the client renderer (≥ `frameIntervalMs` apart) and
 * coalesced: each frame is diffed against what this connection was last sent,
 * so a slow socket (`write()` returning `false`) just skips intermediate
 * states until `drain`. Disconnected sessions survive `reconnectGraceMs`, then
 * unmount. Session ids are 192-bit random capabilities, bound to the
 * credentials (cookies, `Authorization`) they were opened with; requests must
 * be same-origin; only routes in the app manifest can be rendered, and
 * `authorize` (middleware) runs for every server route a session renders.
 */

import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { isAppPath, LIVE_PATH, LIVE_PROTOCOL_VERSION, LIVE_SESSION_HEADER, LiveFrameEncoder, MAX_COLS, MAX_ROWS, parseLiveInput, sseEvent, type LiveInput, type LiveServerMessage } from "../live-protocol";
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
  /**
   * May a session render `href`? Called with the visitor's request headers
   * before a session opens, before every server-side route transition, and
   * when a session's credentials change. Wire it to `middleware.ts`.
   */
  authorize?(href: string, headers: Headers): Promise<boolean>;
  /** Trust `X-Forwarded-Host` / `-Proto` / `-For` (behind a reverse proxy). */
  trustProxy?: boolean;
  /** Concurrent sessions per client address (default 32). */
  maxSessionsPerClient?: number;
  log?(message: string): void;
  onError?(error: unknown): void;
}

const MAX_BODY = 512 * 1024;
export const MAX_EVENTS = 64;
const BODY_TIMEOUT_MS = 5000;
/** Input events per second per session (token bucket), with a burst allowance. */
const INPUT_RATE = 240;
const INPUT_BURST = 480;
const SID_RE = /^[A-Za-z0-9_-]{32}$/;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.split(",")[0]?.trim() || undefined;
}

/** `true` unless the request is (or claims to be) from another site. */
export function isSameOriginRequest(req: Pick<IncomingMessage, "headers">, trustProxy = false): boolean {
  const site = req.headers["sec-fetch-site"];
  if (site !== undefined && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.origin;
  if (origin === undefined || origin === "null") return origin === undefined;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (u.host === req.headers.host) return true;
    if (!trustProxy) return false;
    // Behind a trusted proxy that rewrites Host.
    const proto = first(req.headers["x-forwarded-proto"]);
    return u.host === first(req.headers["x-forwarded-host"]) && (proto === undefined || `${proto}:` === u.protocol);
  } catch {
    return false;
  }
}

/** The request headers of a Node request as Web `Headers`. */
function headersOf(req: Pick<IncomingMessage, "headers">): Headers {
  const out = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) for (const item of v) out.append(k, item);
    else out.set(k, v);
  }
  return out;
}

/** What a session's identity is bound to. */
function credentialsOf(req: Pick<IncomingMessage, "headers">): string {
  const h = req.headers;
  return createHash("sha256")
    .update(`${h.cookie ?? ""}\u0000${h.authorization ?? ""}`)
    .digest("base64url");
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([p, new Promise<"timeout">((r) => (timer = setTimeout(() => r("timeout"), ms)))]).finally(() => clearTimeout(timer));
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
  /** The last address-bar update and a pending document load, replayed to a reconnecting browser. */
  private lastUrl: LiveServerMessage | null = null;
  private pendingLoad: LiveServerMessage | null = null;
  disposed = false;
  /** Hash of the cookies / `Authorization` the session was authorized with. */
  credentials = "";
  /** Request headers used to authorize route transitions. */
  headers = new Headers();
  /** Client address (per-client session cap). */
  client = "";
  /** When the browser detached (`0` while connected). */
  detachedAt = 0;
  private tokens = INPUT_BURST;
  private refilledAt = performance.now();
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
    this.detachedAt = 0;
    this.write(sseEvent({ t: "hello", v: LIVE_PROTOCOL_VERSION, sid: this.id, resumed }, this.id));
    if (this.title !== null) this.write(sseEvent({ t: "title", title: this.title }));
    // Messages a disconnected browser missed.
    if (resumed && this.lastUrl !== null) this.write(sseEvent({ ...(this.lastUrl as { t: "url"; href: string }), replace: true }));
    if (this.pendingLoad !== null) {
      this.write(sseEvent(this.pendingLoad));
      res.end();
      return;
    }
    res.on("close", () => this.detach(res));
    this.app?.setActive?.(true);
    this.schedule();
  }

  /** Take `cost` input events from the rate bucket (`false` when the session is over its rate). */
  takeTokens(cost: number): boolean {
    const now = performance.now();
    this.tokens = Math.min(INPUT_BURST, this.tokens + ((now - this.refilledAt) / 1000) * INPUT_RATE);
    this.refilledAt = now;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  private detach(res: ServerResponse): void {
    if (this.stream !== res) return;
    this.stream = null;
    this.detachedAt = performance.now();
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    // Nobody is watching: stop painting until a browser reattaches.
    this.app?.setActive?.(false);
    if (!this.disposed) this.grace = setTimeout(() => this.server.dispose(this), this.server.reconnectGraceMs);
  }

  /** Send a non-frame message (written immediately, in order with frames). */
  send(message: LiveServerMessage): void {
    if (message.t === "title") this.title = message.title;
    if (message.t === "url") this.lastUrl = message;
    if (message.t === "load") this.pendingLoad = message;
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
    if (app.inputMany) app.inputMany(events);
    else for (const e of events) app.input(e);
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
  private readonly maxPerClient: number;
  private readonly interval: number;
  private readonly heartbeatTimer: ReturnType<typeof setInterval>;
  private readonly basePath: string;

  constructor(options: LiveServerOptions) {
    this.options = options;
    this.maxSessions = options.maxSessions ?? 256;
    this.maxPerClient = options.maxSessionsPerClient ?? 32;
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
    if (!isSameOriginRequest(req, this.options.trustProxy)) {
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

  /** End a stream with a document load: the browser requests `href`, and middleware answers over HTTP. */
  private sendLoad(res: ServerResponse, href: string): void {
    this.startStream(res);
    res.end(sseEvent({ t: "load", href: this.basePath + href }));
  }

  private clientOf(req: IncomingMessage): string {
    const forwarded = this.options.trustProxy ? first(req.headers["x-forwarded-for"]) : undefined;
    return forwarded ?? (req as { socket?: { remoteAddress?: string } }).socket?.remoteAddress ?? "";
  }

  private async authorized(href: string, headers: Headers): Promise<boolean> {
    if (!this.options.authorize) return true;
    try {
      return await this.options.authorize(href, headers);
    } catch (error) {
      this.options.onError?.(error);
      return false;
    }
  }

  /**
   * A session's cookies or `Authorization` changed since it was authorized:
   * re-run `authorize` for what it currently shows before trusting the request.
   */
  private async recheck(session: LiveSession, req: IncomingMessage): Promise<boolean> {
    const credentials = credentialsOf(req);
    if (credentials === session.credentials) return true;
    const headers = headersOf(req);
    const href = session.app?.history.location.href ?? "/";
    if (!(await this.authorized(href, headers))) return false;
    session.credentials = credentials;
    session.headers = headers;
    return true;
  }

  /** Make room for a new session: drop the longest-disconnected one. */
  private evictDisconnected(): boolean {
    let oldest: LiveSession | null = null;
    for (const s of this.sessions.values()) if (!s.connected && s.detachedAt > 0 && (oldest === null || s.detachedAt < oldest.detachedAt)) oldest = s;
    if (oldest === null) return false;
    this.dispose(oldest);
    return true;
  }

  private async openStream(req: IncomingMessage, res: ServerResponse, params: URLSearchParams): Promise<void> {
    const lastId = first(req.headers["last-event-id"]) ?? first(req.headers[LIVE_SESSION_HEADER]);
    const existing = lastId !== undefined && SID_RE.test(lastId) ? this.sessions.get(lastId) : undefined;
    if (existing && !existing.disposed) {
      if (!(await this.recheck(existing, req))) {
        const href = existing.app?.history.location.href ?? "/";
        this.dispose(existing);
        this.sendLoad(res, href);
        return;
      }
      this.startStream(res);
      existing.attach(res, true);
      return;
    }
    const href = safePath(params.get("path"));
    if (this.options.runtimeOf(pathOf(href)) === "client") {
      // Not a server route: let the browser load it as a document.
      this.sendLoad(res, href);
      return;
    }
    const client = this.clientOf(req);
    let perClient = 0;
    for (const s of this.sessions.values()) if (s.client === client) perClient++;
    if ((client !== "" && perClient >= this.maxPerClient) || (this.sessions.size >= this.maxSessions && !this.evictDisconnected())) {
      res.statusCode = 503;
      res.setHeader("Retry-After", "5");
      res.end();
      return;
    }
    const headers = headersOf(req);
    if (!(await this.authorized(href, headers))) {
      // Middleware would redirect / reject this route: let the browser ask for it over HTTP.
      this.sendLoad(res, href);
      return;
    }
    const session = new LiveSession(this, this.interval);
    session.credentials = credentialsOf(req);
    session.headers = headers;
    session.client = client;
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
        authorize: this.options.authorize ? (target) => this.authorized(target, session.headers) : undefined,
        onNavigate: (to, action, runtime, delta) => {
          if (!isAppPath(to)) return;
          if (runtime === "client") {
            // The browser loads the route as a new document (client route, or middleware's call); this session is done.
            session.send({ t: "load", href: this.basePath + to });
            setTimeout(() => this.dispose(session), 0);
          } else if (action === "pop" && delta !== undefined && delta !== 0) session.send({ t: "go", delta });
          else session.send({ t: "url", href: this.basePath + to, replace: action === "replace" || action === "pop" });
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
    const raw = await withTimeout(readRequestBody(req, MAX_BODY), BODY_TIMEOUT_MS);
    if (raw === null || raw === "timeout") {
      res.statusCode = raw === null ? 413 : 408;
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
      res.statusCode = body === null || !Array.isArray(body) ? 400 : 413;
      res.end();
      return;
    }
    if (!session.takeTokens(Math.max(1, body.length))) {
      res.statusCode = 429;
      res.setHeader("Retry-After", "1");
      res.end();
      return;
    }
    if (!(await this.recheck(session, req))) {
      const href = session.app?.history.location.href ?? "/";
      session.send({ t: "load", href: this.basePath + href });
      this.dispose(session);
      res.statusCode = 403;
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
