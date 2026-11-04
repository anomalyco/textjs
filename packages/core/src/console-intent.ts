/**
 * Signals that a visitor wants the console, so a page can load and boot its
 * app only then. React-free and Yoga-free, for bootstrap scripts that run
 * before the app bundle has downloaded.
 */

import { analyzeDock, CHROME_STORAGE_KEY, MAX_CHROME_PX } from "./dock";

/**
 * - `dock`: DevTools is docked, on load or after a window resize.
 * - `shortcut`: a DevTools shortcut was pressed on the page: F12, `Ctrl+Shift+J`/`I`/`C`/`K`, or
 *   `⌘⌥J`/`I`/`C`/`K` on a Mac. This also catches DevTools opening in its own window.
 * - `engage`: a primary press or keyboard click on an `engageSelector` surface, or a
 *   `textjs:engage` event (`<ViewportControl>` dispatches one when a size is picked before boot).
 * - `session`: one of the above already happened in this tab (see `persist`).
 * - `manual`: `handle.trigger()` was called without a reason.
 */
export type ConsoleIntentReason = "dock" | "shortcut" | "engage" | "session" | "manual";

export interface ConsoleIntentEvent {
  reason: ConsoleIntentReason;
}

export interface ConsoleIntentOptions {
  /**
   * CSS selector for explicit console surfaces whose primary press or click
   * signals `"engage"` (default `"[data-textjs-engage], [data-textjs-focus-pad], text-console"`).
   * Pass `false` to disable delegated DOM listeners.
   */
  engageSelector?: string | false;
  /**
   * Remember intent in `sessionStorage` (`CONSOLE_INTENT_KEY`) for this tab
   * once `"dock"`, `"shortcut"` or `"engage"` fires, so reloads and same-tab
   * OAuth redirects with undocked DevTools re-boot immediately (default `true`).
   */
  persist?: boolean;
  /**
   * Optional warmup callback (e.g. `() => void import("./boot")`), called at most
   * once when `canPrefetchConsole()` is `true`:
   * - on `pointerover` or `focusin` of `engageSelector`
   * - and, when `idlePrefetch` is `true`, during `requestIdleCallback` after `load`.
   */
  prefetch?: () => void;
  /** Also invoke `prefetch` on browser idle after `load` when `canPrefetchConsole()` allows (default `false`). */
  idlePrefetch?: boolean;
  /** Injected window for unit tests (defaults to `globalThis.window`). */
  window?: Window & typeof globalThis;
}

export interface ConsoleIntentHandle {
  readonly triggered: boolean;
  /** Imperatively fire intent (default reason `"manual"`). */
  trigger(reason?: ConsoleIntentReason): void;
  /** Remove listeners and idle timers. */
  dispose(): void;
}

/** The `sessionStorage` key that remembers intent for a tab. */
export const CONSOLE_INTENT_KEY = "textjs:console-intent";
/**
 * `globalThis[CONSOLE_OWNER]` is set by whatever renders into the page's
 * console first: a `ConsoleRenderer` on the global console, or an embed
 * script. Everything else checks it, so two apps never interleave frames.
 */
export const CONSOLE_OWNER: unique symbol = Symbol.for("textjs.consoleOwner");
const DEFAULT_ENGAGE = "[data-textjs-engage], [data-textjs-focus-pad], text-console";
const COARSE = "(hover: none) and (pointer: coarse)";
/** Matches `activateFocusPad`: presses on a surface's own controls keep their defaults. */
const INTERACTIVE = "a,button,input,textarea,select,label,summary,[contenteditable],[data-focus-pad-ignore]";

function isMac(win: Window): boolean {
  return /Mac|iPhone|iPad/.test(win.navigator?.platform || win.navigator?.userAgent);
}

/**
 * Whether a keydown opens DevTools in Chrome, Edge, Firefox or Safari. Letters match by physical
 * key or by character, since ⌥ turns `e.key` into `∆` on a Mac and other layouts move the letters.
 */
export function isDevToolsShortcut(e: Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">, mac: boolean): boolean {
  if (e.key === "F12" || e.code === "F12") return !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
  const mods = mac ? e.metaKey && e.altKey && !e.ctrlKey && !e.shiftKey : e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey;
  return mods && (/^Key[JICK]$/.test(e.code) || /^[jick]$/i.test(e.key));
}

function defaultWindow(): (Window & typeof globalThis) | null {
  return typeof window !== "undefined" ? window : null;
}

function matches(win: Window, query: string): boolean {
  return win.matchMedia?.(query).matches === true;
}

/** Read `key`, or write it when `value` is given. Blocked or full storage reads as `null`. */
function store(win: Window, kind: "localStorage" | "sessionStorage", key: string, value?: string): string | null {
  try {
    if (value === undefined) return win[kind].getItem(key);
    win[kind].setItem(key, value);
  } catch {
    // Storage may be missing, full or blocked.
  }
  return null;
}

/** True only on non-touch fine-pointer desktops without `saveData` or slow (< 4g) connections. */
export function canPrefetchConsole(w?: Window): boolean {
  const win = w ?? defaultWindow();
  if (!win || matches(win, COARSE) || !matches(win, "(pointer: fine)")) return false;
  const connection = (win.navigator as { connection?: { saveData?: boolean; effectiveType?: string } } | undefined)?.connection;
  if (connection?.saveData === true) return false;
  return connection?.effectiveType === undefined || connection.effectiveType === "4g";
}

