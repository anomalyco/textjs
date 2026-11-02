/**
 * Shared adapter plumbing: the build context, generated server entries and
 * route-pattern → regular-expression helpers.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Rewrite, TextConfig } from "../../config";
import { encodePathSegment } from "../../path-text";
import { parseSegment } from "../../routing";
import { generateApiModule } from "../../vite-plugin";
import type { ApiRoute, AppScan } from "../scan";
import { txError } from "@textjs/core";
import { compileMatcherSource, matcherKeys } from "../middleware-runtime";
import { listServerPages } from "../live-routes";
import { frameworkFile } from "./bundle";

export const ADAPTERS = ["static", "bun", "vercel", "cloudflare"] as const;
export type AdapterName = (typeof ADAPTERS)[number];

export interface AdapterContext {
  root: string;
  /** The client build (`dist/`). */
  outDir: string;
  config: TextConfig;
  scan: AppScan;
  api: ApiRoute[];
  basePath: string;
  /** Config rewrites, resolved at build time. */
  rewrites: Rewrite[];
  middlewareFile: string | null;
  cacheHandlerFile: string | null;
  print(line?: string): void;
}

export interface AdapterResult {
  adapter: AdapterName;
  /** Deployable output directory. */
  output: string;
  /** Lines for the build summary. */
  notes: string[];
}

export function isAdapterName(value: unknown): value is AdapterName {
  return typeof value === "string" && (ADAPTERS as readonly string[]).includes(value);
}

/** The adapter implied by the build environment (`VERCEL=1`, `CF_PAGES=1`). */
export function detectAdapter(env: Record<string, string | undefined> = process.env): AdapterName | undefined {
  if (env.VERCEL === "1") return "vercel";
  if (env.CF_PAGES === "1") return "cloudflare";
  return undefined;
}

const json = JSON.stringify;

export interface EntryOptions {
  /** Extra source appended after `options` is declared. */
  body: string;
  /** Import the route handler modules (default `true`). */
  handlers?: boolean;
  /** Import `middleware.ts` (default `true`). */
  middleware?: boolean;
  /** Import `createRequestHandler` (default `true`). */
  runtime?: boolean;
}

/**
 * The common entry prelude: route handlers (`manifest`, `handlers`), the
 * middleware module, the cache store and `options` for `createRequestHandler`.
 */
export function serverEntry(ctx: AdapterContext, opts: EntryOptions): string {
  const lines: string[] = [];
  const withHandlers = opts.handlers !== false;
  const withMiddleware = opts.middleware !== false && ctx.middlewareFile !== null;
  if (withHandlers) lines.push(generateApiModule(ctx.scan));
  else lines.push("export const manifest = { segment: \"\" };", "export const handlers = {};");
  if (opts.runtime !== false) lines.push(`import { createRequestHandler } from ${json(frameworkFile("server/adapters/runtime.ts"))};`);
  if (withMiddleware) lines.push(`import * as middleware from ${json(ctx.middlewareFile)};`);
  const withStore = ctx.cacheHandlerFile !== null && opts.runtime !== false;
  if (withStore) lines.push(`import cacheStore from ${json(ctx.cacheHandlerFile)};`);
  lines.push(
    `const options = { manifest, handlers, basePath: ${json(ctx.basePath)}, rewrites: ${json(ctx.rewrites)}${withMiddleware ? ", middleware" : ""}${withStore ? ", cacheStore" : ""} };`,
    opts.body,
  );
  return lines.join("\n");
}

export function escapeRegex(s: string): string {
  return s.replace(/[.+*?^${}()|[\]\\/]/g, "\\$&");
}

/** App route pattern (`/api/posts/[id]`, `/api/[...slug]`) → anchored regex source with one outer capture. */
export function patternRegex(pattern: string, basePath = ""): string {
  let body = "";
  for (const seg of pattern.split("/").filter(Boolean)) {
    const p = parseSegment(seg);
    if (p.kind === "group") continue;
    if (p.kind === "static") body += `\\/${escapeRegex(encodePathSegment(p.name))}`;
    else if (p.kind === "dynamic") body += "\\/[^/]+";
    else if (p.kind === "catchAll") body += "\\/[^/]+(?:\\/[^/]+)*";
    else body += "(?:\\/[^/]+(?:\\/[^/]+)*)?";
  }
  return `^(${escapeRegex(basePath)}${body})\\/?$`;
}

/** A middleware matcher, prefixed with basePath, as an anchored regex source. */
export function matcherRegex(source: string, basePath = ""): string {
  const re = compileMatcherSource(source);
  return `^${escapeRegex(basePath)}${re.slice(1)}`;
}

/** Config rewrite `source` → `{ src, dest }` with `$n` substitutions. */
export function rewriteRoute(rewrite: Rewrite, basePath = ""): { src: string; dest: string } {
  // Capture order, including unnamed groups (`/(.*)`) and groups inside custom patterns.
  const names = matcherKeys(rewrite.source);
  const src = matcherRegex(rewrite.source, basePath);
  const external = /^[a-z]+:\/\//i.test(rewrite.destination);
  let dest = rewrite.destination.replace(/:([A-Za-z_]\w*)[*+?]?/g, (_, n: string) => {
    const i = names.indexOf(n);
    return i < 0 ? "" : `$${i + 1}`;
  });
  if (!external) dest = basePath + dest;
  return { src, dest };
}

/** Copy `from` into `to`, skipping the `.text/` build metadata directory. */
export function copyStatic(from: string, to: string, skip: (rel: string) => boolean = () => false): void {
  mkdirSync(to, { recursive: true });
  const walk = (dir: string, rel: string): void => {
    for (const name of readdirSync(dir)) {
      const r = rel ? `${rel}/${name}` : name;
      if (r === ".text" || skip(r)) continue;
      const src = join(dir, name);
      const dest = join(to, r);
      if (statSync(src).isDirectory()) {
        mkdirSync(dest, { recursive: true });
        walk(src, r);
      } else cpSync(src, dest);
    }
  };
  walk(from, "");
}

/** Remove `.text/` (server bundles and build manifests) from output a static host publishes as-is. */
export function removeServerBundle(outDir: string): void {
  const dir = join(outDir, ".text");
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

/** Patterns of `export const runtime = "server"` pages. */
export function serverRoutePatterns(ctx: Pick<AdapterContext, "scan">): string[] {
  return listServerPages(ctx.scan).map((p) => p.pattern);
}

/** Server-rendered routes keep a live session per tab: refuse platforms without a long-lived server. */
export function assertNoServerRoutes(ctx: Pick<AdapterContext, "scan">, adapter: AdapterName): void {
  const routes = serverRoutePatterns(ctx);
  if (routes.length > 0) throw txError("TX030", routes.join(", "), adapter);
}
