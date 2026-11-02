/**
 * `text build --adapter vercel`: Vercel Build Output API v3 in `.vercel/output`.
 *
 * - `static/`: the client build (under `basePath`).
 * - `functions/_textjs/server.func`: one Node.js function for every route handler.
 * - `functions/_middleware.func`: `middleware.ts` as Edge Routing Middleware,
 *   speaking the `x-middleware-*` protocol Vercel's router understands.
 * - `config.json`: asset headers, middleware, rewrites, handler routes and the
 *   SPA fallback.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VERSION } from "@textjs/core";
import type { MiddlewareModule } from "../middleware";
import { middlewareMatchers } from "../middleware-runtime";
import { bundleServerEntry, frameworkFile } from "./bundle";
import { assertNoServerRoutes, copyStatic, escapeRegex, matcherRegex, patternRegex, rewriteRoute, serverEntry, type AdapterContext, type AdapterResult } from "./shared";

export const VERCEL_FUNCTION = "_textjs/server";
export const VERCEL_MIDDLEWARE = "_middleware";
/**
 * Request header carrying the routed path into the function. Each handler
 * route sets it from its own capture (overwriting any client value), as sent:
 * Vercel decodes captures substituted into a `dest` query, which would make
 * the function decode the path a second time.
 */
export const ROUTED_HEADER = "x-textjs-path";
export const VERCEL_NODE_RUNTIME = "nodejs22.x";

/**
 * Paths whose canonical form differs (`%` escapes, `//`, `.` and `..`
 * segments, backslashes, a trailing slash). Vercel's router may match these
 * differently from the middleware matchers, so they always reach middleware.
 */
export const NON_CANONICAL_PATH = String.raw`^.*(?:%|\/\/|\\|\/\.\.?(?:\/|$)).*$|^.+\/$`;

/** A routed path the function accepts: one leading slash, no backslashes or control characters. */
export const ROUTED_PATH = /^\/(?![/\\])[^\\\u0000-\u001f\u007f]*$/;

const FUNCTION_BODY = `
import { normalizeRequestTarget, requestOrigin, sendWebResponse, toWebRequest } from ${JSON.stringify(frameworkFile("server/http.ts"))};

// Middleware already ran in Vercel's router. The function is only reachable
// through the handler routes in config.json, which set ${ROUTED_HEADER}
// (direct requests to /_textjs/* get a 404).
const handler = createRequestHandler({ ...options, skipMiddleware: true });
const REQUEST_CONTEXT = Symbol.for("@vercel/request-context");
const ROUTED_PATH = ${ROUTED_PATH.toString()};

export default async function textjs(req, res) {
  const url = new URL(normalizeRequestTarget(req.url), "http://vercel.internal");
  const routed = req.headers[${JSON.stringify(ROUTED_HEADER)}];
  if (typeof routed !== "string" || !ROUTED_PATH.test(routed)) {
    res.statusCode = 400;
    res.end();
    return;
  }
  delete req.headers[${JSON.stringify(ROUTED_HEADER)}];
  req.url = routed + url.search;
  const request = toWebRequest(req, requestOrigin(req, { trustProxy: true, protocol: "https" }), res);
  const vercel = globalThis[REQUEST_CONTEXT]?.get?.();
  try {
    const response = await handler(request, { waitUntil: (p) => vercel?.waitUntil?.(p) });
    await sendWebResponse(res, response, request.method);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.statusCode = 500;
    res.end();
  }
}
`;

const MIDDLEWARE_BODY = `
import { runMiddleware, toMiddlewareResponse } from ${JSON.stringify(frameworkFile("server/middleware-runtime.ts"))};

export default async function textjsMiddleware(request, context) {
  const outcome = await runMiddleware(middleware, request, { basePath: options.basePath, waitUntil: (p) => context?.waitUntil?.(p) });
  // Middleware saw the canonical path (/ad%6din → /admin): route that path too.
  if (outcome.type === "next" && !outcome.rewrite && outcome.request.url !== request.url) outcome.rewrite = new URL(outcome.request.url);
  return toMiddlewareResponse(outcome, request);
}
`;

export interface VercelRoute {
  src?: string;
  dest?: string;
  headers?: Record<string, string>;
  continue?: boolean;
  override?: boolean;
  caseSensitive?: boolean;
  check?: boolean;
  status?: number;
  middlewarePath?: string;
  middlewareRawSrc?: string[];
  has?: unknown[];
  missing?: unknown[];
  handle?: "filesystem" | "rewrite" | "miss" | "hit" | "error" | "resource";
  transforms?: Array<{ type: "request.headers"; op: "set" | "delete"; target: { key: string }; args?: string }>;
}

