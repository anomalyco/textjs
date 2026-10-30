/**
 * `text build --adapter cloudflare`: Cloudflare Pages advanced mode.
 * `dist/_worker.js` runs middleware and route handlers; `_routes.json` keeps
 * hashed assets on Pages' static CDN; `env.ASSETS` serves everything else.
 *
 * Requires the `nodejs_compat` compatibility flag (the data cache uses
 * `AsyncLocalStorage`).
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { matcherCouldMatch, middlewareMatchers } from "../middleware-runtime";
import type { MiddlewareModule } from "../middleware";
import { bundleServerEntry } from "./bundle";
import { assertNoServerRoutes, removeServerBundle, serverEntry, type AdapterContext, type AdapterResult } from "./shared";

export const CLOUDFLARE_COMPAT = { date: "2025-01-01", flags: ["nodejs_compat"] } as const;

const BODY = `
async function asset(env, url, request) {
  const res = await env.ASSETS.fetch(new Request(url, { method: request.method, headers: request.headers }));
  if (res.status === 404) return null;
  if (!new URL(url).pathname.startsWith("/assets/") || !res.ok) return res;
  // basePath apps serve hashed assets through the worker (they live at dist/assets, not dist/<base>/assets).
  const out = new Response(res.body, res);
  out.headers.set("cache-control", "public, max-age=31536000, immutable");
  return out;
}

const handler = createRequestHandler({
  ...options,
  assets(pathname, request, context) {
    return asset(context.env, new URL(pathname, request.url), request);
  },
  document(request, context) {
    // Pages redirects /index.html to /, so ask for the directory index.
    return asset(context.env, new URL("/", request.url), request);
  },
});

export default {
  async fetch(request, env, ctx) {
    try {
      return await handler(request, { env, waitUntil: (p) => ctx.waitUntil(p) });
    } catch (error) {
      console.error(error);
      return new Response("500 | Internal Server Error", { status: 500 });
    }
  },
};
`;

export interface CloudflareRoutes {
  version: 1;
  include: string[];
  exclude: string[];
}

function listAssets(outDir: string): string[] {
  const dir = join(outDir, "assets");
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string, rel: string): void => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p, `${rel}/${name}`);
      else out.push(`${rel}/${name}`);
    }
  };
  walk(dir, "/assets");
  return out;
}

/**
 * `_routes.json`: invoke the worker for everything except hashed assets.
 * Pages serves excluded paths straight from `dist/`, so the exclusion only
 * applies without a basePath (files live at `dist/assets`, not
 * `dist/<base>/assets`), and only when no middleware matcher could cover an
 * asset (`has` / `missing` are request-time and ignored here).
 */
export function cloudflareRoutes(ctx: AdapterContext, middleware: MiddlewareModule | null): CloudflareRoutes {
  const base = ctx.basePath;
  const matchers = middleware ? middlewareMatchers(middleware) : null;
  const assets = listAssets(ctx.outDir);
  const assetsRun = middleware ? [...assets, "/assets/__probe.js"].some((p) => matcherCouldMatch(matchers, p)) : false;
  return { version: 1, include: [`${base}/*`], exclude: assetsRun || base ? [] : ["/assets/*"] };
}

export async function adaptCloudflare(ctx: AdapterContext, middleware: MiddlewareModule | null): Promise<AdapterResult> {
  assertNoServerRoutes(ctx, "cloudflare");
  await bundleServerEntry({ root: ctx.root, config: ctx.config, code: serverEntry(ctx, { body: BODY }), outFile: join(ctx.outDir, "_worker.js"), target: "webworker" });
  writeFileSync(join(ctx.outDir, "_routes.json"), `${JSON.stringify(cloudflareRoutes(ctx, middleware), null, 2)}\n`);
  const headersFile = join(ctx.outDir, "_headers");
  const rule = "/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n";
  if (!existsSync(headersFile)) writeFileSync(headersFile, rule);
  else if (!/^\/assets\/\*\s*$/m.test(readFileSync(headersFile, "utf8"))) writeFileSync(headersFile, `${readFileSync(headersFile, "utf8").trimEnd()}\n\n${rule}`);
  // Without a top-level 404.html, Pages answers unknown files with index.html (200), and missing assets would render the app.
  const notFoundFile = join(ctx.outDir, "404.html");
  if (!existsSync(notFoundFile)) writeFileSync(notFoundFile, "404 | This page could not be found.\n");
  // Pages would publish dist/.text (server bundles, manifests) as static files.
  removeServerBundle(ctx.outDir);
  return {
    adapter: "cloudflare",
    output: ctx.outDir,
    notes: [
      `Requires the ${CLOUDFLARE_COMPAT.flags.join(", ")} compatibility flag (Pages → Settings → Runtime, or wrangler.toml).`,
      `Preview: bunx wrangler pages dev ${ctx.config.outDir ?? "dist"} --compatibility-flags=nodejs_compat`,
      `Deploy:  bunx wrangler pages deploy ${ctx.config.outDir ?? "dist"}`,
    ],
  };
}
