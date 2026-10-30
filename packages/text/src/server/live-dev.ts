/**
 * `text dev` wiring for server-rendered console routes and the SSR graph they
 * render in: the `@textjs/next:live` Vite plugin (virtual live / player
 * entries, client stubs for server pages, the async-component JSX runtime on
 * the server) and the dev request handler (live sessions + player HTML).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { join, sep } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import type { ViewportConfig } from "../config";
import { LIVE_PATH } from "../live-protocol";
import type { RouteManifest } from "../routing";
import type { ThemeName } from "@textjs/react";
import { LiveServer } from "./live";
import type { LiveApp, LiveAppOptions, RouteRuntime } from "./live-app";
import {
  createLiveHtml,
  createRuntimeMatcher,
  generateLiveEntryModule,
  generatePlayerEntryModule,
  JSX_DEV_RUNTIME_MODULE,
  JSX_RUNTIME_MODULE,
  LIVE_STUB_MODULE,
  listServerPages,
  PLAYER_URL,
  SERVER_STUB_QUERY,
  VIRTUAL_LIVE,
  VIRTUAL_PLAYER,
} from "./live-routes";
import { scanApp } from "./scan";
import type { MiddlewareModule } from "./middleware";
import { findMiddlewareFile } from "./middleware-node";
import { createLiveAuthorizer } from "./middleware-runtime";

const RESOLVED_LIVE = `\0${VIRTUAL_LIVE}`;
const RESOLVED_PLAYER = `\0${VIRTUAL_PLAYER}`;
const STUB_PREFIX = "\0textjs-server-stub:";

export interface LiveEntryModule {
  routes: RouteManifest;
  createLiveApp(options: LiveAppOptions): Promise<LiveApp>;
  prerenderShell(options: import("./live-app").PrerenderShellOptions): Promise<import("./live-app").ShellCall[]>;
  routeRuntime(routes: RouteManifest, pathname: string): RouteRuntime;
  isServerPage(routes: RouteManifest, pathname: string): boolean;
}

const JSX_IMPORT = /(["'])react\/(jsx-runtime|jsx-dev-runtime)\1/g;
const SHIM_FILE = /[\\/]server[\\/]jsx-(dev-)?runtime\.[cm]?[jt]s$/;

/** Vite plugins (dev, client build and SSR builds). */
export function textjsLivePlugin(options: { appDir?: string; root?: string } = {}): Plugin[] {
  const appDir = options.appDir ?? "app";
  let root = options.root ?? process.cwd();

  const live: Plugin = {
    name: "@textjs/next:live",
    enforce: "pre",
    config(user) {
      if (user.root) root = user.root;
      // One instance of the framework (and its React contexts) in the SSR graph,
      // whether @textjs/* is linked from a workspace or installed.
      return { ssr: { noExternal: [/^@textjs\//] } };
    },
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === VIRTUAL_LIVE || id.endsWith(`/${VIRTUAL_LIVE}`)) return RESOLVED_LIVE;
      if (id === VIRTUAL_PLAYER || id === PLAYER_URL || id.endsWith(PLAYER_URL)) return RESOLVED_PLAYER;
      if (id.endsWith(SERVER_STUB_QUERY)) return `${STUB_PREFIX}${id.slice(0, -SERVER_STUB_QUERY.length)}`;
      return null;
    },
    load(id) {
      if (id === RESOLVED_LIVE) return generateLiveEntryModule(scanApp(root, appDir));
      if (id === RESOLVED_PLAYER) return generatePlayerEntryModule();
      if (id.startsWith(STUB_PREFIX)) return `export { default, runtime } from ${JSON.stringify(LIVE_STUB_MODULE)};\n`;
      return null;
    },
  };

  /**
   * On the server, compiled JSX imports the async-component-aware runtime
   * (`@textjs/next/server/jsx-runtime`) instead of React's. Runs after
   * esbuild has emitted the `react/jsx-runtime` import.
   */
  const shims = new Map<string, Promise<string | null>>();
  const serverJsx: Plugin = {
    name: "@textjs/next:server-jsx",
    enforce: "post",
    async transform(code, id, opts) {
      if (!opts?.ssr || id.startsWith("\0") || SHIM_FILE.test(id.split("?")[0] as string)) return null;
      if (!code.includes("react/jsx-")) return null;
      JSX_IMPORT.lastIndex = 0;
      if (!JSX_IMPORT.test(code)) return null;
      // Resolved from the project root (as user code would), then imported by absolute id,
      // so framework packages that don't depend on @textjs/next can use it too.
      const resolveShim = (spec: string): Promise<string | null> => {
        let p = shims.get(spec);
        if (p === undefined) {
          p = this.resolve(spec, join(root, "package.json"), { skipSelf: true }).then((r) => r?.id ?? null);
          shims.set(spec, p);
        }
        return p;
      };
      const runtime = await resolveShim(JSX_RUNTIME_MODULE);
      const dev = await resolveShim(JSX_DEV_RUNTIME_MODULE);
      JSX_IMPORT.lastIndex = 0;
      return {
        code: code.replace(JSX_IMPORT, (m, q: string, kind: string) => {
          const target = kind === "jsx-runtime" ? runtime : dev;
          return target ? `${q}${target}${q}` : m;
        }),
        map: null,
      };
    },
  };

  return [live, serverJsx];
}

export interface LiveDevOptions {
  root: string;
  appDir?: string;
  basePath: string;
  title: string;
  viewport?: ViewportConfig;
  live?: { maxSessions?: number; reconnectGraceMs?: number };
  logger?: { info(message: string): void; error(message: string): void };
}

export interface LiveDevHandler {
  readonly server: LiveServer;
  /** `url` has `basePath` stripped. Returns `true` when the request was answered. */
  handle(req: IncomingMessage, res: ServerResponse, url: string): Promise<boolean>;
  close(): void;
}

function wantsHtml(req: IncomingMessage, pathname: string): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (pathname.startsWith("/@") || pathname.startsWith("/__") || pathname.startsWith("/node_modules/")) return false;
  const last = pathname.split("/").pop() ?? "";
  if (last.includes(".")) return false;
  const accept = req.headers.accept;
  return accept === undefined || accept.includes("text/html") || accept.includes("*/*");
}

