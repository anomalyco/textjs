import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BRAND_MARK, txError, txMessage } from "@textjs/core";
import { normalizeBasePath, type ProxyTarget } from "../config";
import { matchApiRoute } from "../server/scan";
import { loadLiveProduction } from "../server/live-prod";
import { applyRewrites, canonicalRequestTarget, compileRewrite, isAllowedHost, isValidHostHeader, proxyRequest, requestOrigin, sendWebResponse, toWebRequest, type RouteHandlerModule } from "../server/http";
import type { RouteManifest } from "../routing";
import { loadServerRuntime } from "../server/adapters/runtime-node";
import { runRouteHandlerWithCache } from "../server/cache-route";
import { runNodeMiddleware } from "../server/middleware-node";
import { staticFile } from "../server/static-file";
import { EMBED_ASSET_HEADERS, isEmbedAsset, resolveEmbed } from "../server/cors";
import { wantsAnsi } from "../ansi";
import { appendVary, markAnsiFallthrough, pageCacheControl } from "../server/ansi-server";
import { META_DIR } from "./build";
import { EMBED_FILE } from "../server/embed";
import { loadTextConfig } from "./config";
import { banner, color, fail, ok } from "./ui";
import { resolveRoot } from "../server/paths";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

export interface StartOptions {
  root: string;
  port?: number;
  host?: string;
  log?: boolean;
}

export interface StartedServer {
  server: Server;
  url: string;
  close(): Promise<void>;
}

