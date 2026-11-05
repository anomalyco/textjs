/**
 * @experimental `text dev` for embeds: `/embed.js`, rebuilt on every request
 * with a fresh first frame, and a preview host page that loads it the way
 * another site would (at `/`, or at `/__textjs/embed` when the app keeps its
 * own pages with `standalone`).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViteDevServer } from "vite";
import type { TextConfig } from "../config";
import type { ThemeName } from "@textjs/react";
import { EMBED_ASSET_HEADERS } from "./cors";
import { createEmbedEntry, EMBED_CLIENT_URL, EMBED_FILE, EMBED_LOADER_URL, EMBED_PLAYER_URL, middlewareCouldGuard, resolveEmbedSettings } from "./embed";
import type { MiddlewareModule } from "./middleware";
import { findMiddlewareFile } from "./middleware-node";
import type { LiveEntryModule } from "./live-dev";
import { createRuntimeMatcher, VIRTUAL_LIVE } from "./live-routes";
import { compileShellCalls, createShellReplayCode, shellHasRtl } from "./ppr";
import { scanApp } from "./scan";
import { LIVE_PATH } from "../live-protocol";

/** Where the preview host page is when `/` belongs to the app (`standalone`). */
export const EMBED_PREVIEW_PATH = "/__textjs/embed";

export interface EmbedDevOptions {
  root: string;
  appDir: string;
  config: TextConfig;
  logger?: { error(message: string): void };
}

export interface EmbedDevHandler {
  /** `url` has `basePath` stripped. Returns `true` when the request was answered. */
  handle(req: IncomingMessage, res: ServerResponse, url: string): Promise<boolean>;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** A plain page standing in for the site the app is embedded in. */
export function createEmbedPreviewHtml(o: { title: string; src: string }): string {
  const tag = `<script type="module" src="${escapeHtml(o.src)}"></script>`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(o.title)} · embed preview</title>
    <link rel="icon" href="data:," />
    <style>
      body { margin: 0; font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; color: #171717; background: #fafafa; }
      main { max-width: 640px; margin: 0 auto; padding: 72px 24px 50vh; }
      h1 { font-size: 28px; line-height: 1.2; margin: 0 0 12px; }
      p { color: #525252; margin: 0 0 24px; }
      pre { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 16px; overflow-x: auto; font: 13px/1.5 ui-monospace, Menlo, monospace; margin: 0 0 32px; }
      .row { display: flex; gap: 12px; flex-wrap: wrap; margin: 0 0 32px; }
      button, input { font: inherit; border-radius: 8px; padding: 8px 14px; }
      button { background: #171717; color: #fafafa; border: 0; cursor: pointer; }
      input { border: 1px solid #d4d4d4; background: #fff; min-width: 240px; }
      .tall { min-height: 120vh; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(o.title)}</h1>
      <p>This page loads <code>embed.js</code> the way another site would. Dock DevTools, use a DevTools shortcut or press the button to start the app in the console.</p>
      <pre><code>${escapeHtml(tag)}</code></pre>
      <div class="row">
        <button type="button" data-textjs-engage>Open in the console</button>
        <input type="text" placeholder="Typing here stays on this page" aria-label="Host page field" />
      </div>
      <div class="tall"></div>
    </main>
    ${tag}
  </body>
</html>
`;
}

export function createEmbedDevHandler(vite: ViteDevServer, o: EmbedDevOptions): EmbedDevHandler {
  const renderShell = async (path: string, initialClear: boolean): Promise<{ code: string; rtl: boolean } | null> => {
    if (o.config.ppr === false) return null;
    const vp = o.config.viewport ?? {};
    const middlewareFile = findMiddlewareFile(o.root);
    if (middlewareFile) {
      const mod = (await vite.ssrLoadModule(middlewareFile).catch(() => ({}))) as MiddlewareModule;
      if (middlewareCouldGuard(mod, path)) return null;
    }
    try {
      const mod = (await vite.ssrLoadModule(VIRTUAL_LIVE)) as LiveEntryModule;
      const calls = await mod.prerenderShell({ routes: mod.routes, path, cols: vp.width ?? 120, rows: vp.height ?? 36, theme: vp.theme as ThemeName | undefined, initialClear });
      const compiled = compileShellCalls(calls);
      return { code: createShellReplayCode(compiled), rtl: shellHasRtl(compiled) };
    } catch (error) {
      if (error instanceof Error) vite.ssrFixStacktrace(error);
      o.logger?.error(` ⨯ embed.js has no first frame: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
      return null;
    }
  };

  return {
    async handle(req, res, url) {
      if (req.method !== "GET" && req.method !== "HEAD") return false;
      const settings = resolveEmbedSettings(o.config);
      if (settings === null) return false;
      const pathname = url.split("?")[0] ?? "/";
      const base = vite.config.base;
      if (pathname === `/${EMBED_FILE}`) {
        const server = createRuntimeMatcher(scanApp(o.root, o.appDir))(settings.initialPath.split(/[?#]/)[0] as string) === "server";
        const shell = await renderShell(settings.initialPath, settings.initialClear);
        const code = createEmbedEntry({
          shell: shell?.code ?? null,
          shellRtl: shell?.rtl,
          runtime: `${base}${(server ? EMBED_PLAYER_URL : EMBED_CLIENT_URL).slice(1)}`,
          ...(server ? { endpoint: `.${LIVE_PATH}` } : {}),
          loader: `${base}${EMBED_LOADER_URL.slice(1)}`,
          // Components compiled for Fast Refresh expect its runtime on the page, which the host page doesn't have.
          prelude: server
            ? ""
            : `import RefreshRuntime from "${base}@react-refresh";
if (!window.__vite_plugin_react_preamble_installed__) {
  RefreshRuntime.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type) => type;
  window.__vite_plugin_react_preamble_installed__ = true;
}
`,
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        for (const [k, v] of Object.entries(EMBED_ASSET_HEADERS)) res.setHeader(k, v);
        res.end(req.method === "HEAD" ? undefined : code);
        return true;
      }
      if (pathname === EMBED_PREVIEW_PATH || (pathname === "/" && !settings.standalone)) {
        const accept = req.headers.accept;
        if (accept !== undefined && !accept.includes("text/html") && !accept.includes("*/*")) return false;
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.end(req.method === "HEAD" ? undefined : createEmbedPreviewHtml({ title: o.config.title ?? "▼ Text.js", src: `${base}${EMBED_FILE}` }));
        return true;
      }
      return false;
    },
  };
}
