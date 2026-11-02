/**
 * `@textjs/app/vite` — the Vite plugin behind `text dev` and `text build`:
 * file-system App Router manifest, virtual `index.html` + client entry,
 * `app/**\/route.ts` API handlers, rewrites / proxy and React Fast Refresh.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isIP } from "node:net";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import type { Plugin, ProxyOptions, ViteDevServer } from "vite";
import { BRAND_MARK, ENGINE_NAME, txMessage, VERSION } from "@textjs/core";
import { normalizeBasePath, toClientConfig, type Rewrite, type TextConfig } from "./config";
import { applyRewrites, canonicalRequestTarget, compileRewrite, proxyRequest, requestOrigin, runRouteHandler, sendWebResponse, toWebRequest, type CompiledRewrite, type RouteHandlerModule } from "./server/http";
import { attachFrameStream } from "./server/frames";
import { createLiveDevHandler, textjsLivePlugin } from "./server/live-dev";
import { withServerStubs } from "./server/live-routes";
import { runRouteHandlerWithCache } from "./server/cache-route";
import { createDevMiddleware, isServerOnlySource } from "./server/middleware-node";
import { encodePathSegment } from "./path-text";
import { generateRoutesModule, isRouteFile, matchApiRoute, scanApp, toApiManifest, toPosix, toStaticManifest, type AppScan } from "./server/scan";
import { flattenRoutes, type RouteManifest, type RouteSegmentNode } from "./routing";

export const VIRTUAL_ROUTES = "virtual:textjs/routes";
export const VIRTUAL_CONFIG = "virtual:textjs/config";
export const VIRTUAL_ENTRY = "virtual:textjs/entry";
export const VIRTUAL_API = "virtual:textjs/api";
/** The script `src` used by the generated `index.html`. */
export const ENTRY_URL = "/@textjs/entry";
/**
 * The URL every page's HTML is transformed as (Vite's SPA fallback does the same).
 * The request URL can't be used: Vite maps `/?q` to the project directory and then
 * watches the inline `<style>`'s "file", `/`, so chokidar crawls the whole disk.
 */
export const HTML_TRANSFORM_URL = "/index.html";

const RESOLVED = (id: string): string => `\0${id}`;

export interface TextLogger {
  info(message: string): void;
  error(message: string): void;
}

export interface TextVitePluginOptions extends TextConfig {
  /** Project root (defaults to Vite's `root`). */
  root?: string;
  /** Request / HMR log lines (the CLI passes its logger). */
  logger?: TextLogger;
}

/**
 * Mirrors Vite's `server.allowedHosts` check. Text.js API routes and user
 * middleware are registered in the pre-hook phase (ahead of Vite's own host
 * check), so they get the same DNS-rebinding protection here.
 */
export function isAllowedDevHost(server: Pick<ViteDevServer, "config">, hostHeader: string | undefined): boolean {
  const cfg = server.config.server;
  if (cfg.allowedHosts === true || cfg.https) return true;
  if (!hostHeader) return false;
  const host = hostHeader.trim();
  if (host.startsWith("[")) {
    // `[v6]` or `[v6]:port` only: nothing may follow the bracket but a port.
    const m = /^\[([^\]]+)\](?::\d{1,5})?$/.exec(host);
    return m !== null && isIP(m[1] as string) === 6;
  }
  const hostname = host.replace(/:\d+$/, "");
  if (isIP(hostname) === 4 || hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  const extra = (server.config as { additionalAllowedHosts?: readonly string[] }).additionalAllowedHosts ?? [];
  if (extra.includes(hostname)) return true;
  for (const allowed of cfg.allowedHosts ?? []) {
    if (allowed === hostname) return true;
    if (allowed.startsWith(".") && (allowed.slice(1) === hostname || hostname.endsWith(allowed))) return true;
  }
  return false;
}

const here = dirname(realpathSync(fileURLToPath(import.meta.url)));
const sourceExt = extname(fileURLToPath(import.meta.url)) === ".ts" ? ".tsx" : extname(fileURLToPath(import.meta.url));

/** `@textjs/app/client` next to this module (`src/` or `dist/`), else as the package's own `exports` map resolves it. */
function resolveClientModule(): string {
  const sibling = join(here, `client${sourceExt}`);
  if (existsSync(sibling)) return sibling;
  for (let dir = here; dirname(dir) !== dir; dir = dirname(dir)) {
    const pkgFile = join(dir, "package.json");
    if (!existsSync(pkgFile)) continue;
    const pkg = JSON.parse(readFileSync(pkgFile, "utf8")) as { name?: string; exports?: Record<string, string | { default?: string }> };
    if (pkg.name !== "@textjs/app") continue;
    const entry = pkg.exports?.["./client"];
    const rel = typeof entry === "string" ? entry : entry?.default;
    if (rel) return join(dir, rel);
  }
  return sibling;
}

