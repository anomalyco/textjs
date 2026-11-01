/**
 * Full-route caching for `app/**\/route.ts` handlers: `export const dynamic`
 * and `export const revalidate` (Next.js route segment config).
 *
 * - `dynamic = "force-static"` or `revalidate = N` (N > 0): `GET` / `HEAD` are
 *   cached per pathname with stale-while-revalidate. The handler receives a
 *   build-time-like request (no query string, headers, cookies or body).
 * - Default, `"force-dynamic"` or `revalidate = 0`: run on every request.
 */

import { txError } from "@textjs/core";
import { markGeneratedCacheControl, PRIVATE_CACHE_CONTROL, runRouteHandler, type RouteHandlerModule } from "./http";
import type { RouteParams } from "../routing";
import { __validateRevalidate, EXPIRE_SECONDS, getOrCompute, implicitTags, normalizeCachePath, runInCacheScope, type CacheScope } from "./cache";

export const CACHE_HEADER = "x-textjs-cache";

export interface RouteCacheConfig {
  /** Cached (static / ISR) for GET and HEAD. */
  static: boolean;
  revalidate: number | false;
}

// Next.js's `"error"` (static, failing on request reads) is rejected: Text.js can't detect request reads.
const DYNAMIC_VALUES = new Set(["auto", "force-static", "force-dynamic"]);

/** Read and validate a route module's `dynamic` / `revalidate` exports. */
export function routeCacheConfig(mod: RouteHandlerModule, where = "route handler"): RouteCacheConfig {
  const dynamic = mod.dynamic ?? "auto";
  if (typeof dynamic !== "string" || !DYNAMIC_VALUES.has(dynamic)) throw txError("TX031", JSON.stringify(dynamic), where);
  const revalidate = __validateRevalidate(mod.revalidate, where);
  if (dynamic === "force-dynamic" || revalidate === 0) return { static: false, revalidate: 0 };
  if (dynamic === "force-static") return { static: true, revalidate };
  return { static: typeof revalidate === "number" && revalidate > 0, revalidate };
}

export interface RouteCacheContext {
  params: RouteParams;
  /** Route pattern, e.g. `/api/posts/[id]`. */
  pattern: string;
  /** Pathname without `basePath` (defaults to the request URL's). */
  pathname?: string;
  /** `false` in `text dev`: static semantics without storing responses (default `true`). */
  cache?: boolean;
  waitUntil?: (promise: Promise<unknown>) => void;
}

interface StoredResponse {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  /** Base64. */
  body: string;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** The request a static handler sees: same origin and path, nothing request-specific. */
export function staticRequest(request: Request): Request {
  const url = new URL(request.url);
  return new Request(new URL(url.pathname, url.origin), { method: "GET" });
}

/** `Cache-Control` for a cached route (Next.js: `s-maxage=N, stale-while-revalidate=<expire - N>`). */
export function cacheControlFor(revalidate: number | false): string {
  if (revalidate === false || !Number.isFinite(revalidate)) return `s-maxage=${EXPIRE_SECONDS}`;
  const seconds = Math.min(EXPIRE_SECONDS, Math.max(1, Math.ceil(revalidate)));
  return `s-maxage=${seconds}, stale-while-revalidate=${EXPIRE_SECONDS - seconds}`;
}

/** Responses a shared cache must never replay to other visitors. */
export function isUncacheableResponse(res: Response): boolean {
  if (res.status >= 500) return true;
  if (res.headers.has("set-cookie")) return true;
  const cc = (res.headers.get("cache-control") ?? "").toLowerCase();
  return /(?:^|,)\s*(?:private|no-store)\b/.test(cc);
}

/** Run a route handler with route segment config caching. */
export async function runRouteHandlerWithCache(mod: RouteHandlerModule, request: Request, ctx: RouteCacheContext): Promise<Response> {
  const pathname = normalizeCachePath(ctx.pathname ?? new URL(request.url).pathname);
  const config = routeCacheConfig(mod, `${ctx.pattern}/route`);
  const method = request.method.toUpperCase();
  const tags = implicitTags(pathname, ctx.pattern);
  const scope = (): CacheScope => ({ tags: new Set(tags), revalidate: config.revalidate, implicitTags: tags, waitUntil: ctx.waitUntil });

  if (!config.static || (method !== "GET" && method !== "HEAD") || typeof mod.GET !== "function") {
    return runInCacheScope(scope(), () => runRouteHandler(mod, request, ctx.params));
  }
  const input = staticRequest(request);
  if (ctx.cache === false) {
    const res = await runInCacheScope(scope(), () => runRouteHandler(mod, input, ctx.params));
    return method === "HEAD" ? new Response(null, { status: res.status, statusText: res.statusText, headers: res.headers }) : res;
  }

  const resolved = await getOrCompute(
    `route:${pathname}`,
    async () => {
      const s = scope();
      const res = await runInCacheScope(s, () => runRouteHandler(mod, input, ctx.params));
      if ((res.headers.get("content-type") ?? "").includes("text/event-stream")) {
        await res.body?.cancel().catch(() => undefined);
        throw new Error(`Route ${ctx.pattern} is static (dynamic = "force-static" / revalidate) but returned a text/event-stream response. Streaming route handlers must be dynamic: export const dynamic = "force-dynamic".`);
      }
      const body = new Uint8Array(await res.arrayBuffer());
      const value: StoredResponse = { status: res.status, statusText: res.statusText, headers: [...res.headers], body: toBase64(body) };
      // Server errors, cookies and private responses are returned to this request but never stored.
      return { value, tags: [...s.tags], revalidate: isUncacheableResponse(res) ? 0 : s.revalidate };
    },
    ctx.waitUntil,
  );
  const stored = resolved.entry.value as StoredResponse;
  const headers = new Headers();
  for (const [k, v] of stored.headers) headers.append(k, v);
  let generated = false;
  if (resolved.entry.revalidate === 0) {
    if (stored.status >= 500 || !headers.has("cache-control")) headers.set("cache-control", PRIVATE_CACHE_CONTROL);
  } else {
    headers.set(CACHE_HEADER, resolved.status);
    if (!headers.has("cache-control")) {
      headers.set("cache-control", cacheControlFor(resolved.entry.revalidate));
      generated = true;
    }
  }
  const body = method === "HEAD" || stored.status === 204 || stored.status === 304 ? null : fromBase64(stored.body);
  const response = new Response(body, { status: stored.status, statusText: stored.statusText, headers });
  return generated ? markGeneratedCacheControl(response) : response;
}
