/**
 * `text build --adapter cloudflare`: Cloudflare Pages advanced mode.
 * `dist/_worker.js` runs middleware and route handlers; `_routes.json` keeps
 * hashed assets on Pages' static CDN; `env.ASSETS` serves everything else.
 *
 * Requires the `nodejs_compat` compatibility flag (the data cache uses
 * `AsyncLocalStorage`).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { matchesMiddleware, middlewareMatchers } from "../middleware-runtime";
import type { MiddlewareModule } from "../middleware";
import { bundleServerEntry } from "./bundle";
import { removeServerBundle, serverEntry, type AdapterContext, type AdapterResult } from "./shared";

export const CLOUDFLARE_COMPAT = { date: "2025-01-01", flags: ["nodejs_compat"] } as const;

const BODY = `
async function asset(env, url, request) {
  const res = await env.ASSETS.fetch(new Request(url, { method: request.method, headers: request.headers }));
  return res.status === 404 ? null : res;
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

/** `_routes.json`: invoke the worker for everything except hashed assets (unless middleware matches them). */
export function cloudflareRoutes(ctx: AdapterContext, middleware: MiddlewareModule | null): CloudflareRoutes {
  const base = ctx.basePath;
  const assetsRun = middleware ? matchesMiddleware(middlewareMatchers(middleware), "/assets/__probe.js") : false;
  return { version: 1, include: [`${base}/*`], exclude: assetsRun ? [] : [`${base}/assets/*`] };
}

export async function adaptCloudflare(ctx: AdapterContext, middleware: MiddlewareModule | null): Promise<AdapterResult> {
  await bundleServerEntry({ root: ctx.root, config: ctx.config, code: serverEntry(ctx, { body: BODY }), outFile: join(ctx.outDir, "_worker.js"), target: "webworker" });
  writeFileSync(join(ctx.outDir, "_routes.json"), `${JSON.stringify(cloudflareRoutes(ctx, middleware), null, 2)}\n`);
  const headersFile = join(ctx.outDir, "_headers");
  const rule = `${ctx.basePath}/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`;
  if (!existsSync(headersFile)) writeFileSync(headersFile, rule);
  else if (!readFileSync(headersFile, "utf8").includes(`${ctx.basePath}/assets/*`)) writeFileSync(headersFile, `${readFileSync(headersFile, "utf8").trimEnd()}\n\n${rule}`);
  // Pages would publish dist/.text/server/*.mjs as static files.
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