/** Absolute path of `@textjs/app/client` (deduped with the user's `@textjs/app` imports via realpath). */
export const CLIENT_MODULE = toPosix(resolveClientModule());

export const FAVICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0a0a0a"/><path d="M7 10h18L16 25z" fill="#ededed"/></svg>`,
)}`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** The generated `index.html` used when the project has none. */
export function createIndexHtml(title: string, entryUrl = ENTRY_URL): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content="Text.js ${VERSION} (${ENGINE_NAME})" />
    <meta name="color-scheme" content="dark" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" href="${FAVICON}" />
    <style>
      html, body { margin: 0; min-height: 100%; background: #0a0a0a; color: #ededed; }
      body { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: Geist, Inter, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
    </style>
  </head>
  <body>
    <div id="__textjs"></div>
    <noscript>${BRAND_MARK} Text.js apps render into console.log, which requires JavaScript.</noscript>
    <script type="module" src="${entryUrl}"></script>
  </body>
</html>
`;
}

export function createEntryModule(clientModule = CLIENT_MODULE): string {
  return `import { bootTextApp } from ${JSON.stringify(clientModule)};
import routes from ${JSON.stringify(VIRTUAL_ROUTES)};
import config from ${JSON.stringify(VIRTUAL_CONFIG)};

bootTextApp({ routes, config, dev: import.meta.env.DEV, hot: import.meta.hot });
`;
}

/** Generate the server-side API handler bundle entry. */
export function generateApiModule(scan: AppScan): string {
  const imports: string[] = [];
  const handlers: string[] = [];
  const manifest = toApiManifest(scan);
  let n = 0;
  const walk = (node: RouteSegmentNode): RouteSegmentNode => {
    const out: RouteSegmentNode = { segment: node.segment };
    if (node.files?.page) {
      const id = `r${n++}`;
      imports.push(`import * as ${id} from ${JSON.stringify(toPosix(node.files.page))};`);
      out.page = {};
      out.files = { page: id };
      handlers.push(`${JSON.stringify(id)}: ${id}`);
    }
    if (node.children) out.children = node.children.map(walk);
    return out;
  };
  const tree = walk(manifest);
  return `${imports.join("\n")}
export const manifest = ${JSON.stringify(tree)};
export const handlers = { ${handlers.join(", ")} };
`;
}

