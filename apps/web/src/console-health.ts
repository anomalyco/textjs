/**
 * Footer and /status health for `console.log`, compared with the baseline captured at boot
 * (console-baseline.ts).
 *
 * The renderer looks `console.log` up on every frame, so reassigning it in DevTools really stops
 * the app from drawing. A replacement only counts as an outage when it provably can't pass frames
 * on. Wrappers that forward (Sentry, React DevTools, extensions injected after load) always contain
 * a call, so they stay operational. The check never calls `console.log`.
 */

import { useSyncExternalStore } from "react";
import { NATIVE_LOG } from "./console-baseline";
import { subscribeLocation } from "./router";

/** Strips comments and the parameter list; `null` when the shape isn't recognised. */
function functionBody(source: string): string | null {
  const src = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "").trim();
  const arrow = /^(?:async\s*)?(?:[\w$]+|\([^()]*\))\s*=>([\s\S]*)$/.exec(src);
  if (arrow) return arrow[1] as string;
  const fn = /^(?:async\s*)?(?:function\b\s*\*?\s*[\w$]*|[\w$]+)\s*\([^()]*\)\s*\{([\s\S]*)\}$/.exec(src);
  return fn ? (fn[1] as string) : null;
}

/**
 * Whether `fn` could pass its arguments on to the real console. `false` only for non-functions and
 * for JS functions whose body has no call, member access, `new`, template or `await`, such as
 * `() => {}`, `function () {}` or `() => undefined`.
 */
export function mayForward(fn: unknown): boolean {
  if (typeof fn !== "function") return false;
  let source: string;
  try {
    source = Function.prototype.toString.call(fn);
  } catch {
    return true;
  }
  if (/\{\s*\[native code\]\s*\}$/.test(source)) return true;
  const body = functionBody(source);
  if (body === null) return true;
  return /[(`.[]|\b(?:new|await|yield|import|super|this|arguments)\b/.test(body);
}

/** `true` once `console.log` has been replaced by something that can't reach the console. */
export function consoleLogDown(current: unknown, native: unknown): boolean {
  return current !== native && !mayForward(current);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("focus", onChange);
  const off = subscribeLocation(onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    off();
  };
}

const getSnapshot = (): boolean => consoleLogDown(console.log, NATIVE_LOG);
const getServerSnapshot = (): boolean => false;

/** Re-checked on mount, on every navigation and whenever the window regains focus. */
export function useConsoleLogDown(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