export interface VercelConfig {
  version: 3;
  routes: VercelRoute[];
  framework: { version: string };
}

export function vercelConfig(ctx: AdapterContext, middleware: MiddlewareModule | null): VercelConfig {
  const base = ctx.basePath;
  // The handler function is internal. A `status` route doesn't stop Vercel from
  // running a function at that path, so what keeps it internal is the header:
  // only the handler routes below set it, after the first route drops any the client sent.
  const internal: VercelRoute = { src: `^\\/${escapeRegex(VERCEL_FUNCTION.split("/")[0] as string)}(?:\\/.*)?$`, status: 404 };
  const routes: VercelRoute[] = [
    { src: "^.*$", transforms: [{ type: "request.headers", op: "delete", target: { key: ROUTED_HEADER } }], continue: true },
    internal,
    { src: `^${escapeRegex(base)}\\/assets\\/(.*)$`, headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true, caseSensitive: true },
  ];
  if (middleware) {
    // One route, so middleware runs once per request. It covers every path a
    // matcher names and every non-canonical spelling; the middleware checks
    // the canonical path against the matchers (with `has` / `missing`) itself.
    const matchers = middlewareMatchers(middleware);
    const src = matchers ? [...matchers.map((m) => matcherRegex(m.source, base)), NON_CANONICAL_PATH].map((re) => `(?:${re})`).join("|") : ".*";
    routes.push({
      src: `^(?:${src})$`,
      middlewarePath: VERCEL_MIDDLEWARE,
      middlewareRawSrc: matchers ? matchers.map((m) => m.source) : ["/:path*"],
      continue: true,
      override: true,
      caseSensitive: true,
    });
  }
  for (const r of ctx.rewrites) {
    const { src, dest } = rewriteRoute(r, base);
    routes.push(/^[a-z]+:\/\//i.test(dest) ? { src, dest, caseSensitive: true } : { src, dest, continue: true, caseSensitive: true });
  }
  // Again after middleware and rewrites, which may have rewritten a spelling like `/_%74extjs/server` onto it.
  routes.push(internal);
  const routed = [{ type: "request.headers" as const, op: "set" as const, target: { key: ROUTED_HEADER }, args: "$1" }];
  for (const a of ctx.api) routes.push({ src: patternRegex(a.pattern, base), dest: `/${VERCEL_FUNCTION}`, transforms: routed, caseSensitive: true });
  routes.push({ handle: "filesystem" });
  // Extensionless paths are console pages: serve the SPA document.
  routes.push({ src: `^${escapeRegex(base)}(?:\\/(?:[^/]+\\/)*[^/.]*)?$`, dest: `${base}/index.html`, caseSensitive: true });
  return { version: 3, routes, framework: { version: VERSION } };
}

export async function adaptVercel(ctx: AdapterContext, middleware: MiddlewareModule | null): Promise<AdapterResult> {
  assertNoServerRoutes(ctx, "vercel");
  const out = join(ctx.root, ".vercel", "output");
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  copyStatic(ctx.outDir, join(out, "static", ...ctx.basePath.split("/").filter(Boolean).map(decodeURIComponent)));

  if (ctx.api.length > 0) {
    const dir = join(out, "functions", `${VERCEL_FUNCTION}.func`);
    mkdirSync(dir, { recursive: true });
    await bundleServerEntry({ root: ctx.root, config: ctx.config, code: serverEntry(ctx, { body: FUNCTION_BODY, middleware: false }), outFile: join(dir, "index.mjs"), target: "node" });
    writeFileSync(
      join(dir, ".vc-config.json"),
      `${JSON.stringify({ runtime: VERCEL_NODE_RUNTIME, handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: false, supportsResponseStreaming: true }, null, 2)}\n`,
    );
  }
  if (middleware && ctx.middlewareFile) {
    const dir = join(out, "functions", `${VERCEL_MIDDLEWARE}.func`);
    mkdirSync(dir, { recursive: true });
    await bundleServerEntry({ root: ctx.root, config: ctx.config, code: serverEntry(ctx, { body: MIDDLEWARE_BODY, handlers: false, runtime: false }), outFile: join(dir, "index.js"), target: "edge" });
    writeFileSync(join(dir, ".vc-config.json"), `${JSON.stringify({ runtime: "edge", entrypoint: "index.js" }, null, 2)}\n`);
  }
  writeFileSync(join(out, "config.json"), `${JSON.stringify(vercelConfig(ctx, middleware), null, 2)}\n`);
  return { adapter: "vercel", output: out, notes: ["Deploy: vercel deploy --prebuilt (or push: Vercel runs `text build` and picks up .vercel/output)"] };
}
