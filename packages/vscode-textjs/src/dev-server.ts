/**
 * Talks to a running `text dev`: discovery via `/__textjs/status`, the frame
 * stream via SSE `/__textjs/frames`, and input via `POST /__textjs/input`.
 * Pure Node (no `vscode`) so it can be tested against a real dev server.
 */

import { request as httpRequest, type ClientRequest, type IncomingMessage } from "node:http";
import { realpathSync } from "node:fs";
import {
  FRAMES_PATH,
  FrameDecoder,
  INPUT_PATH,
  MIRROR_HEADER,
  parseDevStatus,
  parseWireFrame,
  shouldSwitchSource,
  STATUS_PATH,
  type DevStatus,
  type FrameMeta,
  type InputMessage,
} from "@textjs/app/frame-protocol";
import type { StyledFrame } from "@textjs/core";
import { SseParser, type SseEvent } from "./sse";

export const DEFAULT_PORTS: readonly number[] = Array.from({ length: 11 }, (_, i) => 3000 + i);

/**
 * The origin of a local `text dev` URL, or `null` unless it is `http:` on a
 * loopback host (`localhost`, `*.localhost`, `127.x.x.x`, `[::1]`). The
 * extension streams frames from, and sends keystrokes to, this server, so a
 * workspace setting must not be able to point it anywhere else.
 */
export function loopbackOrigin(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" || u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  const loopback = host === "localhost" || host.endsWith(".localhost") || host === "[::1]" || (/^\d+\.\d+\.\d+\.\d+$/.test(host) && host.startsWith("127."));
  return loopback ? u.origin : null;
}

function get(url: string, timeoutMs: number): Promise<{ status: number; body: string } | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: { status: number; body: string } | null): void => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    try {
      const req = httpRequest(url, { method: "GET", agent: false, timeout: timeoutMs }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c: string) => {
          body += c;
          if (body.length > 1_000_000) req.destroy();
        });
        res.on("end", () => done({ status: res.statusCode ?? 0, body }));
        res.on("error", () => done(null));
      });
      req.on("timeout", () => req.destroy());
      req.on("error", () => done(null));
      req.end();
    } catch {
      done(null);
    }
  });
}

/** The browser URL of `route` (an app path) on the dev server at `origin`, under the app's `basePath`. */
export function appUrl(origin: string, basePath: string | undefined, route: string): string {
  const path = route.startsWith("/") ? route : `/${route}`;
  const base = basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";
  return `${origin.replace(/\/$/, "")}${base}${base && path === "/" ? "" : path}`;
}

export type ProbeResult = { kind: "down" } | { kind: "other" } | { kind: "textjs"; status: DevStatus };

/** What answers at `baseUrl`: nothing, something that isn't `text dev`, or a `text dev` server. */
export async function probeDetailed(baseUrl: string, timeoutMs = 600): Promise<ProbeResult> {
  const res = await get(`${baseUrl.replace(/\/$/, "")}${STATUS_PATH}`, timeoutMs);
  if (!res) return { kind: "down" };
  if (res.status !== 200) return { kind: "other" };
  try {
    const status = parseDevStatus(JSON.parse(res.body));
    return status ? { kind: "textjs", status } : { kind: "other" };
  } catch {
    return { kind: "other" };
  }
}

/** Fetch `/__textjs/status`, or `null` when nothing (or something else) answers. */
export async function probe(baseUrl: string, timeoutMs = 600): Promise<DevStatus | null> {
  const r = await probeDetailed(baseUrl, timeoutMs);
  return r.kind === "textjs" ? r.status : null;
}

/**
 * Exponential backoff for discovery URLs that answer but aren't this
 * project's `text dev` (another app on :3000, another project's server), so
 * idle polling doesn't keep hitting them. Closed ports are cheap and always
 * re-probed, so a server that just started is found on the next tick.
 */
export class DiscoveryBackoff {
  private readonly entries = new Map<string, { until: number; delay: number }>();

  constructor(
    private readonly baseMs = 5_000,
    private readonly maxMs = 20_000,
    private readonly now: () => number = Date.now,
  ) {}

