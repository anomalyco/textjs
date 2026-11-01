/**
 * Node HTTP helpers shared by `text dev` middleware and `text start`:
 * Web `Request` / `Response` bridging, route handlers, rewrites and proxying.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { txError } from "@textjs/core";
import type { Rewrite } from "../config";
import type { RouteParams } from "../routing";

export const HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export type RouteHandler = (request: Request, context: { params: RouteParams }) => Response | Promise<Response>;
export type RouteHandlerModule = Partial<Record<HttpMethod, RouteHandler>> & Record<string, unknown>;

/** Set by `middleware.ts` handling (see `server/middleware-node.ts`). */
const WEB_REQUEST = Symbol.for("textjs.webRequest");

/**
 * The request target as a path and query with exactly one leading slash.
 * `//evil.com/x` and `/\evil.com/x` would otherwise resolve to another host
 * against the origin (`request.url` → `http://evil.com/x`); absolute-form
 * targets (`GET http://evil.com/x`) keep only their path and query.
 */
export function normalizeRequestTarget(raw: string | undefined): string {
  let target = raw ?? "/";
  if (!target.startsWith("/")) {
    try {
      const u = new URL(target);
      target = `${u.pathname}${u.search}`;
    } catch {
      return "/";
    }
  }
  return target.replace(/^[/\\]+/, "/");
}

/** Resolve a request target against `origin`, never leaving it. */
export function requestUrl(raw: string | undefined, origin: string): URL {
  const base = new URL(origin);
  const url = new URL(normalizeRequestTarget(raw), base);
  return url.origin === base.origin ? url : new URL("/", base);
}

const HOST_HEADER = /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.?|\[[0-9A-Fa-f:.]+\])(?::\d{1,5})?$/;
const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

/** A syntactically valid `Host` header (`name[:port]` or `[ipv6][:port]`). */
export function isValidHostHeader(host: string | undefined): host is string {
  return typeof host === "string" && host.length <= 255 && HOST_HEADER.test(host);
}

