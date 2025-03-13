/**
 * Router histories: `window.history` (pushState / replaceState / popstate)
 * and an in-memory history for tests and embedded previews.
 */

import { normalizeBasePath } from "./config";

export interface RouterLocation {
  pathname: string;
  /** Including the leading `?` (or `""`). */
  search: string;
  /** Including the leading `#` (or `""`). */
  hash: string;
  /** `pathname + search + hash`. */
  href: string;
  /** Unique per history entry. */
  key: string;
}

export type HistoryAction = "push" | "replace" | "pop";

export interface RouterHistory {
  readonly location: RouterLocation;
  readonly action: HistoryAction;
  push(href: string, state?: unknown): void;
  replace(href: string, state?: unknown): void;
  go(delta: number): void;
  back(): void;
  forward(): void;
  /** Subscribe to location changes (returns an unsubscribe function). */
  listen(listener: (location: RouterLocation, action: HistoryAction) => void): () => void;
  /** Stable getter for `useSyncExternalStore`. */
  getLocation(): RouterLocation;
  /** Turn an app href into a document URL (applies `basePath`). */
  createHref(href: string): string;
  dispose?(): void;
}

let keyCounter = 0;
const nextKey = (): string => (++keyCounter).toString(36);

/** Parse an app-relative href against the current pathname. */
export function parseHref(href: string, from = "/"): Omit<RouterLocation, "key"> {
  const url = new URL(href, `http://text.local${from.startsWith("/") ? from : `/${from}`}`);
  let pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  const search = url.search === "?" ? "" : url.search;
  return { pathname, search, hash: url.hash, href: pathname + search + url.hash };
}

/** `true` for absolute URLs on another origin (`https://…`, `mailto:`). */
export function isExternalHref(href: string, origin?: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith("//")) return false;
  if (origin === undefined) return true;
  try {
    return new URL(href, origin).origin !== origin;
  } catch {
    return true;
  }
}

function makeLocation(href: string, from: string): RouterLocation {
  return { ...parseHref(href, from), key: nextKey() };
}

class Emitter {
  private readonly listeners = new Set<(location: RouterLocation, action: HistoryAction) => void>();
  listen(listener: (location: RouterLocation, action: HistoryAction) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(location: RouterLocation, action: HistoryAction): void {
    for (const l of [...this.listeners]) l(location, action);
  }
}

export interface MemoryHistory extends RouterHistory {
  readonly entries: readonly RouterLocation[];
  readonly index: number;
}

export interface MemoryHistoryOptions {
  initialEntries?: string[];
  initialIndex?: number;
}

/** An in-memory history: full App Router navigation without touching `window.location`. */
export function createMemoryHistory(initial: string | MemoryHistoryOptions = "/"): MemoryHistory {
  const opts: MemoryHistoryOptions = typeof initial === "string" ? { initialEntries: [initial] } : initial;
  const raw = opts.initialEntries && opts.initialEntries.length > 0 ? opts.initialEntries : ["/"];
  let entries: RouterLocation[] = raw.map((h) => makeLocation(h, "/"));
  let index = Math.max(0, Math.min(entries.length - 1, opts.initialIndex ?? entries.length - 1));
  let action: HistoryAction = "pop";
  const emitter = new Emitter();
  const current = (): RouterLocation => entries[index] as RouterLocation;
  const go = (delta: number): void => {
    const next = Math.max(0, Math.min(entries.length - 1, index + delta));
    if (next === index) return;
    index = next;
    action = "pop";
    emitter.emit(current(), action);
  };

  return {
    get location() {
      return current();
    },
    get action() {
      return action;
    },
    get entries() {
      return entries;
    },
    get index() {
      return index;
    },
    getLocation: () => current(),
    createHref: (href) => parseHref(href, current().pathname).href,
    push(href) {
      const loc = makeLocation(href, current().pathname);
      entries = [...entries.slice(0, index + 1), loc];
      index = entries.length - 1;
      action = "push";
      emitter.emit(loc, action);
    },
    replace(href) {
      const loc = makeLocation(href, current().pathname);
      entries = entries.slice();
      entries[index] = loc;
      action = "replace";
      emitter.emit(loc, action);
    },
    go,
    back: () => go(-1),
    forward: () => go(1),
    listen: (l) => emitter.listen(l),
  };
}

export interface BrowserHistoryOptions {
  /** Mount point, e.g. `"/console"`. */
  basePath?: string;
  window?: Window;
}

/** Sync the App Router with `window.location` and the browser Back / Forward buttons. */
export function createBrowserHistory(options: BrowserHistoryOptions = {}): RouterHistory {
  const win = options.window ?? (typeof window !== "undefined" ? window : undefined);
  if (!win) return createMemoryHistory("/");
  const base = normalizeBasePath(options.basePath);
  const emitter = new Emitter();
  let action: HistoryAction = "pop";

  const strip = (pathname: string): string => {
    if (base && (pathname === base || pathname.startsWith(`${base}/`))) return pathname.slice(base.length) || "/";
    return pathname;
  };
  const read = (): RouterLocation => {
    const l = win.location;
    const state = win.history.state as { __textjs?: string } | null;
    return { ...parseHref(strip(l.pathname) + l.search + l.hash, "/"), key: state?.__textjs ?? "default" };
  };
  let current = read();
  const createHref = (href: string): string => base + parseHref(href, current.pathname).href;

  const onPop = (): void => {
    current = read();
    action = "pop";
    emitter.emit(current, action);
  };
  win.addEventListener("popstate", onPop);

  const write = (href: string, state: unknown, kind: "push" | "replace"): void => {
    const key = nextKey();
    const data = { ...(typeof state === "object" && state !== null ? state : {}), __textjs: key };
    const url = createHref(href);
    if (kind === "push") win.history.pushState(data, "", url);
    else win.history.replaceState(data, "", url);
    current = { ...parseHref(href, current.pathname), key };
    action = kind;
    emitter.emit(current, action);
  };

  return {
    get location() {
      return current;
    },
    get action() {
      return action;
    },
    getLocation: () => current,
    createHref,
    push: (href, state) => write(href, state, "push"),
    replace: (href, state) => write(href, state, "replace"),
    go: (delta) => win.history.go(delta),
    back: () => win.history.back(),
    forward: () => win.history.forward(),
    listen: (l) => emitter.listen(l),
    dispose: () => win.removeEventListener("popstate", onPop),
  };
}
