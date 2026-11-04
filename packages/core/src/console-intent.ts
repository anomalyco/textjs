/**
 * Signals that a visitor wants the console, so a page can load and boot its
 * app only then. React-free and Yoga-free, for bootstrap scripts that run
 * before the app bundle has downloaded.
 */

import { analyzeDock, CHROME_STORAGE_KEY, VIEWPORT_DEFAULTS } from "./viewport";

/**
 * - `dock`: DevTools is docked, on load or after a window resize.
 * - `shortcut`: a DevTools shortcut was pressed on the page (`F12`, `⌘⌥J`/`I`/`C`/`K` on macOS,
 *   `Ctrl+Shift+J`/`I`/`C`/`K` elsewhere), which also catches DevTools opening in its own window.
 * - `engage`: a primary press or keyboard click on an `engageSelector` surface.
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
   * signals `"engage"` (default `"[data-textjs-engage], [data-textjs-focus-pad]"`).
   * Pass `false` to disable delegated DOM listeners.
   */
  engageSelector?: string | false;
  /**
   * Remember intent in `sessionStorage` (`"textjs:console-intent"`) for this tab
   * once `"dock"`, `"shortcut"` or `"engage"` fires, so reloads and same-tab
   * OAuth redirects with undocked DevTools re-boot immediately (default `true`).
   */
  persist?: boolean;
  /**
   * Optional warmup callback (e.g. `() => void import("./boot")`), called at most
   * once when `canPrefetchConsole()` is `true`:
   * - on `pointerenter` or `focusin` of `engageSelector`
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

export const CONSOLE_INTENT_KEY = "textjs:console-intent";
const DEFAULT_ENGAGE = "[data-textjs-engage], [data-textjs-focus-pad]";
const COARSE = "(hover: none) and (pointer: coarse)";
/** Matches `activateFocusPad`: presses on a surface's own controls keep their defaults. */
const INTERACTIVE = "a,button,input,textarea,select,label,summary,[contenteditable],[data-focus-pad-ignore]";
/** Chrome, Edge, Firefox and Safari open DevTools panels with these letters plus ⌘⌥ (macOS) or Ctrl+Shift. */
const SHORTCUT_CODES = ["KeyJ", "KeyI", "KeyC", "KeyK"];
const SHORTCUT_KEYS = "jick";
/** `ViewportController` ignores stored chrome heights above `analyzeDock`'s plausible maximum. */
const MAX_CHROME_PX = 160;

function isMac(win: Window): boolean {
  return /Mac|iPhone|iPad/.test(win.navigator?.platform || win.navigator?.userAgent || "");
}

/**
 * Whether a keydown opens DevTools. Letters match by physical key or by character, since ⌥ turns
 * `e.key` into `∆` on a Mac and other layouts move the letters.
 */
export function isDevToolsShortcut(e: Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">, mac: boolean): boolean {
  if (e.key === "F12" || e.code === "F12") return !e.metaKey && !e.ctrlKey && !e.altKey;
  const mods = mac ? e.metaKey && e.altKey && !e.ctrlKey : e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey;
  return mods && (SHORTCUT_CODES.includes(e.code) || (e.key?.length === 1 && SHORTCUT_KEYS.includes(e.key.toLowerCase())));
}

function defaultWindow(): (Window & typeof globalThis) | null {
  return typeof window !== "undefined" ? window : null;
}

function matches(win: Window, query: string): boolean {
  return typeof win.matchMedia === "function" && win.matchMedia(query).matches;
}

function storageOf(win: Window, kind: "localStorage" | "sessionStorage"): Storage | null {
  try {
    return win[kind] ?? null;
  } catch {
    return null;
  }
}

function read(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage: Storage | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage may be full or blocked.
  }
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
 * later loads in the same tab booting at once. Touch devices only signal
 * through surfaces.
 *
 * Signals already present (a docked panel, a remembered session) call
 * `onIntent` before this function returns.
 */