/** `localhost`, `*.localhost`, IP literals and `allowed` (a leading `.` allows subdomains). */
export function isAllowedHost(hostHeader: string | undefined, allowed: readonly string[] | true = []): boolean {
  if (allowed === true) return true;
  if (!isValidHostHeader(hostHeader)) return false;
  const host = hostHeader.trim().toLowerCase();
  if (host.startsWith("[")) return true;
  const hostname = host.replace(/:\d+$/, "").replace(/\.$/, "");
  if (IPV4.test(hostname) || hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  for (const a of allowed) {
    const name = a.toLowerCase();
    if (name === hostname) return true;
    if (name.startsWith(".") && (name.slice(1) === hostname || hostname.endsWith(name))) return true;
  }
  return false;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.split(",")[0]?.trim() || undefined;
}

export interface OriginOptions {
  /** Fixed public origin (wins over headers). */
  origin?: string;
  /** Read `X-Forwarded-Host` / `X-Forwarded-Proto`. */
  trustProxy?: boolean;
  /** Protocol when not behind a trusted proxy (default `http`). */
  protocol?: "http" | "https";
}

/** The origin a Node request was addressed to (`http://localhost:3000`), from validated headers only. */
export function requestOrigin(req: Pick<IncomingMessage, "headers">, options: OriginOptions = {}): string {
  if (options.origin) return new URL(options.origin).origin;
  let host = firstHeader(req.headers.host);
  let proto = options.protocol ?? "http";
  if (options.trustProxy) {
    const fwdHost = firstHeader(req.headers["x-forwarded-host"]);
    if (isValidHostHeader(fwdHost)) host = fwdHost;
    const fwdProto = firstHeader(req.headers["x-forwarded-proto"])?.toLowerCase();
    if (fwdProto === "http" || fwdProto === "https") proto = fwdProto;
  }
  return `${proto}://${isValidHostHeader(host) ? host : "localhost"}`;
}

/** A Web `ReadableStream` over a Node request body with backpressure; safe against late chunks after cancel. */
function nodeBodyStream(req: IncomingMessage): ReadableStream<Uint8Array> {
  let finished = false;
  let onData: (chunk: Buffer | string) => void = () => undefined;
  let onEnd: () => void = () => undefined;
  let onError: (error: Error) => void = () => undefined;
  const detach = (): void => {
    finished = true;
    req.off("data", onData);
    req.off("end", onEnd);
    req.off("error", onError);
    req.off("aborted", onAborted);
  };
  const onAborted = (): void => onError(new Error("The client aborted the request."));
  return new ReadableStream<Uint8Array>(
    {
      start(controller) {
        onData = (chunk) => {
          if (finished) return;
          try {
            controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
          } catch {
            detach();
            req.resume();
            return;
          }
          if ((controller.desiredSize ?? 1) <= 0) req.pause();
        };
        onEnd = () => {
          if (finished) return;
          detach();
          try {
            controller.close();
          } catch {
            // already closed or errored
          }
        };
        onError = (error) => {
          if (finished) return;
          detach();
          try {
            controller.error(error);
          } catch {
            // already closed or errored
          }
        };
        req.on("data", onData);
        req.on("end", onEnd);
        req.on("error", onError);
        req.on("aborted", onAborted);
      },
      pull() {
        if (!finished && req.isPaused()) req.resume();
      },
      cancel() {
        detach();
        // Discard the rest of the upload so the response can still be written.
        if (!req.destroyed) req.resume();
      },
    },
    { highWaterMark: 64 * 1024, size: (chunk) => chunk?.byteLength ?? 0 },
  );
}

/**
 * Read a request body as text, at most `max` bytes (`null` when larger).
 * Prefers the body `middleware.ts` already took over from the Node stream.
 */
export async function readRequestBody(req: IncomingMessage, max: number): Promise<string | null> {
  const stash = req as unknown as Record<symbol, Request | undefined>;
  const forwarded = stash[WEB_REQUEST];
  if (forwarded) delete stash[WEB_REQUEST];
  const stream = forwarded ? forwarded.body : nodeBodyStream(req);
  if (!stream) return "";
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
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
  return new TextDecoder().decode(out);
}

/**
 * Bridge a Node request into a Web `Request`. Its `signal` aborts as soon as the
 * client disconnects, so streaming handlers (SSE) can clean up immediately.
 */
export function toWebRequest(req: IncomingMessage, origin: string, res?: ServerResponse): Request {
  const url = requestUrl(req.url, origin);
  // `middleware.ts` already bridged (and possibly re-headered) this request; reuse its body stream.
  const forwarded = (req as unknown as Record<symbol, Request | undefined>)[WEB_REQUEST];
  if (forwarded) {
    delete (req as unknown as Record<symbol, Request | undefined>)[WEB_REQUEST];
    const init: RequestInit & { duplex?: "half" } = { method: forwarded.method, headers: forwarded.headers, signal: forwarded.signal };
    if (forwarded.body) {
      init.body = forwarded.body;
      init.duplex = "half";
    }
    return new Request(url, init);
  }
  const controller = new AbortController();
  const abort = (): void => {
    if (!controller.signal.aborted) controller.abort();
  };
  req.on("aborted", abort);
  // `close` before `end()` means the client disconnected (tab closed, EventSource dropped).
  res?.on("close", () => {
    if (!res.writableEnded) abort();
  });
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) for (const item of v) headers.append(k, item);
    else headers.set(k, v);
  }
  const method = (req.method ?? "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = { method, headers, signal: controller.signal };
  if (hasBody) {
    init.body = nodeBodyStream(req);
    init.duplex = "half";
  }
  return new Request(url, init);
}

/** `Cache-Control` for responses that must not be stored by shared caches. */
export const PRIVATE_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";

