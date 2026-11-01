/**
 * `text build --adapter bun`: a self-contained `dist/server.js` for
 * `bun dist/server.js` (static files, middleware, route handlers, SPA document).
 */

import { join } from "node:path";
import { bundleServerEntry, frameworkFile } from "./bundle";
import { serverEntry, type AdapterContext, type AdapterResult } from "./shared";

export const BUN_SERVER_FILE = "server.js";

const BODY = `
import { existsSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { loadLiveProduction } from ${JSON.stringify(frameworkFile("server/live-prod.ts"))};
import { runNodeStyle } from ${JSON.stringify(frameworkFile("server/live-web.ts"))};

const dir = import.meta.dir;
const self = join(dir, ${JSON.stringify(BUN_SERVER_FILE)});

// Server-rendered routes (\`runtime = "server"\`) and prerendered shells: Bun is a long-lived server, so live sessions run here.
const live = existsSync(join(dir, ".text", "live-manifest.json"))
  ? await loadLiveProduction(dir, {
      middleware: options.middleware,
      trustProxy: process.env.TRUST_PROXY === "1",
      origin: process.env.TEXTJS_ORIGIN,
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
  assets(pathname) {
    let path = normalize(join(dir, pathname));
    if ((path !== dir && !path.startsWith(dir + sep)) || path === self) return null;
    try {
      // Directories serve their index.html (prerendered console shells).
      if (statSync(path).isDirectory()) path = join(path, "index.html");
      if (!statSync(path).isFile()) return null;
    } catch {
      return null;
    }
    const res = fileResponse(path, pathname.startsWith("/assets/"));
    if (path.endsWith(".html")) res.headers.set("content-type", "text/html; charset=utf-8");
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
  await bundleServerEntry({ root: ctx.root, config: ctx.config, code: serverEntry(ctx, { body: BODY }), outFile: join(ctx.outDir, BUN_SERVER_FILE), target: "bun" });
  return { adapter: "bun", output: ctx.outDir, notes: [`Run with: bun ${join(ctx.config.outDir ?? "dist", BUN_SERVER_FILE)}`] };
}
