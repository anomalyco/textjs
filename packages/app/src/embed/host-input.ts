/**
 * Keyboard input for an app embedded in someone else's page. Keys reach the
 * app only once the visitor engages it, and never while they type in the
 * page's own fields. Until then the page keeps Tab, Space, the arrow keys and
 * paste. The wheel always scrolls the page.
 */

import { InputEngine } from "@textjs/core";
import { engageSurfaceOf, isMac } from "@textjs/core/internal";

/** Pressing one of these routes keys to the app. */
export const ENGAGE_SELECTOR = "[data-textjs-engage], [data-textjs-focus-pad], text-console";
/** Elements that keep their own keyboard input, and pressing one hands keys back to the page. */
export const BYPASS_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-textjs-bypass]';
const INTERACTIVE = `a[href], button, label, summary, [role=button], [tabindex]:not([tabindex="-1"]), [data-focus-pad-ignore], ${BYPASS_SELECTOR}`;
/** A press within this long of the window regaining focus is the click that brings focus back from DevTools. */
const REFOCUS_MS = 300;

export interface HostInput {
  readonly engine: InputEngine;
  /** Whether keys go to the app: the visitor engaged it and no field of the page has focus. */
  readonly engaged: boolean;
  /** Route keys to the app and focus its input. */
  engage(): void;
  dispose(): void;
}

export interface HostInputOptions {
  /** Start engaged (the visitor pressed a console surface to open it). Default `false`. */
  engaged?: boolean;
  /**
   * Focus left the page for DevTools before this input started (`ConsoleIntentEvent.away()`). When the
   * page has it back already, the visitor returned while the app loaded, so their next press on the
   * page counts as the click that brings focus back from DevTools. Default `false`.
   */
  away?: boolean;
  document?: Document;
}

/**
 * An attached `InputEngine` gated for a host page. The visitor engages it by
 * pressing a {@link ENGAGE_SELECTOR} surface, or by clicking the page (not a
 * link, button or field) to bring focus back from DevTools. Pressing anything
 * else on the page while it has focus hands the keyboard back.
 */
export function createHostInput(options: HostInputOptions = {}): HostInput {
  const doc = options.document ?? document;
  const win = doc.defaultView;
  // The visitor may have moved on to one of the page's fields while the app was loading: the field keeps the keyboard.
  let open = options.engaged === true && doc.activeElement?.closest(BYPASS_SELECTOR) == null;
  const routes = (): boolean => {
    if (!open) return false;
    const active = doc.activeElement;
    return active === null || active.hasAttribute("data-textjs-input-sink") || active.closest(BYPASS_SELECTOR) === null;
  };
  const engine = new InputEngine({ document: doc, autoFocus: false, refocusOnClick: false, wheel: false, shouldCapture: routes });
  engine.attach();
  let focusedAt = -Infinity;
  // The focus listener below wasn't there yet when the visitor came back.
  let returned = options.away === true && doc.hasFocus();
  let focusAfterClick = false;
  const engage = (): void => {
    open = true;
    engine.focus();
  };
  const onFocus = (e: Event): void => {
    focusedAt = e.timeStamp;
  };
  const onDown = (e: MouseEvent): void => {
    focusAfterClick = false;
    const t = e.target as Element | null;
    // Ctrl+click is a right click on a Mac.
    if (e.button !== 0 || (e.ctrlKey && win !== null && isMac(win)) || typeof t?.closest !== "function") return;
    const refocus = returned || !doc.hasFocus() || e.timeStamp - focusedAt < REFOCUS_MS;
    returned = false;
    // As onConsoleIntent counts presses: a surface's own links, buttons and fields keep theirs.
    open = t.closest(BYPASS_SELECTOR) === null && (engageSurfaceOf(t, ENGAGE_SELECTOR) !== null || (refocus && t.closest(INTERACTIVE) === null));
    focusAfterClick = open;
  };
  const onClick = (e: MouseEvent): void => {
    // Enter or Space on a focused surface.
    if (e.detail === 0 && engageSurfaceOf(e.target, ENGAGE_SELECTOR) && (e.target as Element).closest(BYPASS_SELECTOR) == null) return engage();
    if (!focusAfterClick) return;
    focusAfterClick = false;
    // Once the click is over, and only without a text selection, so drag-to-select and copy still work.
    setTimeout(() => {
      if (open && win?.getSelection()?.isCollapsed !== false) engine.focus();
    }, 0);
  };
  doc.addEventListener("mousedown", onDown, true);
  doc.addEventListener("click", onClick, true);
  win?.addEventListener("focus", onFocus);
  if (open) engine.focus();
  return {
    engine,
    // Not only pressed: focus that moved into one of the page's fields (Tab, autofocus, a dialog) has the keys.
    get engaged() {
      return routes();
    },
    engage,
    dispose() {
      doc.removeEventListener("mousedown", onDown, true);
      doc.removeEventListener("click", onClick, true);
      win?.removeEventListener("focus", onFocus);
      engine.detach();
    },
  };
}
