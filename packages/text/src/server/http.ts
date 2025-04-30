/**
 * Node HTTP helpers shared by `text dev` middleware and `text start`:
 * Web `Request` / `Response` bridging, route handlers, rewrites and proxying.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Rewrite } from "../config";
import type { RouteParams } from "../routing";

export const HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export type RouteHandler = (request: Request, context: { params: RouteParams }) => Response | Promise<Response>;
export type RouteHandlerModule = Partial<Record<HttpMethod, RouteHandler>> & Record<string, unknown>;

/**
 * Bridge a Node request into a Web `Request`. Its `signal` aborts as soon as the
 * client disconnects, so streaming handlers (SSE) can clean up immediately.
 */
export function toWebRequest(req: IncomingMessage, origin: string, res?: ServerResponse): Request {
  const url = new URL(req.url ?? "/", origin);
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
    init.body = new ReadableStream({
      start(controller) {
        req.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        req.on("end", () => controller.close());
        req.on("error", (err) => controller.error(err));
      },
    });
    init.duplex = "half";
  }
  return new Request(url, init);
}

export async function sendWebResponse(res: ServerResponse, response: Response, method = "GET"): Promise<void> {
  res.statusCode = response.status;
  if (response.statusText) res.statusMessage = response.statusText;
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  response.headers.forEach((value, key) => {
    if (key === "set-cookie") return;
    res.setHeader(key, value);
  });
  if (cookies.length > 0) res.setHeader("set-cookie", cookies);
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
    throw new TypeError(`No response is returned from route handler for ${method} ${new URL(request.url).pathname}. Ensure you return a \`Response\`.`);
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

/** Forward a request to an absolute URL and pipe the response back. */
export async function proxyRequest(req: IncomingMessage, res: ServerResponse, target: string, origin: string): Promise<void> {
  const incoming = toWebRequest(req, origin, res);
  const headers = new Headers(incoming.headers);
  headers.delete("host");
  headers.delete("connection");
  // Never forward the visitor's credentials to a third-party origin.
  if (!isLoopbackUrl(target)) {
    headers.delete("cookie");
    headers.delete("authorization");
  }
  const init: RequestInit & { duplex?: "half" } = { method: incoming.method, headers, redirect: "manual", signal: incoming.signal };
  if (incoming.body) {
    init.body = incoming.body;
    init.duplex = "half";
  }
  try {
    const upstream = await fetch(target, init);
    const out = new Headers(upstream.headers);
    out.delete("content-encoding");
    out.delete("content-length");
    await sendWebResponse(res, new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out }), incoming.method);
  } catch (error) {
    if (incoming.signal.aborted) {
      res.destroy();
      return;
    }
    res.statusCode = 502;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(`▼ Text.js proxy error: ${target}\n${error instanceof Error ? error.message : String(error)}`);
  }
}
