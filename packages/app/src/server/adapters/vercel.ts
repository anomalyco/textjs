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
import { ANSI_CACHE_CONTROL, ANSI_VARY, TERMINAL_UA } from "../../ansi";
import { encodePathSegment } from "../../path-text";
import type { MiddlewareModule } from "../middleware";
import { middlewareMatchers } from "../middleware-runtime";
import { bundleServerEntry, frameworkFile } from "./bundle";
import { assertNoServerRoutes, copyStatic, escapeRegex, matcherRegex, patternRegex, readAnsiFrames, rewriteRoute, serverEntry, type AdapterContext, type AdapterResult } from "./shared";

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
 * Where ANSI frames live in `static/`: always at the root (never under
 * basePath) and under `/_textjs/`, which the `internal` route answers with a
 * 404, so a frame is only reachable through its page's route, after middleware.
 */
export const VERCEL_ANSI_DIR = "_textjs/ansi";

/** Vercel accepts 2,048 routes per deployment: past this many, the build warns (each prerendered frame adds one). */
export const VERCEL_ROUTES_NOTE = 1800;
export const VERCEL_MAX_ROUTES = 2048;

/** The build note for a `config.json` with `count` routes, or `null` while it's well under Vercel's limit. */
export function vercelRouteNote(count: number): string | null {
  if (count <= VERCEL_ROUTES_NOTE) return null;
  return `config.json has ${count} routes. Vercel allows ${VERCEL_MAX_ROUTES.toLocaleString("en-US")} per deployment, and each curl frame adds one. Add \`export const ansi = false\` to pages that don't need a frame, or set \`ansi: false\` in text.config.ts.`;
}

/** `text/html` in any case, for an `Accept` condition (route `has` values have no flags). */
const ACCEPT_HTML = "text/html".replace(/[a-z]/g, (c) => `[${c.toUpperCase()}${c}]`);

/** A frame's path below {@link VERCEL_ANSI_DIR} (decoded segments, `/` → `index.txt`). */
export function vercelAnsiFile(pattern: string): string[] {
  return [...pattern.split("/").filter(Boolean), "index.txt"];
}

/**
 * Terminal clients requesting a page with a prerendered frame get the frame:
 * case-sensitive (`/ADMIN` is another path, which middleware guarding `/admin`
 * never saw), `GET` and `HEAD` only.
 */
export function vercelAnsiRoute(pattern: string, basePath = ""): VercelRoute {
  return {
    src: patternRegex(pattern, basePath),
    dest: `/${VERCEL_ANSI_DIR}/${vercelAnsiFile(pattern).map(encodePathSegment).join("/")}`,
    methods: ["GET", "HEAD"],
    caseSensitive: true,
    has: [{ type: "header", key: "user-agent", value: { re: TERMINAL_UA.source } }],
    missing: [{ type: "header", key: "accept", value: { re: ACCEPT_HTML } }],
    headers: { "content-type": "text/plain; charset=utf-8", vary: ANSI_VARY, "cache-control": ANSI_CACHE_CONTROL, "x-content-type-options": "nosniff" },
  };
}

/**
 * Paths that may not be in canonical form, as sent on the wire: escapes,
 * characters a URL parser would encode or reject, `//`, `.` and `..`
 * segments, a trailing slash. Vercel's router may match these differently
 * from the matchers, so they always reach the edge middleware, which
 * rewrites them to the canonical path (even when the app has no
 * `middleware.ts`).
 */
export const NON_CANONICAL_PATH = String.raw`^.*(?:[\x00-\x20"#%<>?\\^\`{}\x7f]|[^\x00-\x7f]|\/\/|\/\.\.?(?:\/|$)).*$|^.+\/$`;

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

// Without middleware.ts this only canonicalizes paths (no matcher matches).
const mod = options.middleware ?? { middleware() {}, config: { matcher: [] } };

