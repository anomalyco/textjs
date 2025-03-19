import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeBasePath, type ProxyTarget } from "../config";
import { matchApiRoute } from "../server/scan";
import { applyRewrites, compileRewrite, proxyRequest, runRouteHandler, sendWebResponse, toWebRequest, type RouteHandlerModule } from "../server/http";
import type { RouteManifest } from "../routing";
import { META_DIR } from "./build";
import { loadTextConfig } from "./config";
import { banner, color, fail, ok } from "./ui";

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

export async function startProductionServer(opts: StartOptions): Promise<StartedServer> {
  const started = performance.now();
  const log = opts.log ?? true;
  const { config } = await loadTextConfig(opts.root, "serve", "production");
  const outDir = resolve(opts.root, config.outDir ?? "dist");
  const indexFile = join(outDir, "index.html");
  if (!existsSync(indexFile)) {
    throw new Error(`Could not find a production build in the '${config.outDir ?? "dist"}' directory. Try building your app with 'text build' before starting the production server.`);
  }
  const basePath = normalizeBasePath(config.basePath);
  const rewrites = (typeof config.rewrites === "function" ? await config.rewrites() : (config.rewrites ?? [])).map(compileRewrite);
  const proxies = Object.entries(config.proxy ?? {}).map(([prefix, v]) => [prefix, typeof v === "string" ? { target: v } : v] as [string, ProxyTarget]);

  const apiFile = join(outDir, META_DIR, "server", "api.mjs");
  type ApiBundle = { manifest: RouteManifest; handlers: Record<string, RouteHandlerModule> };
  const api: ApiBundle | null = existsSync(apiFile) ? ((await import(pathToFileURL(apiFile).href)) as ApiBundle) : null;
  const indexHtml = readFileSync(indexFile);

  const server = createServer((req, res) => {
    const t0 = performance.now();
    const origin = `http://${req.headers.host ?? "localhost"}`;
    const done = (): void => {
      if (log) console.log(color.gray(` ${req.method} ${req.url} ${res.statusCode} in ${Math.round(performance.now() - t0)}ms`));
    };
    void (async () => {
      let url = req.url ?? "/";
      if (basePath) {
        if (url === basePath || url.startsWith(`${basePath}/`) || url.startsWith(`${basePath}?`)) url = url.slice(basePath.length) || "/";
      }
      const rewritten = rewrites.length > 0 ? applyRewrites(rewrites, url) : null;
      if (rewritten) {
        if (/^[a-z]+:\/\//i.test(rewritten)) return proxyRequest(req, res, rewritten, origin);
        url = rewritten;
      }
      for (const [prefix, target] of proxies) {
        if (url.startsWith(prefix)) {
          const path = target.rewrite ? target.rewrite(url) : url;
          return proxyRequest(req, res, new URL(path, target.target).href, origin);
        }
      }
      const pathname = decodeURIComponent(url.split("?")[0] ?? "/");
      if (api) {
        const m = matchApiRoute(api.manifest, pathname);
        const mod = m ? api.handlers[m.file] : undefined;
        if (m && mod) {
          const request = toWebRequest(Object.assign(req, { url }), origin);
          return sendWebResponse(res, await runRouteHandler(mod, request, m.params), request.method);
        }
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.statusCode = 405;
        return res.end();
      }
      const filePath = normalize(join(outDir, pathname));
      const inside = filePath === outDir || filePath.startsWith(outDir + sep);
      const hidden = pathname.split("/").some((p) => p.startsWith(".") && p.length > 1);
      if (inside && !hidden && existsSync(filePath) && statSync(filePath).isFile()) {
        res.statusCode = 200;
        res.setHeader("Content-Type", MIME[extname(filePath)] ?? "application/octet-stream");
        res.setHeader("Cache-Control", pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate");
        if (req.method === "HEAD") return res.end();
        createReadStream(filePath).pipe(res);
        return;
      }
      const last = pathname.split("/").pop() ?? "";
      if (last.includes(".") || hidden) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.end("404 | This page could not be found.");
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", MIME[".html"] as string);
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      res.end(req.method === "HEAD" ? undefined : indexHtml);
    })()
      .catch((error: unknown) => {
        if (log) console.error(fail(error instanceof Error ? (error.stack ?? error.message) : String(error)));
        if (!res.headersSent) res.statusCode = 500;
        res.end();
      })
      .finally(done);
  });

  const port = opts.port ?? 3000;
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, opts.host, () => resolveListen());
  });
  const addr = server.address() as AddressInfo;
  const url = `http://${opts.host && opts.host !== "0.0.0.0" ? opts.host : "localhost"}:${addr.port}${basePath}`;
  if (log) {
    console.log(`\n${banner([["Local", color.cyan(url)]])}\n`);
    console.log(ok("Starting..."));
    console.log(ok(`Ready in ${Math.round(performance.now() - started)}ms`));
    console.log("");
  }
  return {
    server,
    url,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
