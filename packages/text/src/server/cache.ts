/**
 * `@textjs/next/cache` — the data cache: `unstable_cache()` / `cache()` with
 * tags and time-based revalidation, `revalidateTag()` / `revalidatePath()`,
 * stale-while-revalidate semantics and a pluggable store (in-memory by default).
 *
 * State lives on `globalThis` so the CLI, the route-handler bundle and user
 * code share one cache even when they load separate copies of this module.
 */

import { AsyncLocalStorage } from "node:async_hooks";

type Awaitable<T> = T | Promise<T>;

export interface CacheEntry {
  /** Serialized value (JSON for the data cache, `{ status, headers, body }` for routes). */
  value: unknown;
  /** Epoch ms when the computation that produced `value` started. */
  lastModified: number;
  /** Seconds until the entry turns stale; `false` = only on-demand revalidation. */
  revalidate: number | false;
  tags: string[];
}

export interface TagState {
  /** Latest `revalidateTag()` / `revalidatePath()` that expired one of the tags (epoch ms, `0` = never). */
  expiredAt: number;
  /** Latest `revalidateTag(tag, "max")` that marked one of the tags stale. */
  staleAt: number;
}

/**
 * A cache backend. Implement this to share the cache across instances
 * (Redis, Upstash, Workers KV, …) and point `cacheHandler` in
 * `text.config.ts` at a module that default-exports it.
 */
export interface CacheStore {
  get(key: string): Awaitable<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Awaitable<void>;
  delete(key: string): Awaitable<void>;
  /** Record that `tags` were revalidated at `at`. */
  markTags(tags: readonly string[], mode: "expire" | "stale", at: number): Awaitable<void>;
  getTagState(tags: readonly string[]): Awaitable<TagState>;
}

export interface MemoryCacheStoreOptions {
  /** Maximum entries before the least recently used are evicted (default `1000`). */
  maxEntries?: number;
  /** Approximate maximum size in bytes (default 50 MB). */
  maxSize?: number;
}

function sizeOf(value: unknown): number {
  if (typeof value === "string") return value.length * 2;
  try {
    return (JSON.stringify(value)?.length ?? 0) * 2;
  } catch {
    return 1024;
  }
}

/** The default store: a per-process LRU map. */
export class MemoryCacheStore implements CacheStore {
  readonly #entries = new Map<string, { entry: CacheEntry; size: number }>();
  readonly #tags = new Map<string, TagState>();
  readonly #maxEntries: number;
  readonly #maxSize: number;
  #size = 0;

  constructor(options: MemoryCacheStoreOptions = {}) {
    this.#maxEntries = options.maxEntries ?? 1000;
    this.#maxSize = options.maxSize ?? 50 * 1024 * 1024;
  }

  get size(): number {
    return this.#entries.size;
  }

  get(key: string): CacheEntry | undefined {
    const hit = this.#entries.get(key);
    if (!hit) return undefined;
    this.#entries.delete(key);
    this.#entries.set(key, hit);
    return hit.entry;
  }