  skip(url: string): boolean {
    const e = this.entries.get(url);
    return e !== undefined && e.until > this.now();
  }
  miss(url: string): void {
    const prev = this.entries.get(url);
    const delay = prev ? Math.min(prev.delay * 2, this.maxMs) : this.baseMs;
    this.entries.set(url, { until: this.now() + delay, delay });
  }
  hit(url: string): void {
    this.entries.delete(url);
  }
  clear(): void {
    this.entries.clear();
  }
}

function canonical(p: string): string {
  let out = p;
  try {
    out = realpathSync(p);
  } catch {}
  return out.replace(/\\/g, "/").replace(/\/$/, "").toLowerCase();
}

export function sameRoot(a: string, b: string): boolean {
  return canonical(a) === canonical(b);
}

export interface Discovered {
  url: string;
  status: DevStatus;
}

/** Find a `text dev` server for one of `roots` (or exactly `url` when configured). */
export interface DiscoverOptions {
  url?: string;
  ports?: readonly number[];
  host?: string;
  backoff?: DiscoveryBackoff;
}

export async function discover(roots: readonly string[], options: DiscoverOptions = {}): Promise<Discovered | null> {
  if (options.url) {
    const url = loopbackOrigin(options.url);
    if (!url) return null;
    const status = await probe(url);
    return status ? { url, status } : null;
  }
  // `localhost` first; it can resolve to ::1 while Vite listens on 127.0.0.1 (or another process owns ::1), so fall back to 127.0.0.1.
  const hosts = options.host ? [options.host] : ["localhost", "127.0.0.1"];
  const backoff = options.backoff;
  const ours = (s: DevStatus): boolean => roots.some((r) => sameRoot(r, s.root));
  const found = await Promise.all(
    (options.ports ?? DEFAULT_PORTS).map(async (port): Promise<Discovered | null> => {
      for (const host of hosts) {
        const url = `http://${host}:${port}`;
        if (backoff?.skip(url)) continue;
        const r = await probeDetailed(url);
        if (r.kind === "textjs" && ours(r.status)) {
          backoff?.hit(url);
          return { url, status: r.status };
        }
        if (r.kind === "down") backoff?.hit(url);
        else backoff?.miss(url);
      }
      return null;
    }),
  );
  return found.find((d): d is Discovered => d !== null) ?? null;
}

export async function postInput(baseUrl: string, msg: InputMessage, source?: string): Promise<boolean> {
  return (await postInputStatus(baseUrl, msg, source)) === 204;
}

