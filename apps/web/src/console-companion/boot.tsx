/**
 * Boots the live console companion: a real `@textjs/react` ConsoleRoot that
 * renders into the visitor's DevTools console the moment textjs.org loads.
 */

import { extractStyledFrame, InputEngine, type StyledFrame } from "@textjs/core";
import { createConsoleRoot, type ConsoleRoot } from "@textjs/react";
import { loadViewportChoice } from "@textjs/react/dom";
import { CompanionApp } from "./App";
import { siteStore, type CompanionTab } from "./store";
import { exampleGrid } from "./tabs/ExampleTab";
import { viewportConsole } from "./viewport-console";

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
  // A docs example gets exactly its preview's grid, so the page can mirror it cell for cell.
  const grid = tab === "docs" && example !== null ? exampleGrid(example) : null;
  if (grid) return { minCols: grid.cols, maxCols: grid.cols, minRows: grid.rows, maxRows: grid.rows, fallbackCols: grid.cols, fallbackRows: grid.rows };
  // terminal.shop's ssh layout is a fixed 80 × 30 grid.
  if (tab === "terminal")
    return { minCols: TERMINAL_COLS, maxCols: TERMINAL_COLS, minRows: TERMINAL_ROWS, maxRows: TERMINAL_ROWS, fallbackCols: TERMINAL_COLS, fallbackRows: TERMINAL_ROWS };
  return tab === "home"
    ? { minCols: 40, maxCols: COMPANION_COLS, minRows: 12, maxRows: COMPANION_ROWS, fallbackCols: COMPANION_COLS, fallbackRows: COMPANION_ROWS }
    : { minCols: 40, maxCols: 200, minRows: 12, maxRows: 60, fallbackCols: 120, fallbackRows: 36 };
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

/**
 * An InputEngine that coexists with the website: keystrokes inside page form
 * fields (⌘K search, playground editor, sandboxes) or while the visitor has
 * paused console input are left alone.
 */
export class GatedInputEngine extends InputEngine {
  constructor(gate: () => boolean) {
    // While the gate is closed the host page keeps every default (Tab, Space, PageDown, paste).
    super({ autoFocus: false, refocusOnClick: false, wheel: false, shouldCapture: gate });
  }
}

/** Explicit console surfaces (live DevTools mirrors) that route keystrokes into the companion when clicked. */
export const ENGAGE_SELECTOR = "[data-console-engage]";

type FrameListener = (frame: StyledFrame) => void;

export interface Companion {
  root: ConsoleRoot;
  engine: GatedInputEngine;
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

const finePointer = (): boolean => typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches;

export function bootCompanion(): Promise<Companion> {
  if (booting) return booting;
  booting = (async () => {
    const engine = new GatedInputEngine(() => shouldRouteToConsole(document.activeElement, siteStore.getSnapshot().consoleInput));
    engine.attach();
    const choice = loadViewportChoice() ?? "fit";
    const limits = viewportLimitsFor(siteStore.getSnapshot().tab, siteStore.getSnapshot().example);
    const target = viewportConsole();
    const root = await createConsoleRoot({
      ...(choice === "fit" ? { responsive: true } : { width: choice.cols, height: choice.rows }),
      // The driver only turns the curtain on by default for the global console.
      ...(target ? { console: target, curtain: true } : {}),
      viewport: limits,
      input: engine,
      theme: siteStore.getSnapshot().theme,
      tabFocus: false,
      identifierPrefix: "txc",
    });

    let wireframe = siteStore.getSnapshot().wireframe;
    root.renderer.setWireframe(wireframe);
    // `text.wireframe()` goes through the store too, so the inspect button stays in sync.
    const repl = (globalThis as { text?: { wireframe?: (enabled?: boolean) => boolean } }).text;
    if (repl?.wireframe) {
      repl.wireframe = (enabled) => {
        const next = enabled ?? !siteStore.getSnapshot().wireframe;
        siteStore.set({ wireframe: next });
        return next;
      };
    }
    let theme = siteStore.getSnapshot().theme;
    let tab = siteStore.getSnapshot().tab;
    let example = siteStore.getSnapshot().example;
    siteStore.subscribe(() => {
      const snap = siteStore.getSnapshot();
      if (snap.wireframe !== wireframe) {
        wireframe = snap.wireframe;
        root.renderer.setWireframe(wireframe);
      }
      if (snap.theme !== theme) {
        theme = snap.theme;
        root.setTheme(snap.theme);
      }
      if (snap.tab !== tab || snap.example !== example) {
        tab = snap.tab;
        example = snap.example;
        root.renderer.viewport.configure(viewportLimitsFor(tab, example));
      }
    });

    // Only clicking an explicit console surface routes keys into the console;
    // the page background stays a normal, selectable, scrollable document.
    document.addEventListener("mousedown", (e) => {
      const t = e.target as Element | null;
      if (!t || typeof t.closest !== "function") return;
      if (t.closest(ENGAGE_SELECTOR) === null || t.closest(BYPASS_SELECTOR) !== null) return;
      siteStore.set({ consoleInput: true });
      if (finePointer()) setTimeout(() => engine.focus(), 0);
    });
    window.addEventListener("focus", () => engine.setFocused(true));
    window.addEventListener("blur", () => engine.setFocused(false));

    const listeners = new Set<FrameListener>();
    let latest: StyledFrame | null = null;
    let scheduled = false;
    const publish = (): void => {
      scheduled = false;
      if (root.unmounted || siteStore.getSnapshot().teamEgg !== null) return;
      latest = extractStyledFrame(root.renderer.buffer);
      for (const l of listeners) l(latest);
    };
    root.onFrame((frame) => {
      // A teammate's view stays in DevTools: the page's mirrors keep the last regular frame.
      if (frame.skipped || listeners.size === 0 || scheduled || siteStore.getSnapshot().teamEgg !== null) return;
      // Microtask, not rAF: inline mirrors update in the same task as the keypress.
      scheduled = true;
      queueMicrotask(publish);
    });

    root.render(<CompanionApp />);

    const c: Companion = {
      root,
      engine,
      getFrame: () => latest ?? (root.unmounted || siteStore.getSnapshot().teamEgg !== null ? null : (latest = extractStyledFrame(root.renderer.buffer))),
      subscribeFrame(listener) {
        listeners.add(listener);
        listener(c.getFrame() as StyledFrame);
        return () => listeners.delete(listener);
      },
      activate() {
        siteStore.set({ consoleInput: true });
        engine.setFocused(true);
        engine.focus();
      },
    };
    companion = c;
    for (const l of pending) c.subscribeFrame(l);
    pending.clear();
    return c;
  })();
  return booting;
}
