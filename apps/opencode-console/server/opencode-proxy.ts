/**
 * Server-only OpenCode proxy shared by the `text dev` middleware (`/__opencode/*`)
 * and the `app/api/opencode/[...path]` route handler (`text start`).
 *
 * The OpenCode service password lives only in this module's memory: it is
 * never logged, never returned to the browser and never written to disk.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { discoverOpencode, normalizeTargetUrl, probeOpenCode, selectsTarget,readCliKeys } from "@textjs/opencode";

export { normalizeTargetUrl };

export type ProxyMode = "service" | "direct";

export interface ProxyTarget {
  url: string;
  mode: ProxyMode;
  /** `Basic …` header value; server memory only. */
  authorization?: string;
}

export interface ProxyStatus {
  connected: boolean;
  targetUrl: string;
  mode: ProxyMode | "demo";
  /** Upstream status on failure (0 = unreachable, 415 = not OpenCode). */
  upstreamStatus?: number;
}

export interface OpencodeProxyOptions {
  /** Override discovery (tests, custom daemons). */
  discover?: () => Promise<ProxyTarget>;
  /** Cache discovery results for this long (default 30s). */
  cacheMs?: number;
}

const DEFAULT_URL = "http://127.0.0.1:4096";
const TARGET_HEADER = "x-opencode-target";
const FORWARD_REQUEST_HEADERS = ["accept", "content-type", "last-event-id", "x-opencode-directory", "x-opencode-client"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "location", "x-request-id"];
/** Required on state-changing requests: a custom header forces a CORS preflight, defeating cross-site form / `fetch` CSRF. */
export const CLIENT_HEADER = "x-opencode-client";
export const MAX_BODY_BYTES = 4 * 1024 * 1024;
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Strip the port from a `Host` header: `localhost:3001` → `localhost`, `[::1]:3001` → `[::1]`. */
export function hostnameOf(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    return end > 0 ? h.slice(0, end + 1) : h;
  }
  return h.replace(/:\d*$/, "");
}

/**
 * Browser-facing request guard: loopback `Host` only (DNS rebinding), same-origin
 * `Sec-Fetch-Site` only (cross-site reads), and the client header on writes (CSRF).
 */
export function guardRequest(request: Request): Response | null {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (!LOOPBACK_HOSTNAMES.has(hostnameOf(host))) return Response.json({ error: "Forbidden host" }, { status: 403 });
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin" && site !== "none") return Response.json({ error: "Cross-site requests are not allowed" }, { status: 403 });
  if (!SAFE_METHODS.has(request.method.toUpperCase()) && request.headers.get(CLIENT_HEADER) !== "1") {
    return Response.json({ error: `Missing ${CLIENT_HEADER} header` }, { status: 403 });
  }
  return null;
}

export class PayloadTooLargeError extends Error {
  constructor() {
    super("Payload Too Large");
  }
}