/** `POST` one input message and return the HTTP status (`0` when the request never completed). */
function postInputStatus(baseUrl: string, msg: InputMessage, source?: string): Promise<number> {
  const origin = loopbackOrigin(baseUrl);
  if (!origin) return Promise.resolve(0);
  const body = JSON.stringify(source ? { ...msg, source } : msg);
  return new Promise((resolve) => {
    try {
      const req = httpRequest(
        `${origin}${INPUT_PATH}`,
        { method: "POST", agent: false, timeout: 2000, headers: { "content-type": "application/json", [MIRROR_HEADER]: "1", "content-length": Buffer.byteLength(body) } },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on("timeout", () => req.destroy());
      req.on("error", () => resolve(0));
      req.end(body);
    } catch {
      resolve(0);
    }
  });
}

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * A `text` message rewritten for `text dev` servers that predate it (`@textjs/app` 1.1.0 and
 * earlier): one key per character when each is a single code point, otherwise a paste (also for newlines or more than 16 characters).
 */
export function legacyTextMessages(text: string): InputMessage[] {
  const parts = Array.from(graphemes.segment(text), (s) => s.segment);
  if (text.includes("\n") || text.length > 16 || !parts.every((g) => [...g].length === 1)) return [{ type: "paste", text }];
  return parts.map((key) => ({ type: "key", key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }));
}

/**
 * Sends live input, falling back to {@link legacyTextMessages} for servers that answer a
 * `text` message with 400. The fallback is remembered per server session.
 */
export class LiveInputSender {
  private readonly legacy = new Set<string>();

  async send(baseUrl: string, msg: InputMessage, source?: string, session: string = baseUrl): Promise<boolean> {
    if (msg.type === "text" && this.legacy.has(session)) return this.sendAll(baseUrl, legacyTextMessages(msg.text), source);
    const status = await postInputStatus(baseUrl, msg, source);
    if (status === 400 && msg.type === "text") {
      this.legacy.add(session);
      return this.sendAll(baseUrl, legacyTextMessages(msg.text), source);
    }
    return status === 204;
  }

  private async sendAll(baseUrl: string, msgs: InputMessage[], source?: string): Promise<boolean> {
    let ok = true;
    for (const m of msgs) ok = (await postInput(baseUrl, m, source)) && ok;
    return ok;
  }
}

export interface LiveFrame {
  source: string;
  frame: StyledFrame;
  meta: FrameMeta;
}

export interface FrameStreamHandlers {
  onFrame(frame: LiveFrame): void;
  onStatus(status: DevStatus): void;
  onSourceGone(source: string): void;
  onClose(): void;
}

export interface FrameStreamConnection {
  readonly url: string;
  /** The mirrored tab: the most recent sender, except that a focused tab is never displaced by an unfocused one. */
  readonly activeSource: string | null;
  current(): LiveFrame | null;
  close(): void;
}

/** Subscribe to `/__textjs/frames`. `onClose` fires once when the stream ends for any reason. */
export function connectFrameStream(baseUrl: string, handlers: FrameStreamHandlers): FrameStreamConnection {
  const decoders = new Map<string, FrameDecoder>();
  /** Arrival order of each source's latest frame (fallback when the active tab closes). */
  const order = new Map<string, number>();
  let tick = 0;
  const parser = new SseParser();
  let active: string | null = null;
  let closed = false;
  let res: IncomingMessage | null = null;

  const finish = (): void => {
    if (closed) return;
    closed = true;
    handlers.onClose();
  };

  const origin = loopbackOrigin(baseUrl);
  let req: ClientRequest | null = null;
  try {
    if (origin) req = httpRequest(`${origin}${FRAMES_PATH}`, { method: "GET", agent: false, headers: { accept: "text/event-stream" } }, onResponse);
  } catch {
    req = null;
  }
  if (req) {
    req.on("error", finish);
    req.end();
  } else queueMicrotask(finish);

  function onResponse(r: IncomingMessage): void {
    res = r;
    if (r.statusCode !== 200) {
      r.resume();
      finish();
      return;
    }
    r.setEncoding("utf8");
    r.on("data", (chunk: string) => {
      let events: SseEvent[];
      try {
        events = parser.push(chunk);
      } catch {
        // A runaway event: drop the connection (the monitor reconnects).
        r.destroy();
        finish();
        return;
      }
      for (const ev of events) {
        let data: unknown;
        try {
          data = JSON.parse(ev.data);
        } catch {
          continue;
        }
        if (ev.event === "status") {
          const status = parseDevStatus(data);
          if (status) handlers.onStatus(status);
        }
        else if (ev.event === "gone") {
          const id = (data as { source?: unknown } | null)?.source;
          if (typeof id === "string") {
            decoders.delete(id);
            order.delete(id);
            if (active === id) {
              // Fall back to the tab that sent a frame most recently (or none: the preview clears).
              active = null;
              let best = -1;
              for (const [s, t] of order) {
                if (t > best && decoders.get(s)?.frame) {
                  best = t;
                  active = s;
                }
              }
            }
            handlers.onSourceGone(id);
          }
        } else if (ev.event === "frame") {
          const wire = parseWireFrame(data);
          if (!wire) continue;
          const source = wire.source ?? "default";
          let dec = decoders.get(source);
          if (!dec) decoders.set(source, (dec = new FrameDecoder()));
          const frame = dec.apply(wire);
          if (!frame) continue;
          order.set(source, ++tick);
          const current = active === null ? undefined : decoders.get(active);
          if (active !== source && (!current?.frame || shouldSwitchSource(current.meta, dec.meta))) active = source;
          handlers.onFrame({ source, frame, meta: dec.meta });
        }
      }
    });
    r.on("end", finish);
    r.on("close", finish);
    r.on("error", finish);
  }

  return {
    url: baseUrl,
    get activeSource() {
      return active;
    },
    current() {
      if (active === null) return null;
      const dec = decoders.get(active);
      return dec?.frame ? { source: active, frame: dec.frame, meta: dec.meta } : null;
    },
    close() {
      closed = true;
      res?.destroy();
      req?.destroy();
    },
  };
}
