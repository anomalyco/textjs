import type { StyledFrame } from "@textjs/core";
import type { ConsoleRoot } from "@textjs/react";
import { loadViewportChoice, VIEWPORT_CHOICE_KEY, type ViewportChoice } from "@textjs/react/dom";
import { exampleGrid, runsExamples } from "../docs/preview-meta";
import { isPadRoute, type CompanionTab } from "./store";

/** The Home hero mirrors the console on the page, so Home keeps (at most) this shape. */
export const COMPANION_COLS = 100;
export const COMPANION_ROWS = 26;
export const TERMINAL_COLS = 80;
export const TERMINAL_ROWS = 30;
export const TERMINAL_MIN_COLS = 10;
export const TERMINAL_MIN_ROWS = 6;

/**
 * The companion fills the docked DevTools console ("Fit console", the
 * default) unless the visitor picked a size on a pad. Home caps the fit at
 * the hero mirror's shape; elsewhere it uses the whole console.
 */
export function viewportLimitsFor(
  tab: CompanionTab,
  example: string | null = null,
): { minCols: number; maxCols: number; minRows: number; maxRows: number; fallbackCols: number; fallbackRows: number } {
  // An example gets exactly its grid, so the page can mirror it cell for cell.
  const grid = runsExamples(tab) && example !== null ? exampleGrid(example, tab) : null;
  if (grid) return { minCols: grid.cols, maxCols: grid.cols, minRows: grid.rows, maxRows: grid.rows, fallbackCols: grid.cols, fallbackRows: grid.rows };
  // terminal.shop follows the console like the ssh shop follows the terminal: its layouts change
  // below 80 and 50 columns, and under 20 × 10 it asks for a bigger window. 80 × 30 when unmeasurable.
  if (tab === "terminal")
    return { minCols: TERMINAL_MIN_COLS, maxCols: 200, minRows: TERMINAL_MIN_ROWS, maxRows: 60, fallbackCols: TERMINAL_COLS, fallbackRows: TERMINAL_ROWS };
  return tab === "home"
    ? { minCols: 40, maxCols: COMPANION_COLS, minRows: 12, maxRows: COMPANION_ROWS, fallbackCols: COMPANION_COLS, fallbackRows: COMPANION_ROWS }
    : { minCols: 40, maxCols: 200, minRows: 12, maxRows: 60, fallbackCols: 120, fallbackRows: 36 };
}

/** The Playground's "Console size" choice (also /opencode and /coffee). It keeps the original key, so earlier choices stay. */
export const PLAYGROUND_VIEWPORT_KEY = VIEWPORT_CHOICE_KEY;
export const LEARN_VIEWPORT_KEY = "textjs:viewport:learn";

/**
 * Where a page's "Console size" choice is kept: the Playground demos share one and Learn keeps its own.
 * Every other page (Home and its hero mirror, docs, blog) has no size control and always fits.
 */
export function viewportChoiceKey(tab: CompanionTab): string | null {
  if (tab === "playground" || tab === "opencode" || tab === "terminal") return PLAYGROUND_VIEWPORT_KEY;
  if (tab === "learn") return LEARN_VIEWPORT_KEY;
  return null;
}

export function viewportChoiceFor(tab: CompanionTab): ViewportChoice {
  const key = viewportChoiceKey(tab);
  return (key === null ? null : loadViewportChoice(key)) ?? "fit";
}

const EDITABLE = "input,textarea,select,[contenteditable=''],[contenteditable='true']";
/** Elements that own their keyboard input (sandboxes, search) and must never feed the companion. */
export const BYPASS_SELECTOR = `${EDITABLE},[data-console-bypass]`;

function isSink(el: Element | null): boolean {
  return el !== null && el.hasAttribute("data-textjs-input-sink");
}

/** Returns `true` when keystrokes should be routed into the console app right now. */
export function shouldRouteToConsole(active: Element | null, consoleInput: boolean): boolean {
  if (!consoleInput) return false;
  if (active === null || isSink(active)) return true;
  return active.closest(BYPASS_SELECTOR) === null;
}

