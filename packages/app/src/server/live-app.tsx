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
import { createConsoleRootSync, frameToAnsi, type ConsoleRoot, type ThemeName } from "@textjs/react";
import { pageAnsiSize } from "../config";
import { RouterContext } from "../context";
import { createMemoryHistory, parseHref, type HistoryAction, type MemoryHistory } from "../history";
import type { LiveBanner, LiveInput } from "../live-protocol";
import { isNotFoundError, isRedirectError } from "../navigation-errors";
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
  /**
   * The app navigated. `runtime` is the target route's runtime; `delta` is how
   * far a `"pop"` moved through the history.
   */
  onNavigate?: (href: string, action: HistoryAction, runtime: RouteRuntime, delta?: number) => void;
  /**
   * May the session render `href` (a server route)? Runs `middleware.ts` for
   * the target before every server-side route transition. Denied transitions
   * are handed to the browser as a document load, where middleware answers.
   */
  authorize?: (href: string) => Promise<boolean>;
  onTitle?: (title: string) => void;
  /**
   * Draw the "Click the page to use the keyboard" bar while the browser page doesn't have focus
   * and the app wants keys (default `true`). The player draws it; it never enters {@link LiveApp.buffer}.
   */
  focusHint?: boolean;
  /** The focus hint appeared, changed or went away (`null`). */
  onBanner?: (banner: LiveBanner | null) => void;
  onError?: (error: unknown) => void;
}

export interface LiveApp {
  readonly root: ConsoleRoot;
  readonly buffer: CellBuffer;
  readonly history: MemoryHistory;
  input(event: LiveInput): void;
  /** Apply a batch of input events (one POST) and paint once. */
  inputMany?(events: readonly LiveInput[]): void;
  /** Pause rendering while no browser is attached; resume (and repaint) on attach. */
  setActive?(active: boolean): void;
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
    // The engine reads keys from a browser page over the network.
    focusHint: options.focusHint !== false,
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
  if (options.onBanner) {
    const onBanner = options.onBanner;
    root.renderer._onBannerChange((b) => onBanner(b === null ? null : ({ text: b.text, fg: String(b.fg), bg: String(b.bg) } satisfies LiveBanner)));
  }
  const inner = createMemoryHistory(options.path);
  const cache = new ServerComponentCache();
  let routes = prepareServerManifest(options.routes);
  let fromClient = false;
  let disposed = false;
  let lastIndex = inner.index;
  let navSeq = 0;

  const unlisten = inner.listen((location, action) => {
    const delta = inner.index - lastIndex;
    lastIndex = inner.index;
    if (fromClient) return;
    options.onNavigate?.(location.href, action, routeRuntime(routes, location.pathname), action === "pop" ? delta : undefined);
  });

  /**
   * Route transitions to server pages wait for `authorize` (middleware for the
   * target). Denied ones become a document load of the target, which runs
   * middleware over HTTP (redirects, 401s, rewrites).
   */
  const guard = (href: string, action: HistoryAction, apply: () => void): void => {
    const target = parseHref(href, inner.location.pathname).href;
    if (!options.authorize || routeRuntime(routes, pathOf(target)) === "client") {
      navSeq++;
      apply();
      return;
    }
    const seq = ++navSeq;
    options.authorize(target).then(
      (ok) => {
        if (disposed || seq !== navSeq) return;
        if (ok) apply();
        else options.onNavigate?.(target, action, "client");
      },
      (error: unknown) => {
        options.onError?.(error);
        if (!disposed && seq === navSeq) options.onNavigate?.(target, action, "client");
      },
    );
  };
  const history: MemoryHistory = Object.create(inner, {
    push: { value: (href: string) => guard(href, "push", () => inner.push(href)) },
    replace: { value: (href: string) => guard(href, "replace", () => inner.replace(href)) },
    go: {
      value: (delta: number) => {
        const target = inner.entries[inner.index + delta];
        if (target) guard(target.href, "pop", () => inner.go(delta));
      },
    },
    back: { value: () => history.go(-1) },
    forward: { value: () => history.go(1) },
  }) as MemoryHistory;

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