/**
 * Call `onIntent` once, the first time the visitor shows they want the console:
 * DevTools docks, they press a DevTools shortcut, or they press a console
 * surface. DevTools opened in its own window from a menu can't be seen from
 * the page, so those visitors boot through a surface, and `persist` keeps
 * later loads in the same tab booting at once. On touch screens nothing fires
 * automatically and no listeners are added. Call `trigger()` from your own control.
 *
 * Signals already present (a docked panel, a remembered session) call
 * `onIntent` before this function returns.
 */
export function onConsoleIntent(onIntent: (event: ConsoleIntentEvent) => void, options: ConsoleIntentOptions = {}): ConsoleIntentHandle {
  const win = options.window ?? defaultWindow();
  const persist = win !== null && options.persist !== false;
  let triggered = false;
  let disposed = false;
  const cleanup: Array<() => void> = [];

  const detach = (): void => {
    for (const fn of cleanup.splice(0)) fn();
  };

  const trigger = (reason: ConsoleIntentReason = "manual"): void => {
    if (triggered || disposed) return;
    triggered = true;
    detach();
    if (persist && win && reason !== "manual") store(win, "sessionStorage", CONSOLE_INTENT_KEY, "1");
    onIntent({ reason });
  };

  const handle: ConsoleIntentHandle = {
    get triggered() {
      return triggered;
    },
    trigger,
    dispose() {
      disposed = true;
      detach();
    },
  };
  if (!win || matches(win, COARSE)) return handle;

  const listen = (target: EventTarget | null | undefined, type: string, fn: (e: Event) => void, capture = false): void => {
    if (!target) return;
    target.addEventListener(type, fn, { capture, passive: true });
    cleanup.push(() => target.removeEventListener(type, fn, capture));
  };

  const stored = Number(store(win, "localStorage", CHROME_STORAGE_KEY) ?? NaN);
  let chrome = stored >= 0 && stored <= MAX_CHROME_PX ? stored : undefined;
  const checkDock = (): void => {
    const a = analyzeDock(win, chrome);
    if (a.dock !== "undocked") return trigger("dock");
    if (a.chromeSample !== null && a.chromeSample !== chrome) {
      chrome = a.chromeSample;
      store(win, "localStorage", CHROME_STORAGE_KEY, String(chrome));
    }
  };
  const check = (): void => {
    checkDock();
    if (!triggered && persist && store(win, "sessionStorage", CONSOLE_INTENT_KEY) === "1") trigger("session");
  };

  check();
  if (triggered) return handle;
  listen(win, "resize", checkDock);
  // A page restored from the back/forward cache keeps its state but may come back docked or to a remembered tab.
  listen(win, "pageshow", (e) => {
    if ((e as PageTransitionEvent).persisted) check();
  });
  // Observed only: the browser still opens DevTools.
  listen(
    win,
    "keydown",
    (e) => {
      if (isDevToolsShortcut(e as KeyboardEvent, isMac(win))) trigger("shortcut");
    },
    true,
  );

  const engage = options.engageSelector ?? DEFAULT_ENGAGE;
  const doc = win.document;
  const surfaceOf = (e: Event): Element | null | undefined => {
    const t = e.target as Element | null;
    const surface = t?.closest?.(engage as string);
    const control = surface && t!.closest(INTERACTIVE);
    return control && control !== surface && !control.matches("[data-textjs-engage]") ? null : surface;
  };
  if (engage !== false) {
    listen(
      doc,
      "mousedown",
      (e) => {
        const m = e as MouseEvent;
        if (m.button === 0 && !(m.ctrlKey && isMac(win)) && surfaceOf(e)) trigger("engage");
      },
      true,
    );
    // Enter or Space on a focused surface; pointer clicks already counted on mousedown.
    listen(
      doc,
      "click",
      (e) => {
        if ((e as MouseEvent).detail === 0 && surfaceOf(e)) trigger("engage");
      },
      true,
    );
    listen(doc, "textjs:engage", () => trigger("engage"));
  }

  const prefetch = options.prefetch;
  if (prefetch) {
    let warmed = false;
    const warm = (): void => {
      if (warmed || triggered || disposed || !canPrefetchConsole(win)) return;
      warmed = true;
      prefetch();
    };
    if (engage !== false) {
      const onHover = (e: Event): void => {
        if ((e.target as Element | null)?.closest?.(engage)) warm();
      };
      listen(doc, "pointerover", onHover, true);
      listen(doc, "focusin", onHover, true);
    }
    if (options.idlePrefetch) {
      const ric = typeof win.requestIdleCallback === "function";
      let id: number | undefined;
      const schedule = (): void => {
        id = ric ? win.requestIdleCallback(warm, { timeout: 5000 }) : (setTimeout(warm, 1) as unknown as number);
      };
      cleanup.push(() => (ric ? win.cancelIdleCallback(id!) : clearTimeout(id)));
      if (doc?.readyState === "complete") schedule();
      else listen(win, "load", schedule);
    }
  }

  return handle;
}