/** Read a Web `Request` body, refusing anything over `limit` bytes (even without `content-length`). */
async function readRequestBody(request: Request, limit = MAX_BODY_BYTES): Promise<ArrayBuffer> {
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
      throw new PayloadTooLargeError();
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

/** Honor explicit configuration, otherwise discover the daemon or try the standard foreground port. */
export async function discoverTarget(): Promise<ProxyTarget> {
  const t = await discoverOpencode();
  return { url: t?.url ?? DEFAULT_URL, mode: t?.source === "service" ? "service" : "direct", authorization: t?.authorization };
}

function isLoopback(url: URL): boolean {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "::1";
}

export interface OpencodeProxy {
  /** Handle `subpath` (`/_status`, `/api/session`, `/api/event`, …). */
  handle(request: Request, subpath: string): Promise<Response>;
  status(): Promise<ProxyStatus>;
}

export function createOpencodeProxy(options: OpencodeProxyOptions = {}): OpencodeProxy {
  const discover = options.discover ?? discoverTarget;
  const cacheMs = options.cacheMs ?? 30_000;
  let cached: { target: ProxyTarget; at: number } | null = null;

  const target = async (force = false): Promise<ProxyTarget> => {
    if (!force && cached && Date.now() - cached.at < cacheMs) return cached.target;
    cached = { target: await discover(), at: Date.now() };
    return cached.target;
  };

  const status = async (): Promise<ProxyStatus> => {
    const wasCached = cached !== null && Date.now() - cached.at < cacheMs;
    let t = await target();
    let code = await probeOpenCode(t);
    // The daemon may have restarted with a new port or credential.
    if (wasCached && t.mode === "service" && (code === 0 || code === 401)) {
      t = await target(true);
      code = await probeOpenCode(t);
    }
    const connected = code >= 200 && code < 300;
    return { connected, targetUrl: t.url, mode: connected ? t.mode : "demo", upstreamStatus: connected ? undefined : code };
  };

  const handle = async (request: Request, subpath: string): Promise<Response> => {
    const denied = guardRequest(request);
    if (denied) return denied;
    const incoming = new URL(request.url);
    if(subpath==="/__textjs/keys")return request.method==="GET"?Response.json(await readCliKeys(),{headers:{"cache-control":"no-store"}}):new Response(null,{status:405});
    if (subpath === "/_status") {
      return Response.json(await status(), { headers: { "cache-control": "no-store" } });
    }
    const wasCached = cached !== null && Date.now() - cached.at < cacheMs;
    const discovered = await target();
    let base = discovered.url;
    let authorization = discovered.authorization;
    const custom = request.headers.get(TARGET_HEADER);
    if (custom) {
      let u: URL;
      try {
        u = new URL(custom);
      } catch {
        return Response.json({ error: "Invalid target URL" }, { status: 400 });
      }
      const origin = normalizeTargetUrl(u.origin);
      if (!origin || !isLoopback(new URL(origin))) return Response.json({ error: "Only loopback OpenCode servers can be proxied" }, { status: 403 });
      // For loopback aliases of the discovered target, send to `discovered.url` rather than an alternate interface.
      if (!selectsTarget(origin, discovered.url)) {
        authorization = undefined;
        base = origin;
      }
    }

    const buildHeaders = (auth?: string): Headers => {
      const h = new Headers();
      for (const k of FORWARD_REQUEST_HEADERS) {
        const v = request.headers.get(k);
        if (v) h.set(k, v);
      }
      if (auth) h.set("authorization", auth);
      return h;
    };
    const method = request.method.toUpperCase();
    let body: ArrayBuffer | undefined;
    if (method !== "GET" && method !== "HEAD") {
      const declared = Number(request.headers.get("content-length") ?? 0);
      if (declared > MAX_BODY_BYTES) return Response.json({ error: "Payload Too Large" }, { status: 413 });
      try {
        body = await readRequestBody(request);
      } catch (error) {
        if (error instanceof PayloadTooLargeError) return Response.json({ error: "Payload Too Large" }, { status: 413 });
        throw error;
      }
    }

    const canRetry = !custom && wasCached && discovered.mode === "service" && SAFE_METHODS.has(method);
    let upstream: Response;
    try {
      upstream = await fetch(`${base}${subpath}${incoming.search}`, { method, headers: buildHeaders(authorization), body, signal: request.signal, redirect: "manual" });
    } catch (error) {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      cached = null;
      if (canRetry) {
        const refreshed = await target(true);
        try {
          upstream = await fetch(`${refreshed.url}${subpath}${incoming.search}`, { method, headers: buildHeaders(refreshed.authorization), body, signal: request.signal, redirect: "manual" });
        } catch (retryError) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          cached = null;
          return Response.json({ error: "OpenCode server unreachable", targetUrl: refreshed.url, detail: retryError instanceof Error ? retryError.message : String(retryError) }, { status: 502 });
        }
      } else {
        return Response.json({ error: "OpenCode server unreachable", targetUrl: base, detail: error instanceof Error ? error.message : String(error) }, { status: 502 });
      }
    }
    if (upstream.status === 401 && !custom) {
      cached = null;
      if (canRetry) {
        const refreshed = await target(true);
        if (refreshed.url !== base || refreshed.authorization !== authorization) {
          await upstream.body?.cancel().catch(() => undefined);
          try {
            upstream = await fetch(`${refreshed.url}${subpath}${incoming.search}`, { method, headers: buildHeaders(refreshed.authorization), body, signal: request.signal, redirect: "manual" });
          } catch (retryError) {
            if (request.signal.aborted) return new Response(null, { status: 499 });
            cached = null;
            return Response.json({ error: "OpenCode server unreachable", targetUrl: refreshed.url, detail: retryError instanceof Error ? retryError.message : String(retryError) }, { status: 502 });
          }
        }
      }
    }

    const out = new Headers();
    for (const h of FORWARD_RESPONSE_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    const sse = (upstream.headers.get("content-type") ?? "").includes("text/event-stream");
    out.set("cache-control", "no-cache");
    if (sse) {
      out.set("connection", "keep-alive");
      out.set("x-accel-buffering", "no");
    }
    return new Response(method === "HEAD" ? null : upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  };

  return { handle, status };
}

let shared: OpencodeProxy | null = null;

/** The process-wide proxy (one discovery cache per dev / start server). */
export function getOpencodeProxy(): OpencodeProxy {
  shared ??= createOpencodeProxy();
  return shared;
}

type Next = (error?: unknown) => void;

/** Connect middleware for Vite: proxies `${prefix}/*`, streaming SSE through unbuffered. */
export function opencodeDevMiddleware(prefix = "/__opencode", proxy?: OpencodeProxy): (req: IncomingMessage, res: ServerResponse, next: Next) => void {
  return (req, res, next) => {
    const url = req.url ?? "/";
    if (url !== prefix && !url.startsWith(`${prefix}/`) && !url.startsWith(`${prefix}?`)) return next();
    void serveNode(proxy ?? getOpencodeProxy(), req, res, url.slice(prefix.length) || "/").catch((error) => {
      const tooLarge = error instanceof PayloadTooLargeError;
      if (!res.headersSent) {
        res.statusCode = tooLarge ? 413 : 500;
        res.setHeader("content-type", "application/json");
        if (tooLarge) res.setHeader("connection", "close");
      }
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    });
  };
}

async function serveNode(proxy: OpencodeProxy, req: IncomingMessage, res: ServerResponse, rest: string): Promise<void> {
  const abort = new AbortController();
  res.on("close", () => abort.abort());
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const method = (req.method ?? "GET").toUpperCase();
  const href = `http://${req.headers.host ?? "localhost"}${rest.startsWith("/") ? rest : `/${rest}`}`;
  // Refuse forbidden requests before buffering any body.
  const denied = guardRequest(new Request(href, { method, headers }));
  if (denied) {
    req.resume();
    await sendDenied(res, denied);
    return;
  }
  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(req);
  const request = new Request(href, { method, headers, body, signal: abort.signal });
  const q = rest.indexOf("?");
  const response = await proxy.handle(request, q >= 0 ? rest.slice(0, q) : rest);
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

async function sendDenied(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

/** Buffer a request body, refusing anything over `limit` bytes. */
export function readBody(req: IncomingMessage, limit = MAX_BODY_BYTES): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"] ?? 0);
    if (declared > limit) {
      reject(new PayloadTooLargeError());
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    req.on("data", (c: Buffer) => {
      if (failed) return;
      size += c.byteLength;
      if (size > limit) {
        failed = true;
        chunks.length = 0;
        req.pause();
        reject(new PayloadTooLargeError());
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (failed) return;
      const b = Buffer.concat(chunks);
      resolve(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
    });
    req.on("error", reject);
  });
}