export async function startProductionServer(options: StartOptions): Promise<StartedServer> {
  const opts = { ...options, root: resolveRoot(options.root) };
  const started = performance.now();
  const log = opts.log ?? true;
  const { config } = await loadTextConfig(opts.root, "serve", "production");
  const outDir = resolve(opts.root, config.outDir ?? "dist");
  const indexFile = join(outDir, "index.html");
  // An embed build has `embed.js` and no pages of its own (unless `embed.standalone`).
  // (The static and Cloudflare adapters remove `.text/`, so the files themselves tell.)
  const embedOnly = !existsSync(indexFile) && existsSync(join(outDir, EMBED_FILE));
  if (!existsSync(indexFile) && !embedOnly) {
    throw txError("TX017", config.outDir ?? "dist");
  }
  const basePath = normalizeBasePath(config.basePath);
  // `text build --embed` leaves text.config.ts alone: an embed-only build is for other sites either way.
  const embed = resolveEmbed(embedOnly && !config.embed ? { embed: true } : config);
  const rewrites = (typeof config.rewrites === "function" ? await config.rewrites() : (config.rewrites ?? [])).map(compileRewrite);
  const proxies = Object.entries(config.proxy ?? {}).map(([prefix, v]) => [prefix, typeof v === "string" ? { target: v } : v] as [string, ProxyTarget]);

  const apiFile = join(outDir, META_DIR, "server", "api.mjs");
  type ApiBundle = { manifest: RouteManifest; handlers: Record<string, RouteHandlerModule> };
  const api: ApiBundle | null = existsSync(apiFile) ? ((await import(pathToFileURL(apiFile).href)) as ApiBundle) : null;
  const indexHtml = existsSync(indexFile) ? readFileSync(indexFile) : null;
  // `middleware.ts` and `cacheHandler` (bundled by `text build`).
  const runtime = await loadServerRuntime(outDir);
  // Prerendered console shells (PPR) and server-rendered routes (`runtime = "server"`).
  const live = await loadLiveProduction(outDir, {
    log: log ? (m) => console.log(color.gray(m)) : undefined,
    onError: (e) => console.error(fail(e instanceof Error ? (e.stack ?? e.message) : String(e))),
    middleware: runtime?.middleware,
    trustProxy: config.server?.trustProxy ?? process.env.TRUST_PROXY === "1",
    origin: config.server?.origin ?? process.env.TEXTJS_ORIGIN,
    allowOrigins: embed.allowOrigins,
    allowCredentials: embed.allowCredentials,
  });

  const port = opts.port ?? 3000;
  // Loopback only unless `--host` is passed explicitly.
  const host = opts.host ?? "127.0.0.1";
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
  const originOptions = {
    origin: config.server?.origin ?? process.env.TEXTJS_ORIGIN,
    trustProxy: config.server?.trustProxy ?? process.env.TRUST_PROXY === "1",
  };
  // DNS rebinding: a loopback-bound server only answers loopback / IP / allowed host names.
  const allowedHosts = config.server?.allowedHosts ?? [];
  const notFound = (res: ServerResponse): void => {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("404 | This page could not be found.");
  };

  const server = createServer((req, res) => {
    const t0 = performance.now();
    const done = (): void => {
      if (log) console.log(color.gray(` ${req.method} ${(req.url ?? "/").split("?")[0]} ${res.statusCode} in ${Math.round(performance.now() - t0)}ms`));
    };
    void (async () => {
      if (loopback ? !isAllowedHost(req.headers.host, allowedHosts) : !isValidHostHeader(req.headers.host)) {
        res.statusCode = loopback ? 403 : 400;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(loopback ? `${BRAND_MARK} ${txMessage("TX028", JSON.stringify((req.headers.host ?? "").replace(/:\d+$/, "")), "server.allowedHosts")}` : "400 | Bad Request");
        return;
      }
      // One canonical pathname for middleware, rewrites, handlers and files (`/ad%6din//x/` → `/admin/x`).
      const canonical = canonicalRequestTarget(req.url);
      if (canonical === null) {
        res.statusCode = 400;
        return res.end("400 | Bad Request");
      }
      req.url = canonical;
      const origin = requestOrigin(req, originOptions);
      let url = req.url;
      if (basePath) {
        if (url === basePath || url.startsWith(`${basePath}/`) || url.startsWith(`${basePath}?`)) url = url.slice(basePath.length) || "/";
        else return notFound(res);
      }
      if (runtime?.middleware) {
        const next = await runNodeMiddleware(runtime.middleware, req, res, { basePath, origin });
        if (next === null) return;
        url = next;
      }
      const rewritten = rewrites.length > 0 ? applyRewrites(rewrites, url) : null;
      if (rewritten) {
        if (/^[a-z]+:\/\//i.test(rewritten)) return proxyRequest(req, res, rewritten, origin);
        const target = canonicalRequestTarget(rewritten);
        if (target === null) {
          res.statusCode = 400;
          return res.end("400 | Bad Request");
        }
        url = target;
      }
      for (const [prefix, target] of proxies) {
        if (url.startsWith(prefix)) {
          const path = target.rewrite ? target.rewrite(url) : url;
          return proxyRequest(req, res, new URL(path, target.target).href, origin);
        }
      }
      // `route` is canonical: route matching decodes it once, file lookups use the decoded form.
      const route = url.split("?")[0] ?? "/";
      const pathname = decodeURIComponent(route);
      const m = api ? matchApiRoute(api.manifest, route) : null;
      const mod = m ? api?.handlers[m.file] : undefined;
      if (live && !mod) {
        // Terminal clients (curl) get the page's first frame as ANSI, wherever a page would be served.
        const frame = await live.ansi(req, url);
        if (frame) return sendWebResponse(res, frame, req.method);
        // Terminals could get a frame here, so the HTML page served instead depends on User-Agent and Accept.
        if ((req.method === "GET" || req.method === "HEAD") && live.ansi.varies(url)) {
          res.setHeader("Vary", appendVary(res.getHeader("vary")?.toString()));
          // A terminal getting HTML here (over budget, skipped, failed): never cached under its key.
          if (wantsAnsi(req.method, req.headers)) markAnsiFallthrough(res);
        }
      }
      if (live && (await live.handle(req, res, url))) return;
      if (api) {
        if (m && mod) {
          const request = toWebRequest(Object.assign(req, { url }), origin, res);
          return sendWebResponse(res, await runRouteHandlerWithCache(mod, request, { params: m.params, pattern: m.pattern, pathname: route }), request.method);
        }
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.statusCode = 405;
        return res.end();
      }
      const hidden = pathname.split(/[/\\]/).some((p) => p.startsWith(".") && p.length > 1);
      const filePath = hidden ? null : staticFile(outDir, pathname);
      if (filePath) {
        res.statusCode = 200;
        res.setHeader("Content-Type", MIME[extname(filePath)] ?? "application/octet-stream");
        res.setHeader("Cache-Control", pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate");
        if (embed.enabled && isEmbedAsset(pathname)) for (const [k, v] of Object.entries(EMBED_ASSET_HEADERS)) res.setHeader(k, v);
        if (req.method === "HEAD") return res.end();
        createReadStream(filePath).pipe(res);
        return;
      }
      const last = pathname.split("/").pop() ?? "";
      if (last.includes(".") || hidden || indexHtml === null) return notFound(res);
      res.statusCode = 200;
      res.setHeader("Content-Type", MIME[".html"] as string);
      res.setHeader("Cache-Control", pageCacheControl(res));
      res.end(req.method === "HEAD" ? undefined : indexHtml);
    })()
      .catch((error: unknown) => {
        if (log) console.error(fail(error instanceof Error ? (error.stack ?? error.message) : String(error)));
        if (!res.headersSent) res.statusCode = 500;
        res.end();
      })
      .finally(done);
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolveListen());
  });
  const addr = server.address() as AddressInfo;
  const url = `http://${host === "0.0.0.0" || host === "127.0.0.1" ? "localhost" : host}:${addr.port}${basePath}`;
  if (log) {
    console.log(`\n${banner([["Local", color.cyan(url)]])}\n`);
    console.log(ok("Starting..."));
    console.log(ok(`Ready in ${Math.round(performance.now() - started)}ms`));
    console.log("");
  }
  return {
    server,
    url,
    close: () =>
      new Promise<void>((r) => {
        live?.close();
        server.close(() => r());
      }),
  };
}
