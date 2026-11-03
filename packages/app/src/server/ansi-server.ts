/**
 * Serving ANSI frames to terminal clients (see `@textjs/app/ansi`), shared by
 * `text dev`, `text start` and the deploy adapters. Called at the
 * page-serving step: after middleware, rewrites, live sessions and route
 * handlers, and never for files, dot-paths or hidden segments.
 *
 * No Node imports: this file also runs in the Cloudflare worker.
 */

import { ANSI_CACHE_CONTROL, ANSI_VARY, ansiResponse, wantsAnsi, type HeaderRecord } from "../ansi";
import { canonicalPathname } from "./http";
import type { AnsiFrame } from "./live-app";

export interface AnsiHandlerOptions {
  /** Prerendered frames: decoded route pattern (`/about`) → ANSI text. */
  frames?: Record<string, string>;
  /** Render a canonical href (path and query, without basePath) on request. `null` serves HTML instead. */
  render?: (href: string) => Promise<AnsiFrame | null>;
  /** Whether `render` can still render (`text start` stops when `live.mjs` can't be imported). Default `true`. */
  renders?: () => boolean;
  /** `true` when the decoded pathname names a file the host serves as is. */
  isFile?: (pathname: string) => boolean;
  /** Paths the host handles itself (`text dev`: Vite's `/@vite/…`, `/node_modules/…`). */
  skip?: (pathname: string) => boolean;
  /** On-request renders kept (default {@link ANSI_CACHE_SIZE}; `0` turns the cache off). */
  cacheSize?: number;
  /** How long a cached render stays fresh (default {@link ANSI_CACHE_TTL_MS}). */
  cacheTtlMs?: number;
  /**
   * Uncached renders allowed per window, process-wide (default {@link ANSI_COLD_RENDERS}).
   * Renders are synchronous, so a crawler requesting distinct URLs could otherwise
   * keep the event loop busy. Past the budget, terminals get the HTML page. `null` turns it off.
   */
  coldRenders?: { limit: number; windowMs: number } | null;
  onError?(error: unknown): void;
}

export const ANSI_CACHE_SIZE = 128;
export const ANSI_CACHE_TTL_MS = 10_000;
/** 20 uncached renders per 10 seconds (a token bucket refilled continuously). */
export const ANSI_COLD_RENDERS = { limit: 20, windowMs: 10_000 } as const;

export interface AnsiRequest {
  method?: string;
  headers: Headers | HeaderRecord;
}

/** `url` is the request's path and query without basePath, after middleware and rewrites. */
export interface AnsiHandler {
  (request: AnsiRequest, url: string): Promise<Response | null>;
  /**
   * Whether terminals may get a frame at `url` (a `GET` or `HEAD` there is negotiated), so the
   * HTML page served there needs `Vary: User-Agent, Accept`. Doesn't depend on the request.
   */
  varies(url: string): boolean;
}

