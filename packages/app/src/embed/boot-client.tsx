/**
 * The client runtime `embed.js` loads on console intent: React 19, the
 * reconciler and the App Router, bundled with no `react-dom` and no bare
 * imports, so the host page's own React (or import map) never meets it.
 * Navigation happens in memory: the host page's `location`, `history` and
 * `document.title` are never touched.
 */

import { createElement } from "react";
import { initYoga, type YogaWasmSource } from "@textjs/core";
import { CONSOLE_OWNER } from "@textjs/core/experimental";
import { createConsoleRootSync, type ConsoleRoot } from "@textjs/react";
import type { ViewportConfig } from "../config";
import { createMemoryHistory, type RouterHistory } from "../history";
import { isNavigationError } from "../navigation-errors";
import { AppRouter } from "../router";
import type { RouteManifest } from "../routing";
import { createHostInput, type HostInput } from "./host-input";
import type { EmbedBootState } from "./loader";

/** The build-time part of an embedded client app's settings. */
export interface EmbedClientConfig {
  viewport?: ViewportConfig;
  focusHint?: boolean;
  /** Default `"/"`. */
  initialPath?: string;
  /** Default `"text"`; `false` installs no global. */
  globalName?: string | false;
  /** Clear the console before the first frame when `embed.js` painted none (default `false`). */
  initialClear?: boolean;
}

export interface EmbedClientOptions extends Partial<EmbedBootState> {
  routes: RouteManifest;
  config?: EmbedClientConfig;
  /** Yoga's WebAssembly, already requested by `embed.js` (default: the asset next to this chunk). */
  wasm?: YogaWasmSource;
}

export interface EmbedClient {
  root: ConsoleRoot;
  history: RouterHistory;
  input: HostInput;
  dispose(): void;
}

/** Boot an embedded app into the page's console. `null` when another app already renders there. */
export async function bootEmbedClient(options: EmbedClientOptions): Promise<EmbedClient | null> {
  const config = options.config ?? {};
  const vp = config.viewport ?? {};
  await initYoga(options.wasm === undefined ? undefined : { wasm: options.wasm });
  const g = globalThis as Record<symbol, unknown>;
  const owner = g[CONSOLE_OWNER];
  if (owner !== undefined && typeof owner !== "string") return null;
  const input = createHostInput({ engaged: options.reason === "engage" });
  const seen = new WeakSet<object>();
  const root = createConsoleRootSync({
    width: vp.width ?? 120,
    height: vp.height ?? 36,
    responsive: vp.responsive ?? true,
    theme: vp.theme,
    focusHint: config.focusHint === false ? false : undefined,
    input: input.engine,
    // embed.js already logged the first frame (and cleared, when asked to): append below it.
    initialClear: options.shell !== true && config.initialClear === true,
    previousFrameAt: options.shell === true ? options.shellAt : undefined,
    registerGlobal: config.globalName ?? "text",
    onCaughtError: (error) => {
      if (isNavigationError(error)) return;
      if (typeof error === "object" && error !== null) {
        if (seen.has(error)) return;
        seen.add(error);
      }
      console.error(error);
    },
  });
  const history = createMemoryHistory(config.initialPath ?? "/");
  root.render(createElement(AppRouter, { routes: options.routes, history, theme: vp.theme, documentTitle: false, errorStore: null }));
  return {
    root,
    history,
    input,
    dispose() {
      root.unmount();
      input.dispose();
    },
  };
}
