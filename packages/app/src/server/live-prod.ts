/**
 * `text start` half of server-rendered routes and Partial Prerendering: serves
 * prerendered shells, the frame player document for server routes, and the
 * live session endpoints, all from what `text build` wrote to `.text/`.
 */

import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import type { ThemeName } from "@textjs/react";
import { LIVE_PATH } from "../live-protocol";
import { canonicalPathname } from "./http";
import { LiveServer, type LiveServerOptions } from "./live";
import type { MiddlewareModule } from "./middleware";
import { createLiveAuthorizer } from "./middleware-runtime";
import { LIVE_MANIFEST, type LiveManifest } from "./live-manifest";
import { createAnsiHandler, NO_ANSI, pageCacheControl, type AnsiHandler } from "./ansi-server";
import { staticFile } from "./static-file";
import type { LiveEntryModule } from "./live-dev";

export interface LiveProductionOptions {
  log?(message: string): void;
  onError?(error: unknown): void;
  /** `middleware.ts`: authorizes every server route a session renders (unless `authorize` is given). */
  middleware?: MiddlewareModule;
  authorize?: LiveServerOptions["authorize"];
  /** Behind a reverse proxy: trust `X-Forwarded-*` (also for the origin middleware sees). */
  trustProxy?: boolean;
  /** Fixed public origin for middleware's `request.url`. */
  origin?: string;
  /** Other sites whose pages may open live sessions (`embed.allowOrigins`). */
  allowOrigins?: LiveServerOptions["allowOrigins"];
  /** `embed.credentials`. */
  allowCredentials?: boolean;
}

export interface LiveProduction {
  readonly manifest: LiveManifest;
  readonly server: LiveServer | null;
  /** `url` has `basePath` stripped. Returns `true` when the request was answered. */
  handle(req: IncomingMessage, res: ServerResponse, url: string): Promise<boolean>;
  /**
   * The ANSI frame for a terminal client (curl), or `null` (serve the page as
   * usual). Call it at the page-serving step: after middleware, rewrites and
   * route handlers. `url` has `basePath` stripped.
   */
  ansi: AnsiHandler;
  close(): void;
}

function wantsHtml(req: IncomingMessage, pathname: string): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const last = pathname.split("/").pop() ?? "";
  if (last.includes(".")) return false;
  const accept = req.headers.accept;
  return accept === undefined || accept.includes("text/html") || accept.includes("*/*");
}

/**
 * Prerendered frames from the build, and on-request renders for every other
 * route (dynamic, server-rendered, not found) through `live.mjs`, imported on
 * the first request that needs it. If it can't be imported (a route module
 * touches `window` at the top level), terminals get HTML from then on.
 */
function createAnsiFrames(outDir: string, manifest: LiveManifest, loadEntry: () => Promise<LiveEntryModule>, onError?: (error: unknown) => void): AnsiHandler {
  const ansi = manifest.ansi;
  if (!ansi) return NO_ANSI;
  const frames: Record<string, string> = {};
  for (const [pattern, rel] of Object.entries(ansi.frames)) {
    const p = join(outDir, rel);
    if (existsSync(p)) frames[pattern] = readFileSync(p, "utf8");
  }
  const shells = new Set(Object.values(manifest.pages));
  let onRequest = ansi.onRequest;
  const theme = manifest.viewport?.theme as ThemeName | undefined;
  return createAnsiHandler({
    frames,
    // Files, and directory indexes from `public/` (the bun adapter serves `/manual` from `manual/index.html`),
    // but not the app's own documents: the root `index.html` and prerendered page shells.
    isFile: (pathname) => {
      if (staticFile(outDir, pathname) !== null) return true;
      if (pathname === "/") return false;
      const index = staticFile(outDir, pathname, { index: true });
      return index !== null && !shells.has(relative(outDir, index).split(sep).join("/"));
    },
    onError,
    renders: () => onRequest,
    render: async (href) => {
      if (!onRequest) return null;
      let entry: LiveEntryModule;
      try {
        entry = await loadEntry();
      } catch (error) {
        onRequest = false;
        onError?.(error);
        return null;
      }
      return entry.prerenderAnsi({ routes: entry.routes, path: href, cols: ansi.cols, rows: ansi.rows, theme });
    },
  });
}

/** Load `.text/live-manifest.json` (and the live bundle when routes render on the server). */
export async function loadLiveProduction(outDir: string, options: LiveProductionOptions = {}): Promise<LiveProduction | null> {
  const file = join(outDir, ".text", LIVE_MANIFEST);
  if (!existsSync(file)) return null;
  const manifest = JSON.parse(readFileSync(file, "utf8")) as LiveManifest;
  const html = new Map<string, Buffer>();
  for (const [pattern, rel] of Object.entries(manifest.pages)) {
    const p = join(outDir, rel);
    if (existsSync(p)) html.set(pattern, readFileSync(p));
  }
  const liveHtml = manifest.liveHtml && existsSync(join(outDir, manifest.liveHtml)) ? readFileSync(join(outDir, manifest.liveHtml)) : null;

  let server: LiveServer | null = null;
  let runtimeOf: (pathname: string) => "server" | "client" = () => "client";
  const entryFile = pathToFileURL(join(outDir, ".text", "server", "live.mjs")).href;
  let loaded: Promise<LiveEntryModule> | null = null;
  const loadEntry = (): Promise<LiveEntryModule> => (loaded ??= import(entryFile) as Promise<LiveEntryModule>);
  if (manifest.serverRoutes.length > 0) {
    const entry = await loadEntry();
    runtimeOf = (pathname) => (entry.isServerPage(entry.routes, pathname) ? "server" : "client");
    server = new LiveServer({
      basePath: manifest.basePath,
      maxSessions: manifest.live?.maxSessions,
      reconnectGraceMs: manifest.live?.reconnectGraceMs,
      runtimeOf,
      log: options.log,
      onError: options.onError,
      trustProxy: options.trustProxy,
      allowOrigins: options.allowOrigins,
      allowCredentials: options.allowCredentials,
      authorize:
        options.authorize ??
        (options.middleware ? createLiveAuthorizer(() => options.middleware, { basePath: manifest.basePath, trustProxy: options.trustProxy, origin: options.origin }) : undefined),
      createApp: (init) =>
        entry.createLiveApp({ ...init, routes: entry.routes, theme: manifest.viewport?.theme as ThemeName | undefined, defaultTitle: manifest.title || undefined, focusHint: manifest.focusHint }),
    });
  }

  const ansi = createAnsiFrames(outDir, manifest, loadEntry, options.onError);

  const send = (req: IncomingMessage, res: ServerResponse, body: Buffer): true => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", pageCacheControl(res));
    res.end(req.method === "HEAD" ? undefined : body);
    return true;
  };

  return {
    manifest,
    server,
    async handle(req, res, url) {
      const pathname = url.split("?")[0] ?? "/";
      if (pathname === LIVE_PATH) {
        if (server) return server.handle(req, res, url);
        res.statusCode = 404;
        res.end();
        return true;
      }
      if (!wantsHtml(req, pathname)) return false;
      const route = canonicalPathname(pathname);
      if (route === null) return false;
      const page = html.get(decodeURIComponent(route));
      if (page) return send(req, res, page);
      if (server && liveHtml && runtimeOf(route) === "server") return send(req, res, liveHtml);
      return false;
    },
    ansi,
    close() {
      server?.close();
    },
  };
}
