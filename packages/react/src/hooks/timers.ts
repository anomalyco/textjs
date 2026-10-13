/**
 * Timers and frame-paced animation loops. Loops share one timer per interval
 * and stop while console output is paused (`window.text.pause()`), so idle
 * apps keep logging nothing.
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import type { ConsoleRenderer } from "@textjs/core";
import { useRuntime } from "../context";
import { useViewport } from "../hooks";

/** Run `callback` every `delay` ms. Pass `null` to stop. The latest callback is always used. */
export function useInterval(callback: () => void, delay: number | null): void {
  const ref = useRef(callback);
  useLayoutEffect(() => {
    ref.current = callback;
  });
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => ref.current(), Math.max(0, delay));
    return () => clearInterval(id);
  }, [delay]);
}

/** Run `callback` once after `delay` ms. Pass `null` to cancel. Restarts when `delay` changes. */
export function useTimeout(callback: () => void, delay: number | null): void {
  const ref = useRef(callback);
  useLayoutEffect(() => {
    ref.current = callback;
  });
  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => ref.current(), Math.max(0, delay));
    return () => clearTimeout(id);
  }, [delay]);
}

interface Ticker {
  id: ReturnType<typeof setInterval>;
  listeners: Set<(now: number) => void>;
}

const tickers = new Map<number, Ticker>();

const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Subscribe to a shared interval timer (one `setInterval` per distinct interval). */
export function subscribeTicker(interval: number, listener: (now: number) => void): () => void {
  let t = tickers.get(interval);
  if (t === undefined) {
    const listeners = new Set<(now: number) => void>();
    const id = setInterval(() => {
      const ts = now();
      for (const fn of listeners) fn(ts);
    }, interval);
    t = { id, listeners };
    tickers.set(interval, t);
  }
  t.listeners.add(listener);
  return () => {
    const cur = tickers.get(interval);
    if (!cur) return;
    cur.listeners.delete(listener);
    if (cur.listeners.size === 0) {
      clearInterval(cur.id);
      tickers.delete(interval);
    }
  };
}

/** Number of live shared tickers (tests and diagnostics). */
export function activeTickerCount(): number {
  return tickers.size;
}

/**
 * The renderer's frame interval in ms: frames closer together than this are
 * coalesced (DevTools paints ~15fps), so animating faster only burns CPU.
 */
export function frameIntervalOf(renderer: ConsoleRenderer): number {
  const v = (renderer as unknown as { frameInterval?: number }).frameInterval;
  return typeof v === "number" && v > 0 ? v : 16;
}

export interface UseAnimationFrameOptions {
  /** Run the loop (default `true`). */
  isActive?: boolean;
  /** Override the tick rate (default: the renderer's frame pacing, ~15fps in DevTools). */
  fps?: number;
}

/**
 * Call `callback(deltaMs, elapsedMs)` once per renderer frame slot while
 * active. Stops while output is paused.
 */
export function useAnimationFrame(callback: (delta: number, elapsed: number) => void, options: UseAnimationFrameOptions = {}): void {
  const rt = useRuntime();
  const vp = useViewport();
  const ref = useRef(callback);
  useLayoutEffect(() => {
    ref.current = callback;
  });
  const running = (options.isActive ?? true) && !vp.paused;
  const interval = options.fps ? Math.max(1, Math.round(1000 / options.fps)) : frameIntervalOf(rt.renderer);
  useEffect(() => {
    if (!running) return;
    const start = now();
    let last = start;
    return subscribeTicker(interval, (ts) => {
      const dt = ts - last;
      last = ts;
      ref.current(dt, ts - start);
    });
  }, [running, interval]);
}
