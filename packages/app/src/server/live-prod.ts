/**
 * `text start` half of server-rendered routes and Partial Prerendering: serves
 * prerendered shells, the frame player document for server routes, and the
 * live session endpoints, all from what `text build` wrote to `.text/`.
 */

import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ThemeName } from "@textjs/react";
import { LIVE_PATH } from "../live-protocol";
import { canonicalPathname } from "./http";
import { LiveServer, type LiveServerOptions } from "./live";
import type { MiddlewareModule } from "./middleware";
import { createLiveAuthorizer } from "./middleware-runtime";
import { LIVE_MANIFEST, type LiveManifest } from "./live-manifest";
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
}

export interface LiveProduction {
  readonly manifest: LiveManifest;
  readonly server: LiveServer | null;
  /** `url` has `basePath` stripped. Returns `true` when the request was answered. */
  handle(req: IncomingMessage, res: ServerResponse, url: string): Promise<boolean>;
  close(): void;
}

function wantsHtml(req: IncomingMessage, pathname: string): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const last = pathname.split("/").pop() ?? "";
  if (last.includes(".")) return false;
  const accept = req.headers.accept;
  return accept === undefined || accept.includes("text/html") || accept.includes("*/*");
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
  if (manifest.serverRoutes.length > 0) {
    const entry = (await import(pathToFileURL(join(outDir, ".text", "server", "live.mjs")).href)) as LiveEntryModule;
    runtimeOf = (pathname) => (entry.isServerPage(entry.routes, pathname) ? "server" : "client");
    server = new LiveServer({
      basePath: manifest.basePath,
      maxSessions: manifest.live?.maxSessions,
      reconnectGraceMs: manifest.live?.reconnectGraceMs,
      runtimeOf,
      log: options.log,
      onError: options.onError,
      trustProxy: options.trustProxy,
      authorize:
        options.authorize ??
        (options.middleware ? createLiveAuthorizer(() => options.middleware, { basePath: manifest.basePath, trustProxy: options.trustProxy, origin: options.origin }) : undefined),
      createApp: (init) =>
        entry.createLiveApp({ ...init, routes: entry.routes, theme: manifest.viewport?.theme as ThemeName | undefined, defaultTitle: manifest.title || undefined }),
    });
  }

  const send = (req: IncomingMessage, res: ServerResponse, body: Buffer): true => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
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
    close() {
      server?.close();
    },
  };
}
