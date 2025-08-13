/**
 * `text proxy`: a loopback bridge that lets https://textjs.org (and local dev
 * origins) talk to the OpenCode server running on this machine.
 *
 * Browsers block a public page from reading `http://127.0.0.1` unless the
 * server answers CORS and Private Network Access preflights, and the desktop
 * daemon additionally requires Basic auth. The bridge adds both, while
 * rejecting every other origin. The daemon password is read into memory only:
 * it is never logged, never returned to the browser and never written to disk.
 */

import { execFile } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { color } from "./ui";

export const DEFAULT_PROXY_PORT = 4096;
export const BRIDGE_HEADER = "x-textjs-bridge";
export const CLIENT_HEADER = "x-opencode-client";
export const MAX_BODY_BYTES = 4 * 1024 * 1024;

export const DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
  "https://textjs.org",
  "https://www.textjs.org",
  "https://textjs-avg.pages.dev",
  "https://*.textjs-avg.pages.dev",
  "http://localhost:*",
  "http://127.0.0.1:*",
];

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const FORWARD_REQUEST_HEADERS = ["accept", "content-type", "last-event-id", "x-opencode-directory"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "location", "x-request-id"];

export interface BridgeTarget {
  url: string;
  /** How the target was found. */
  source: "service" | "flag" | "env";
  /** `Basic …` header value; memory only. */
  authorization?: string;
}

export interface BridgeOptions {
  port?: number;
  host?: string;
  /** Explicit OpenCode server URL (skips daemon discovery). */
  target?: string;
  /** Extra allowed browser origins (`https://example.com`, `http://localhost:*`). */
  allowOrigins?: readonly string[];
  /** Override discovery (tests). */
  discover?: () => Promise<BridgeTarget | null>;
  /** Re-run discovery after this long (default 30s). */
  cacheMs?: number;
  log?: boolean;
}

/** Strip the port from a `Host` header: `localhost:4096` → `localhost`, `[::1]:4096` → `[::1]`. */
export function hostnameOf(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    return end > 0 ? h.slice(0, end + 1) : h;
  }
  return h.replace(/:\d*$/, "");
}

function matchOrigin(origin: string, pattern: string): boolean {
  if (pattern === origin) return true;
  let o: URL;
  try {
    o = new URL(origin);
  } catch {
    return false;
  }
  const m = /^(https?):\/\/(\*\.)?([^:/]+)(?::(\*|\d+))?$/.exec(pattern);
  if (!m) return false;
  const [, scheme, wildcard, host, port] = m;
  if (o.protocol !== `${scheme}:`) return false;
  if (wildcard ? !o.hostname.endsWith(`.${host}`) : o.hostname !== host) return false;
  if (port === "*") return true;
  return o.port === (port ?? "");
}

/** Whether a browser `Origin` may use the bridge. */
export function isAllowedOrigin(origin: string, extra: readonly string[] = []): boolean {
  if (origin === "null") return false;
  for (const p of DEFAULT_ALLOWED_ORIGINS) if (matchOrigin(origin, p)) return true;
  for (const p of extra) if (matchOrigin(origin, p)) return true;
  return false;
}

/** CORS + Private Network Access headers for an allowed origin. */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-private-network": "true",
    "access-control-allow-methods": "GET, HEAD, POST, PATCH, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": `Content-Type, Accept, Last-Event-ID, ${CLIENT_HEADER}`,
    "access-control-expose-headers": BRIDGE_HEADER,
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

/** `http://0.0.0.0:49374` → `http://127.0.0.1:49374`; picks the first URL in CLI output. */
export function normalizeTargetUrl(raw: string): string | null {
  const word = raw.split(/\s+/).find((s) => /^https?:\/\//i.test(s));
  if (!word) return null;
  try {
    const u = new URL(word);
    if (u.hostname === "0.0.0.0" || u.hostname === "[::]") u.hostname = "127.0.0.1";
    return u.origin;
  } catch {
    return null;
  }
}

function run(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile("opencode", args, { timeout: 4000, windowsHide: true }, (error, stdout) => resolve(error ? "" : String(stdout).trim()));
  });
}

