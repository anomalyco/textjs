/**
 * `text build --adapter bun`: a self-contained `dist/server.js` for
 * `bun dist/server.js` (static files, middleware, route handlers, SPA document).
 */

import { join } from "node:path";
import { resolveEmbed } from "../cors";
import { bundleServerEntry, frameworkFile } from "./bundle";
import { serverEntry, type AdapterContext, type AdapterResult } from "./shared";

export const BUN_SERVER_FILE = "server.js";

const BODY = `
import { existsSync } from "node:fs";
import { join, sep } from "node:path";
import { staticFile } from ${JSON.stringify(frameworkFile("server/static-file.ts"))};
import { loadLiveProduction } from ${JSON.stringify(frameworkFile("server/live-prod.ts"))};
import { runNodeStyle } from ${JSON.stringify(frameworkFile("server/live-web.ts"))};
import { EMBED_ASSET_HEADERS, isEmbedAsset } from ${JSON.stringify(frameworkFile("server/cors.ts"))};

const dir = import.meta.dir;
const self = join(dir, ${JSON.stringify(BUN_SERVER_FILE)});

// Server-rendered routes (\`runtime = "server"\`) and prerendered shells: Bun is a long-lived server, so live sessions run here.
const live = existsSync(join(dir, ".text", "live-manifest.json"))
  ? await loadLiveProduction(dir, {
      middleware: options.middleware,
      // As in \`text start\`: \`server\` from text.config.ts, then the environment.
      trustProxy: serverConfig.trustProxy ?? process.env.TRUST_PROXY === "1",
      origin: serverConfig.origin ?? process.env.TEXTJS_ORIGIN,
      allowOrigins: embed.allowOrigins,
      allowCredentials: embed.allowCredentials,
      onError: (error) => console.error(error),
    })
  : null;

function fileResponse(path, immutable) {
  const file = Bun.file(path);
  return new Response(file, {
    headers: {
      "content-type": file.type,
      "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate",
    },
  });
}

export const handler = createRequestHandler({
  ...options,
  live: live ? (request, url, context) => runNodeStyle(request, url, (req, res) => live.handle(req, res, url), context.clientAddress) : undefined,
  ansi: live ? live.ansi : undefined,
  assets(pathname) {
    // Directories serve their index.html (prerendered console shells).
    const path = staticFile(dir, decodeURIComponent(pathname), { index: true });
    if (!path || path === self) return null;
    const res = fileResponse(path, path.startsWith(join(dir, "assets") + sep));
    if (path.endsWith(".html")) res.headers.set("content-type", "text/html; charset=utf-8");
    else if (embed.enabled && isEmbedAsset(pathname)) for (const [k, v] of Object.entries(EMBED_ASSET_HEADERS)) res.headers.set(k, v);
    return res;
  },
  document() {
    const res = fileResponse(join(dir, "index.html"), false);
    res.headers.set("content-type", "text/html; charset=utf-8");
    return res;
  },
});

if (import.meta.main) {
  const server = Bun.serve({
    // Live sessions stream server-sent events (15s heartbeats): don't idle them out.
    idleTimeout: 60,
    port: Number(process.env.PORT ?? 3000),
    hostname: process.env.HOSTNAME ?? "0.0.0.0",
    fetch(request, server) {
      return handler(request, { clientAddress: server.requestIP(request)?.address }).catch((error) => {
        console.error(error);
        return new Response("500 | Internal Server Error", { status: 500 });
      });
    },
  });
  const stop = () => {
    live?.close();
    server.stop();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  console.log("▼ Text.js ready on http://" + (server.hostname === "0.0.0.0" ? "localhost" : server.hostname) + ":" + server.port + options.basePath);
}
`;

export async function adaptBun(ctx: AdapterContext): Promise<AdapterResult> {
  // `text.config.ts` isn't read at run time: bake in `embed` (validated here, so a bad `allowOrigins` fails the build) and `server`.
  const baked = [`const embed = ${JSON.stringify(resolveEmbed(ctx.config))};`, `const serverConfig = ${JSON.stringify({ trustProxy: ctx.config.server?.trustProxy, origin: ctx.config.server?.origin })};`].join("\n");
  await bundleServerEntry({ root: ctx.root, config: ctx.config, code: serverEntry(ctx, { body: `${baked}\n${BODY}` }), outFile: join(ctx.outDir, BUN_SERVER_FILE), target: "bun" });
  return { adapter: "bun", output: ctx.outDir, notes: [`Run with: bun ${join(ctx.config.outDir ?? "dist", BUN_SERVER_FILE)}`] };
}