export function onConsoleIntent(onIntent: (event: ConsoleIntentEvent) => void, options: ConsoleIntentOptions = {}): ConsoleIntentHandle {
  const win = options.window ?? defaultWindow();
  let triggered = false;
  let disposed = false;
  const cleanup: Array<() => void> = [];
  const persist = options.persist ?? true;
  const session = win && persist ? storageOf(win, "sessionStorage") : null;

  const detach = (): void => {
    for (const fn of cleanup.splice(0)) fn();
  };

  const trigger = (reason: ConsoleIntentReason = "manual"): void => {
    if (triggered || disposed) return;
    triggered = true;
    detach();
    if (reason === "dock" || reason === "shortcut" || reason === "engage") write(session, CONSOLE_INTENT_KEY, "1");
    onIntent({ reason });
  };

  const handle: ConsoleIntentHandle = {
    get triggered() {
      return triggered;
    },
    trigger,
    dispose() {
      if (disposed) return;
      disposed = true;
      detach();
    },
  };
  if (!win) return handle;

  const listen = (target: EventTarget | null | undefined, type: string, fn: (e: Event) => void, capture = false): void => {
    if (!target || typeof target.addEventListener !== "function") return;
    target.addEventListener(type, fn, { capture, passive: true });
    cleanup.push(() => target.removeEventListener(type, fn, capture));
  };
  const coarse = (): boolean => matches(win, COARSE);

  let chrome: number | null = null;
  const local = storageOf(win, "localStorage");
  const stored = Number(read(local, CHROME_STORAGE_KEY) ?? Number.NaN);
  if (Number.isFinite(stored) && stored >= 0 && stored <= MAX_CHROME_PX) chrome = stored;
  const checkDock = (): void => {
    if (coarse()) return;
    const a = analyzeDock(win, chrome ?? VIEWPORT_DEFAULTS.browserChromeHeight);
    if (a.dock !== "undocked") return trigger("dock");
    if (a.chromeSample !== null && a.chromeSample !== chrome) {
      chrome = a.chromeSample;
      write(local, CHROME_STORAGE_KEY, String(chrome));
    }
  };

  if (session !== null && read(session, CONSOLE_INTENT_KEY) === "1" && !coarse()) trigger("session");
  if (!triggered) checkDock();
  if (triggered) return handle;
  listen(win, "resize", checkDock);
  // Observed only: the browser still opens DevTools.
  listen(
    win,
    "keydown",
    (e) => {
      if (!coarse() && isDevToolsShortcut(e as KeyboardEvent, isMac(win))) trigger("shortcut");
    },
    true,
  );

  const engage = options.engageSelector ?? DEFAULT_ENGAGE;
  const surfaceOf = (e: Event): Element | null => {
    const t = e.target as Element | null;
    if (!t || typeof t.closest !== "function") return null;
    const surface = t.closest(engage as string);
    if (surface === null) return null;
    const control = t.closest(INTERACTIVE);
    return control !== null && control !== surface && !control.matches("[data-textjs-engage]") ? null : surface;
  };
  if (engage !== false) {
    const doc = win.document;
    listen(
      doc,
      "mousedown",
      (e) => {
        const m = e as MouseEvent;
        if (m.button !== 0 || (m.ctrlKey && isMac(win)) || coarse()) return;
        if (surfaceOf(e) !== null) trigger("engage");
      },
      true,
    );
    // Enter or Space on a focused surface; pointer clicks already counted on mousedown.
    listen(
      doc,
      "click",
      (e) => {
        if ((e as MouseEvent).detail === 0 && surfaceOf(e) !== null) trigger("engage");
      },
      true,
    );
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
        const t = e.target as Element | null;
        if (t && typeof t.closest === "function" && t.closest(engage) !== null) warm();
      };
      listen(win.document, "pointerover", onHover, true);
      listen(win.document, "focusin", onHover, true);
    }
    if (options.idlePrefetch) {
      let idle: number | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const schedule = (): void => {
        if (typeof win.requestIdleCallback === "function") idle = win.requestIdleCallback(warm, { timeout: 5000 });
        else timer = setTimeout(warm, 1);
      };
      cleanup.push(() => {
        if (idle !== null) win.cancelIdleCallback?.(idle);
        if (timer !== null) clearTimeout(timer);
      });
      if (win.document?.readyState === "complete") schedule();
      else listen(win, "load", schedule);
    }
  }

  return handle;
}
