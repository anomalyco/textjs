/**
 * `text dev` wiring for server-rendered console routes and the SSR graph they
 * render in: the `@textjs/app:live` Vite plugin (virtual live / player
 * entries, client stubs for server pages, the async-component JSX runtime on
 * the server) and the dev request handler (live sessions + player HTML).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { join, relative, resolve, sep } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import { resolveAnsiSize, type AnsiConfig, type TextConfig, type ViewportConfig } from "../config";
import { LOOPBACK_ORIGINS, resolveEmbed } from "./cors";
import { createAnsiHandler, NO_ANSI, type AnsiHandler } from "./ansi-server";
import { staticFile } from "./static-file";
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
  SERVER_ONLY_QUERY,
  SERVER_STUB_QUERY,
  VIRTUAL_LIVE,
  VIRTUAL_PLAYER,
} from "./live-routes";
import { scanApp, toPosix } from "./scan";
import type { MiddlewareModule } from "./middleware";
import { findMiddlewareFile, isDevInternalRequest } from "./middleware-node";
import { createLiveAuthorizer } from "./middleware-runtime";

const RESOLVED_LIVE = `\0${VIRTUAL_LIVE}`;
const RESOLVED_PLAYER = `\0${VIRTUAL_PLAYER}`;
const STUB_PREFIX = "\0textjs-server-stub:";
const SERVER_ONLY_PREFIX = "\0textjs-server-only:";
/** `*.server.ts`, `*.server.tsx`, `foo.server` (any extension or none). */
const SERVER_MODULE = /\.server(?:\.[cm]?[jt]sx?)?$/;

export interface LiveEntryModule {
  routes: RouteManifest;
  createLiveApp(options: LiveAppOptions): Promise<LiveApp>;
  prerenderShell(options: import("./live-app").PrerenderShellOptions): Promise<import("./live-app").ShellCall[]>;
  prerenderAnsi(options: import("./live-app").PrerenderShellOptions): Promise<import("./live-app").AnsiFrame | null>;
  routeRuntime(routes: RouteManifest, pathname: string): RouteRuntime;
  isServerPage(routes: RouteManifest, pathname: string): boolean;
}

/** `react/jsx-runtime` / `react/jsx-dev-runtime` as an import or re-export specifier (not any string in the code). */
const JSX_IMPORT = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])react\/(jsx-runtime|jsx-dev-runtime)\2/g;

const VLQ = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function vlq(value: number): string {
  let v = value < 0 ? (-value << 1) | 1 : value << 1;
  let out = "";
  do {
    let digit = v & 31;
    v >>>= 5;
    if (v > 0) digit |= 32;
    out += VLQ[digit];
  } while (v > 0);
  return out;
}

/**
 * Apply same-line replacements and return a source map back to the original:
 * every line maps column 0 to itself, and code after each replacement maps to
 * where it was before (so stack traces and breakpoints stay exact).
 */
export function replaceWithMap(code: string, re: RegExp, replace: (match: RegExpExecArray) => string | null, source: string): { code: string; map: { version: 3; sources: string[]; names: string[]; mappings: string } } | null {
  const lines = code.split("\n");
  let changed = false;
  let prevLine = 0;
  let prevCol = 0;
  const mappings: string[] = [];
  const out = lines.map((line, y) => {
    const segments: Array<[number, number]> = [[0, 0]];
    let result = "";
    let last = 0;
    re.lastIndex = 0;
    for (let m = re.exec(line); m !== null; m = re.exec(line)) {
      const next = replace(m);
      if (next === null) continue;
      changed = true;
      result += line.slice(last, m.index) + next;
      last = m.index + m[0].length;
      segments.push([result.length, last]);
    }
    result += line.slice(last);
    let genCol = 0;
    mappings.push(
      segments
        .map(([gen, orig]) => {
          const seg = vlq(gen - genCol) + vlq(0) + vlq(y - prevLine) + vlq(orig - prevCol);
          genCol = gen;
          prevLine = y;
          prevCol = orig;
          return seg;
        })
        .join(","),
    );
    return result;
  });
  return changed ? { code: out.join("\n"), map: { version: 3, sources: [source], names: [], mappings: mappings.join(";") } } : null;
}
const SHIM_FILE = /[\\/]server[\\/]jsx-(dev-)?runtime\.[cm]?[jt]s$/;

function toPosixPath(file: string, root: string): string {
  const rel = relative(root, file);
  return (rel.startsWith("..") ? file : rel).split(sep).join("/");
}

