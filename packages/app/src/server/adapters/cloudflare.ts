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
import type { MiddlewareModule } from "../middleware";
import { bundleServerEntry, frameworkFile } from "./bundle";
import { assertNoServerRoutes, readAnsiFrames, removeServerBundle, serverEntry, type AdapterContext, type AdapterResult } from "./shared";

export const CLOUDFLARE_COMPAT = { date: "2025-01-01", flags: ["nodejs_compat"] } as const;

/** Inlined ANSI frames past this size get a build note: Workers limit the compressed bundle size. */
export const CLOUDFLARE_ANSI_NOTE_BYTES = 1024 * 1024;

/** Prerendered ANSI frames inlined into the worker (`ASSETS` would serve them at a URL middleware never sees). */
function ansiPrelude(frames: Record<string, string>): string {
  if (Object.keys(frames).length === 0) return "const ansi = undefined;";
  return `import { createAnsiHandler } from ${JSON.stringify(frameworkFile("server/ansi-server.ts"))};
const ansi = createAnsiHandler({ frames: ${JSON.stringify(frames)} });`;
}

const BODY = `
const fetchAsset = (env, url, request) => env.ASSETS.fetch(new Request(url, { method: request.method, headers: request.headers }));

// \`pathname\` is canonical and percent-encoded: \`new URL()\` keeps it as is (decoding it again would undo the middleware match).
async function asset(env, url, request) {
  let res = await fetchAsset(env, url, request);
  if (res.status === 404) return null;
  // Pages redirects a directory (\`/docs\`) to its slash form (\`/docs/\`), which canonicalizes back to \`/docs\`: serve the index here instead of looping.
  const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
  if (location) {
    const to = new URL(location, url);
    if (to.origin === new URL(url).origin && to.pathname === new URL(url).pathname + "/") {
      res = await fetchAsset(env, to, request);
      if (res.status === 404) return null;
    }
  }
  if (!new URL(url).pathname.startsWith("/assets/") || !res.ok) return res;
  // basePath apps serve hashed assets through the worker (they live at dist/assets, not dist/<base>/assets).
  const out = new Response(res.body, res);
  out.headers.set("cache-control", "public, max-age=31536000, immutable");
  return out;
}

const handler = createRequestHandler({
  ...options,
  ansi,
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

/**
 * `_routes.json`: invoke the worker for every request, so middleware sees
 * every path and requests outside `basePath` get the worker's 404 instead of
 * a file from `dist/`. Hashed assets skip the worker only when the app has no
 * middleware and no basePath: Pages serves excluded paths straight from
 * `dist/`, under spellings (`/assets/../admin/x`) a matcher never sees.
 */
export function cloudflareRoutes(ctx: AdapterContext, middleware: MiddlewareModule | null): CloudflareRoutes {
  return { version: 1, include: ["/*"], exclude: middleware || ctx.basePath ? [] : ["/assets/*"] };
}

export async function adaptCloudflare(ctx: AdapterContext, middleware: MiddlewareModule | null): Promise<AdapterResult> {
  assertNoServerRoutes(ctx, "cloudflare");
  const frames = readAnsiFrames(ctx.outDir);
  const frameBytes = Object.values(frames).reduce((n, f) => n + Buffer.byteLength(f), 0);
  await bundleServerEntry({ root: ctx.root, config: ctx.config, code: serverEntry(ctx, { body: `${ansiPrelude(frames)}\n${BODY}` }), outFile: join(ctx.outDir, "_worker.js"), target: "webworker" });
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
      ...(frameBytes > CLOUDFLARE_ANSI_NOTE_BYTES ? [`curl frames add ${(frameBytes / 1024 / 1024).toFixed(1)} MB to _worker.js. Set \`ansi: false\` on pages that don't need them if the worker gets too large.`] : []),
      `Requires the ${CLOUDFLARE_COMPAT.flags.join(", ")} compatibility flag (Pages → Settings → Runtime, or wrangler.toml).`,
      `Preview: bunx wrangler pages dev ${ctx.config.outDir ?? "dist"} --compatibility-flags=nodejs_compat`,
      `Deploy:  bunx wrangler pages deploy ${ctx.config.outDir ?? "dist"}`,
    ],
  };
}
