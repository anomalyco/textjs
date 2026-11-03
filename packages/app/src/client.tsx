/**
 * `@textjs/app/client` — browser bootstrap used by the virtual entry that `text dev`
 * and `text build` generate: mounts the console root, the App Router, the
 * Dev Overlay and the DOM `<FocusPad>`.
 */

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createConsoleRoot, type ConsoleRoot } from "@textjs/react";
import { FocusPad } from "@textjs/react/dom";
import { toClientConfig, type ClientConfig } from "./config";
import { connectViteHmr, devErrors, installGlobalErrorHandlers, TextDevOverlay, type HotContextLike } from "./devtools";
import { connectFrameMirror, type MirrorHotContext } from "./frame-mirror";
import { createBrowserHistory, type RouterHistory } from "./history";
import { isNavigationError } from "./navigation-errors";
import { AppRouter } from "./router";
import type { RouteManifest } from "./routing";

export interface BootOptions {
  routes: RouteManifest;
  config?: Partial<ClientConfig>;
  /** `import.meta.env.DEV`. */
  dev?: boolean;
  /** `import.meta.hot`. */
  hot?: HotContextLike;
  /** Element (or id) for the DOM `<FocusPad>` (default `#__textjs`, created when missing). */
  container?: HTMLElement | string;
}

export interface TextApp {
  root: ConsoleRoot;
  history: RouterHistory;
  /** Swap the route manifest (HMR when route files change). */
  updateRoutes(routes: RouteManifest): void;
}

declare global {
  interface Window {
    __TEXTJS_APP__?: TextApp;
  }
}

function resolveContainer(container: BootOptions["container"]): HTMLElement {
  if (container instanceof HTMLElement) return container;
  const id = typeof container === "string" ? container : "__textjs";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
  return el;
}

/** Boot a Text.js app into `console.log`. */
export async function bootTextApp(options: BootOptions): Promise<TextApp> {
  const config = { ...toClientConfig({}), ...options.config };
  const dev = options.dev ?? false;
  const vp = config.viewport ?? {};
  const seen = new WeakSet<object>();

  const root = await createConsoleRoot({
    // Follows the docked DevTools console by default; width × height is the
    // size used when it can't be measured (undocked DevTools) or when `responsive: false`.
    width: vp.width ?? 120,
    height: vp.height ?? 36,
    responsive: vp.responsive ?? true,
    theme: vp.theme,
    focusHint: config.focusHint ? undefined : false,
    // A prerendered shell (PPR) already cleared the console: append below it.
    initialClear: typeof window === "undefined" || (window as { __TEXTJS_SHELL__?: number }).__TEXTJS_SHELL__ !== 1,
    // …and its clear opened DevTools' post-clear pacing window.
    previousFrameAt: typeof window === "undefined" ? undefined : (window as { __TEXTJS_SHELL_AT__?: number }).__TEXTJS_SHELL_AT__,
    onCaughtError: (error) => {
      if (isNavigationError(error)) return;
      if (typeof error === "object" && error !== null) {
        if (seen.has(error)) return;
        seen.add(error);
      }
      console.error(error);
    },
  });
  const history = createBrowserHistory({ basePath: config.basePath });

  const render = (routes: RouteManifest): void => {
    root.render(
      createElement(AppRouter, {
        routes,
        history,
        theme: vp.theme,
        defaultTitle: config.title || undefined,
        errorStore: dev ? devErrors : null,
        devOverlay: dev && config.devIndicators ? createElement(TextDevOverlay) : null,
      }),
    );
  };
  render(options.routes);

  if (typeof document !== "undefined") {
    if (!document.title && config.title) document.title = config.title;
    const el = resolveContainer(options.container);
    createRoot(el).render(
      createElement(FocusPad, {
        root,
        title: config.title || undefined,
        hints: config.hints,
        action: config.action,
        showMirrorDefault: config.showMirrorDefault,
        style: { width: "min(960px, calc(100vw - 48px))", minHeight: "min(640px, calc(100vh - 48px))", boxSizing: "border-box" },
      }),
    );
  }

  if (dev) {
    if (options.hot) connectViteHmr(options.hot);
    if (options.hot && typeof (options.hot as Partial<MirrorHotContext>).send === "function") connectFrameMirror(root, options.hot as MirrorHotContext, history);
    installGlobalErrorHandlers();
  }

  const app: TextApp = { root, history, updateRoutes: render };
  if (typeof window !== "undefined") window.__TEXTJS_APP__ = app;
  return app;
}