/** Responses whose `Cache-Control` the route cache generated (not set by the handler). */
const generatedCacheControl = new WeakSet<Response>();

export function markGeneratedCacheControl(response: Response): Response {
  generatedCacheControl.add(response);
  return response;
}

export function hasGeneratedCacheControl(response: Response): boolean {
  return generatedCacheControl.has(response);
}

const MIDDLEWARE_STATE = Symbol.for("textjs.middlewareState");

/** What `middleware.ts` decided for a Node response that is completed later (see `sendWebResponse`). */
export interface MiddlewareResponseState {
  /** Middleware set cookies, rewrote or changed request headers: never let shared caches store the result. */
  private?: boolean;
  /** `NextResponse.next({ status })` / `rewrite(url, { status })`. */
  status?: number;
}

export function setMiddlewareState(res: ServerResponse, state: MiddlewareResponseState): void {
  (res as unknown as Record<symbol, MiddlewareResponseState>)[MIDDLEWARE_STATE] = state;
}

function middlewareState(res: ServerResponse): MiddlewareResponseState | undefined {
  return (res as unknown as Record<symbol, MiddlewareResponseState | undefined>)[MIDDLEWARE_STATE];
}

export async function sendWebResponse(res: ServerResponse, response: Response, method = "GET"): Promise<void> {
  const state = middlewareState(res);
  res.statusCode = state?.status ?? response.status;
  if (response.statusText && state?.status === undefined) res.statusMessage = response.statusText;
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  response.headers.forEach((value, key) => {
    if (key === "set-cookie") return;
    res.setHeader(key, value);
  });
  if (state?.private && hasGeneratedCacheControl(response)) res.setHeader("cache-control", PRIVATE_CACHE_CONTROL);
  if (cookies.length > 0) {
    // Keep cookies `middleware.ts` already set on this response.
    const prior = res.getHeader("set-cookie");
    res.setHeader("set-cookie", [...(prior === undefined ? [] : Array.isArray(prior) ? prior : [String(prior)]), ...cookies]);
  }
  if (method === "HEAD" || !response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  const cancel = (): void => {
    reader.cancel().catch(() => undefined);
  };
  res.on("close", cancel);
  try {
    for (;;) {
      if (res.writableEnded || res.destroyed) {
        cancel();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (res.writableEnded || res.destroyed) {
        cancel();
        return;
      }
      res.write(value);
    }
  } catch {
    // The client went away mid-stream (the reader was cancelled).
    return;
  } finally {
    res.off("close", cancel);
  }
  res.end();
}

export function allowedMethods(mod: RouteHandlerModule): string[] {
  const out = HTTP_METHODS.filter((m) => typeof mod[m] === "function") as string[];
  if (out.includes("GET") && !out.includes("HEAD")) out.push("HEAD");
  if (!out.includes("OPTIONS")) out.push("OPTIONS");
  return out;
}

/** Invoke an `app/**\/route.ts` handler with Next.js semantics (HEAD → GET, auto OPTIONS, 405). */
export async function runRouteHandler(mod: RouteHandlerModule, request: Request, params: RouteParams): Promise<Response> {
  const method = request.method.toUpperCase() as HttpMethod;
  let handler = mod[method];
  if (!handler && method === "HEAD") handler = mod.GET;
  if (!handler) {
    const allow = allowedMethods(mod).join(", ");
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: { Allow: allow } });
    return new Response(null, { status: 405, headers: { Allow: allow } });
  }
  const result = await handler(request, { params });
  if (!(result instanceof Response)) {
    throw txError("TX016", method, new URL(request.url).pathname);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Rewrites
// ---------------------------------------------------------------------------

export interface CompiledRewrite {
  rewrite: Rewrite;
  match(pathname: string): Record<string, string> | null;
  destination(params: Record<string, string>, search: string): string;
}

function escapeRe(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

/** Compile `/docs/:slug`, `/blog/:path*`, `/a/:rest+` source patterns. */
export function compileRewrite(rewrite: Rewrite): CompiledRewrite {
  const names: string[] = [];
  let re = "^";
  for (const part of rewrite.source.split("/").filter(Boolean)) {
    const m = /^:([A-Za-z_][\w]*)([*+?])?$/.exec(part);
    if (!m) {
      re += `/${escapeRe(part)}`;
      continue;
    }
    names.push(m[1] as string);
    const mod = m[2];
    if (mod === "*") re += "(?:/(.*))?";
    else if (mod === "+") re += "/(.+)";
    else if (mod === "?") re += "(?:/([^/]+))?";
    else re += "/([^/]+)";
  }
  re += "/?$";
  const regex = new RegExp(re || "^/$");
  return {
    rewrite,
    match(pathname) {
      const m = regex.exec(pathname);
      if (!m) return null;
      const out: Record<string, string> = {};
      names.forEach((n, i) => {
        out[n] = m[i + 1] ?? "";
      });
      return out;
    },
    destination(params, search) {
      let dest = rewrite.destination.replace(/:([A-Za-z_][\w]*)[*+?]?/g, (_, n: string) => params[n] ?? "");
      if (!/^[a-z]+:\/\//i.test(dest)) dest = dest.replace(/\/{2,}/g, "/");
      if (search && !dest.includes("?")) dest += search;
      return dest;
    },
  };
}

export function applyRewrites(rewrites: readonly CompiledRewrite[], url: string): string | null {
  const u = new URL(url, "http://text.local");
  for (const r of rewrites) {
    const params = r.match(u.pathname);
    if (params) return r.destination(params, u.search);
  }
  return null;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLoopbackUrl(url: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

const HOP_BY_HOP = ["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "proxy-connection", "te", "trailer", "transfer-encoding", "upgrade"];

/** Remove hop-by-hop headers (and any named by `Connection`) before forwarding a message. */
export function stripHopByHop(headers: Headers): Headers {
  for (const name of (headers.get("connection") ?? "").split(",")) {
    const n = name.trim().toLowerCase();
    if (n) headers.delete(n);
  }
  for (const h of HOP_BY_HOP) headers.delete(h);
  return headers;
}

/** Forward `request` to an absolute URL (a middleware or config rewrite). Credentials are stripped for third-party origins. */
export async function proxyFetch(request: Request, target: string | URL, options: { stripCredentials?: boolean } = {}): Promise<Response> {
  const headers = stripHopByHop(new Headers(request.headers));
  headers.delete("host");
  headers.delete("content-length");
  if (options.stripCredentials !== false) {
    headers.delete("cookie");
    headers.delete("authorization");
  }
  const init: RequestInit & { duplex?: "half" } = { method: request.method, headers, redirect: "manual", signal: request.signal };
  if (request.body && request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }
  try {
    const upstream = await fetch(target, init);
    const out = stripHopByHop(new Headers(upstream.headers));
    out.delete("content-encoding");
    out.delete("content-length");
    // An upstream must never steer this server's own routing.
    for (const key of [...out.keys()]) if (key.startsWith("x-middleware-")) out.delete(key);
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  } catch (error) {
    if (request.signal.aborted) throw error;
    return new Response(`▼ Text.js proxy error: ${String(target)}\n${error instanceof Error ? error.message : String(error)}`, {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

/** Forward a request to an absolute URL and pipe the response back. */
export async function proxyRequest(req: IncomingMessage, res: ServerResponse, target: string, origin: string): Promise<void> {
  const incoming = toWebRequest(req, origin, res);
  let response: Response;
  try {
    // Never forward the visitor's credentials to a third-party origin.
    response = await proxyFetch(incoming, target, { stripCredentials: !isLoopbackUrl(target) });
  } catch {
    res.destroy();
    return;
  }
  await sendWebResponse(res, response, incoming.method);
}
