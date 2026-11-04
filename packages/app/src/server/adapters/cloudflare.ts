/**
 * `text build --adapter cloudflare`: Cloudflare Pages advanced mode.
 * `dist/_worker.js` runs middleware and route handlers; `_routes.json` keeps
 * hashed assets on Pages' static CDN; `env.ASSETS` serves everything else.
 *
 * Requires the `nodejs_compat` compatibility flag (the data cache uses
 * `AsyncLocalStorage`).
 */

import { existsSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MiddlewareModule } from "../middleware";
import { bundleServerEntry, frameworkFile } from "./bundle";
import { resolveEmbed } from "../cors";
import { assertNoServerRoutes, headersNote, readAnsiFrames, removeServerBundle, serverEntry, staticHeadersRules, writeHeadersRules, type AdapterContext, type AdapterResult } from "./shared";

export const CLOUDFLARE_COMPAT = { date: "2025-01-01", flags: ["nodejs_compat"] } as const;

/**
 * A `_worker.js` past this size gets a build note. Cloudflare documents (Oct 2026) a 64 MiB
 * uncompressed limit for Workers and 25 MiB for any single Pages file: warn at 20 MiB, near the lower one.
 */
export const CLOUDFLARE_WORKER_NOTE_BYTES = 20 * 1024 * 1024;

/** The build note for a `_worker.js` of `bytes`, or `null` while it's well under Cloudflare's limits. */
export function cloudflareWorkerNote(bytes: number): string | null {
  if (bytes <= CLOUDFLARE_WORKER_NOTE_BYTES) return null;
  return `_worker.js is ${(bytes / 1024 / 1024).toFixed(1)} MiB, near Cloudflare's 25 MiB Pages file limit. If the worker gets too large, add \`export const ansi = false\` to pages that don't need a frame, or set \`ansi: false\` in text.config.ts.`;
}

/** Prerendered ANSI frames inlined into the worker (`ASSETS` would serve them at a URL middleware never sees). */
function ansiPrelude(frames: Record<string, string>): string {
  if (Object.keys(frames).length === 0) return "const ansi = undefined;";
  return `import { createAnsiHandler } from ${JSON.stringify(frameworkFile("server/ansi-server.ts"))};
const ansi = createAnsiHandler({ frames: ${JSON.stringify(frames)} });`;
}

const BODY = `
import { EMBED_ASSET_HEADERS, isEmbedAsset } from ${JSON.stringify(frameworkFile("server/cors.ts"))};

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
  const pathname = new URL(url).pathname;
  const hashed = pathname.startsWith("/assets/");
  const shared = embed.enabled && isEmbedAsset(pathname);
  if ((!hashed && !shared) || !res.ok) return res;
  const out = new Response(res.body, res);
  // basePath apps serve hashed assets through the worker (they live at dist/assets, not dist/<base>/assets).
  if (hashed) out.headers.set("cache-control", "public, max-age=31536000, immutable");
  if (shared && !(out.headers.get("content-type") ?? "").includes("text/html")) for (const [k, v] of Object.entries(EMBED_ASSET_HEADERS)) out.headers.set(k, v);
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
  if (middleware || ctx.basePath) return { version: 1, include: ["/*"], exclude: [] };
  return { version: 1, include: ["/*"], exclude: resolveEmbed(ctx.config).enabled ? ["/assets/*", "/embed.js"] : ["/assets/*"] };
}

export async function adaptCloudflare(ctx: AdapterContext, middleware: MiddlewareModule | null): Promise<AdapterResult> {
  assertNoServerRoutes(ctx, "cloudflare");
  const frames = readAnsiFrames(ctx.outDir);
  const workerFile = join(ctx.outDir, "_worker.js");
  const embed = `const embed = ${JSON.stringify({ enabled: resolveEmbed(ctx.config).enabled })};`;
  await bundleServerEntry({ root: ctx.root, config: ctx.config, code: serverEntry(ctx, { body: `${ansiPrelude(frames)}\n${embed}\n${BODY}` }), outFile: workerFile, target: "webworker" });
  const sizeNote = cloudflareWorkerNote(statSync(workerFile).size);
  writeFileSync(join(ctx.outDir, "_routes.json"), `${JSON.stringify(cloudflareRoutes(ctx, middleware), null, 2)}\n`);
  const headersNoteLine = headersNote(writeHeadersRules(ctx.outDir, staticHeadersRules(ctx.config)), ctx.config);
  // Without a top-level 404.html, Pages answers unknown files with index.html (200), and missing assets would render the app.
  const notFoundFile = join(ctx.outDir, "404.html");
  if (!existsSync(notFoundFile)) writeFileSync(notFoundFile, "404 | This page could not be found.\n");
  // Pages would publish dist/.text (server bundles, manifests) as static files.
  removeServerBundle(ctx.outDir);
  return {
    adapter: "cloudflare",
    output: ctx.outDir,
    notes: [
      ...(sizeNote ? [sizeNote] : []),
      ...(headersNoteLine ? [headersNoteLine] : []),
      `Requires the ${CLOUDFLARE_COMPAT.flags.join(", ")} compatibility flag (Pages → Settings → Runtime, or wrangler.toml).`,
      `Preview: bunx wrangler pages dev ${ctx.config.outDir ?? "dist"} --compatibility-flags=nodejs_compat`,
      `Deploy:  bunx wrangler pages deploy ${ctx.config.outDir ?? "dist"}`,
    ],
  };
}
