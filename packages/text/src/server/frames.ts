/**
 * Dev-only frame mirror endpoints for editor previews (the VS Code extension).
 *
 * - `GET  /__textjs/frames` — server-sent events: `frame` ({@link WireFrame}) and `status` ({@link DevStatus}).
 * - `POST /__textjs/input`  — forward an {@link InputMessage} to the browser tab(s).
 * - `GET  /__textjs/status` — {@link DevStatus} JSON.
 *
 * Loopback peers only, addressed by a loopback `Host` (so DNS rebinding can't
 * reach them even when Vite's `allowedHosts` is relaxed). Browsers can't reach
 * them cross-origin: SSE and status send no CORS headers, Fetch Metadata
 * rejects cross-site and `no-cors` requests, and input requires a JSON body
 * plus a custom header, so a foreign page can't send keystrokes with a simple
 * request. Tabs only encode frames while at least one editor is watching.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { isIP } from "node:net";
import type { ViteDevServer } from "vite";
import { VERSION } from "@textjs/core";
import {
  encodeFullFrame,
  FrameDecoder,
  FRAMES_PATH,
  HMR_FRAME_EVENT,
  HMR_HELLO_EVENT,
  HMR_INPUT_EVENT,
  HMR_MIRROR_EVENT,
  INPUT_PATH,
  isAppPath,
  isSourceId,
  MIRROR_HEADER,
  parseWireFrame,
  parseInputMessage,
  shouldSwitchSource,
  STATUS_PATH,
  type DevStatus,
  type FrameMeta,
  type WireFrame,
} from "../frame-protocol";

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const MAX_INPUT_BYTES = 128 * 1024;
const HEARTBEAT_MS = 15_000;

export function isLoopbackAddress(address: string | undefined): boolean {
  return address !== undefined && (LOOPBACK.has(address) || address.startsWith("127."));
}

/**
 * `Host` names the loopback interface: `localhost`, `*.localhost`, `127.x.x.x`
 * or `[::1]`, with an optional port. Anything else may be a rebound DNS name.
 */
export function isLoopbackHost(host: string | undefined): boolean {
  if (!host) return false;
  const m = /^(\[[^\]]*\]|[^:[\]]+)(?::\d{1,5})?$/.exec(host.trim().toLowerCase());
  if (!m) return false;
  const name = m[1] as string;
  if (name === "[::1]") return true;
  if (name === "localhost" || name.endsWith(".localhost")) return true;
  return isIP(name) === 4 && name.startsWith("127.");
}

/**
 * Fetch Metadata: browsers label every request. Only same-origin requests and
 * user-initiated ones (`none`) are accepted, and never `no-cors` loads of the
 * stream (`<img>`, `fetch(..., { mode: "no-cors" })` omit `Origin`). Clients
 * that send no metadata (editors, curl) pass.
 */
export function isFetchMetadataAllowed(req: Pick<IncomingMessage, "headers">, pathname: string): boolean {
  const site = req.headers["sec-fetch-site"];
  if (site !== undefined && site !== "same-origin" && site !== "none") return false;
  if (pathname === FRAMES_PATH && req.headers["sec-fetch-mode"] === "no-cors") return false;
  return true;
}

