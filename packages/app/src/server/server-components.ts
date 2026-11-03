/**
 * Async Server Components for server-rendered console routes.
 *
 * React's client reconciler (which the console renderer is) re-runs an
 * `async function` component on every retry, creating a fresh promise each
 * time, so it never settles. On the server, `text dev` / `text build` alias
 * `react/jsx-runtime` to {@link ./jsx-runtime}, which swaps every async
 * component for a wrapper that memoizes its promise per session, navigation
 * and props, then unwraps it with `use()` (suspending to the nearest
 * `<Suspense>` / `loading.tsx` meanwhile). The data access stays on the server:
 * these modules never ship to the frame player.
 */

import { createElement, use, useContext, type ComponentType, type ReactNode } from "react";
import { sharedContext } from "@textjs/react";
import { RouterContext } from "../context";

type AnyComponent = (props: any) => unknown;

/** Promises kept per cache (least recently used are dropped first). */
export const SERVER_COMPONENT_CACHE_SIZE = 256;

const NEVER: Promise<never> = new Promise<never>(() => undefined);

/** Per-session promise cache, cleared whenever the route or `router.refresh()` generation changes. */
export class ServerComponentCache {
  private generation = "";
  private readonly entries = new Map<string, Promise<ReactNode>>();
  private readonly ids = new WeakMap<object, number>();
  private nextId = 1;
  private inflight = 0;
  private settledAt = 0;
  private readonly maxEntries: number;
  private readonly onActivity: (() => void) | undefined;
  private readonly suspendOnly: boolean;

  /**
   * `onActivity` runs whenever a component's promise starts or settles (idle tracking).
   * With `suspendOnly`, async components never run: each one suspends to its
   * `<Suspense>` fallback (prerendered shells and ANSI frames, which capture the first frame).
   */
  constructor(options: { maxEntries?: number; onActivity?: () => void; suspendOnly?: boolean } = {}) {
    this.maxEntries = options.maxEntries ?? SERVER_COMPONENT_CACHE_SIZE;
    this.onActivity = options.onActivity;
    this.suspendOnly = options.suspendOnly ?? false;
  }

  get size(): number {
    return this.entries.size;
  }

  /** Component promises that have not settled yet. */
  get pending(): number {
    return this.inflight;
  }

  /** `Date.now()` when a component promise last settled (0 = never). */
  get lastSettled(): number {
    return this.settledAt;
  }

  clear(): void {
    this.entries.clear();
  }

  /** Stable identity id for functions, symbols-as-objects and non-plain objects. */
  idOf(value: object): number {
    let id = this.ids.get(value);
    if (id === undefined) {
      id = this.nextId++;
      this.ids.set(value, id);
    }
    return id;
  }

  read(component: AnyComponent, props: object, generation: string): Promise<ReactNode> {
    if (this.suspendOnly) return NEVER;
    if (generation !== this.generation) {
      this.generation = generation;
      this.entries.clear();
    }
    const key = `${this.idOf(component)}|${stableKey(props, this, 0)}`;
    let p = this.entries.get(key);
    if (p !== undefined) {
      // Most recently used last.
      this.entries.delete(key);
      this.entries.set(key, p);
    } else {
      try {
        p = Promise.resolve(component(props) as ReactNode | Promise<ReactNode>);
      } catch (error) {
        p = Promise.reject(error);
      }
      // Rejections surface through `use()` to the nearest error boundary.
      this.inflight++;
      this.onActivity?.();
      const settled = (): void => {
        this.inflight--;
        this.settledAt = Date.now();
        this.onActivity?.();
      };
      p.then(settled, settled);
      this.entries.set(key, p);
      for (const k of this.entries.keys()) {
        if (this.entries.size <= this.maxEntries) break;
        this.entries.delete(k);
      }
    }
    return p;
  }
}

const MAX_DEPTH = 64;
const REACT_ELEMENT = Symbol.for("react.transitional.element");
const REACT_ELEMENT_LEGACY = Symbol.for("react.element");

let warnedFunctionProp = false;

/**
 * Structural key for props: primitives, plain objects, arrays, `Date`, `URL`,
 * `URLSearchParams`, `RegExp`, `Map`, `Set`, class instances (by constructor
 * and own fields) and React elements by value; component types by identity
 * (they're module-level). Function props aren't part of the key: a callback
 * rebuilt on every render would otherwise miss on every retry and suspend
 * forever. Props rebuilt on every parent render keep the same key, so a
 * retried render reuses the in-flight promise.
 */