/** Live sessions and player HTML for `text dev`. */
export function createLiveDevHandler(vite: ViteDevServer, o: LiveDevOptions): LiveDevHandler {
  const appDirName = o.appDir ?? "app";
  const appDir = join(o.root, appDirName);
  let scan = scanApp(o.root, appDirName);
  let runtimeOf = createRuntimeMatcher(scan);
  let serverSig = JSON.stringify(listServerPages(scan));
  const log = o.logger;

  const loadEntry = async (): Promise<LiveEntryModule> => (await vite.ssrLoadModule(VIRTUAL_LIVE)) as LiveEntryModule;

  const live = new LiveServer({
    basePath: o.basePath,
    exposeErrors: true,
    // middleware.ts guards server routes a session renders (opening, in-app navigation, credential changes).
    authorize: createLiveAuthorizer(
      async () => {
        const file = findMiddlewareFile(o.root);
        return file ? ((await vite.ssrLoadModule(file)) as MiddlewareModule) : null;
      },
      { basePath: o.basePath },
    ),
    maxSessions: o.live?.maxSessions,
    reconnectGraceMs: o.live?.reconnectGraceMs,
    runtimeOf: (p) => runtimeOf(p),
    log: (m) => log?.info(m),
    onError: (error) => {
      if (error instanceof Error) vite.ssrFixStacktrace(error);
      log?.error(` ⨯ ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    },
    createApp: async (init) => {
      const mod = await loadEntry();
      return mod.createLiveApp({ ...init, routes: mod.routes, theme: o.viewport?.theme as ThemeName | undefined, defaultTitle: o.title || undefined });
    },
  });

  /** Re-execute changed project modules in the SSR graph and re-render every session. */
  const reloadSessions = async (): Promise<void> => {
    if (live.sessions.size === 0) return;
    const graph = vite.environments?.ssr?.moduleGraph ?? vite.moduleGraph;
    const rootPrefix = o.root.endsWith(sep) ? o.root : o.root + sep;
    for (const mod of graph.idToModuleMap.values()) {
      const file = mod.file ?? "";
      if (mod.id === `\0${VIRTUAL_LIVE}` || (file.startsWith(rootPrefix) && !file.includes(`${sep}node_modules${sep}`))) graph.invalidateModule(mod);
    }
    try {
      const mod = await loadEntry();
      live.forEachApp((app) => app.setRoutes(mod.routes));
      log?.info(` ✓ Live sessions refreshed (${live.sessions.size})`);
    } catch (error) {
      log?.error(` ⨯ ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    }
  };

  let timer: ReturnType<typeof setTimeout> | null = null;
  const onChange = (file: string): void => {
    if (!file.startsWith(o.root) || file.includes(`${sep}node_modules${sep}`)) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (file.startsWith(appDir)) {
        scan = scanApp(o.root, appDirName);
        runtimeOf = createRuntimeMatcher(scan);
        const sig = JSON.stringify(listServerPages(scan));
        if (sig !== serverSig) {
          // A page switched runtimes: the client manifest swaps its stub.
          serverSig = sig;
          const routesMod = vite.moduleGraph.getModuleById("\0virtual:textjs/routes");
          if (routesMod) vite.moduleGraph.invalidateModule(routesMod);
          vite.ws.send({ type: "full-reload" });
        }
      }
      void reloadSessions();
    }, 50);
  };
  vite.watcher.on("change", onChange);
  vite.watcher.on("add", onChange);
  vite.watcher.on("unlink", onChange);
  vite.httpServer?.once("close", () => live.close());

  return {
    server: live,
    async handle(req, res, url) {
      const pathname = url.split("?")[0] ?? "/";
      if (pathname === LIVE_PATH) return live.handle(req, res, url);
      if (!wantsHtml(req, pathname) || runtimeOf(pathname) !== "server") return false;
      const raw = createLiveHtml({ title: o.title, basePath: o.basePath, viewport: o.viewport, playerSrc: `${o.basePath}${PLAYER_URL}` });
      const html = await vite.transformIndexHtml(req.url ?? "/", raw, (req as { originalUrl?: string }).originalUrl);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.end(req.method === "HEAD" ? undefined : html);
      return true;
    },
    close() {
      if (timer !== null) clearTimeout(timer);
      vite.watcher.off("change", onChange);
      vite.watcher.off("add", onChange);
      vite.watcher.off("unlink", onChange);
      live.close();
    },
  };
}
