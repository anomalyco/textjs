/**
 * Shared adapter plumbing: the build context, generated server entries and
 * route-pattern → regular-expression helpers.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Rewrite, TextConfig } from "../../config";
import { encodePathSegment } from "../../path-text";
import { parseSegment } from "../../routing";
import { generateApiModule } from "../../vite-plugin";
import type { ApiRoute, AppScan } from "../scan";
import { txError } from "@textjs/core";
import { compileMatcherSource, matcherKeys } from "../middleware-runtime";
import { listServerPages } from "../live-routes";
import { LIVE_MANIFEST, type LiveManifest } from "../live-manifest";
import { EMBED_ASSET_HEADERS, resolveEmbed } from "../cors";
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

/** A `_headers` rule (Cloudflare Pages, Netlify): a path pattern and the headers its responses get. */
export interface HeadersRule {
  path: string;
  headers: Record<string, string>;
}

const IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * `_headers` rules for the client build: hashed assets are immutable, and
 * with `embed` on, `embed.js` and `/assets/*` can be loaded by any site.
 */
export function staticHeadersRules(config: Pick<TextConfig, "embed">): HeadersRule[] {
  const embed = resolveEmbed(config).enabled ? EMBED_ASSET_HEADERS : null;
  const rules: HeadersRule[] = [{ path: "/assets/*", headers: { "Cache-Control": IMMUTABLE, ...embed } }];
  if (embed) rules.push({ path: "/embed.js", headers: { "Cache-Control": "public, max-age=0, must-revalidate", ...embed } });
  return rules;
}

/** The build note for `_headers` rules the app's own file already had, or `null`. */
export function headersNote(skipped: readonly string[], config: Pick<TextConfig, "embed">): string | null {
  if (skipped.length === 0 || !resolveEmbed(config).enabled) return null;
  const lines = Object.entries(EMBED_ASSET_HEADERS).map(([k, v]) => `${k}: ${v}`).join(", ");
  return `_headers already has rules for ${skipped.join(" and ")}, so Text.js left them as they are. Other sites can only load the embed when they include ${lines}.`;
}

/**
 * Append `rules` to `dist/_headers`. A path the file already has a rule for
 * is the app's own and stays as it is: returns those paths.
 */
export function writeHeadersRules(outDir: string, rules: readonly HeadersRule[]): string[] {
  const file = join(outDir, "_headers");
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  const skipped: string[] = [];
  const blocks: string[] = [];
  for (const rule of rules) {
    if (new RegExp(`^${escapeRegex(rule.path)}\\s*$`, "m").test(current)) {
      skipped.push(rule.path);
      continue;
    }
    blocks.push(`${rule.path}\n${Object.entries(rule.headers).map(([k, v]) => `  ${k}: ${v}\n`).join("")}`);
  }
  if (blocks.length > 0) writeFileSync(file, current.trim() ? `${current.trimEnd()}\n\n${blocks.join("\n")}` : blocks.join("\n"));
  return skipped;
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

/** The ANSI frames `text build` prerendered for terminal clients: decoded route pattern → frame. */
export function readAnsiFrames(outDir: string): Record<string, string> {
  const file = join(outDir, ".text", LIVE_MANIFEST);
  if (!existsSync(file)) return {};
  const manifest = JSON.parse(readFileSync(file, "utf8")) as LiveManifest;
  const out: Record<string, string> = {};
  for (const [pattern, rel] of Object.entries(manifest.ansi?.frames ?? {})) {
    const p = join(outDir, rel);
    if (existsSync(p)) out[pattern] = readFileSync(p, "utf8");
  }
  return out;
}
