import type { StyledFrame } from "@textjs/core";
import type { ConsoleRoot } from "@textjs/react";
import { loadViewportChoice, VIEWPORT_CHOICE_KEY, type ViewportChoice } from "@textjs/react/dom";
import { exampleGrid, runsExamples } from "../docs/preview-meta";
import type { CompanionTab } from "./store";

/** The Home hero mirrors the console on the page, so Home keeps (at most) this shape. */
export const COMPANION_COLS = 100;
export const COMPANION_ROWS = 26;
export const TERMINAL_COLS = 80;
export const TERMINAL_ROWS = 30;

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
  // terminal.shop's ssh layout is a fixed 80 × 30 grid.
  if (tab === "terminal")
    return { minCols: TERMINAL_COLS, maxCols: TERMINAL_COLS, minRows: TERMINAL_ROWS, maxRows: TERMINAL_ROWS, fallbackCols: TERMINAL_COLS, fallbackRows: TERMINAL_ROWS };
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

/** Explicit console surfaces (live DevTools mirrors) that route keystrokes into the companion when clicked. */
export const ENGAGE_SELECTOR = "[data-console-engage]";

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
