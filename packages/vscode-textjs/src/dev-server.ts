/**
 * Talks to a running `text dev`: discovery via `/__textjs/status`, the frame
 * stream via SSE `/__textjs/frames`, and input via `POST /__textjs/input`.
 * Pure Node (no `vscode`) so it can be tested against a real dev server.
 */

import { request as httpRequest, type IncomingMessage } from "node:http";
import { realpathSync } from "node:fs";
import {
  FRAMES_PATH,
  FrameDecoder,
  INPUT_PATH,
  isWireFrame,
  MIRROR_HEADER,
  STATUS_PATH,
  type DevStatus,
  type FrameMeta,
  type InputMessage,
} from "@textjs/next/frame-protocol";
import type { StyledFrame } from "@textjs/core";
import { SseParser } from "./sse";

export const DEFAULT_PORTS: readonly number[] = Array.from({ length: 11 }, (_, i) => 3000 + i);

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

/** Fetch `/__textjs/status`, or `null` when nothing (or something else) answers. */
export async function probe(baseUrl: string, timeoutMs = 600): Promise<DevStatus | null> {
  const res = await get(`${baseUrl.replace(/\/$/, "")}${STATUS_PATH}`, timeoutMs);
  if (!res || res.status !== 200) return null;
  try {
    const s = JSON.parse(res.body) as DevStatus;
    return s && s.name === "textjs" ? s : null;
  } catch {
    return null;
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
export async function discover(roots: readonly string[], options: { url?: string; ports?: readonly number[]; host?: string } = {}): Promise<Discovered | null> {
  if (options.url) {
    const status = await probe(options.url);
    return status ? { url: options.url.replace(/\/$/, ""), status } : null;
  }
  // `localhost` can resolve to ::1 while Vite listens on 127.0.0.1 (or another process owns ::1), so try both.
  const hosts = options.host ? [options.host] : ["localhost", "127.0.0.1"];
  const found = await Promise.all(
    (options.ports ?? DEFAULT_PORTS).flatMap((port) =>
      hosts.map(async (host) => {
        const url = `http://${host}:${port}`;
        const status = await probe(url);
        return status ? { url, status } : null;
      }),
    ),
  );
  const hits = found.filter((d): d is Discovered => d !== null);
  return hits.find((d) => roots.some((r) => sameRoot(r, d.status.root))) ?? null;
}

export async function postInput(baseUrl: string, msg: InputMessage, source?: string): Promise<boolean> {
  const body = JSON.stringify(source ? { ...msg, source } : msg);
  return new Promise((resolve) => {
    const req = httpRequest(
      `${baseUrl}${INPUT_PATH}`,
      { method: "POST", agent: false, timeout: 2000, headers: { "content-type": "application/json", [MIRROR_HEADER]: "1", "content-length": Buffer.byteLength(body) } },
      (res) => {
        res.resume();
        resolve(res.statusCode === 204);
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
    req.end(body);
  });
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
  /** The tab whose frames arrived most recently. */
  readonly activeSource: string | null;
  current(): LiveFrame | null;
  close(): void;
}

/** Subscribe to `/__textjs/frames`. `onClose` fires once when the stream ends for any reason. */
export function connectFrameStream(baseUrl: string, handlers: FrameStreamHandlers): FrameStreamConnection {
  const decoders = new Map<string, FrameDecoder>();
  const parser = new SseParser();
  let active: string | null = null;
  let closed = false;
  let res: IncomingMessage | null = null;

  const finish = (): void => {
    if (closed) return;
    closed = true;
    handlers.onClose();
  };

  const req = httpRequest(`${baseUrl}${FRAMES_PATH}`, { method: "GET", agent: false, headers: { accept: "text/event-stream" } }, (r) => {
    res = r;
    if (r.statusCode !== 200) {
      r.resume();
      finish();
      return;
    }
    r.setEncoding("utf8");
    r.on("data", (chunk: string) => {
      for (const ev of parser.push(chunk)) {
        let data: unknown;
        try {
          data = JSON.parse(ev.data);
        } catch {
          continue;
        }
        if (ev.event === "status") handlers.onStatus(data as DevStatus);
        else if (ev.event === "gone") {
          const id = (data as { source?: string }).source;
          if (typeof id === "string") {
            decoders.delete(id);
            if (active === id) active = null;
            handlers.onSourceGone(id);
          }
        } else if (ev.event === "frame" && isWireFrame(data)) {
          const source = data.source ?? "default";
          let dec = decoders.get(source);
          if (!dec) decoders.set(source, (dec = new FrameDecoder()));
          const frame = dec.apply(data);
          if (!frame) continue;
          active = source;
          handlers.onFrame({ source, frame, meta: dec.meta });
        }
      }
    });
    r.on("end", finish);
    r.on("close", finish);
    r.on("error", finish);
  });
  req.on("error", finish);
  req.end();

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
      req.destroy();
    },
  };
}