  let active = true;
  const applyInput = (event: LiveInput): void => {
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
        const href = parseHref(event.href, inner.location.pathname).href;
        if (href === inner.location.href) break;
        // Browser Back / Forward: move through the same entries when they line up, so both histories agree.
        const delta = event.delta;
        const aligned = delta !== undefined && inner.entries[inner.index + delta]?.href === href;
        guard(href, "pop", () => {
          fromClient = true;
          try {
            if (aligned) inner.go(delta);
            else inner.push(href);
          } finally {
            fromClient = false;
          }
          // Onto a client-rendered route: hand the document over.
          if (routeRuntime(routes, inner.location.pathname) === "client") options.onNavigate?.(inner.location.href, "pop", "client");
        });
        break;
      }
    }
  };

  return {
    root,
    history,
    get buffer() {
      return root.renderer.buffer;
    },
    input: applyInput,
    inputMany(events) {
      if (events.length <= 1 || !active) {
        for (const e of events) applyInput(e);
        return;
      }
      // One paint for the whole batch; React still commits between events.
      root.renderer.pause();
      try {
        for (const e of events) applyInput(e);
      } finally {
        if (!root.unmounted) root.renderer.resume();
      }
    },
    setActive(next) {
      if (next === active || root.unmounted) return;
      active = next;
      if (next) root.renderer.resume();
      else root.renderer.pause();
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
      disposed = true;
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
  /** The CSS arguments for Firefox's and Safari's inline consoles, when they differ (the format string never does). */
  inlineArgs?: string[];
}

export interface PrerenderShellOptions {
  routes: RouteManifest;
  path: string;
  cols: number;
  rows: number;
  theme?: ThemeName;
}

interface FirstFrameOptions {
  routes: RouteManifest;
  path: string;
  cols: number;
  rows: number;
  theme?: ThemeName;
  focusHint?: boolean;
  /**
   * Terminal frames: `notFound()` renders the not-found page instead of
   * failing, and a `redirect()` (or any navigation) yields `null`.
   */
  terminal?: boolean;
}

/**
 * Render a route's first committed frame and hand its buffer to `capture`
 * before unmounting. Async server components never run (they suspend to
 * their fallbacks), and `fetch` never resolves while rendering, so data
 * loaded in effects stays in its loading state too. Everything after
 * `initYoga()` is synchronous: the `fetch` stub can't leak into other work
 * on the same event loop.
 */
async function renderFirstFrame<T>(options: FirstFrameOptions, capture: (buffer: CellBuffer, notFound: boolean) => T): Promise<T | null> {
  await initYoga();
  const g = globalThis as { fetch?: typeof fetch };
  const realFetch = g.fetch;
  g.fetch = (() => new Promise<Response>(() => undefined)) as unknown as typeof fetch;
  // Any error the render hit (caught by an error boundary, `redirect()` / `notFound()` included)
  // means the first frame is not the route's shell: never bake it into HTML.
  const errors: unknown[] = [];
  const root = createConsoleRootSync({
    width: options.cols,
    height: options.rows,
    responsive: false,
    theme: options.theme,
    input: new InputEngine({ document: null }),
    ...(options.focusHint === false ? { focusHint: false } : {}),
    console: NULL_CONSOLE,
    clear: "never",
    scheduler: { request: () => null, cancel: () => undefined },
    minFrameInterval: 0,
    registerGlobal: false,
    onCaughtError: (error) => void errors.push(error),
    onUncaughtError: (error) => void errors.push(error),
    onRecoverableError: () => undefined,
  });
  try {
    const history = createMemoryHistory(options.path);
    root.render(
      <ServerComponentsProvider cache={new ServerComponentCache({ suspendOnly: true })}>
        <AppRouter routes={prepareServerManifest(options.routes)} history={history} theme={options.theme} documentTitle={false} errorStore={null} />
      </ServerComponentsProvider>,
    );
    root.flushSyncRender();
    const navigated = history.location.href !== parseHref(options.path).href;
    if (options.terminal && (navigated || errors.some(isRedirectError))) return null;
    const notFound = options.terminal === true && errors.length > 0 && errors.every(isNotFoundError);
    if (errors.length > 0 && !notFound) {
      const first = errors[0];
      throw new Error(`rendering ${options.path} threw: ${first instanceof Error ? first.message : String(first)}`, { cause: first });
    }
    if (navigated) throw new Error(`rendering ${options.path} navigated to ${history.location.href}`);
    return capture(root.renderer.buffer, notFound);
  } finally {
    root.unmount();
    g.fetch = realFetch;
  }
}

/**
 * Render the static shell of a route: the first committed frame, with every
 * `<Suspense>` boundary that is still waiting (async server components,
 * `use()`, lazy modules) showing its fallback.
 *
 * Returns the exact `console.clear()` / `console.log()` calls the client's
 * driver would make for this frame (curtain included).
 */
export async function prerenderShell(options: PrerenderShellOptions): Promise<ShellCall[]> {
  const calls = await renderFirstFrame(options, (buffer) => {
    // The live stream sends cells (`readCells`), so pixel sprites draw as half-blocks once it takes
    // over. Bake the same cells into the shell, so the first frame doesn't switch and the HTML
    // doesn't carry each sprite's data URL twice.
    buffer._materializeSpritesInRect(0, 0, buffer.width, buffer.height, true, false);
    const capture = (browser: "chromium" | "firefox"): ShellCall[] => {
      const calls: ShellCall[] = [];
      const target: ConsoleTarget = {
        clear: () => void calls.push({ method: "clear", args: [] }),
        log: (...args: unknown[]) => void calls.push({ method: "log", args: args.map(String) }),
      };
      new CssConsoleDriver({ console: target, curtain: true, browser }).render(buffer);
      return calls;
    };
    // The shell runs before any module, so it carries the CSS for both kinds of console.
    const inline = capture("firefox");
    return capture("chromium").map((call, i) => {
      const css = inline[i]?.args.slice(1);
      return call.method === "log" && css !== undefined && css.join("\0") !== call.args.slice(1).join("\0") ? { ...call, inlineArgs: css } : call;
    });
  });
  return calls as ShellCall[];
}

// ---------------------------------------------------------------------------
// ANSI frames for terminal clients
// ---------------------------------------------------------------------------

/** A route's first frame for curl and friends. */
export interface AnsiFrame {
  ansi: string;
  /** `404` when the path matches no page or the page called `notFound()`. */
  status: 200 | 404;
}

/**
 * A route's first frame (as for {@link prerenderShell}) as truecolor ANSI,
 * at `cols × rows` unless the page's `export const ansi` changes the size.
 * `null` when the page opts out (`export const ansi = false`) or redirects
 * while rendering (the client follows it). Throws on render errors.
 */
export async function prerenderAnsi(options: PrerenderShellOptions): Promise<AnsiFrame | null> {
  const match = resolveRoute(options.routes, pathOf(options.path));
  const page = match.notFound ? undefined : match.chain[match.chain.length - 1]?.page;
  const size = pageAnsiSize({ cols: options.cols, rows: options.rows }, page !== undefined && typeof page !== "function" ? page.ansi : undefined);
  if (size === null) return null;
  return renderFirstFrame({ ...size, routes: options.routes, path: options.path, theme: options.theme, focusHint: false, terminal: true }, (buffer, notFound) => ({
    ansi: frameToAnsi(buffer, { theme: options.theme }),
    status: match.notFound || notFound ? 404 : 200,
  }));
}
