/**
 * The Web-standard Text.js server (`(Request) => Response`) bundled into every
 * deploy adapter: middleware → rewrites → route handlers (with the route
 * cache) → static assets → the SPA document.
 *
 * No Node imports: this file runs on Bun, Node, Vercel and Cloudflare Workers.
 */

import type { Rewrite } from "../../config";
import { matchAppRoutes, type RouteManifest, type RouteSegmentNode } from "../../routing";
import { runRouteHandlerWithCache } from "../cache-route";
import { setCacheStore, type CacheStore } from "../cache";
import { applyRewrites, compileRewrite, isLoopbackUrl, type RouteHandlerModule } from "../http";
import type { MiddlewareModule } from "../middleware";
import { proxyFetch, rebuild, runMiddleware, withMiddlewareHeaders } from "../middleware-runtime";

export interface RequestContext {
  waitUntil?: (promise: Promise<unknown>) => void;
  /** Platform bindings (Cloudflare `env`). */
  env?: unknown;
}

export interface RequestHandlerOptions {
  /** API route manifest: leaf `files.page` values are keys into `handlers`. */
  manifest: RouteManifest;
  handlers: Record<string, RouteHandlerModule>;
  middleware?: MiddlewareModule;
  /** Skip middleware (it already ran at the edge, e.g. on Vercel). */
  skipMiddleware?: boolean;
  basePath?: string;
  rewrites?: Rewrite[];
  cacheStore?: CacheStore;
  /** Serve a static file for `pathname` (without basePath), or `null`. */
  assets?: (pathname: string, request: Request, context: RequestContext) => Promise<Response | null> | Response | null;
  /** The SPA document (`index.html`) for page routes. */
  document?: (request: Request, context: RequestContext) => Promise<Response | null> | Response | null;
}

export type TextRequestHandler = (request: Request, context?: RequestContext) => Promise<Response>;

function notFound(): Response {
  return new Response("404 | This page could not be found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
}

function stripBase(pathname: string, basePath: string): string | null {
  if (!basePath) return pathname;
  if (pathname === basePath) return "/";
  return pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : null;
}

function matchApi(manifest: RouteManifest, pathname: string): { id: string; pattern: string; params: Record<string, string | string[]> } | null {
  const m = matchAppRoutes(manifest, pathname);
  if (!m) return null;
  const leaf = m.chain[m.chain.length - 1] as RouteSegmentNode;
  const id = leaf.files?.page;
  return id ? { id, pattern: m.pattern, params: m.params } : null;
}

function safeDecode(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

export function createRequestHandler(options: RequestHandlerOptions): TextRequestHandler {
  const basePath = options.basePath ?? "";
  const rewrites = (options.rewrites ?? []).map(compileRewrite);
  if (options.cacheStore) setCacheStore(options.cacheStore);

  return async (incoming, context = {}) => {
    const url = new URL(incoming.url);
    const stripped = stripBase(url.pathname, basePath);
    if (stripped === null) return notFound();
    let pathname = stripped;
    let search = url.search;
    let request = incoming;
    let extra: Headers | null = null;
    const finish = (response: Response): Response => (extra ? withMiddlewareHeaders(response, extra) : response);

    if (options.middleware && !options.skipMiddleware) {
      const outcome = await runMiddleware(options.middleware, request, { basePath, waitUntil: context.waitUntil });
      if (outcome.type === "response") return outcome.response;
      request = outcome.request;
      extra = outcome.headers;
      if (outcome.rewrite) {
        if (outcome.rewrite.origin !== url.origin) return finish(await proxyFetch(request, outcome.rewrite, { stripCredentials: !isLoopbackUrl(outcome.rewrite.href) }));
        const p = stripBase(outcome.rewrite.pathname, basePath);
        pathname = p ?? outcome.rewrite.pathname;
        search = outcome.rewrite.search;
      }
    }

    if (rewrites.length > 0) {
      const target = applyRewrites(rewrites, pathname + search);
      if (target) {
        if (/^[a-z]+:\/\//i.test(target)) return finish(await proxyFetch(request, target, { stripCredentials: !isLoopbackUrl(target) }));
        const u = new URL(target, url.origin);
        pathname = u.pathname;
        search = u.search;
      }
    }

    const decoded = safeDecode(pathname);
    if (decoded === null) return finish(new Response("400 | Bad Request", { status: 400 }));
    const api = matchApi(options.manifest, decoded);
    const mod = api ? options.handlers[api.id] : undefined;
    if (api && mod) {
      const target = new URL(pathname + search, url.origin);
      const req = target.href === request.url ? request : rebuild(request, new Headers(request.headers), target);
      return finish(await runRouteHandlerWithCache(mod, req, { params: api.params, pattern: api.pattern, pathname: decoded, waitUntil: context.waitUntil }));
    }

    const method = request.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD") return finish(new Response(null, { status: 405, headers: { allow: "GET, HEAD" } }));
    const hidden = decoded.split("/").some((p) => p.startsWith(".") && p.length > 1);
    if (!hidden && options.assets) {
      const asset = await options.assets(decoded, request, context);
      if (asset) return finish(asset);
    }
    const last = decoded.split("/").pop() ?? "";
    if (last.includes(".") || hidden || !options.document) return finish(notFound());
    const doc = await options.document(request, context);
    return finish(doc ?? notFound());
  };
}
