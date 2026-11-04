import type { StyledFrame } from "@textjs/core";
import type { ConsoleRoot } from "@textjs/react";
import { loadViewportChoice, VIEWPORT_CHOICE_KEY, type ViewportChoice } from "@textjs/react/dom";
import { exampleGrid, runsExamples } from "../docs/preview-meta";
import { isPadRoute, siteStore, type CompanionTab } from "./store";

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
export const ENGAGE_SELECTOR = "[data-textjs-engage]";

/** Buttons that start the console when clicked (the Console pill, "Run in console", the hero's inspect button). Hovering one downloads the companion. */
export const COMPANION_CONTROLS = ".console-pill,.preview-run,.dt-inspect";

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
let loader: (() => Promise<Companion>) | null = null;
const booted = new Set<(c: Companion) => void>();

export function getCompanion(): Companion | null {
  return companion;
}

/** Resolves once the companion has booted (`null` until something starts it, and always in tests). */
export function companionReady(): Promise<Companion> | null {
  return booting;
}

/** @internal `main.tsx` registers how to load and boot the companion, which happens on the visitor's first sign of intent. */
export function configureCompanionLoader(load: (() => Promise<Companion>) | null): void {
  loader = load;
}

/** Whether this page can boot a companion (the site's client registered a loader, or one is already booting). */
export function isCompanionConfigured(): boolean {
  return loader !== null || booting !== null;
}

/** Start the companion if it hasn't started, and resolve once it has booted (`null` without a loader). */
export function ensureCompanion(): Promise<Companion> | null {
  if (booting || !loader) return booting;
  const promise = loader();
  booting = promise;
  // A failed load (a chunk gone after a deploy, say) can be retried by the next intent.
  promise.catch(() => {
    if (booting === promise) booting = null;
  });
  return promise;
}

export function activateCompanion(): void {
  if (companion) return companion.activate();
  const boot = ensureCompanion();
  if (!boot) return;
  // Engaged from the click on: the overlay hides and keys pressed while it loads are kept (main.tsx).
  siteStore.set({ consoleInput: true });
  void boot.then(
    (c) => c.activate(),
    () => siteStore.set({ consoleInput: false }),
  );
}

/** Call `listener` with the companion once it has booted (now, if it already has). Doesn't start it. */
export function subscribeCompanion(listener: (c: Companion) => void): () => void {
  if (companion) {
    listener(companion);
    return () => undefined;
  }
  booted.add(listener);
  return () => booted.delete(listener);
}

export function subscribeCompanionFrame(listener: FrameListener): () => void {
  if (companion) return companion.subscribeFrame(listener);
  let off: (() => void) | null = null;
  const unsubscribe = subscribeCompanion((c) => {
    off = c.subscribeFrame(listener);
  });
  return () => {
    unsubscribe();
    off?.();
  };
}

/** @internal Register the in-flight boot promise before `boot.tsx` finishes loading. */
export function setBootingCompanion(promise: Promise<Companion>): Promise<Companion> {
  if (!booting) booting = promise;
  return booting;
}

/** @internal Publish the booted companion instance and notify everything waiting for it. */
export function registerBootedCompanion(c: Companion): void {
  companion = c;
  const waiting = [...booted];
  booted.clear();
  for (const l of waiting) l(c);
}
