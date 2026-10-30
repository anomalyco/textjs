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
/** Query parameter carrying the routed path into the function. */
export const PATH_PARAM = "__textjs_path";
export const VERCEL_NODE_RUNTIME = "nodejs22.x";

/** A routed path the function accepts: one leading slash, no backslashes or control characters. */
export const ROUTED_PATH = /^\/(?![/\\])[^\\\u0000-\u001f\u007f]*$/;

const FUNCTION_BODY = `
import { normalizeRequestTarget, requestOrigin, sendWebResponse, toWebRequest } from ${JSON.stringify(frameworkFile("server/http.ts"))};

// Middleware already ran in Vercel's router. The function is only reachable
// through the handler routes in config.json, which reject client-supplied
// ${PATH_PARAM} parameters and direct requests to /_textjs/*.
const handler = createRequestHandler({ ...options, skipMiddleware: true });
const REQUEST_CONTEXT = Symbol.for("@vercel/request-context");
const ROUTED_PATH = ${ROUTED_PATH.toString()};

export default async function textjs(req, res) {
  const url = new URL(normalizeRequestTarget(req.url), "http://vercel.internal");
  const routed = url.searchParams.getAll(${JSON.stringify(PATH_PARAM)});
  if (routed.length !== 1 || !ROUTED_PATH.test(routed[0])) {
    res.statusCode = 400;
    res.end();
    return;
  }
  url.searchParams.delete(${JSON.stringify(PATH_PARAM)});
  req.url = routed[0] + url.search;
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
  return toMiddlewareResponse(outcome, request);
}
`;

export interface VercelRoute {
  src?: string;
  dest?: string;
  headers?: Record<string, string>;
  continue?: boolean;
  override?: boolean;
  check?: boolean;
  status?: number;
  middlewarePath?: string;
  middlewareRawSrc?: string[];
  has?: unknown[];
  missing?: unknown[];
  handle?: "filesystem" | "rewrite" | "miss" | "hit" | "error" | "resource";
}

export interface VercelConfig {
  version: 3;
  routes: VercelRoute[];
  framework: { version: string };
}

export function vercelConfig(ctx: AdapterContext, middleware: MiddlewareModule | null): VercelConfig {
  const base = ctx.basePath;
  const routes: VercelRoute[] = [
    // The handler function is internal: only the handler routes below may reach it, with a path they set.
    { src: `^\\/${escapeRegex(VERCEL_FUNCTION.split("/")[0] as string)}(?:\\/.*)?$`, status: 404 },
    { src: "^.*$", has: [{ type: "query", key: PATH_PARAM }], status: 400 },
    { src: `^${escapeRegex(base)}\\/assets\\/(.*)$`, headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
  ];
  if (middleware) {
    const matchers = middlewareMatchers(middleware);
    const list = matchers ?? [{ source: "/:path*", regex: "", has: undefined, missing: undefined }];
    for (const m of list) {
      routes.push({
        src: matchers ? matcherRegex(m.source, base) : `^${escapeRegex(base)}(?:\\/.*)?$`,
        middlewarePath: VERCEL_MIDDLEWARE,
        middlewareRawSrc: [m.source],
        continue: true,
        override: true,
        ...(m.has ? { has: m.has } : {}),
        ...(m.missing ? { missing: m.missing } : {}),
      });
    }
  }
  for (const r of ctx.rewrites) {
    const { src, dest } = rewriteRoute(r, base);
    routes.push(/^[a-z]+:\/\//i.test(dest) ? { src, dest } : { src, dest, continue: true });
  }
  for (const a of ctx.api) routes.push({ src: patternRegex(a.pattern, base), dest: `/${VERCEL_FUNCTION}?${PATH_PARAM}=$1` });
  routes.push({ handle: "filesystem" });
  // Extensionless paths are console pages: serve the SPA document.
  routes.push({ src: `^${escapeRegex(base)}(?:\\/(?:[^/]+\\/)*[^/.]*)?$`, dest: `${base}/index.html` });
  return { version: 3, routes, framework: { version: VERSION } };
}

export async function adaptVercel(ctx: AdapterContext, middleware: MiddlewareModule | null): Promise<AdapterResult> {
  assertNoServerRoutes(ctx, "vercel");
  const out = join(ctx.root, ".vercel", "output");
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  copyStatic(ctx.outDir, join(out, "static", ...ctx.basePath.split("/").filter(Boolean)));

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