/** Find the running OpenCode daemon (`opencode service status`), else `--target`, else `$OPENCODE_SERVER_URL`. */
export async function discoverOpencode(target?: string): Promise<BridgeTarget | null> {
  const explicit = target ? normalizeTargetUrl(/^https?:\/\//i.test(target) ? target : `http://${target}`) : null;
  const service = normalizeTargetUrl(await run(["service", "status"]));
  if (service && (!explicit || explicit === service)) {
    const password = await run(["service", "get", "password"]);
    return { url: service, source: "service", authorization: password ? `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}` : undefined };
  }
  if (explicit) return { url: explicit, source: "flag" };
  const env = normalizeTargetUrl(process.env.OPENCODE_SERVER_URL ?? "");
  return env ? { url: env, source: "env" } : null;
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
}

async function readBody(request: Request, limit = MAX_BODY_BYTES): Promise<ArrayBuffer | null> {
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out.buffer;
}

export interface BridgeHandler {
  (request: Request): Promise<Response>;
  /** The current (cached) target, discovering it if needed. */
  target(force?: boolean): Promise<BridgeTarget | null>;
}

/** The bridge as a Web `Request → Response` handler. */
export function createBridgeHandler(options: BridgeOptions = {}): BridgeHandler {
  const discover = options.discover ?? (() => discoverOpencode(options.target));
  const cacheMs = options.cacheMs ?? 30_000;
  const extra = options.allowOrigins ?? [];
  let cached: { target: BridgeTarget | null; at: number } | null = null;

  const target = async (force = false): Promise<BridgeTarget | null> => {
    if (!force && cached && Date.now() - cached.at < cacheMs) return cached.target;
    cached = { target: await discover(), at: Date.now() };
    return cached.target;
  };

  const handler = (async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    if (!LOOPBACK_HOSTNAMES.has(hostnameOf(host))) return json(403, { error: "Forbidden host" });
    const origin = request.headers.get("origin");
    if (origin !== null && !isAllowedOrigin(origin, extra)) return json(403, { error: "Origin not allowed" });
    const cors: Record<string, string> = { [BRIDGE_HEADER]: "1", ...(origin !== null ? corsHeaders(origin) : {}) };
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/__bridge") {
      const t = await target();
      return json(200, { bridge: "textjs", target: t?.url ?? null, connected: t !== null }, cors);
    }
    if (!SAFE_METHODS.has(method) && request.headers.get(CLIENT_HEADER) !== "1") return json(403, { error: `Missing ${CLIENT_HEADER} header` }, cors);

    let t = await target();
    if (t === null) t = await target(true);
    if (t === null) return json(502, { error: "No OpenCode server found. Start `opencode` or pass --target." }, cors);

    const headers = new Headers();
    for (const h of FORWARD_REQUEST_HEADERS) {
      const v = request.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (t.authorization) headers.set("authorization", t.authorization);
    let body: ArrayBuffer | undefined;
    if (method !== "GET" && method !== "HEAD") {
      if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return json(413, { error: "Payload Too Large" }, cors);
      const read = await readBody(request);
      if (read === null) return json(413, { error: "Payload Too Large" }, cors);
      body = read;
    }

    let upstream: Response;
    try {
      upstream = await fetch(`${t.url}${url.pathname}${url.search}`, { method, headers, body, signal: request.signal, redirect: "manual" });
    } catch (error) {
      if (request.signal.aborted) return new Response(null, { status: 499, headers: cors });
      cached = null;
      return json(502, { error: "OpenCode server unreachable", detail: error instanceof Error ? error.message : String(error) }, cors);
    }
    // The daemon may have restarted with a new port or password.
    if (upstream.status === 401) cached = null;

    const out = new Headers(cors);
    for (const h of FORWARD_RESPONSE_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    out.set("cache-control", "no-cache");
    if ((upstream.headers.get("content-type") ?? "").includes("text/event-stream")) {
      out.set("connection", "keep-alive");
      out.set("x-accel-buffering", "no");
    }
    return new Response(method === "HEAD" ? null : upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  }) as BridgeHandler;
  handler.target = target;
  return handler;
}

async function serveNode(handler: BridgeHandler, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const abort = new AbortController();
  res.on("close", () => abort.abort());
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(", "));
  }
  const method = (req.method ?? "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const body = hasBody
    ? new ReadableStream<Uint8Array>({
        start(controller) {
          req.on("data", (c: Buffer) => controller.enqueue(new Uint8Array(c)));
          req.on("end", () => controller.close());
          req.on("error", (e) => controller.error(e));
        },
        cancel() {
          req.destroy();
        },
      })
    : undefined;
  const request = new Request(`http://${req.headers.host ?? "127.0.0.1"}${req.url ?? "/"}`, {
    method,
    headers,
    body,
    signal: abort.signal,
    ...(body ? { duplex: "half" } : {}),
  } as RequestInit);
  const response = await handler(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) {
    res.end();
    return;
  }
  res.flushHeaders();
  const reader = response.body.getReader();
  const cancel = (): void => {
    reader.cancel().catch(() => undefined);
  };
  res.on("close", cancel);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || res.writableEnded || res.destroyed) break;
      res.write(value);
    }
  } catch {
    // client disconnected mid-stream
  } finally {
    res.off("close", cancel);
  }
  res.end();
}

export interface StartedBridge {
  server: Server;
  url: string;
  target: BridgeTarget | null;
  close(): Promise<void>;
}

/** Start the bridge on `127.0.0.1:<port>`. */
export async function startProxy(options: BridgeOptions = {}): Promise<StartedBridge> {
  const handler = createBridgeHandler(options);
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? DEFAULT_PROXY_PORT;
  const target = await handler.target();
  if (target) {
    const t = new URL(target.url);
    if (LOOPBACK_HOSTNAMES.has(t.hostname) && Number(t.port) === port) {
      throw new Error(`The OpenCode server already uses port ${port}. Pick another with --port.`);
    }
  }
  const server = createServer((req, res) => {
    serveNode(handler, req, res).catch((error: unknown) => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
      }
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const addr = server.address() as AddressInfo;
  const url = `http://${host === "::1" ? "[::1]" : host}:${addr.port}`;
  if (options.log !== false) {
    const dest = target ? `${target.url}${target.source === "service" ? color.dim(" (opencode service)") : ""}` : color.yellow("no server yet — start opencode");
    console.log(`\n   ${color.bold("▼ Text.js OpenCode Bridge")}\n\n   ${url} ${color.dim("→")} ${dest}\n   ${color.dim("Open https://textjs.org/opencode to connect.")}\n`);
  }
  return {
    server,
    url,
    target,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}