/** {@link ANSI_VARY} added to a `Vary` header value, keeping what's there. */
export function appendVary(existing: string | null | undefined): string {
  const current = (existing ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  if (current.includes("*")) return "*";
  const lower = new Set(current.map((v) => v.toLowerCase()));
  for (const v of ANSI_VARY.split(", ")) if (!lower.has(v.toLowerCase())) current.push(v);
  return current.join(", ");
}

/**
 * The HTML served at a negotiated URL: {@link appendVary} applied and, when a terminal asked
 * (`terminal`: it got HTML because the render budget ran out, the page skipped or the render
 * failed), {@link ANSI_CACHE_CONTROL}, so no shared cache stores that HTML under a terminal's key.
 * A copy when the response's headers are immutable.
 */
export function withAnsiVary(response: Response, terminal = false): Response {
  const apply = (headers: Headers): void => {
    headers.set("vary", appendVary(headers.get("vary")));
    if (terminal) headers.set("cache-control", ANSI_CACHE_CONTROL);
  };
  try {
    apply(response.headers);
    return response;
  } catch {
    const copy = new Response(response.body, response);
    apply(copy.headers);
    return copy;
  }
}

const fallthroughs = new WeakSet<object>();

/** Mark a Node response as a terminal's HTML fallback (see {@link withAnsiVary}). */
export function markAnsiFallthrough(res: object): void {
  fallthroughs.add(res);
}

/** The `Cache-Control` for an HTML page on `res`: {@link ANSI_CACHE_CONTROL} for a terminal's fallback. */
export function pageCacheControl(res: object): string {
  return fallthroughs.has(res) ? ANSI_CACHE_CONTROL : "public, max-age=0, must-revalidate";
}

/** The ANSI-capable handler that never answers (frames off). */
export const NO_ANSI: AnsiHandler = Object.assign(async () => null, { varies: () => false });

/**
 * The canonical (`route`) and decoded (`page`) pathname a frame may answer,
 * or `null` for files, dot-paths and invalid paths.
 */
export function ansiPagePath(pathname: string): { route: string; page: string } | null {
  const route = canonicalPathname(pathname);
  if (route === null) return null;
  const page = decodeURIComponent(route);
  const segments = page.split("/");
  if (segments.some((s) => s.startsWith("."))) return null;
  if ((segments[segments.length - 1] ?? "").includes(".")) return null;
  return { route, page };
}

export function createAnsiHandler(options: AnsiHandlerOptions): AnsiHandler {
  const frames = new Map(Object.entries(options.frames ?? {}));
  const size = options.cacheSize ?? ANSI_CACHE_SIZE;
  const ttl = options.cacheTtlMs ?? ANSI_CACHE_TTL_MS;
  // Renders never see cookies or run data loaders, so one href always renders the same frame.
  // Skips and failures are cached too: they would fail again.
  const cache = new Map<string, { at: number; frame: AnsiFrame | null }>();
  const budget = options.coldRenders === undefined ? ANSI_COLD_RENDERS : options.coldRenders;
  let tokens = budget?.limit ?? 0;
  let refilledAt = Date.now();
  const takeToken = (): boolean => {
    if (!budget) return true;
    const now = Date.now();
    // A clock that steps back never drains the bucket.
    tokens = Math.min(budget.limit, tokens + (Math.max(0, now - refilledAt) * budget.limit) / budget.windowMs);
    refilledAt = now;
    if (tokens < 1) return false;
    tokens--;
    return true;
  };

  // Concurrent requests for one href share a render (and one token).
  const inflight = new Map<string, Promise<AnsiFrame | null>>();
  const render = async (href: string): Promise<AnsiFrame | null> => {
    const hit = cache.get(href);
    if (hit && Date.now() - hit.at < ttl) {
      cache.delete(href);
      cache.set(href, hit);
      return hit.frame;
    }
    const pending = inflight.get(href);
    if (pending) return pending;
    // Over budget: HTML this time, and nothing cached, so the page renders once the budget refills.
    if (!takeToken()) return null;
    const started = renderCold(href).finally(() => inflight.delete(href));
    inflight.set(href, started);
    return started;
  };
  const renderCold = async (href: string): Promise<AnsiFrame | null> => {
    let frame: AnsiFrame | null = null;
    try {
      frame = (await options.render?.(href)) ?? null;
    } catch (error) {
      options.onError?.(error);
    }
    if (size > 0) {
      cache.delete(href);
      cache.set(href, { at: Date.now(), frame });
      for (const key of cache.keys()) {
        if (cache.size <= size) break;
        cache.delete(key);
      }
    }
    return frame;
  };

  /** The page path a frame could answer at `url`, or `null`. */
  const pageAt = (url: string): { route: string; page: string; search: string } | null => {
    const q = url.indexOf("?");
    const pathname = q < 0 ? url : url.slice(0, q);
    // `/__textjs/live` and the dev frame mirror.
    if (pathname.startsWith("/__textjs/") || options.skip?.(pathname)) return null;
    const path = ansiPagePath(pathname);
    if (path === null || options.isFile?.(path.page)) return null;
    return { ...path, search: q < 0 ? "" : url.slice(q) };
  };
  const canRender = (): boolean => options.render !== undefined && (options.renders?.() ?? true);

  const handler = async (request: AnsiRequest, url: string): Promise<Response | null> => {
    if (!wantsAnsi(request.method, request.headers)) return null;
    const path = pageAt(url);
    if (path === null) return null;
    const method = request.method ?? "GET";
    const prebuilt = frames.get(path.page);
    if (prebuilt !== undefined) return ansiResponse(prebuilt, method);
    if (!canRender()) return null;
    const frame = await render(path.route + path.search);
    return frame ? ansiResponse(frame.ansi, method, frame.status) : null;
  };
  return Object.assign(handler, {
    varies(url: string): boolean {
      const path = pageAt(url);
      return path !== null && (frames.has(path.page) || canRender());
    },
  });
}
