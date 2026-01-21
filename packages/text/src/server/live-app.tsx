/**
 * The React half of server-rendered console routes: mounts the App Router in a
 * headless console root on the server (Bun / Node), applies forwarded input
 * and exposes the painted `CellBuffer` for the live transport and for Partial
 * Prerendering. Loaded through Vite's SSR graph in `text dev` and bundled into
 * `.text/server/live.mjs` by `text build`, so route modules, `@textjs/react`
 * and this module share one React instance.
 */

import { useContext, useEffect, type ReactNode } from "react";
import {
  CssConsoleDriver,
  initYoga,
  InputEngine,
  type CellBuffer,
  type ConsoleTarget,
  type RendererScheduler,
} from "@textjs/core";
import { createConsoleRootSync, type ConsoleRoot, type ThemeName } from "@textjs/react";
import { RouterContext } from "../context";
import { createMemoryHistory, type HistoryAction, type MemoryHistory } from "../history";
import type { LiveInput } from "../live-protocol";
import { AppRouter } from "../router";
import { resolveRoute, type RouteManifest, type RouteModule, type RouteModuleRef, type RouteSegmentNode } from "../routing";
import { isAsyncComponent, serverComponent, ServerComponentCache, ServerComponentsProvider } from "./server-components";

/** `export const runtime = "server"` in `page.tsx`. */
export type RouteRuntime = "server" | "client";

export interface LiveAppOptions {
  /** Eager route manifest (every page imported). */
  routes: RouteManifest;
  /** Initial href (`pathname + search`). */
  path: string;
  cols: number;
  rows: number;
  theme?: ThemeName;
  /** `document.title` fallback when no route sets one. */
  defaultTitle?: string;
  focused?: boolean;
  /** A frame with changed cells was painted into {@link LiveApp.buffer}. */
  onFrame?: () => void;
  /** The app navigated. `runtime` is the target route's runtime. */
  onNavigate?: (href: string, action: HistoryAction, runtime: RouteRuntime) => void;
  onTitle?: (title: string) => void;
  onError?: (error: unknown) => void;
}

export interface LiveApp {
  readonly root: ConsoleRoot;
  readonly buffer: CellBuffer;
  readonly history: MemoryHistory;
  input(event: LiveInput): void;
  /** Swap the manifest (dev: a route module changed). Keeps the history. */
  setRoutes(routes: RouteManifest): void;
  /** Lay out and paint synchronously. */
  flush(): void;
  dispose(): void;
}

const NULL_CONSOLE: ConsoleTarget = { clear() {}, log() {} };