  set(key: string, entry: CacheEntry): void {
    this.delete(key);
    const size = sizeOf(entry.value);
    if (size > this.#maxSize) return;
    this.#entries.set(key, { entry, size });
    this.#size += size;
    for (const [k, v] of this.#entries) {
      if (this.#entries.size <= this.#maxEntries && this.#size <= this.#maxSize) break;
      this.#entries.delete(k);
      this.#size -= v.size;
    }
  }

  delete(key: string): void {
    const hit = this.#entries.get(key);
    if (!hit) return;
    this.#entries.delete(key);
    this.#size -= hit.size;
  }

  markTags(tags: readonly string[], mode: "expire" | "stale", at: number): void {
    for (const tag of tags) {
      const s = this.#tags.get(tag) ?? { expiredAt: 0, staleAt: 0 };
      if (mode === "expire") s.expiredAt = Math.max(s.expiredAt, at);
      else s.staleAt = Math.max(s.staleAt, at);
      this.#tags.set(tag, s);
    }
  }

  getTagState(tags: readonly string[]): TagState {
    const out: TagState = { expiredAt: 0, staleAt: 0 };
    for (const tag of tags) {
      const s = this.#tags.get(tag);
      if (!s) continue;
      out.expiredAt = Math.max(out.expiredAt, s.expiredAt);
      out.staleAt = Math.max(out.staleAt, s.staleAt);
    }
    return out;
  }

  clear(): void {
    this.#entries.clear();
    this.#tags.clear();
    this.#size = 0;
  }
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

/** Collects tags and the shortest `revalidate` of everything cached while a route handler runs. */
export interface CacheScope {
  tags: Set<string>;
  revalidate: number | false;
  /** Path-derived tags (`revalidatePath`) inherited by data cached inside the scope. */
  implicitTags: readonly string[];
  waitUntil?: (promise: Promise<unknown>) => void;
}

interface CacheState {
  store: CacheStore;
  inflight: Map<string, Promise<ResolvedEntry>>;
  scope: AsyncLocalStorage<CacheScope>;
  clock: () => number;
  last: number;
  onError: (error: unknown, key: string) => void;
}

const STATE = Symbol.for("textjs.cache");

function state(): CacheState {
  const g = globalThis as unknown as Record<symbol, CacheState | undefined>;
  let s = g[STATE];
  if (!s) {
    s = {
      store: new MemoryCacheStore(),
      inflight: new Map(),
      scope: new AsyncLocalStorage<CacheScope>(),
      clock: Date.now,
      last: 0,
      onError: (error, key) => console.error(`▼ Text.js: background revalidation failed for ${key}\n`, error),
    };
    g[STATE] = s;
  }
  return s;
}

/** Strictly increasing timestamps, so a revalidation in the same millisecond as a write still wins. */
export function cacheNow(): number {
  const s = state();
  let t = s.clock();
  if (t <= s.last) t = s.last + 0.001;
  s.last = t;
  return t;
}

/** Replace the cache backend (`text.config.ts` → `cacheHandler` does this for you). */
export function setCacheStore(store: CacheStore): void {
  const s = state();
  s.store = store;
  s.inflight.clear();
}

export function getCacheStore(): CacheStore {
  return state().store;
}

/** @internal Test hooks: a fake clock, error sink, or a fresh in-memory store. */
export function __configureCache(options: { clock?: () => number; onError?: (error: unknown, key: string) => void; reset?: boolean }): void {
  const s = state();
  if (options.clock) {
    s.clock = options.clock;
    s.last = 0;
  }
  if (options.onError) s.onError = options.onError;
  if (options.reset) {
    s.store = new MemoryCacheStore();
    s.inflight.clear();
    s.last = 0;
  }
}

export function currentCacheScope(): CacheScope | undefined {
  return state().scope.getStore();
}

export function runInCacheScope<T>(scope: CacheScope, fn: () => T): T {
  return state().scope.run(scope, fn);
}

function track(scope: CacheScope | undefined, tags: readonly string[], revalidate: number | false): void {
  if (!scope) return;
  for (const t of tags) scope.tags.add(t);
  if (revalidate !== false && (scope.revalidate === false || revalidate < scope.revalidate)) scope.revalidate = revalidate;
}

// ---------------------------------------------------------------------------
// Core: stale-while-revalidate lookup
// ---------------------------------------------------------------------------

/** Entries older than a year are regenerated in the foreground (Next.js `expireTime`). */
export const EXPIRE_SECONDS = 31_536_000;

export type CacheStatus = "HIT" | "STALE" | "MISS";

interface ResolvedEntry {
  entry: CacheEntry;
  status: CacheStatus;
}

export interface Computed {
  value: unknown;
  tags: readonly string[];
  /** `0` = don't store (dynamic). */
  revalidate: number | false;
}

export function classifyEntry(entry: CacheEntry, tags: TagState, now: number): "fresh" | "stale" | "expired" {
  if (tags.expiredAt > entry.lastModified) return "expired";
  const age = now - entry.lastModified;
  if (entry.revalidate !== false && age > EXPIRE_SECONDS * 1000) return "expired";
  if (tags.staleAt > entry.lastModified) return "stale";
  if (entry.revalidate !== false && age > entry.revalidate * 1000) return "stale";
  return "fresh";
}

async function compute(key: string, fn: () => Promise<Computed>): Promise<ResolvedEntry> {
  const s = state();
  const startedAt = cacheNow();
  const result = await fn();
  const entry: CacheEntry = { value: result.value, lastModified: startedAt, revalidate: result.revalidate, tags: [...new Set(result.tags)] };
  if (result.revalidate !== 0) await s.store.set(key, entry);
  return { entry, status: "MISS" };
}

function dedupe(key: string, fn: () => Promise<Computed>): Promise<ResolvedEntry> {
  const s = state();
  const running = s.inflight.get(key);
  if (running) return running;
  const p = compute(key, fn).finally(() => {
    if (s.inflight.get(key) === p) s.inflight.delete(key);
  });
  s.inflight.set(key, p);
  return p;
}

/**
 * Read `key`, serving stale entries while one deduplicated background
 * refresh runs (registered with `waitUntil` on serverless runtimes).
 */
export async function getOrCompute(key: string, fn: () => Promise<Computed>, waitUntil?: (p: Promise<unknown>) => void): Promise<ResolvedEntry> {
  const s = state();
  const entry = await s.store.get(key);
  if (entry) {
    const verdict = classifyEntry(entry, await s.store.getTagState(entry.tags), cacheNow());
    if (verdict === "fresh") return { entry, status: "HIT" };
    if (verdict === "stale") {
      if (!s.inflight.has(key)) {
        const refresh = dedupe(key, fn).catch((error: unknown) => {
          s.onError(error, key);
        });
        if (waitUntil) waitUntil(refresh);
      }
      return { entry, status: "STALE" };
    }
  }
  return dedupe(key, fn);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CacheOptions {
  /** Tags for `revalidateTag()`. */
  tags?: string[];
  /** Seconds before the value turns stale (served while refreshing). `false` (default) = until revalidated. */
  revalidate?: number | false;
}

function validateRevalidate(value: unknown, where: string): number | false {
  if (value === undefined || value === false) return false;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  throw new TypeError(`Invalid revalidate value ${JSON.stringify(value)} in ${where}; must be a non-negative number or false.`);
}

function validateTags(tags: unknown, where: string): string[] {
  if (tags === undefined) return [];
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== "string")) throw new TypeError(`Invalid tags in ${where}; must be an array of strings.`);
  return tags as string[];
}

function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Cache the result of an async function (Next.js `unstable_cache`). Results
 * are JSON-serialized, so every call returns a fresh copy. The cache key is
 * `keyParts` (or the function source) plus the JSON-encoded arguments.
 */
export function unstable_cache<Args extends unknown[], R>(fn: (...args: Args) => Promise<R> | R, keyParts?: readonly string[], options: CacheOptions = {}): (...args: Args) => Promise<R> {
  const where = `unstable_cache(${keyParts?.join(", ") ?? fn.name ?? "anonymous"})`;
  const revalidate = validateRevalidate(options.revalidate, where);
  const tags = validateTags(options.tags, where);
  const base = keyParts && keyParts.length > 0 ? keyParts.join("\u0000") : `fn:${hashString(fn.toString())}`;
  return async (...args: Args): Promise<R> => {
    const parent = currentCacheScope();
    if (revalidate === 0) {
      track(parent, tags, 0);
      return fn(...args);
    }
    const key = `data:${base}:${JSON.stringify(args)}`;
    const inherited = parent?.implicitTags ?? [];
    const resolved = await getOrCompute(
      key,
      async () => {
        const child: CacheScope = { tags: new Set([...tags, ...inherited]), revalidate, implicitTags: inherited, waitUntil: parent?.waitUntil };
        const value = await runInCacheScope(child, () => fn(...args));
        const json = value === undefined ? null : JSON.stringify(value);
        return { value: json, tags: [...child.tags], revalidate: child.revalidate };
      },
      parent?.waitUntil,
    );
    track(parent, resolved.entry.tags, resolved.entry.revalidate);
    const json = resolved.entry.value as string | null;
    return (json === null ? undefined : JSON.parse(json)) as R;
  };
}

/** `unstable_cache` with an options object: `cache(fn, { key, tags, revalidate })`. */
export function cache<Args extends unknown[], R>(fn: (...args: Args) => Promise<R> | R, options: CacheOptions & { key?: string | string[] } = {}): (...args: Args) => Promise<R> {
  const key = options.key === undefined ? undefined : Array.isArray(options.key) ? options.key : [options.key];
  return unstable_cache(fn, key, options);
}

function after(promise: Promise<void>): Promise<void> {
  const scope = currentCacheScope();
  const p = promise.catch((error: unknown) => state().onError(error, "revalidate"));
  scope?.waitUntil?.(p);
  return p;
}

/**
 * Invalidate every entry tagged `tag`. By default the next request recomputes
 * in the foreground; pass `"max"` to serve the stale value while it refreshes.
 */
export function revalidateTag(tag: string | readonly string[], profile?: "max"): Promise<void> {
  const tags = typeof tag === "string" ? [tag] : [...tag];
  return after(Promise.resolve(state().store.markTags(tags, profile === "max" ? "stale" : "expire", cacheNow())));
}

export function normalizeCachePath(path: string): string {
  const p = (path.startsWith("/") ? path : `/${path}`).split(/[?#]/)[0] as string;
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

/** Tags a route entry carries: `_P:<path>` for itself and `_L:<prefix>` for every enclosing segment. */
export function implicitTags(pathname: string, pattern?: string): string[] {
  const out = new Set<string>();
  for (const p of pattern && pattern !== pathname ? [pathname, pattern] : [pathname]) {
    const path = normalizeCachePath(p);
    out.add(`_P:${path}`);
    out.add("_L:/");
    let prefix = "";
    for (const seg of path.split("/").filter(Boolean)) {
      prefix += `/${seg}`;
      out.add(`_L:${prefix}`);
    }
  }
  return [...out];
}

/**
 * Invalidate a cached path (`"page"`, the default) or everything below it
 * (`"layout"`). Dynamic patterns work too: `revalidatePath("/api/posts/[id]")`.
 */
export function revalidatePath(path: string, type: "page" | "layout" = "page"): Promise<void> {
  const p = normalizeCachePath(path);
  return after(Promise.resolve(state().store.markTags([type === "layout" ? `_L:${p}` : `_P:${p}`], "expire", cacheNow())));
}

export { validateRevalidate as __validateRevalidate };