export default async function textjsMiddleware(request, context) {
  const outcome = await runMiddleware(mod, request, { basePath: options.basePath, waitUntil: (p) => context?.waitUntil?.(p) });
  if (outcome.type === "next") {
    // Route exactly the canonical path middleware saw (/ad%6din → /admin). The request URL here may
    // already be normalized while Vercel still routes the raw path (/x/../admin), so always rewrite.
    if (!outcome.rewrite) outcome.rewrite = new URL(outcome.request.url);
    // Only the handler routes set the routed-path header, whether the client or middleware.ts sent one.
    outcome.request.headers.delete(${JSON.stringify(ROUTED_HEADER)});
  }
  return toMiddlewareResponse(outcome, request);
}
`;

export interface VercelRoute {
  src?: string;
  methods?: string[];
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

/** `ansi`: route patterns with a prerendered frame (see {@link vercelAnsiRoute}). */
export function vercelConfig(ctx: AdapterContext, middleware: MiddlewareModule | null, ansi: readonly string[] = []): VercelConfig {
  const base = ctx.basePath;
  // The handler function is internal. A `status` route doesn't stop Vercel from
  // running a function at that path, so what keeps it internal is the header:
  // only the handler routes below set it, after the first route drops any the client sent.
  // `dest` points at a path with no function: a bare `status` route would still run server.func.
  const internal: VercelRoute = { src: `^\\/${escapeRegex(VERCEL_FUNCTION.split("/")[0] as string)}(?:\\/.*)?$`, dest: "/_textjs/404", status: 404 };
  const dropRouted: VercelRoute = { src: "^.*$", transforms: [{ type: "request.headers", op: "delete", target: { key: ROUTED_HEADER } }], continue: true };
  const routes: VercelRoute[] = [
    dropRouted,
    internal,
    { src: `^${escapeRegex(base)}\\/assets\\/(.*)$`, headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true, caseSensitive: true },
  ];
  // One route, so middleware runs once per request. It covers every path a
  // matcher names and every non-canonical spelling; the middleware checks
  // the canonical path against the matchers (with `has` / `missing`) itself.
  const matchers = middleware ? middlewareMatchers(middleware) : [];
  const src = matchers ? [...matchers.map((m) => matcherRegex(m.source, base)), NON_CANONICAL_PATH].map((re) => `(?:${re})`).join("|") : ".*";
  routes.push({
    src: `^(?:${src})$`,
    middlewarePath: VERCEL_MIDDLEWARE,
    ...(middleware ? { middlewareRawSrc: matchers ? matchers.map((m) => m.source) : ["/:path*"] } : {}),
    continue: true,
    override: true,
    caseSensitive: true,
  });
  for (const r of ctx.rewrites) {
    const { src, dest } = rewriteRoute(r, base);
    routes.push(/^[a-z]+:\/\//i.test(dest) ? { src, dest, caseSensitive: true } : { src, dest, continue: true, caseSensitive: true });
  }
  // Again after middleware and rewrites, which may have rewritten a spelling like `/_%74extjs/server` onto it,
  // and whatever order Vercel applies header transforms and middleware in.
  routes.push(internal, dropRouted);
  const routed = [{ type: "request.headers" as const, op: "set" as const, target: { key: ROUTED_HEADER }, args: "$1" }];
  for (const a of ctx.api) routes.push({ src: patternRegex(a.pattern, base), dest: `/${VERCEL_FUNCTION}`, transforms: routed, caseSensitive: true });
  // Pages, after route handlers and before files: a frame never shadows either (the build skips frames that collide with a file).
  for (const pattern of ansi) routes.push(vercelAnsiRoute(pattern, base));
  // The HTML at those paths depends on User-Agent and Accept too (one route for all of them).
  if (ansi.length > 0) {
    const src = ansi.map((p) => patternRegex(p, base).slice(1, -1)).join("|");
    routes.push({ src: `^(?:${src})$`, methods: ["GET", "HEAD"], headers: { vary: ANSI_VARY }, continue: true, caseSensitive: true });
  }
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
  const frames = readAnsiFrames(ctx.outDir);
  for (const [pattern, frame] of Object.entries(frames)) {
    const file = join(out, "static", ...VERCEL_ANSI_DIR.split("/"), ...vercelAnsiFile(pattern));
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, frame);
  }

  if (ctx.api.length > 0) {
    const dir = join(out, "functions", `${VERCEL_FUNCTION}.func`);
    mkdirSync(dir, { recursive: true });
    await bundleServerEntry({ root: ctx.root, config: ctx.config, code: serverEntry(ctx, { body: FUNCTION_BODY, middleware: false }), outFile: join(dir, "index.mjs"), target: "node" });
    writeFileSync(
      join(dir, ".vc-config.json"),
      `${JSON.stringify({ runtime: VERCEL_NODE_RUNTIME, handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: false, supportsResponseStreaming: true }, null, 2)}\n`,
    );
  }
  // Edge middleware runs even without middleware.ts: it canonicalizes paths before Vercel routes them.
  const mwDir = join(out, "functions", `${VERCEL_MIDDLEWARE}.func`);
  mkdirSync(mwDir, { recursive: true });
  await bundleServerEntry({ root: ctx.root, config: ctx.config, code: serverEntry(ctx, { body: MIDDLEWARE_BODY, handlers: false, runtime: false }), outFile: join(mwDir, "index.js"), target: "edge" });
  writeFileSync(join(mwDir, ".vc-config.json"), `${JSON.stringify({ runtime: "edge", entrypoint: "index.js" }, null, 2)}\n`);
  const config = vercelConfig(ctx, middleware, Object.keys(frames));
  writeFileSync(join(out, "config.json"), `${JSON.stringify(config, null, 2)}\n`);
  const routeNote = vercelRouteNote(config.routes.length);
  return { adapter: "vercel", output: out, notes: [...(routeNote ? [routeNote] : []), "Deploy: vercel deploy --prebuilt (or push: Vercel runs `text build` and picks up .vercel/output)"] };
}