/** `Origin` is absent (editors, curl) or the dev server's own origin. */
export function isSameOriginRequest(req: Pick<IncomingMessage, "headers">): boolean {
  const origin = req.headers.origin;
  if (origin === undefined) return true;
  const host = req.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

interface Source {
  id: string;
  decoder: FrameDecoder;
  client: { send(event: string, payload?: unknown): void };
  updatedAt: number;
  /** Size and path reported by `textjs:hello` (kept current while nobody watches). */
  grid: { width: number; height: number } | null;
  path: string | null;
}

export interface FrameStream {
  /** Connected editors. */
  readonly watchers: number;
  status(): DevStatus;
  close(): void;
}

function readBody(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Register the frame mirror middleware and HMR channel on a Vite dev server. */
export function attachFrameStream(server: ViteDevServer, root: string): FrameStream {
  const sources = new Map<string, Source>();
  const watchers = new Set<ServerResponse>();
  let latest: Source | null = null;

  const status = (): DevStatus => {
    const f = latest?.decoder.frame ?? null;
    return {
      name: "textjs",
      version: VERSION,
      root,
      clients: server.ws.clients.size,
      sources: sources.size,
      watchers: watchers.size,
      grid: f ? { width: f.width, height: f.height } : (latest?.grid ?? null),
      path: latest?.decoder.meta.path ?? latest?.path ?? null,
    };
  };

  const write = (res: ServerResponse, event: string, data: unknown): void => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const broadcast = (event: string, data: unknown): void => {
    for (const res of watchers) write(res, event, data);
  };
  const announce = (): void => {
    server.ws.send(HMR_MIRROR_EVENT, { active: watchers.size > 0 });
  };

  type Client = Source["client"];
  const mostRecent = (): Source | null => [...sources.values()].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  const sourceFor = (id: string, client: Client): Source => {
    let src = sources.get(id);
    if (src?.client === client) return src;
    if (src) src.client = client;
    else {
      src = { id, decoder: new FrameDecoder(), client, updatedAt: Date.now(), grid: null, path: null };
      sources.set(id, src);
    }
    // A tab that reconnects keeps its id on a new socket: only the socket that currently owns the source may remove it.
    const socket = (client as { socket?: { once?(e: string, cb: () => void): void } }).socket;
    socket?.once?.("close", () => {
      const gone = sources.get(id);
      if (!gone || gone.client !== client) return;
      sources.delete(id);
      if (latest === gone) latest = mostRecent();
      broadcast("gone", { source: id });
      broadcast("status", status());
    });
    return src;
  };
  const metaOf = (src: Source | null): FrameMeta | null => (src ? src.decoder.meta : null);

  server.ws.on(HMR_HELLO_EVENT, (data: unknown, client) => {
    client.send(HMR_MIRROR_EVENT, { active: watchers.size > 0 });
    const d = (data ?? {}) as { source?: unknown; grid?: { width?: unknown; height?: unknown }; path?: unknown };
    if (isSourceId(d.source)) {
      const src = sourceFor(d.source, client);
      const w = d.grid?.width;
      const h = d.grid?.height;
      if (Number.isInteger(w) && Number.isInteger(h) && (w as number) > 0 && (h as number) > 0 && (w as number) <= 1000 && (h as number) <= 1000) {
        src.grid = { width: w as number, height: h as number };
      }
      if (isAppPath(d.path)) src.path = d.path;
      src.updatedAt = Date.now();
      if (latest === null || latest === src || shouldSwitchSource(metaOf(latest), {})) latest = src;
    }
    broadcast("status", status());
  });

  server.ws.on(HMR_FRAME_EVENT, (raw: unknown, client) => {
    const data = parseWireFrame(raw);
    if (!data || data.source === undefined) return;
    const src = sourceFor(data.source, client);
    if (src.decoder.apply(data) === null) return;
    src.updatedAt = Date.now();
    const switched = latest !== src && shouldSwitchSource(metaOf(latest), src.decoder.meta);
    if (switched) latest = src;
    broadcast("frame", data);
    if (data.full || switched) broadcast("status", status());
  });

  const heartbeat = setInterval(() => {
    for (const res of watchers) res.write(": ♥\n\n");
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  const reject = (res: ServerResponse, code: number, message: string): void => {
    res.statusCode = code;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(message);
  };

  server.middlewares.use((req, res, next) => {
    const pathname = (req.url ?? "/").split("?")[0];
    if (pathname !== FRAMES_PATH && pathname !== INPUT_PATH && pathname !== STATUS_PATH) return next();
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!isLoopbackAddress(req.socket.remoteAddress) || !isLoopbackHost(req.headers.host) || !isSameOriginRequest(req) || !isFetchMetadataAllowed(req, pathname as string)) {
      return reject(res, 403, "▼ Text.js: the frame mirror only accepts local requests.");
    }

    if (pathname === STATUS_PATH) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify(status()));
      return;
    }

    if (pathname === FRAMES_PATH) {
      if (req.method !== "GET") return reject(res, 405, "Method Not Allowed");
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write("retry: 1000\n\n");
      watchers.add(res);
      write(res, "status", status());
      // The latest source last: editors mirror whichever tab sent the most recent frame.
      for (const src of [...sources.values()].filter((s) => s !== latest).concat(latest ? [latest] : [])) {
        const f = src.decoder.frame;
        if (f) write(res, "frame", encodeFullFrame(f, { source: src.id, meta: src.decoder.meta, seq: src.decoder.seq }) satisfies WireFrame);
      }
      if (watchers.size === 1) announce();
      req.on("close", () => {
        if (!watchers.delete(res) || watchers.size > 0) return;
        // Tabs stop streaming now, so these frames go stale: keep the size and path for status, and
        // wait for the full frames tabs send when the next editor subscribes.
        for (const src of sources.values()) {
          const f = src.decoder.frame;
          if (f) src.grid = { width: f.width, height: f.height };
          if (src.decoder.meta.path) src.path = src.decoder.meta.path;
          src.decoder.reset();
        }
        announce();
      });
      return;
    }

    if (req.method !== "POST") return reject(res, 405, "Method Not Allowed");
    if (!(req.headers["content-type"] ?? "").startsWith("application/json") || req.headers[MIRROR_HEADER] !== "1") {
      return reject(res, 400, `▼ Text.js: send JSON with the ${MIRROR_HEADER}: 1 header.`);
    }
    void readBody(req, MAX_INPUT_BYTES).then(
      (body) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          return reject(res, 400, "Invalid JSON");
        }
        const target = (parsed as { source?: unknown })?.source;
        const msg = parseInputMessage(parsed);
        if (!msg) return reject(res, 400, "Invalid input message");
        // Never broadcast: input for a tab that just closed (or when no tab is connected) is dropped.
        const src = target === undefined ? latest : typeof target === "string" ? (sources.get(target) ?? null) : null;
        if (!src) return reject(res, 404, "Unknown source");
        src.client.send(HMR_INPUT_EVENT, msg);
        res.statusCode = 204;
        res.end();
      },
      () => reject(res, 413, "Payload Too Large"),
    );
  });

  return {
    get watchers() {
      return watchers.size;
    },
    status,
    close() {
      clearInterval(heartbeat);
      for (const res of watchers) res.end();
      watchers.clear();
    },
  };
}