function findUp(start: string, rel: string): string | null {
  let dir = start;
  for (;;) {
    const p = join(dir, rel);
    if (existsSync(p)) return p;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// The live stub and player are imported by code text dev generates (server pages' client
// stand-in, /@textjs/player), which Vite's dependency scan never sees. Found later, they make
// Vite re-bundle mid-load: 404s for stale chunks and two copies of React.
const OPTIMIZE = ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom", "react-dom/client", "react-reconciler", "react-reconciler/constants.js", "scheduler", "yoga-layout/load", "@textjs/app/live-stub", "@textjs/app/live-player"];

function toViteProxy(proxy: TextConfig["proxy"]): Record<string, string | ProxyOptions> | undefined {
  if (!proxy) return undefined;
  const out: Record<string, string | ProxyOptions> = {};
  for (const [k, v] of Object.entries(proxy)) out[k] = typeof v === "string" ? v : { ...v };
  return out;
}

async function resolveRewrites(rewrites: TextConfig["rewrites"]): Promise<CompiledRewrite[]> {
  if (!rewrites) return [];
  const list: Rewrite[] = typeof rewrites === "function" ? await rewrites() : rewrites;
  return list.map(compileRewrite);
}

/** Whether Vite's `server.proxy` owns `url` (same key semantics: a path prefix, or a RegExp source starting with `^`). */
export function matchesProxy(proxy: TextConfig["proxy"], url: string): boolean {
  if (!proxy) return false;
  return Object.keys(proxy).some((key) => (key.startsWith("^") ? new RegExp(key).test(url) : url.startsWith(key)));
}

function isHtmlRequest(url: string, accept: string | undefined): boolean {
  const pathname = url.split("?")[0] ?? "/";
  if (pathname.startsWith("/@") || pathname.startsWith("/node_modules/") || pathname.startsWith("/__")) return false;
  const last = pathname.split("/").pop() ?? "";
  if (last.endsWith(".html")) return true;
  if (last.includes(".")) return false;
  return accept === undefined || accept.includes("text/html") || accept.includes("*/*");
}

/** Text.js Vite plugin (includes `@vitejs/plugin-react` for Fast Refresh). */
export function textjsVitePlugin(options: TextVitePluginOptions = {}): Plugin[] {
  const appDirName = options.appDir ?? "app";
  const basePath = normalizeBasePath(options.basePath);
  let root = resolve(options.root ?? process.cwd());
  let serving = false;
  const realPath = (file: string): string => {
    try {
      return realpathSync.native(file);
    } catch {
      return file;
    }
  };
  const within = (dir: string, file: string): boolean => file === dir || file.startsWith(dir + sep);
  /** A server-only source by its file path (any spelling: the real path decides). */
  const isServerOnlyFile = (file: string): boolean => {
    const realRoot = realPath(root);
    const real = realPath(file);
    if (!within(realRoot, real)) return false;
    const rel = relative(realRoot, real).split(sep).map(encodePathSegment).join("/");
    return isServerOnlySource(`/${rel}`, root, appDirName, options.cacheHandler ? [resolve(root, options.cacheHandler)] : []);
  };
  let scan: AppScan = scanApp(root, appDirName);
  let apiManifest: RouteManifest = toApiManifest(scan);
  let routesSignature = "";
  const log = options.logger;

  const rescan = (): boolean => {
    scan = scanApp(root, appDirName);
    apiManifest = toApiManifest(scan);
    const sig = JSON.stringify(generateRoutesModule(scan));
    const changed = sig !== routesSignature;
    routesSignature = sig;
    return changed;
  };

  const userHtml = (): string | null => {
    const p = join(root, "index.html");
    return existsSync(p) ? p : null;
  };
  const htmlPath = (): string => join(root, "index.html");
  const title = (): string => options.title ?? `${BRAND_MARK} Text.js`;

  const plugin: Plugin = {
    name: "@textjs/app",
    enforce: "pre",

    config(user, env) {
      root = resolve(user.root ?? options.root ?? process.cwd());
      rescan();
      const optimize = OPTIMIZE.filter((id) => {
        const pkg = id.startsWith("@") ? id.split("/").slice(0, 2).join("/") : (id.split("/")[0] as string);
        const manifest = findUp(root, join("node_modules", pkg, "package.json"));
        if (manifest === null) return false;
        // A workspace-linked @textjs/app isn't pre-bundled, so neither are its entry points:
        // bundling them alone would give them their own copy of the package's modules.
        return pkg !== "@textjs/app" || realpathSync(manifest).includes(`${sep}node_modules${sep}`);
      });
      return {
        root,
        appType: "custom",
        base: basePath ? `${basePath}/` : undefined,
        resolve: {
          dedupe: ["react", "react-dom"],
        },
        optimizeDeps: {
          entries: [`${appDirName}/**/*.{tsx,ts,jsx,js}`],
          include: optimize,
        },
        server: options.proxy ? { proxy: toViteProxy(options.proxy) } : undefined,
        preview: options.proxy ? { proxy: toViteProxy(options.proxy) } : undefined,
        build:
          env.command === "build" && !user.build?.ssr
            ? {
                outDir: options.outDir ?? "dist",
                target: "es2022",
                chunkSizeWarningLimit: 4096,
                rollupOptions: { input: userHtml() ?? htmlPath() },
              }
            : { target: "es2022" },
      };
    },

    configResolved(config) {
      root = config.root;
      serving = config.command === "serve";
      rescan();
    },

    buildStart() {
      rescan();
    },

    resolveId(rawId) {
      // `build.ssr` entries arrive resolved against the root.
      const v = rawId.indexOf("virtual:textjs/");
      const id = v > 0 && !rawId.startsWith("\0") ? rawId.slice(v) : rawId;
      if (id === VIRTUAL_ROUTES || id === VIRTUAL_CONFIG || id === VIRTUAL_API) return RESOLVED(id);
      if (id === VIRTUAL_ENTRY || id === ENTRY_URL || id === `${basePath}${ENTRY_URL}`) return RESOLVED(VIRTUAL_ENTRY);
      if (!userHtml() && toPosix(id) === toPosix(htmlPath())) return id;
      return null;
    },

    load(id, loadOptions) {
      // Vite resolves module requests itself (`/text.config?import`, `/app/api/x/route?raw`): guard the resolved file, not only the URL.
      if (serving && !loadOptions?.ssr && !id.startsWith("\0") && isAbsolute(id.split("?")[0] ?? "") && isServerOnlyFile(id.split("?")[0] as string)) {
        throw new Error(`${BRAND_MARK} ${toPosix(relative(root, id.split("?")[0] as string))} is server-only and can't be loaded in the browser.`);
      }
      if (id === RESOLVED(VIRTUAL_ROUTES)) return generateRoutesModule(withServerStubs(scan), { hmr: true });
      if (id === RESOLVED(VIRTUAL_CONFIG)) return `export default ${JSON.stringify(toClientConfig(options))};`;
      if (id === RESOLVED(VIRTUAL_ENTRY)) return createEntryModule();
      if (id === RESOLVED(VIRTUAL_API)) return generateApiModule(scan);
      if (!userHtml() && toPosix(id) === toPosix(htmlPath())) return createIndexHtml(title());
      return null;
    },

    handleHotUpdate(ctx) {
      if (log && !ctx.file.includes("/node_modules/")) log.info(` ✓ Fast Refresh  ${toPosix(relative(root, ctx.file))}`);
    },

    async configureServer(server: ViteDevServer) {
      const appDir = join(root, appDirName);
      server.watcher.add(appDir);
      const onStructure = (file: string): void => {
        if (!isRouteFile(file, appDir) && !toPosix(file).startsWith(toPosix(appDir))) return;
        if (!rescan()) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED(VIRTUAL_ROUTES));
        if (mod) server.moduleGraph.invalidateModule(mod);
        log?.info(` ○ Route manifest updated (${flattenRoutes(toStaticManifest(scan)).length} routes)`);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", onStructure);
      server.watcher.on("unlink", onStructure);
      server.watcher.on("addDir", onStructure);
      server.watcher.on("unlinkDir", onStructure);

      const rewrites = await resolveRewrites(options.rewrites);
      // Registered before user middleware and API routes so neither bypasses the host check.
      const realRoot = realPath(root);
      const miscased = (spelled: string, onDisk: string): boolean => spelled !== onDisk && spelled.toLowerCase() === onDisk.toLowerCase();
      /**
       * Files Vite would hand out that the browser must not get, from a canonical request target:
       * server-only sources (in any spelling), `public/` files under any URL but their own
       * (`/public/x`, `/@fs/…/public/x` skip middleware), and files spelled in another case.
       */
      const isHiddenFromBrowser = (target: string): boolean => {
        // Decoded once, before basePath and `/@fs/` are stripped (an encoded root, `My%20App`, must still match).
        let pathname = decodeURIComponent(target.split("?")[0] ?? "/");
        const base = decodeURIComponent(basePath);
        if (base && (pathname === base || pathname.startsWith(`${base}/`))) pathname = pathname.slice(base.length) || "/";
        // `/@fs/C:/app/x.ts` on Windows: drop the slash before the drive letter.
        const requested = pathname.startsWith("/@fs/") ? resolve(pathname.slice(4).replace(/^\/([A-Za-z]:)/, "$1")) : join(root, pathname);
        const file = realPath(requested);
        const publicDir = server.config.publicDir ? realPath(server.config.publicDir) : "";
        if (publicDir && publicDir !== realRoot && within(publicDir, file)) return true;
        if (!within(realRoot, file)) return false;
        // On disk under another case (macOS, Windows): middleware matched a different path.
        const spelled = within(root, requested) ? relative(root, requested) : relative(realRoot, requested);
        if (miscased(spelled, relative(realRoot, file))) return true;
        if (publicDir) {
          const asset = join(server.config.publicDir, pathname);
          if (within(server.config.publicDir, asset) && miscased(relative(server.config.publicDir, asset), relative(publicDir, realPath(asset)))) return true;
        }
        return isServerOnlyFile(file);
      };
      server.middlewares.use((req, res, next) => {
        if (!isAllowedDevHost(server, req.headers.host)) {
          res.statusCode = 403;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`${BRAND_MARK} ${txMessage("TX028", JSON.stringify((req.headers.host ?? "").replace(/:\d+$/, "")), "vite.server.allowedHosts")}`);
          return;
        }
        // One canonical pathname for middleware, handlers and files: `//evil.com/x` must not become `request.url` → http://evil.com/x,
        // and `/ad%6din//x/` is `/admin/x` everywhere.
        const canonical = canonicalRequestTarget(req.url);
        if (canonical === null) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("400 | Bad Request");
          return;
        }
        req.url = canonical;
        if (isHiddenFromBrowser(canonical)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("404 | This page could not be found.");
          return;
        }
        next();
      });
      // `middleware.ts` runs before user middleware, route handlers and pages.
      server.middlewares.use(createDevMiddleware(server, { root, basePath, log }));
      // `NextResponse.rewrite()` may have pointed the request at a file Vite would serve: guard it like the original.
      server.middlewares.use((req, res, next) => {
        if (!isHiddenFromBrowser(req.url ?? "/")) return next();
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("404 | This page could not be found.");
      });
      // Editor previews (VS Code): `/__textjs/frames`, `/__textjs/input`, `/__textjs/status`.
      const frames = attachFrameStream(server, root, { basePath });
      server.httpServer?.once("close", () => frames.close());
      // Server-rendered routes (`export const runtime = "server"`): live sessions + frame player HTML.
      const live = createLiveDevHandler(server, { root, appDir: appDirName, basePath, title: title(), viewport: options.viewport, live: options.live, logger: log });
      server.httpServer?.once("close", () => live.close());
      const userHook = await options.configureServer?.(server as never);

      server.middlewares.use(async (req, res, next) => {
        // Vite's proxy middleware runs after this one: leave `proxy` paths to it (a `fetch()` sends `Accept: */*`, which reads as a page request).
        if (matchesProxy(options.proxy, req.url ?? "/")) return next();
        const started = performance.now();
        const origin = requestOrigin(req);
        let url = req.url ?? "/";
        if (basePath) {
          // Outside basePath there are no app routes (and middleware didn't run): leave it to Vite.
          if (url === basePath || url.startsWith(`${basePath}/`) || url.startsWith(`${basePath}?`)) url = url.slice(basePath.length) || "/";
          else return next();
        }
        try {
          const rewritten = rewrites.length > 0 ? applyRewrites(rewrites, url) : null;
          if (rewritten) {
            if (/^[a-z]+:\/\//i.test(rewritten)) {
              await proxyRequest(req, res, rewritten, origin);
              log?.info(` ${req.method} ${url} → ${rewritten} ${res.statusCode} in ${Math.round(performance.now() - started)}ms`);
              return;
            }
            const target = canonicalRequestTarget(rewritten);
            if (target === null) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "text/plain; charset=utf-8");
              res.end("400 | Bad Request");
              return;
            }
            url = target;
            req.url = basePath + target;
            // The rewritten URL may name a file Vite would serve: guard it like the original.
            if (isHiddenFromBrowser(req.url)) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "text/plain; charset=utf-8");
              res.end("404 | This page could not be found.");
              return;
            }
          }
          const pathname = url.split("?")[0] ?? "/";
          if (await live.handle(req, res, url)) return;
          const api = matchApiRoute(apiManifest, pathname);
          if (api) {
            const mod = (await server.ssrLoadModule(api.file)) as RouteHandlerModule;
            const request = toWebRequest(Object.assign(req, { url }), origin, res);
            // Route segment config applies in dev, but responses are never cached (like Next.js).
            const response = await runRouteHandlerWithCache(mod, request, { params: api.params, pattern: api.pattern, pathname, cache: false });
            await sendWebResponse(res, response, request.method);
            log?.info(` ${req.method} ${pathname} ${response.status} in ${Math.round(performance.now() - started)}ms`);
            return;
          }
          if ((req.method === "GET" || req.method === "HEAD") && isHtmlRequest(url, req.headers.accept)) {
            const custom = userHtml();
            const raw = custom ? readFileSync(custom, "utf8") : createIndexHtml(title(), `${basePath}${ENTRY_URL}`);
            const html = await server.transformIndexHtml(HTML_TRANSFORM_URL, raw, req.originalUrl);
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
            res.end(req.method === "HEAD" ? undefined : html);
            log?.info(` ${req.method} ${pathname} 200 in ${Math.round(performance.now() - started)}ms`);
            return;
          }
        } catch (error) {
          if (error instanceof Error) server.ssrFixStacktrace(error);
          log?.error(` ⨯ ${req.method} ${url}\n${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`${BRAND_MARK} Text.js: ${error instanceof Error ? error.message : String(error)}`);
          return;
        }
        next();
      });

      return typeof userHook === "function" ? userHook : undefined;
    },
  };

  return [...(react() as Plugin[]), plugin, ...textjsLivePlugin({ appDir: appDirName, root })];
}

export { scanApp, toStaticManifest, listApiRoutes, listPages, generateRoutesModule, type AppScan } from "./server/scan";
export default textjsVitePlugin;