const timeoutScheduler: RendererScheduler = {
  request: (cb) => setTimeout(cb, 0),
  cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

const prepared = new WeakMap<RouteManifest, RouteManifest>();

/** Wrap async `default` exports (pages, layouts, …) so they render on the console reconciler. */
export function prepareServerManifest(routes: RouteManifest): RouteManifest {
  const hit = prepared.get(routes);
  if (hit) return hit;
  const wrapRef = (ref: RouteModuleRef | undefined): RouteModuleRef | undefined => {
    if (ref === undefined || typeof ref === "function") return ref;
    return isAsyncComponent(ref.default) ? ({ ...ref, default: serverComponent(ref.default as never) } as RouteModule) : ref;
  };
  const walk = (node: RouteSegmentNode): RouteSegmentNode => {
    const out: RouteSegmentNode = { ...node };
    for (const k of ["layout", "page", "loading", "error", "notFound"] as const) {
      if (node[k] !== undefined) out[k] = wrapRef(node[k]);
    }
    if (node.children) out.children = node.children.map(walk);
    return out;
  };
  const result = walk(routes);
  prepared.set(routes, result);
  return result;
}

/** `true` only when `pathname` matches a page that opts into `runtime = "server"` (HTML routing, new sessions). */
export function isServerPage(routes: RouteManifest, pathname: string): boolean {
  const match = resolveRoute(routes, pathname);
  if (match.notFound) return false;
  const page = match.chain[match.chain.length - 1]?.page;
  return page !== undefined && typeof page !== "function" && page.runtime === "server";
}

/** The runtime of the page `pathname` resolves to (in-app navigation: not-found pages render where they are requested). */
export function routeRuntime(routes: RouteManifest, pathname: string): RouteRuntime {
  const match = resolveRoute(routes, pathname);
  if (match.notFound) return "server";
  const page = match.chain[match.chain.length - 1]?.page;
  return page !== undefined && typeof page !== "function" && page.runtime === "server" ? "server" : "client";
}

function TitleReporter({ fallback, onTitle }: { fallback?: string; onTitle?: (title: string) => void }): ReactNode {
  const state = useContext(RouterContext);
  const title = state?.metadata.title ?? fallback;
  useEffect(() => {
    if (title !== undefined && onTitle) onTitle(title);
  }, [title, onTitle]);
  return null;
}

function pathOf(href: string): string {
  const q = href.search(/[?#]/);
  return q < 0 ? href : href.slice(0, q);
}

/** Mount a live session's App Router on the server. */
export async function createLiveApp(options: LiveAppOptions): Promise<LiveApp> {
  await initYoga();
  const engine = new InputEngine({ document: null });
  engine.setFocused(options.focused ?? true);
  const root = createConsoleRootSync({
    width: options.cols,
    height: options.rows,
    responsive: false,
    theme: options.theme,
    input: engine,
    console: NULL_CONSOLE,
    clear: "never",
    scheduler: timeoutScheduler,
    minFrameInterval: 0,
    registerGlobal: false,
    onFrame: (frame) => {
      if (!frame.skipped) options.onFrame?.();
    },
    onCaughtError: (error) => options.onError?.(error),
    onUncaughtError: (error) => options.onError?.(error),
    onRecoverableError: () => undefined,
  });
  const history = createMemoryHistory(options.path);
  const cache = new ServerComponentCache();
  let routes = prepareServerManifest(options.routes);
  let fromClient = false;

  const unlisten = history.listen((location, action) => {
    if (fromClient) return;
    options.onNavigate?.(location.href, action, routeRuntime(routes, location.pathname));
  });

  const render = (): void => {
    root.render(
      <ServerComponentsProvider cache={cache}>
        <AppRouter routes={routes} history={history} theme={options.theme} documentTitle={false} errorStore={null}>
          <TitleReporter fallback={options.defaultTitle} onTitle={options.onTitle} />
        </AppRouter>
      </ServerComponentsProvider>,
    );
  };
  render();

  return {
    root,
    history,
    get buffer() {
      return root.renderer.buffer;
    },
    input(event) {
      if (root.unmounted) return;
      switch (event.type) {
        case "key":
        case "paste":
        case "wheel":
          engine.emit(event.type, event as never);
          break;
        case "focus":
          engine.setFocused(event.focused);
          break;
        case "resize":
          root.renderer.resize(event.cols, event.rows);
          break;
        case "nav": {
          if (event.href === history.location.href) break;
          fromClient = true;
          try {
            history.push(event.href);
          } finally {
            fromClient = false;
          }
          // Back / Forward onto a client-rendered route: hand the document over.
          if (routeRuntime(routes, pathOf(event.href)) === "client") options.onNavigate?.(event.href, "pop", "client");
          break;
        }
      }
    },
    setRoutes(next) {
      routes = prepareServerManifest(next);
      cache.clear();
      if (!root.unmounted) render();
    },
    flush() {
      if (!root.unmounted) root.flushSyncRender();
    },
    dispose() {
      unlisten();
      cache.clear();
      if (!root.unmounted) root.unmount();
    },
  };
}

// ---------------------------------------------------------------------------
// Partial Prerendering
// ---------------------------------------------------------------------------

export interface ShellCall {
  method: "clear" | "log";
  args: string[];
}

export interface PrerenderShellOptions {
  routes: RouteManifest;
  path: string;
  cols: number;
  rows: number;
  theme?: ThemeName;
}

/**
 * Render the static shell of a route: the first committed frame, with every
 * `<Suspense>` boundary that is still waiting (async server components,
 * `use()`, lazy modules) showing its fallback. `fetch` never resolves while
 * rendering, so data loaded in effects stays in its loading state too.
 *
 * Returns the exact `console.clear()` / `console.log()` calls the client's
 * driver would make for this frame (curtain included).
 */
export async function prerenderShell(options: PrerenderShellOptions): Promise<ShellCall[]> {
  await initYoga();
  const g = globalThis as { fetch?: typeof fetch };
  const realFetch = g.fetch;
  g.fetch = (() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
  const root = createConsoleRootSync({
    width: options.cols,
    height: options.rows,
    responsive: false,
    theme: options.theme,
    input: new InputEngine({ document: null }),
    console: NULL_CONSOLE,
    clear: "never",
    scheduler: { request: () => null, cancel: () => undefined },
    minFrameInterval: 0,
    registerGlobal: false,
    onCaughtError: () => undefined,
    onUncaughtError: () => undefined,
    onRecoverableError: () => undefined,
  });
  try {
    const history = createMemoryHistory(options.path);
    root.render(
      <ServerComponentsProvider cache={new ServerComponentCache()}>
        <AppRouter routes={prepareServerManifest(options.routes)} history={history} theme={options.theme} documentTitle={false} errorStore={null} />
      </ServerComponentsProvider>,
    );
    root.flushSyncRender();
    const calls: ShellCall[] = [];
    const capture: ConsoleTarget = {
      clear: () => void calls.push({ method: "clear", args: [] }),
      log: (...args: unknown[]) => void calls.push({ method: "log", args: args.map(String) }),
    };
    new CssConsoleDriver({ console: capture, curtain: true }).render(root.renderer.buffer);
    return calls;
  } finally {
    root.unmount();
    g.fetch = realFetch;
  }
}
