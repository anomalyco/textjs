/**
 * Responsive breakpoints, clipboard and persisted state.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useViewport } from "../hooks";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

/** Minimum console columns per breakpoint. */
export const BREAKPOINTS: Readonly<Record<Breakpoint, number>> = Object.freeze({ xs: 0, sm: 60, md: 80, lg: 110, xl: 140 });

const ORDER: readonly Breakpoint[] = ["xs", "sm", "md", "lg", "xl"];

export interface BreakpointApi {
  /** The largest breakpoint whose minimum the console width meets. */
  breakpoint: Breakpoint;
  cols: number;
  rows: number;
  /** `cols >= breakpoints[bp]`. */
  up(bp: Breakpoint): boolean;
  /** `cols < breakpoints[bp]`. */
  down(bp: Breakpoint): boolean;
}

/** Responsive layout by console width (cells, not pixels). */
export function useBreakpoint(breakpoints: Partial<Record<Breakpoint, number>> = {}): BreakpointApi {
  const { cols, rows } = useViewport();
  const sm = breakpoints.sm ?? BREAKPOINTS.sm;
  const md = breakpoints.md ?? BREAKPOINTS.md;
  const lg = breakpoints.lg ?? BREAKPOINTS.lg;
  const xl = breakpoints.xl ?? BREAKPOINTS.xl;
  return useMemo(() => {
    const table: Record<Breakpoint, number> = { xs: 0, sm, md, lg, xl };
    let bp: Breakpoint = "xs";
    for (const name of ORDER) if (cols >= table[name]) bp = name;
    return {
      breakpoint: bp,
      cols,
      rows,
      up: (b: Breakpoint) => cols >= table[b],
      down: (b: Breakpoint) => cols < table[b],
    };
  }, [cols, rows, sm, md, lg, xl]);
}

export interface UseClipboardOptions {
  /** How long `copied` stays `true` (default `1500` ms). */
  timeout?: number;
}

export interface ClipboardApi {
  /** Write text to the clipboard. Resolves `false` when unavailable or denied. */
  copy(text: string): Promise<boolean>;
  /** `true` for `timeout` ms after a successful copy. */
  copied: boolean;
}

/** Copy to the system clipboard with a transient `copied` flag. */
export function useClipboard(options: UseClipboardOptions = {}): ClipboardApi {
  const timeout = options.timeout ?? 1500;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
      if (!clip?.writeText) return false;
      try {
        await clip.writeText(text);
      } catch {
        return false;
      }
      setCopied(true);
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), timeout);
      return true;
    },
    [timeout],
  );
  return useMemo(() => ({ copy, copied }), [copy, copied]);
}

type Setter<T> = (value: T | ((prev: T) => T)) => void;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memory = new Map<string, string>();
const memoryStorage: StorageLike = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

function getStorage(): StorageLike {
  try {
    if (typeof localStorage !== "undefined" && localStorage !== null) return localStorage;
  } catch {
    // Storage access can throw (sandboxed iframes, disabled cookies).
  }
  return memoryStorage;
}

const keyListeners = new Map<string, Set<() => void>>();

function notify(key: string): void {
  const set = keyListeners.get(key);
  if (set) for (const l of set) l();
}

function subscribeKey(key: string, l: () => void): () => void {
  let set = keyListeners.get(key);
  if (!set) {
    set = new Set();
    keyListeners.set(key, set);
  }
  set.add(l);
  const onStorage = (e: { key: string | null }): void => {
    if (e.key === key || e.key === null) l();
  };
  const win = typeof window !== "undefined" ? window : null;
  win?.addEventListener("storage", onStorage as unknown as EventListener);
  return () => {
    set.delete(l);
    if (set.size === 0) keyListeners.delete(key);
    win?.removeEventListener("storage", onStorage as unknown as EventListener);
  };
}

/**
 * `useState` persisted to `localStorage` as JSON (in-memory outside the
 * browser). Hooks sharing a key stay in sync, across tabs too.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, Setter<T>, () => void] {
  const initial = useRef(initialValue);
  const parsed = useRef<{ raw: string | null; value: T }>({ raw: null, value: initialValue });
  const getSnapshot = useCallback((): T => {
    const raw = getStorage().getItem(key);
    if (raw === null) return initial.current;
    if (raw === parsed.current.raw) return parsed.current.value;
    let value: T;
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = initial.current;
    }
    parsed.current = { raw, value };
    return value;
  }, [key]);
  const subscribe = useCallback((l: () => void) => subscribeKey(key, l), [key]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const set = useCallback<Setter<T>>(
    (next) => {
      const prev = getSnapshot();
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        getStorage().setItem(key, JSON.stringify(v));
      } catch {
        // Quota exceeded: keep the previous persisted value.
      }
      notify(key);
    },
    [key, getSnapshot],
  );
  const remove = useCallback(() => {
    getStorage().removeItem(key);
    notify(key);
  }, [key]);
  return [value, set, remove];
}
