/**
 * The client runtime `embed.js` loads on console intent: React 19, the
 * reconciler and the App Router, bundled with no `react-dom` and no bare
 * imports, so the host page's own React (or import map) never meets it.
 * Navigation happens in memory: the host page's `location`, `history` and
 * `document.title` are never touched.
 */

import { createElement } from "react";
import { initYoga, loadBidi, type YogaWasmSource } from "@textjs/core";
import { claimConsole, CONSOLE_OWNER, type ConsoleOwner } from "@textjs/core/experimental";
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
  /** `embed.js`'s first frame showed right-to-left text. */
  shellRtl?: boolean;
  /** Yoga's WebAssembly, already requested by `embed.js` (default: the asset next to this chunk). */
  wasm?: YogaWasmSource;
}

export interface EmbedClient {
  root: ConsoleRoot;
  history: RouterHistory;
  input: HostInput;
  dispose(): void;
}

/**
 * Boot an embedded app into the page's console. `null` when the page's own
 * app already renders there. The page's app takes the console back when it
 * starts later: the embed then unmounts and drops its global.
 */
export async function bootEmbedClient(options: EmbedClientOptions): Promise<EmbedClient | null> {
  const config = options.config ?? {};
  const vp = config.viewport ?? {};
  // A first frame with right-to-left text: fetch the bidi engine alongside Yoga, so our first frame repaints it in
  // display order too. A failed chunk never blocks boot.
  await Promise.all([initYoga(options.wasm === undefined ? undefined : { wasm: options.wasm }), options.shellRtl === true ? loadBidi().catch(() => {}) : null]);
  const g = globalThis as Record<symbol, ConsoleOwner | undefined>;
  if (g[CONSOLE_OWNER] !== undefined && g[CONSOLE_OWNER].embed !== true) return null;
  // Our own renderer claims the console as it's created: drop embed.js's claim so it doesn't preempt us.
  delete g[CONSOLE_OWNER];
  const input = createHostInput({ engaged: options.reason === "engage" });
  const seen = new WeakSet<object>();
  let root: ConsoleRoot;
  try {
    root = createConsoleRootSync({
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
  } catch (error) {
    input.dispose();
    throw error;
  }
  const history = createMemoryHistory(config.initialPath ?? "/");
  let disposed = false;
  const client: EmbedClient = {
    root,
    history,
    input,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.unmount();
      input.dispose();
      release();
    },
  };
  const release = claimConsole({ embed: true, preempt: () => client.dispose() });
  // External URLs open in a new tab: the host page never navigates away.
  root.render(createElement(AppRouter, { routes: options.routes, history, theme: vp.theme, documentTitle: false, errorStore: null, openExternal: openInNewTab }));
  return client;
}

function openInNewTab(href: string): void {
  window.open(href, "_blank", "noopener");
}
