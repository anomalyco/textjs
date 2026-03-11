/**
 * `middleware.ts` on Node HTTP servers (`text dev` via Vite, `text start`).
 */

import { existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { isLoopbackUrl, sendWebResponse, toWebRequest } from "./http";
import type { MiddlewareModule } from "./middleware";
import { MIDDLEWARE_FILES, proxyFetch, runMiddleware } from "./middleware-runtime";

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

/**
 * Run middleware for a Node request (`req.url` must still include basePath).
 * Resolves to the app URL to continue with (no basePath, may be rewritten),
 * or `null` once middleware has sent the response itself.
 */
export async function runNodeMiddleware(mod: MiddlewareModule, req: IncomingMessage, res: ServerResponse, options: NodeMiddlewareOptions): Promise<string | null> {
  const request = toWebRequest(req, options.origin, res);
  const outcome = await runMiddleware(mod, request, { basePath: options.basePath });
  const url = new URL(request.url);
  if (outcome.type === "response") {
    await sendWebResponse(res, outcome.response, request.method);
    return null;
  }
  if (!outcome.matched) {
    // Untouched: let downstream re-read the original request.
    (req as unknown as Record<symbol, Request>)[WEB_REQUEST] = outcome.request;
    return `${stripBase(url.pathname, options.basePath) ?? url.pathname}${url.search}`;
  }

  outcome.headers.forEach((value, key) => {
    if (key !== "set-cookie") res.setHeader(key, value);
  });
  const cookies = outcome.headers.getSetCookie();
  if (cookies.length > 0) res.setHeader("set-cookie", cookies);

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

/** Vite-served module and tooling requests never run middleware in `text dev` (they don't exist in production). */
export function isDevInternalRequest(rawUrl: string, root: string): boolean {
  const pathname = rawUrl.split("?")[0] ?? "/";
  if (pathname.startsWith("/@") || pathname.startsWith("/node_modules/") || pathname.startsWith("/__")) return true;
  // Source files Vite serves as modules (`/app/page.tsx?t=…`); `public/` files still run middleware, as in production.
  try {
    const file = join(root, decodeURIComponent(pathname));
    return file.startsWith(root) && statSync(file).isFile();
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
    if (!file || isDevInternalRequest(raw, options.root)) return next();
    if (stripBase(raw.split("?")[0] ?? "/", options.basePath) === null) return next();
    const started = performance.now();
    try {
      const mod = (await server.ssrLoadModule(file)) as MiddlewareModule;
      const url = await runNodeMiddleware(mod, req, res, { basePath: options.basePath, origin: `http://${req.headers.host ?? "localhost"}` });
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
