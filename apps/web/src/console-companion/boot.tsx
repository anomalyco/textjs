/**
 * Boots the live console companion: a real `@textjs/react` ConsoleRoot that
 * renders into the visitor's DevTools console the moment textjs.org loads.
 */

import { extractStyledFrame, InputEngine, type StyledFrame } from "@textjs/core";
import { createConsoleRoot, type ConsoleRoot } from "@textjs/react";
import { applyViewportChoice, VIEWPORT_CHOICE_KEY, type ViewportChoice } from "@textjs/react/dom";
import { CompanionApp, CompanionFocusHint } from "./App";
import {
  activateCompanion,
  BYPASS_SELECTOR,
  COMPANION_COLS,
  COMPANION_ROWS,
  companionReady,
  ENGAGE_SELECTOR,
  engagesConsole,
  getCompanion,
  LEARN_VIEWPORT_KEY,
  noteWindowFocus,
  PLAYGROUND_VIEWPORT_KEY,
  registerBootedCompanion,
  setBootingCompanion,
  shouldRouteToConsole,
  subscribeCompanionFrame,
  TERMINAL_COLS,
  TERMINAL_ROWS,
  viewportChoiceFor,
  viewportChoiceKey,
  viewportLimitsFor,
  type Companion,
  type FrameListener,
} from "./bridge";
import { consoleRootErrors, report } from "../telemetry/capture";
import { siteStore, type CompanionTab } from "./store";
import { isCompanionTabLoaded, preloadCompanionTab } from "./tabs-loader";
import { viewportConsole } from "./viewport-console";

export {
  activateCompanion,
  BYPASS_SELECTOR,
  COMPANION_COLS,
  COMPANION_ROWS,
  companionReady,
  ENGAGE_SELECTOR,
  getCompanion,
  LEARN_VIEWPORT_KEY,
  PLAYGROUND_VIEWPORT_KEY,
  shouldRouteToConsole,
  subscribeCompanionFrame,
  TERMINAL_COLS,
  TERMINAL_ROWS,
  VIEWPORT_CHOICE_KEY,
  viewportChoiceFor,
  viewportChoiceKey,
  viewportLimitsFor,
  type Companion,
  type ViewportChoice,
};

/**
 * Called when the page changes: applies the new page's limits and, when it moves to another size scope,
 * that scope's choice. A size picked on the Playground then never follows the visitor to Home.
 */
export function followViewportScope(root: ConsoleRoot, from: CompanionTab, to: CompanionTab, example: string | null): void {
  root.renderer.viewport.configure(viewportLimitsFor(to, example));
  if (viewportChoiceKey(from) !== viewportChoiceKey(to)) applyViewportChoice(root, viewportChoiceFor(to));
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

const selectionCollapsed = (): boolean => {
  const s = typeof getSelection === "function" ? getSelection() : null;
  return s === null || s.isCollapsed;
};

const finePointer = (): boolean => typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches;
const touchFallback = (): boolean => typeof matchMedia === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches;

let bootStarted: Promise<Companion> | null = null;

export function bootCompanion(): Promise<Companion> {
  if (bootStarted) return bootStarted;
  const promise = (async () => {
    const engine = new GatedInputEngine(() => shouldRouteToConsole(document.activeElement, siteStore.getSnapshot().consoleInput));
    engine.attach();
    const initialSnap = siteStore.getSnapshot();
    const choice = viewportChoiceFor(initialSnap.tab);
    const limits = viewportLimitsFor(initialSnap.tab, initialSnap.example);
    const target = viewportConsole();
    const [root] = await Promise.all([
      createConsoleRoot({
        ...(choice === "fit" ? { responsive: true } : { width: choice.cols, height: choice.rows }),
        // The driver only turns the curtain on by default for the global console.
        ...(target ? { console: target, curtain: true } : {}),
        viewport: limits,
        input: engine,
        theme: initialSnap.theme,
        tabFocus: false,
        // CompanionFocusHint shows it only where clicking the page gives the console the keyboard.
        focusHint: false,
        identifierPrefix: "txc",
        ...consoleRootErrors,
      }),
      preloadCompanionTab(initialSnap.tab),
      initialSnap.example !== null ? preloadCompanionTab("example") : Promise.resolve(),
    ]);

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
        const from = tab;
        const nextTab = snap.tab;
        const nextExample = snap.example;
        tab = nextTab;
        example = nextExample;
        const needsTab = !isCompanionTabLoaded(nextTab);
        const needsEx = nextExample !== null && !isCompanionTabLoaded("example");
        if (needsTab || needsEx) {
          void Promise.all([
            needsTab ? preloadCompanionTab(nextTab) : Promise.resolve(),
            needsEx ? preloadCompanionTab("example") : Promise.resolve(),
          ]).then(
            () => {
              const cur = siteStore.getSnapshot();
              if (cur.tab === nextTab && cur.example === nextExample) {
                followViewportScope(root, from, nextTab, nextExample);
              }
            },
            (error: unknown) => report(error, "console"),
          );
        } else {
          followViewportScope(root, from, nextTab, nextExample);
        }
      }
    });

    let focusOnClick = false;
    document.addEventListener("mousedown", (e) => {
      const t = e.target as Element | null;
      focusOnClick = false;
      if (touchFallback()) return;
      if (!t || typeof t.closest !== "function") return;
      const snap = siteStore.getSnapshot();
      if (!engagesConsole(t, snap.consoleInput, snap.pathname)) return;
      siteStore.set({ consoleInput: true });
      focusOnClick = finePointer();
    });
    // The hidden input takes focus once the click is over, and only without a text selection, so
    // dragging or double-clicking to select text and ⌘C still work.
    document.addEventListener("click", () => {
      if (!focusOnClick) return;
      focusOnClick = false;
      // After the click: a click inside a selection collapses it only once the event is over.
      setTimeout(() => {
        if (selectionCollapsed()) engine.focus();
      }, 0);
    });
    window.addEventListener("focus", (e) => {
      noteWindowFocus(e.timeStamp);
      engine.setFocused(true);
    });
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

    // If the visitor navigated while createConsoleRoot was initializing, ensure the current tab is ready.
    const latestSnap = siteStore.getSnapshot();
    if (!isCompanionTabLoaded(latestSnap.tab)) await preloadCompanionTab(latestSnap.tab);
    if (latestSnap.example !== null && !isCompanionTabLoaded("example")) await preloadCompanionTab("example");

    root.render(
      <>
        <CompanionApp />
        <CompanionFocusHint />
      </>,
    );

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
    registerBootedCompanion(c);
    return c;
  })();
  bootStarted = promise;
  setBootingCompanion(promise);
  return promise;
}
