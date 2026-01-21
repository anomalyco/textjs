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

import { createContext, createElement, use, useContext, type ComponentType, type ReactNode } from "react";
import { RouterContext } from "../context";

type AnyComponent = (props: any) => unknown;

/** Per-session promise cache, cleared whenever the route or `router.refresh()` generation changes. */
export class ServerComponentCache {
  private generation = "";
  private readonly entries = new Map<string, Promise<ReactNode>>();
  private readonly ids = new WeakMap<object, number>();
  private nextId = 1;

  get size(): number {
    return this.entries.size;
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
    if (generation !== this.generation) {
      this.generation = generation;
      this.entries.clear();
    }
    const key = `${this.idOf(component)}|${stableKey(props, this, 0)}`;
    let p = this.entries.get(key);
    if (p === undefined) {
      try {
        p = Promise.resolve(component(props) as ReactNode | Promise<ReactNode>);
      } catch (error) {
        p = Promise.reject(error);
      }
      // Rejections surface through `use()` to the nearest error boundary.
      p.catch(() => undefined);
      this.entries.set(key, p);
    }
    return p;
  }
}

const MAX_DEPTH = 8;
const REACT_ELEMENT = Symbol.for("react.transitional.element");
const REACT_ELEMENT_LEGACY = Symbol.for("react.element");

/**
 * Structural key for props: primitives by value, plain objects / arrays /
 * React elements by structure, functions and class instances by identity.
 * Props rebuilt on every parent render (params objects, `children`) keep the
 * same key, so a retried render reuses the in-flight promise.
 */
export function stableKey(value: unknown, cache: ServerComponentCache, depth: number): string {
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
      return `f#${cache.idOf(value)}`;
  }
  if (value === null) return "n";
  const obj = value as Record<string | symbol, unknown>;
  if (depth >= MAX_DEPTH) return `o#${cache.idOf(obj)}`;
  if (Array.isArray(obj)) return `[${obj.map((v) => stableKey(v, cache, depth + 1)).join(",")}]`;
  const tag = obj.$$typeof;
  if (tag === REACT_ELEMENT || tag === REACT_ELEMENT_LEGACY) {
    const type = obj.type;
    const t = typeof type === "string" ? type : typeof type === "object" || typeof type === "function" ? `#${cache.idOf(type as object)}` : String(type);
    return `<${t}:${String(obj.key)}:${stableKey(obj.props, cache, depth + 1)}>`;
  }
  if (obj instanceof Date) return `d:${obj.getTime()}`;
  const proto = Object.getPrototypeOf(obj);
  if (proto !== Object.prototype && proto !== null) return `o#${cache.idOf(obj)}`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableKey(obj[k], cache, depth + 1)}`).join(",")}}`;
}

export const ServerComponentCacheContext = createContext<ServerComponentCache | null>(null);
ServerComponentCacheContext.displayName = "TextServerComponentCache";

/** Used when an async component renders outside a live session (tests, `text run`). */
const fallbackCache = new ServerComponentCache();

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
export function resolveServerType<T>(type: T): T {
  return (isAsyncComponent(type) ? serverComponent(type as never) : type) as T;
}

/** Provide a session's cache to every async component below. */
export function ServerComponentsProvider({ cache, children }: { cache: ServerComponentCache; children?: ReactNode }): ReactNode {
  return createElement(ServerComponentCacheContext, { value: cache }, children);
}