/** Page controls that handle their own clicks: pressing one never engages the console by itself. */
export const INTERACTIVE_SELECTOR =
  'a[href],button,input,textarea,select,label,summary,[contenteditable],[role=button],[tabindex]:not([tabindex="-1"]),[data-textjs-interactive]';

/** A press on something that handles its own clicks (links, buttons, fields, the Console pill, search). */
export function isInteractivePress(target: EventTarget | null): boolean {
  const el = target as Element | null;
  return el !== null && typeof el.closest === "function" && el.closest(`${INTERACTIVE_SELECTOR},${BYPASS_SELECTOR}`) !== null;
}

/** A press that brings focus back counts within this long after the window's `focus` event. */
const REFOCUS_MS = 300;
let windowFocusedAt = -Infinity;

/** @internal Boot records each window `focus` event's time. */
export function noteWindowFocus(timeStamp: number): void {
  windowFocusedAt = timeStamp;
}

/**
 * Whether a press is the click that brought focus back to the page from DevTools or another
 * window, which only means "give the console the keyboard again". Browsers fire the window's
 * `focus` before or after that `mousedown`, so both orders count.
 */
export function isRefocusPress(e: { timeStamp: number }): boolean {
  if (typeof document !== "undefined" && typeof document.hasFocus === "function" && !document.hasFocus()) return true;
  return e.timeStamp - windowFocusedAt < REFOCUS_MS;
}

/** Explicit console surfaces (live DevTools mirrors) that route keystrokes into the companion when clicked. */
export const ENGAGE_SELECTOR = "[data-console-engage]";

/**
 * Whether pressing `target` routes keys into the console: an explicit console surface, or any
 * non-interactive part of the page wherever the focus hint can show (pad pages, or once keys go to
 * the console), so "Click the page" always works. Elsewhere the page stays a normal document.
 */
export function engagesConsole(target: Pick<Element, "closest">, consoleInput: boolean, pathname: string): boolean {
  if (target.closest(BYPASS_SELECTOR) !== null) return false;
  if (target.closest(ENGAGE_SELECTOR) !== null) return true;
  return (consoleInput || isPadRoute(pathname)) && target.closest(INTERACTIVE_SELECTOR) === null;
}

export type FrameListener = (frame: StyledFrame) => void;

export interface Companion {
  root: ConsoleRoot;
  engine: unknown;
  /** Latest styled snapshot (for inline DevTools mirrors). */
  getFrame(): StyledFrame | null;
  subscribeFrame(listener: FrameListener): () => void;
  /** Focus keyboard capture for the console app (used by "click to type" buttons). */
  activate(): void;
}

let companion: Companion | null = null;
let booting: Promise<Companion> | null = null;
const pending = new Set<FrameListener>();

export function getCompanion(): Companion | null {
  return companion;
}

/** Resolves once the companion has booted (`null` when it was never started, e.g. in tests). */
export function companionReady(): Promise<Companion> | null {
  return booting;
}

export function activateCompanion(): void {
  if (companion) companion.activate();
  else void booting?.then((c) => c.activate());
}

export function subscribeCompanionFrame(listener: FrameListener): () => void {
  if (companion) return companion.subscribeFrame(listener);
  pending.add(listener);
  let off: (() => void) | null = null;
  void booting?.then((c) => {
    if (pending.delete(listener)) off = c.subscribeFrame(listener);
  });
  return () => {
    pending.delete(listener);
    off?.();
  };
}

/** @internal Register the in-flight boot promise before `boot.tsx` finishes loading. */
export function setBootingCompanion(promise: Promise<Companion>): Promise<Companion> {
  if (!booting) booting = promise;
  return booting;
}

/** @internal Publish the booted companion instance and attach pending frame subscribers. */
export function registerBootedCompanion(c: Companion): void {
  companion = c;
  for (const l of pending) c.subscribeFrame(l);
  pending.clear();
}
