/** The cart: lines in localStorage, shared by every merch page through useSyncExternalStore. */
import { useSyncExternalStore } from "react";
import type { CartLine } from "./config";

const KEY = "textjs-merch-cart";
const EMPTY: readonly CartLine[] = [];
let lines: readonly CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed))
      lines = parsed.filter((l): l is CartLine => typeof l?.slug === "string" && typeof l?.size === "string" && Number.isInteger(l?.quantity) && l.quantity > 0);
  } catch {
    lines = EMPTY;
  }
}

function set(next: readonly CartLine[]): void {
  lines = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage full: the cart still works for this page view.
  }
  for (const l of listeners) l();
}

const same = (a: Omit<CartLine, "quantity">, b: Omit<CartLine, "quantity">): boolean => a.slug === b.slug && a.size === b.size;

export const cart = {
  get(): readonly CartLine[] {
    load();
    return lines;
  },
  add(line: Omit<CartLine, "quantity">, quantity = 1): void {
    load();
    const found = lines.find((l) => same(l, line));
    set(found ? lines.map((l) => (l === found ? { ...l, quantity: l.quantity + quantity } : l)) : [...lines, { ...line, quantity }]);
  },
  setQuantity(line: Omit<CartLine, "quantity">, quantity: number): void {
    load();
    set(quantity < 1 ? lines.filter((l) => !same(l, line)) : lines.map((l) => (same(l, line) ? { ...l, quantity } : l)));
  },
  clear(): void {
    set(EMPTY);
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Cart lines; empty during prerender and hydration, so server and client markup match. */
export function useCart(): readonly CartLine[] {
  return useSyncExternalStore(cart.subscribe, cart.get, () => EMPTY);
}