/** Vite plugins (dev, client build and SSR builds). */
export function textjsLivePlugin(options: { appDir?: string; root?: string } = {}): Plugin[] {
  const appDir = options.appDir ?? "app";
  let root = options.root ?? process.cwd();

  const live: Plugin = {
    name: "@textjs/app:live",
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
    resolveId(id, importer, opts) {
      if (id === VIRTUAL_LIVE) return RESOLVED_LIVE;
      if (id === VIRTUAL_PLAYER || id === PLAYER_URL || id.endsWith(PLAYER_URL)) return RESOLVED_PLAYER;
      if (id.endsWith(SERVER_STUB_QUERY)) return `${STUB_PREFIX}${id.slice(0, -SERVER_STUB_QUERY.length)}`;
      if (id.endsWith(SERVER_ONLY_QUERY)) return `${SERVER_ONLY_PREFIX}${id.slice(0, -SERVER_ONLY_QUERY.length)}`;
      // Client graph guard: browser code (yours, not dependencies') must not import server-only modules.
      // The dependency scan crawls every file under `app/`, server pages and route handlers included: it isn't the client graph.
      if (!opts?.ssr && !(opts as { scan?: boolean } | undefined)?.scan && importer && !importer.startsWith("\0") && !importer.includes(`${sep}node_modules${sep}`) && !importer.includes("/node_modules/")) {
        const bare = id.split("?")[0] as string;
        if (bare.startsWith("node:") || SERVER_MODULE.test(bare)) {
          this.error(
            `▼ Text.js: ${toPosixPath(importer.split("?")[0] as string, root)} imports ${JSON.stringify(id)}, which only runs on the server, from code that ships to the browser. ` +
              `Import it from a page with \`export const runtime = "server"\` (or its server components), or from a route handler.`,
          );
        }
      }
      return null;
    },
    load(id) {
      if (id === RESOLVED_LIVE) return generateLiveEntryModule(scanApp(root, appDir));
      if (id === RESOLVED_PLAYER) return generatePlayerEntryModule();
      if (id.startsWith(STUB_PREFIX)) return `export { default, runtime } from ${JSON.stringify(LIVE_STUB_MODULE)};\n`;
      // Layouts / boundaries of server-only segments: the browser never renders them.
      if (id.startsWith(SERVER_ONLY_PREFIX)) return "export default function ServerOnly(props) { return props.children ?? null; }\n";
      return null;
    },
  };

  /**
   * On the server, compiled JSX imports the async-component-aware runtime
   * (`@textjs/app/server/jsx-runtime`) instead of React's. Runs after
   * esbuild has emitted the `react/jsx-runtime` import.
   */
  const shims = new Map<string, Promise<string | null>>();
  const serverJsx: Plugin = {
    name: "@textjs/app:server-jsx",
    enforce: "post",
    async transform(code, id, opts) {
      if (!opts?.ssr || id.startsWith("\0") || SHIM_FILE.test(id.split("?")[0] as string)) return null;
      if (!code.includes("react/jsx-")) return null;
      JSX_IMPORT.lastIndex = 0;
      if (!JSX_IMPORT.test(code)) return null;
      // Resolved from the project root (as user code would), then imported by absolute id,
      // so framework packages that don't depend on @textjs/app can use it too.
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
      return replaceWithMap(
        code,
        JSX_IMPORT,
        (m) => {
          const target = m[3] === "jsx-runtime" ? runtime : dev;
          return target ? `${m[1]}${JSON.stringify(target)}` : null;
        },
        id.split("?")[0] as string,
      );
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
  focusHint?: boolean;
  live?: { maxSessions?: number; reconnectGraceMs?: number };
  /** `text.config.ts` `ansi`. */
  ansi?: false | AnsiConfig;
  /** `text.config.ts` `embed`: dev also accepts loopback origins on any port (without `credentials`). */
  embed?: TextConfig["embed"];
  logger?: { info(message: string): void; error(message: string): void };
}

export interface LiveDevHandler {
  readonly server: LiveServer;
  /** `url` has `basePath` stripped. Returns `true` when the request was answered. */
  handle(req: IncomingMessage, res: ServerResponse, url: string): Promise<boolean>;
  /** The ANSI frame for a terminal client (curl), rendered on request, or `null`. Call it at the page-serving step. */
  ansi: AnsiHandler;
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
  const embed = resolveEmbed(o);

  const live = new LiveServer({
    basePath: o.basePath,
    exposeErrors: true,
    // A host page on another local port (a Next.js or Astro dev server) can run the embed.
    allowOrigins: embed.enabled && !embed.allowCredentials ? [...embed.allowOrigins, ...LOOPBACK_ORIGINS] : embed.allowOrigins,
    allowCredentials: embed.allowCredentials,
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
      return mod.createLiveApp({ ...init, routes: mod.routes, theme: o.viewport?.theme as ThemeName | undefined, defaultTitle: o.title || undefined, focusHint: o.focusHint });
    },
  });

  /**
   * Re-execute the changed files (and what imports them) in the SSR graph and
   * re-render every session. A route structure change also regenerates the
   * virtual live module.
   */
  const changed = new Set<string>();
  let structureChanged = false;
  const reloadSessions = async (): Promise<void> => {
    const files = [...changed];
    changed.clear();
    const structure = structureChanged;
    structureChanged = false;
    if (live.sessions.size === 0) return;
    const graph = vite.environments?.ssr?.moduleGraph ?? vite.moduleGraph;
    type GraphModule = { id: string | null; importers: Set<GraphModule> };
    const seen = new Set<GraphModule>();
    const invalidate = (mod: GraphModule): void => {
      if (seen.has(mod)) return;
      seen.add(mod);
      graph.invalidateModule(mod as never);
      for (const importer of mod.importers) invalidate(importer);
    };
    for (const file of files) for (const mod of graph.getModulesByFile(file) ?? []) invalidate(mod as unknown as GraphModule);
    if (structure) {
      const virtual = graph.getModuleById(`\0${VIRTUAL_LIVE}`);
      if (virtual) invalidate(virtual as unknown as GraphModule);
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
  // Vite's root and module graph use `/`; the watcher reports native paths (`\` on Windows).
  const withSlash = (p: string): string => (p.endsWith("/") ? p : `${p}/`);
  const rootPrefix = withSlash(toPosix(o.root));
  const appPrefix = withSlash(toPosix(appDir));
  const onChange = (native: string, kind: "change" | "add" | "unlink"): void => {
    const file = toPosix(native);
    if (!file.startsWith(rootPrefix) || file.includes("/node_modules/")) return;
    changed.add(file);
    if (kind !== "change" && file.startsWith(appPrefix)) structureChanged = true;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (file.startsWith(appPrefix)) {
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
  const onFileChange = (file: string): void => onChange(file, "change");
  const onAdd = (file: string): void => onChange(file, "add");
  const onUnlink = (file: string): void => onChange(file, "unlink");
  vite.watcher.on("change", onFileChange);
  vite.watcher.on("add", onAdd);
  vite.watcher.on("unlink", onUnlink);
  vite.httpServer?.once("close", () => live.close());

  const ansiSize = resolveAnsiSize({ ansi: o.ansi, viewport: o.viewport });
  const publicDir = vite.config.publicDir ? resolve(vite.config.publicDir) : "";
  const ansi: AnsiHandler = ansiSize
    ? createAnsiHandler({
        // Every request renders the current code.
        cacheSize: 0,
        coldRenders: null,
        // Vite's own URLs and files in the project root (`/LICENSE`) never render a route.
        skip: (pathname) => isDevInternalRequest(pathname, o.root),
        isFile: (pathname) => Boolean(publicDir) && staticFile(publicDir, pathname) !== null,
        onError: (error) => {
          if (error instanceof Error) vite.ssrFixStacktrace(error);
          log?.error(` ⨯ ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
        },
        render: async (href) => {
          const mod = await loadEntry();
          return mod.prerenderAnsi({ routes: mod.routes, path: href, ...ansiSize, theme: o.viewport?.theme as ThemeName | undefined });
        },
      })
    : NO_ANSI;

  return {
    server: live,
    ansi,
    async handle(req, res, url) {
      const pathname = url.split("?")[0] ?? "/";
      if (pathname === LIVE_PATH) return live.handle(req, res, url);
      if (!wantsHtml(req, pathname) || runtimeOf(pathname) !== "server") return false;
      const raw = createLiveHtml({ title: o.title, basePath: o.basePath, viewport: o.viewport, playerSrc: `${o.basePath}${PLAYER_URL}` });
      // As in the page handler (`HTML_TRANSFORM_URL`): never the request URL, whose query string makes Vite watch `/`.
      const html = await vite.transformIndexHtml("/index.html", raw, (req as { originalUrl?: string }).originalUrl);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.end(req.method === "HEAD" ? undefined : html);
      return true;
    },
    close() {
      if (timer !== null) clearTimeout(timer);
      vite.watcher.off("change", onFileChange);
      vite.watcher.off("add", onAdd);
      vite.watcher.off("unlink", onUnlink);
      live.close();
    },
  };
}
