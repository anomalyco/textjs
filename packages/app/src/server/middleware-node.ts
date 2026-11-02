/**
 * `middleware.ts` on Node HTTP servers (`text dev` via Vite, `text start`).
 */

import { existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join, relative, resolve, sep } from "node:path";
import { LIVE_PATH } from "../live-protocol";
import { isLoopbackUrl, proxyFetch, requestOrigin, requestUrl, sendWebResponse, setMiddlewareState, toWebRequest } from "./http";
import type { MiddlewareModule } from "./middleware";
import { matchesMiddleware, MIDDLEWARE_FILES, middlewareMatchers, runMiddleware } from "./middleware-runtime";

/** `toWebRequest()` returns this request (once) instead of re-reading the Node stream. */
export const WEB_REQUEST = Symbol.for("textjs.webRequest");

export function findMiddlewareFile(root: string): string | null {
  for (const rel of MIDDLEWARE_FILES) {
    const p = join(root, rel);
    if (existsSync(p)) return p;
  }
  return null;
}

function stripBase(pathname: string, basePath: string): string | null {
  if (!basePath) return pathname;
  if (pathname === basePath) return "/";
  return pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : null;
}

export interface NodeMiddlewareOptions {
  basePath: string;
  origin: string;
}

/** Request headers of a Node request, for matching before the body is touched. */
export function nodeHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) for (const item of v) headers.append(k, item);
    else headers.set(k, v);
  }
  return headers;
}

/**
 * Run middleware for a Node request (`req.url` must still include basePath).
 * Resolves to the app URL to continue with (no basePath, may be rewritten),
 * or `null` once middleware has sent the response itself.
 */
export async function runNodeMiddleware(mod: MiddlewareModule, req: IncomingMessage, res: ServerResponse, options: NodeMiddlewareOptions): Promise<string | null> {
  const url = requestUrl(req.url, options.origin);
  const pathname = stripBase(url.pathname, options.basePath);
  // Match on the URL and headers first: unmatched requests keep their Node body stream untouched.
  const probe = new Request(url, { method: "GET", headers: nodeHeaders(req) });
  if (pathname === null || !matchesMiddleware(middlewareMatchers(mod), pathname, probe)) {
    return `${pathname ?? url.pathname}${url.search}`;
  }
  const request = toWebRequest(req, options.origin, res);
  const outcome = await runMiddleware(mod, request, { basePath: options.basePath, matchers: null });
  if (outcome.type === "response") {
    await sendWebResponse(res, outcome.response, request.method);
    return null;
  }

  outcome.headers.forEach((value, key) => {
    if (key !== "set-cookie") res.setHeader(key, value);
  });
  const cookies = outcome.headers.getSetCookie();
  if (cookies.length > 0) res.setHeader("set-cookie", cookies);
  if (outcome.private || outcome.status !== undefined) setMiddlewareState(res, { private: outcome.private, status: outcome.status });

  // Mirror forwarded headers onto the Node request (Vite and proxies read `req.headers`).
  const forwarded = outcome.request.headers;
  for (const key of Object.keys(req.headers)) if (!forwarded.has(key)) delete req.headers[key];
  forwarded.forEach((value, key) => {
    req.headers[key] = value;
  });

  if (outcome.rewrite && outcome.rewrite.origin !== url.origin) {
    const response = await proxyFetch(outcome.request, outcome.rewrite, { stripCredentials: !isLoopbackUrl(outcome.rewrite.href) });
    await sendWebResponse(res, response, request.method);
    return null;
  }
  (req as unknown as Record<symbol, Request>)[WEB_REQUEST] = outcome.request;
  const target = outcome.rewrite ?? url;
  return `${stripBase(target.pathname, options.basePath) ?? target.pathname}${target.search}`;
}

const SOURCE_EXT = /\.(?:[cm]?[jt]sx?)$/;

/**
 * Server-only sources `text dev` must never hand to the browser as modules:
 * `middleware.ts`, `text.config.*`, the cache handler, route handlers,
 * `*.server.*` modules and `.env` files.
 */
export function isServerOnlySource(pathname: string, root: string, appDir = "app", extra: readonly string[] = []): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  const rel = decoded.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  const name = rel.split("/").pop() ?? "";
  if (/^\.env(?:\..*)?$/.test(name)) return true;
  if ((MIDDLEWARE_FILES as readonly string[]).includes(rel) || /^text\.config\.[cm]?[jt]s$/.test(rel)) return true;
  if (/\.server\.[cm]?[jt]sx?$/.test(name)) return true;
  if (rel.startsWith(`${appDir.replace(/^\.?\//, "")}/`) && /^route\.[cm]?[jt]sx?$/.test(name)) return true;
  return extra.some((file) => {
    const r = relative(root, file).split(sep).join("/");
    return r === rel && SOURCE_EXT.test(r);
  });
}

/**
 * Vite-served module and tooling requests never run middleware in `text dev`
 * (they don't exist in production). `pathname` excludes basePath. The live
 * session endpoint is not internal: it serves app routes.
 */
export function isDevInternalRequest(rawUrl: string, root: string): boolean {
  const pathname = rawUrl.split("?")[0] ?? "/";
  if (pathname === LIVE_PATH) return false;
  if (pathname.startsWith("/@") || pathname.startsWith("/node_modules/") || pathname.startsWith("/__")) return true;
  // Source files Vite serves as modules (`/app/page.tsx?t=…`); `public/` files still run middleware, as in production.
  try {
    const base = resolve(root);
    const file = join(base, decodeURIComponent(pathname));
    return file.startsWith(base + sep) && statSync(file).isFile();
  } catch {
    return false;
  }
}

interface DevServerLike {
  ssrLoadModule(id: string): Promise<Record<string, unknown>>;
  ssrFixStacktrace(error: Error): void;
}

type Next = (error?: unknown) => void;

/** Connect middleware for the Vite dev server. */
export function createDevMiddleware(server: DevServerLike, options: { root: string; basePath: string; log?: { info(m: string): void; error(m: string): void } }) {
  return async (req: IncomingMessage, res: ServerResponse, next: Next): Promise<void> => {
    const file = findMiddlewareFile(options.root);
    const raw = req.url ?? "/";
    if (!file) return next();
    const stripped = stripBase(raw.split("?")[0] ?? "/", options.basePath);
    if (stripped === null || isDevInternalRequest(stripped, options.root)) return next();
    const started = performance.now();
    try {
      const mod = (await server.ssrLoadModule(file)) as MiddlewareModule;
      const url = await runNodeMiddleware(mod, req, res, { basePath: options.basePath, origin: requestOrigin(req) });
      if (url === null) {
        options.log?.info(` ${req.method} ${raw} ${res.statusCode} (middleware) in ${Math.round(performance.now() - started)}ms`);
        return;
      }
      req.url = options.basePath + url;
      next();
    } catch (error) {
      if (error instanceof Error) server.ssrFixStacktrace(error);
      options.log?.error(` ⨯ middleware ${req.method} ${raw}\n${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
      if (res.headersSent) return void res.end();
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(`▼ Text.js: middleware error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
}
