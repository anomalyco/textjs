/**
 * Serving ANSI frames to terminal clients (see `@textjs/app/ansi`), shared by
 * `text dev`, `text start` and the deploy adapters. Called at the
 * page-serving step: after middleware, rewrites, live sessions and route
 * handlers, and never for files, dot-paths or hidden segments.
 *
 * No Node imports: this file also runs in the Cloudflare worker.
 */

import { ansiResponse, wantsAnsi, type HeaderRecord } from "../ansi";
import { canonicalPathname } from "./http";
import type { AnsiFrame } from "./live-app";

export interface AnsiHandlerOptions {
  /** Prerendered frames: decoded route pattern (`/about`) → ANSI text. */
  frames?: Record<string, string>;
  /** Render a canonical href (path and query, without basePath) on request. `null` serves HTML instead. */
  render?: (href: string) => Promise<AnsiFrame | null>;
  /** `true` when the decoded pathname names a file the host serves as is. */
  isFile?: (pathname: string) => boolean;
  /** Paths the host handles itself (`text dev`: Vite's `/@vite/…`, `/node_modules/…`). */
  skip?: (pathname: string) => boolean;
  /** On-request renders kept (default {@link ANSI_CACHE_SIZE}; `0` turns the cache off). */
  cacheSize?: number;
  /** How long a cached render stays fresh (default {@link ANSI_CACHE_TTL_MS}). */
  cacheTtlMs?: number;
  onError?(error: unknown): void;
}

export const ANSI_CACHE_SIZE = 128;
export const ANSI_CACHE_TTL_MS = 10_000;

export interface AnsiRequest {
  method?: string;
  headers: Headers | HeaderRecord;
}

/** `url` is the request's path and query without basePath, after middleware and rewrites. */
export type AnsiHandler = (request: AnsiRequest, url: string) => Promise<Response | null>;

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

  const render = async (href: string): Promise<AnsiFrame | null> => {
    const hit = cache.get(href);
    if (hit && Date.now() - hit.at < ttl) {
      cache.delete(href);
      cache.set(href, hit);
      return hit.frame;
    }
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

  return async (request, url) => {
    if (!wantsAnsi(request.method, request.headers)) return null;
    const q = url.indexOf("?");
    const pathname = q < 0 ? url : url.slice(0, q);
    // `/__textjs/live` and the dev frame mirror.
    if (pathname.startsWith("/__textjs/") || options.skip?.(pathname)) return null;
    const path = ansiPagePath(pathname);
    if (path === null || options.isFile?.(path.page)) return null;
    const method = request.method ?? "GET";
    const prebuilt = frames.get(path.page);
    if (prebuilt !== undefined) return ansiResponse(prebuilt, method);
    if (!options.render) return null;
    const frame = await render(path.route + (q < 0 ? "" : url.slice(q)));
    return frame ? ansiResponse(frame.ansi, method, frame.status) : null;
  };
}
