/**
 * Build-time knowledge of server-rendered routes: which pages opt in with
 * `export const runtime = "server"`, the virtual modules that render them, and
 * the HTML document that boots the frame player.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND_MARK, ENGINE_NAME, VERSION } from "@textjs/core";
import { matchAppRoutes, type RouteManifest } from "../routing";
import { generateRoutesModule, listPages, toStaticManifest, type AppScan, type ScannedSegment } from "./scan";

export const VIRTUAL_LIVE = "virtual:textjs/live";
export const VIRTUAL_PLAYER = "virtual:textjs/player";
/** Script `src` of the frame player in `text dev`. */
export const PLAYER_URL = "/@textjs/player";

const SERVER_RUNTIME = /export\s+const\s+runtime\s*=\s*["']server["']/;

/**
 * Framework modules are imported by package specifier (not file path) so the
 * virtual modules resolve them exactly like user code does, sharing one
 * instance of the router context in the SSR graph.
 */
export const LIVE_APP_MODULE = "@textjs/next/live-app";
export const LIVE_PLAYER_MODULE = "@textjs/next/live-player";
export const LIVE_STUB_MODULE = "@textjs/next/live-stub";
/** Suffix marking a server page import in the client manifest; the plugin loads the stub instead. */
export const SERVER_STUB_QUERY = "?textjs-server-stub";
export const JSX_RUNTIME_MODULE = "@textjs/next/server/jsx-runtime";
export const JSX_DEV_RUNTIME_MODULE = "@textjs/next/server/jsx-dev-runtime";

export function isServerRuntimeFile(file: string | undefined): boolean {
  if (!file) return false;
  try {
    return SERVER_RUNTIME.test(readFileSync(file, "utf8"));
  } catch {
    return false;
  }
}

export interface ServerPage {
  pattern: string;
  /** Project-relative page file. */
  file: string;
  dynamic: boolean;
}

/** Pages that render on the server. */
export function listServerPages(scan: AppScan): ServerPage[] {
  return listPages(scan)
    .filter((p) => p.file !== undefined && isServerRuntimeFile(join(scan.root, p.file)))
    .map((p) => ({ pattern: p.pattern, file: p.file as string, dynamic: p.dynamic }));
}

/** Route matcher for HTML requests: does `pathname` resolve to a server page? */
export function createRuntimeMatcher(scan: AppScan): (pathname: string) => "server" | "client" {
  const manifest: RouteManifest = toStaticManifest(scan);
  const server = new Set(listServerPages(scan).map((p) => p.file));
  return (pathname) => {
    if (server.size === 0) return "client";
    const m = matchAppRoutes(manifest, pathname);
    const file = m?.chain[m.chain.length - 1]?.files?.page;
    return file !== undefined && server.has(file) ? "server" : "client";
  };
}

/**
 * The scan with every server page swapped for the client stub, so the browser
 * bundle never contains server route modules (or anything they import).
 */
export function withServerStubs(scan: AppScan): AppScan {
  const swap = (s: ScannedSegment): ScannedSegment => {
    const page = s.files.page;
    const files = page && isServerRuntimeFile(page) ? { ...s.files, page: `${page}${SERVER_STUB_QUERY}` } : s.files;
    return { ...s, files, children: s.children.map(swap) };
  };
  return { ...scan, tree: swap(scan.tree) };
}

/** `virtual:textjs/live`: the SSR entry rendering live sessions and PPR shells. */
export function generateLiveEntryModule(scan: AppScan): string {
  return `${generateRoutesModule(scan)}
export { createLiveApp, isServerPage, prerenderShell, routeRuntime } from ${JSON.stringify(LIVE_APP_MODULE)};
`;
}

export function generatePlayerEntryModule(): string {
  return `import { bootFramePlayer } from ${JSON.stringify(LIVE_PLAYER_MODULE)};
bootFramePlayer();
`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** JSON safe to inline in a `<script>` element. */
export function inlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

const FAVICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0a0a0a"/><path d="M7 10h18L16 25z" fill="#ededed"/></svg>`,
)}`;

export interface LiveHtmlOptions {
  title: string;
  playerSrc: string;
  basePath: string;
  viewport?: { width?: number; height?: number; responsive?: boolean };
  /** Inline PPR shell `<script>` (painted before the player loads). */
  shell?: string;
}

/** The document for a server-rendered route: a static page pad plus the frame player. */
export function createLiveHtml(o: LiveHtmlOptions): string {
  const config = { basePath: o.basePath, viewport: o.viewport ?? {}, title: o.title };
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content="Text.js ${VERSION} (${ENGINE_NAME})" />
    <meta name="color-scheme" content="dark" />
    <title>${escapeHtml(o.title)}</title>
    <link rel="icon" href="${FAVICON}" />
    <style>
      html, body { margin: 0; min-height: 100%; background: #0a0a0a; color: #ededed; }
      body { min-height: 100vh; display: flex; align-items: center; justify-content: center;
        font-family: Geist, Inter, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
      #__textjs { text-align: center; line-height: 1.6; padding: 24px; }
      #__textjs .mark { font-size: 28px; margin: 0 0 8px; }
      #__textjs .title { font-size: 18px; font-weight: 600; margin: 0; }
      #__textjs .hint { color: #a1a1a1; margin: 8px 0 0; }
      #__textjs kbd { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 12px; border: 1px solid #333; border-radius: 4px; padding: 1px 5px; color: #ededed; }
      #__textjs .status { color: #666; font-size: 12px; margin: 16px 0 0; font-family: "SF Mono", Menlo, Consolas, monospace; }
    </style>
  </head>
  <body>
    <div id="__textjs" data-textjs-runtime="server">
      <p class="mark">${BRAND_MARK}</p>
      <p class="title">${escapeHtml(o.title)}</p>
      <p class="hint">Open the console: <kbd>⌥⌘J</kbd> on macOS, <kbd>Ctrl+Shift+J</kbd> elsewhere. Then click here and type.</p>
      <p class="status">Rendered on the server · <span data-textjs-status>connecting</span></p>
    </div>
    <noscript>${BRAND_MARK} Text.js apps render into console.log, which requires JavaScript.</noscript>
    <script type="application/json" id="__textjs-live">${inlineJson(config)}</script>${o.shell ? `\n    ${o.shell}` : ""}
    <script type="module" src="${escapeHtml(o.playerSrc)}"></script>
  </body>
</html>
`;
}