export function stableKey(value: unknown, cache: ServerComponentCache, depth: number, seen: WeakSet<object> = new WeakSet()): string {
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "number":
    case "boolean":
    case "bigint":
      return `${typeof value}:${String(value)}`;
    case "undefined":
      return "u";
    case "symbol":
      return `s:${String(value)}`;
    case "function":
      if (!warnedFunctionProp) {
        warnedFunctionProp = true;
        console.warn("▼ Text.js: an async server component received a function prop. Functions aren't part of its cache key; pass data instead of callbacks.");
      }
      return "f";
  }
  if (value === null) return "n";
  const obj = value as Record<string | symbol, unknown>;
  if (seen.has(obj)) return "cycle";
  if (depth >= MAX_DEPTH) return `o#${cache.idOf(obj)}`;
  seen.add(obj);
  try {
    const next = (v: unknown): string => stableKey(v, cache, depth + 1, seen);
    if (Array.isArray(obj)) return `[${obj.map(next).join(",")}]`;
    const tag = obj.$$typeof;
    if (tag === REACT_ELEMENT || tag === REACT_ELEMENT_LEGACY) {
      const type = obj.type;
      const t = typeof type === "string" ? type : typeof type === "object" || typeof type === "function" ? `#${cache.idOf(type as object)}` : String(type);
      return `<${t}:${String(obj.key)}:${next(obj.props)}>`;
    }
    if (obj instanceof Date) return `d:${obj.getTime()}`;
    if (obj instanceof URL) return `url:${JSON.stringify(obj.href)}`;
    if (obj instanceof URLSearchParams) return `qs:${JSON.stringify(obj.toString())}`;
    if (obj instanceof RegExp) return `re:${JSON.stringify(obj.toString())}`;
    if (obj instanceof Map) return `map{${[...obj].map(([k, v]) => `${next(k)}=>${next(v)}`).sort().join(",")}}`;
    if (obj instanceof Set) return `set{${[...obj].map(next).sort().join(",")}}`;
    const proto = Object.getPrototypeOf(obj) as { constructor?: { name?: string } } | null;
    const prefix = proto !== Object.prototype && proto !== null ? `${proto.constructor?.name ?? "?"}` : "";
    const keys = Object.keys(obj).sort();
    return `${prefix}{${keys.map((k) => `${JSON.stringify(k)}:${next(obj[k])}`).join(",")}}`;
  } finally {
    seen.delete(obj);
  }
}

export const ServerComponentCacheContext = sharedContext<ServerComponentCache | null>("serverComponentCache", null, "TextServerComponentCache");

/** Used when an async component renders outside a live session (tests, `text run`); bounded like a session's. */
const fallbackCache = new ServerComponentCache();

/** Drop every promise cached outside live sessions (`text run` between apps, tests). */
export function clearFallbackServerComponentCache(): void {
  fallbackCache.clear();
}

const AsyncFunction = (async () => undefined).constructor;

export function isAsyncComponent(type: unknown): type is AnyComponent {
  return typeof type === "function" && type instanceof AsyncFunction;
}

const wrappers = new WeakMap<AnyComponent, ComponentType<any>>();

/** Wrap an `async function` component so it renders on the console reconciler. */
export function serverComponent<P extends object>(component: (props: P) => Promise<ReactNode>): ComponentType<P> {
  const fn = component as AnyComponent;
  let wrapped = wrappers.get(fn);
  if (wrapped === undefined) {
    const Wrapped = (props: P): ReactNode => {
      const cache = useContext(ServerComponentCacheContext) ?? fallbackCache;
      const router = useContext(RouterContext);
      const generation = router ? `${router.location.key}:${router.refreshKey}` : "";
      return use(cache.read(fn, props, generation));
    };
    Wrapped.displayName = fn.name ? `${fn.name}` : "ServerComponent";
    wrapped = Wrapped as ComponentType<any>;
    wrappers.set(fn, wrapped);
  }
  return wrapped as ComponentType<P>;
}

/** `type` with async function components swapped for their wrappers. */
const REACT_MEMO = Symbol.for("react.memo");
const memoWrappers = new WeakMap<object, object>();

export function resolveServerType<T>(type: T): T {
  if (isAsyncComponent(type)) return serverComponent(type as never) as T;
  // `React.memo(async function …)`: wrap the inner component, keep the memo.
  if (typeof type === "object" && type !== null && (type as { $$typeof?: symbol }).$$typeof === REACT_MEMO && isAsyncComponent((type as { type?: unknown }).type)) {
    let wrapped = memoWrappers.get(type);
    if (wrapped === undefined) {
      wrapped = { ...(type as object), type: serverComponent((type as unknown as { type: never }).type) };
      memoWrappers.set(type, wrapped);
    }
    return wrapped as T;
  }
  return type;
}

/** Provide a session's cache to every async component below. */
export function ServerComponentsProvider({ cache, children }: { cache: ServerComponentCache; children?: ReactNode }): ReactNode {
  return createElement(ServerComponentCacheContext, { value: cache }, children);
}
