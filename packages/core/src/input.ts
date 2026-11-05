/**
 * Keyboard, paste, wheel and focus input via a hidden `<textarea>` sink.
 */

import { applyStyle } from "./dom-style";

export interface KeyModifiers {
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

export type NamedKey =
  | "up"
  | "down"
  | "left"
  | "right"
  | "return"
  | "escape"
  | "tab"
  | "backspace"
  | "delete"
  | "pageup"
  | "pagedown"
  | "home"
  | "end"
  | "space"
  | "insert"
  | `f${number}`;

export interface KeyInputEvent extends KeyModifiers {
  type: "key";
  /** Normalized key name: a `NamedKey`, or the lowercased printable character. */
  key: NamedKey | (string & {});
  /** Text produced by the key (empty for non-printing keys). */
  input: string;
  /** Physical `KeyboardEvent.code` when available. */
  code: string;
  repeat: boolean;
}

export interface PasteInputEvent {
  type: "paste";
  text: string;
  /** Files supplied by an actual clipboard event. No clipboard read permission is requested. */
  files?: readonly File[];
}

export interface WheelInputEvent extends KeyModifiers {
  type: "wheel";
  deltaX: number;
  deltaY: number;
  /** Delta normalized to text rows (positive scrolls down). */
  rows: number;
  /** Delta normalized to text columns. */
  cols: number;
}

export interface FocusChangeEvent {
  type: "focus";
  focused: boolean;
}

/**
 * A physical key went down or up. Unlike `key` events, it fires for a modifier key on its own
 * and when a key is released, and it never repeats.
 * @experimental
 */
export interface KeyStateEvent {
  type: "keystate";
  /** Physical `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`), or `key` when the browser gives none. */
  code: string;
  /** `KeyboardEvent.key` as reported when the key went down. */
  key: string;
  down: boolean;
}

export type InputEvent = KeyInputEvent | PasteInputEvent | WheelInputEvent | FocusChangeEvent;

export interface InputEventMap {
  key: KeyInputEvent;
  paste: PasteInputEvent;
  wheel: WheelInputEvent;
  focus: FocusChangeEvent;
  /** @experimental */
  keystate: KeyStateEvent;
}

/** The subset of `KeyboardEvent` the engine reads (makes it testable without a DOM). */
export interface KeyboardEventLike {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  target?: EventTarget | null;
  preventDefault(): void;
}

export interface WheelEventLike {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

const NAMED: Readonly<Record<string, NamedKey>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "return",
  Escape: "escape",
  Esc: "escape",
  Tab: "tab",
  Backspace: "backspace",
  Delete: "delete",
  PageUp: "pageup",
  PageDown: "pagedown",
  Home: "home",
  End: "end",
  Insert: "insert",
  " ": "space",
  Spacebar: "space",
};

/** Keys whose browser default (scrolling, focus moves, history) must be suppressed. */
const PREVENT_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  " ",
  "Tab",
  "Backspace",
  "Escape",
  "/",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  "Enter",
  "Delete",
]);

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "Fn", "FnLock", "Hyper", "Super", "OS", "AltGraph"]);

const isApplePlatform: boolean =
  typeof navigator !== "undefined"
    ? /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    : (globalThis as { process?: { platform?: string } }).process?.platform === "darwin";

/** Browser / DevTools shortcuts that must never be intercepted. */
export function isPassthroughShortcut(e: KeyboardEventLike): boolean {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === "F12" || k === "F5") return true;
  // ⌘⌥J / ⌘⌥I / ⌘⌥C (macOS) and Ctrl+Shift+J/I/C (Windows/Linux): DevTools. ⌘⌥K / Ctrl+Shift+K: Firefox's console.
  if ((e.metaKey && e.altKey) || (e.ctrlKey && e.shiftKey)) {
    if (k === "j" || k === "i" || k === "c" || k === "k") return true;
  }
  if (e.altKey) return false;
  // Reload, hard reload, address bar, new tab, close tab, new window, quit:
  // ⌘+<key> on macOS; Ctrl+R / Ctrl+L on Windows/Linux (browsers reserve Ctrl+T/W/N natively).
  if (e.metaKey) {
    return k === "r" || k === "l" || k === "t" || k === "w" || k === "n" || k === "q";
  }
  if (e.ctrlKey && !isApplePlatform) {
    return k === "r" || k === "l";
  }
  return false;
}

function isSingleGrapheme(s: string): boolean {
  if (s.length === 1) return true;
  if (s.length === 2) {
    const c = s.charCodeAt(0);
    return c >= 0xd800 && c <= 0xdbff;
  }
  return false;
}

function isTextField(t: EventTarget | null | undefined): boolean {
  const tag = (t as { tagName?: unknown } | null | undefined)?.tagName;
  return tag === "TEXTAREA" || tag === "INPUT";
}

/**
 * Dead keys on Windows send no composition events: a `Dead` keydown, then an ordinary keydown
 * for the next character, which the browser combines into the focused text field (`'` then `e`
 * inserts `é`, `'` then `t` inserts `'t`). That keydown must keep its default and not count as a
 * key, so the text arrives once through the sink. macOS and Linux compose dead keys, which
 * `isComposing` already covers.
 */
const NAMED_KEY = /^[A-Z][A-Za-z0-9]+$/;

export class DeadKeyTracker {
  private pending = false;

  /** `true` when the text field owns this keydown: a dead key, or the character that completes one. */
  owns(e: KeyboardEventLike): boolean {
    if (e.key === "Dead") {
      this.pending = true;
      return true;
    }
    // Shift and AltGr on their way to the completing character neither claim nor clear.
    if (MODIFIER_KEYS.has(e.key)) return false;
    if (!this.pending) return false;
    this.pending = false;
    // Arrows, Esc and shortcuts (Ctrl, Alt or Meta alone) after a dead key are ordinary keys; named keys are
    // ASCII identifiers. Anything else is text, including Firefox's two-character "'t". AltGr (Ctrl+Alt) still combines.
    return isTextField(e.target) && e.key.length > 0 && !NAMED_KEY.test(e.key) && !e.metaKey && e.ctrlKey === e.altKey;
  }

  /** Text reached the field or the field lost focus, so nothing is pending (a dead key pressed twice inserts text by itself). */
  reset(): void {
    this.pending = false;
  }
}

/** Normalize a keyboard event. Returns `null` for modifier-only and IME-composition keys. */
export function normalizeKeyEvent(e: KeyboardEventLike): KeyInputEvent | null {
  if (MODIFIER_KEYS.has(e.key) || e.key === "Dead" || e.key === "Process" || e.key === "Unidentified") return null;
  if (e.isComposing || e.keyCode === 229) return null;
  const named = NAMED[e.key] ?? (/^F\d{1,2}$/.test(e.key) ? (e.key.toLowerCase() as NamedKey) : undefined);
  const printable = named === undefined && isSingleGrapheme(e.key);
  let input = "";
  if (named === "space") input = " ";
  else if (printable && !e.ctrlKey && !e.metaKey) input = e.key;
  return {
    type: "key",
    key: named ?? (printable ? e.key.toLowerCase() : e.key),
    input,
    code: e.code ?? "",
    repeat: e.repeat ?? false,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    shift: e.shiftKey,
    alt: e.altKey,
  };
}

/**
 * Read committed text from a hidden input sink: IME commits, dead keys and autocorrect.
 * Text being composed stays in the sink untouched so the IME keeps working, and is
 * delivered once on `compositionend`, whether the browser fires the last `input`
 * before or after it. `onBlur` runs when the sink loses focus. Returns a function that
 * removes the listeners.
 */
export function bindTextSink(sink: HTMLTextAreaElement | HTMLInputElement, onText: (text: string) => void, onBlur?: () => void): () => void {
  let composing = false;
  // Anything typed before the binding (while an engine boots) would prepend to the next commit.
  sink.value = "";
  const take = (): void => {
    const value = sink.value;
    if (value === "") return;
    sink.value = "";
    onText(value);
  };
  const onStart = (): void => {
    composing = true;
  };
  const onInput = (e: Event): void => {
    if (composing || (e as { isComposing?: boolean }).isComposing) return;
    take();
  };
  const onEnd = (): void => {
    composing = false;
    take();
  };
  const onFocusOut = (): void => onBlur?.();
  sink.addEventListener("compositionstart", onStart);
  sink.addEventListener("input", onInput);
  sink.addEventListener("compositionend", onEnd);
  sink.addEventListener("blur", onFocusOut);
  return () => {
    sink.removeEventListener("compositionstart", onStart);
    sink.removeEventListener("input", onInput);
    sink.removeEventListener("compositionend", onEnd);
    sink.removeEventListener("blur", onFocusOut);
  };
}

export interface InputEngineOptions {
  /** Defaults to the global `document` when present. */
  document?: Document | null;
  /** Focus the sink on attach (default `true`). */
  autoFocus?: boolean;
  /** Refocus the sink when the page background is clicked (default `true`). */
  refocusOnClick?: boolean;
  /** Forward wheel events (default `true`). */
  wheel?: boolean;
  /** CSS pixels per text row for pixel-mode wheel deltas (default `16`). */
  pixelsPerRow?: number;
  /**
   * Return `false` to leave host page keyboard and paste events completely
   * untouched (no `preventDefault()`, no emitted events). Default: always capture.
   */
  shouldCapture?: () => boolean;
}

type Listener<E> = (event: E) => void;

const INTERACTIVE_SELECTOR =
  'input,textarea,select,button,a[href],label,summary,[contenteditable=""],[contenteditable="true"],[data-textjs-interactive]';

export const SINK_STYLE =
  "position:fixed;top:50%;left:50%;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;border:0;padding:0;margin:0;resize:none;overflow:hidden;";

export class InputEngine {
  private readonly listeners: { [K in keyof InputEventMap]: Set<Listener<InputEventMap[K]>> } = {
    key: new Set(),
    paste: new Set(),
    wheel: new Set(),
    focus: new Set(),
    keystate: new Set(),
  };
  private readonly held = new Map<string, string>();
  private readonly pressedSet = new Set<string>();
  private readonly anyListeners = new Set<Listener<InputEvent>>();
  private readonly doc: Document | null;
  private readonly options: Required<Omit<InputEngineOptions, "document" | "shouldCapture">>;
  private readonly shouldCapture: (() => boolean) | null;
  private sink: HTMLTextAreaElement | null = null;
  private cleanup: Array<() => void> = [];
  private isFocused = true;
  private readonly deadKeys = new DeadKeyTracker();

  constructor(options: InputEngineOptions = {}) {
    this.doc = options.document !== undefined ? options.document : typeof document !== "undefined" ? document : null;
    this.options = {
      autoFocus: options.autoFocus ?? true,
      refocusOnClick: options.refocusOnClick ?? true,
      wheel: options.wheel ?? true,
      pixelsPerRow: options.pixelsPerRow ?? 16,
    };
    this.shouldCapture = options.shouldCapture ?? null;
    if (this.doc && typeof this.doc.hasFocus === "function") this.isFocused = this.doc.hasFocus();
  }

  get focused(): boolean {
    return this.isFocused;
  }

  /** Whether host page keyboard / paste events are currently captured. */
  get enabled(): boolean {
    return this.shouldCapture === null || this.shouldCapture();
  }

  get element(): HTMLTextAreaElement | null {
    return this.sink;
  }

  /**
   * Physical keys held right now, by `KeyboardEvent.code`. Cleared when the page loses focus.
   * @experimental
   */
  get pressed(): ReadonlySet<string> {
    return this.pressedSet;
  }

  /** @experimental */
  isDown(code: string): boolean {
    return this.held.has(code);
  }

  private trackKey(e: KeyboardEventLike, down: boolean): void {
    if (down && (e.isComposing || e.keyCode === 229)) return;
    const code = e.code || e.key;
    if (!code || code === "Unidentified") return;
    if (down) {
      if (this.held.has(code)) return;
      this.held.set(code, e.key);
      this.pressedSet.add(code);
      this.emit("keystate", { type: "keystate", code, key: e.key, down: true });
      return;
    }
    // macOS sends no keyup for keys released while ⌘ is held, so ⌘'s release ends them all.
    if (e.key === "Meta") this.releaseAll();
    else if (this.held.has(code)) {
      const key = this.held.get(code) as string;
      this.held.delete(code);
      this.pressedSet.delete(code);
      this.emit("keystate", { type: "keystate", code, key, down: false });
    }
  }

  /**
   * Release every held key (blur, hidden tab, detach), emitting `keystate` ups.
   * @experimental
   */
  releaseAll(): void {
    for (const [code, key] of [...this.held]) {
      this.held.delete(code);
      this.pressedSet.delete(code);
      this.emit("keystate", { type: "keystate", code, key, down: false });
    }
  }

  on<K extends keyof InputEventMap>(type: K, listener: Listener<InputEventMap[K]>): () => void {
    const set = this.listeners[type] as Set<Listener<InputEventMap[K]>>;
    set.add(listener);
    return () => set.delete(listener);
  }

  onAny(listener: Listener<InputEvent>): () => void {
    this.anyListeners.add(listener);
    return () => this.anyListeners.delete(listener);
  }

  emit<K extends keyof InputEventMap>(type: K, event: InputEventMap[K]): void {
    for (const l of this.listeners[type] as Set<Listener<InputEventMap[K]>>) l(event);
    if (type !== "keystate") {
      for (const l of this.anyListeners) l(event as InputEvent);
    }
  }

  /**
   * Process a keydown. Returns `true` when the event was consumed (and its
   * default prevented). Browser and DevTools shortcuts always pass through.
   */
  handleKeyDown(e: KeyboardEventLike): boolean {
    if (!this.enabled || isPassthroughShortcut(e)) return false;
    this.trackKey(e, true);
    if (this.deadKeys.owns(e)) return false;
    const event = normalizeKeyEvent(e);
    if (event === null) return false;
    let prevent = false;
    if (e.metaKey && !e.ctrlKey) {
      // ⌘C / ⌘V / ⌘A / ⌘X and other app shortcuts keep their defaults.
      prevent = PREVENT_KEYS.has(e.key) && e.key !== "/";
    } else if (e.ctrlKey) {
      const k = e.key.toLowerCase();
      prevent = k !== "v" && k !== "c" && k !== "x" && k !== "tab";
    } else if (PREVENT_KEYS.has(e.key)) prevent = true;
    else if (event.input.length > 0) prevent = true;
    // Printable keys never reach the sink: letting Blink insert text into the
    // focused textarea triggers scroll-into-view and jumps the page.
    if (!prevent && !e.isComposing && !e.metaKey && !e.ctrlKey && e.key.length === 1) prevent = true;
    if (prevent) {
      e.preventDefault();
      if (this.sink !== null && this.sink.value !== "") this.sink.value = "";
    }
    this.emit("key", event);
    return prevent;
  }

  /**
   * Process a keyup: ends the key's `keystate`. Releases are never filtered, so no key sticks.
   * @experimental
   */
  handleKeyUp(e: KeyboardEventLike): void {
    this.trackKey(e, false);
  }

  /** Text committed by the sink (IME, dead keys, autocorrect). */
  handleTextInput(text: string): void {
    this.deadKeys.reset();
    if (text.length === 0 || !this.enabled) return;
    if (text.includes("\n") || text.length > 16) {
      this.emit("paste", { type: "paste", text });
      return;
    }
    this.emit("key", {
      type: "key",
      key: text === " " ? "space" : isSingleGrapheme(text) ? text.toLowerCase() : text,
      input: text,
      code: "",
      repeat: false,
      ctrl: false,
      meta: false,
      shift: false,
      alt: false,
    });
  }

  /**
   * Deliver committed text from a host-owned sink (IME, dead keys) to this engine, for
   * consoles that keep their own textarea instead of calling `attach()`. Returns a function that removes the listeners.
   */
  bindTextSink(sink: HTMLTextAreaElement | HTMLInputElement): () => void {
    return bindTextSink(sink, (text) => this.handleTextInput(text), () => this.deadKeys.reset());
  }

  handlePaste(text: string, files?: readonly File[]): void {
    if ((text.length > 0 || files?.length) && this.enabled) this.emit("paste", { type: "paste", text: text.replace(/\r\n?/g, "\n"), ...(files?.length && {files}) });
  }

  handleWheel(e: WheelEventLike): void {
    const scale = e.deltaMode === 1 ? 1 : e.deltaMode === 2 ? 24 : 1 / this.options.pixelsPerRow;
    this.emit("wheel", {
      type: "wheel",
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      rows: e.deltaY * scale,
      cols: e.deltaX * scale,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    });
  }

  setFocused(focused: boolean): void {
    if (!focused) {
      this.deadKeys.reset();
      this.releaseAll();
    }
    if (focused === this.isFocused) return;
    this.isFocused = focused;
    this.emit("focus", { type: "focus", focused });
  }

  focus(): void {
    this.sink?.focus({ preventScroll: true });
  }

  /** Create the hidden sink and start listening. No-op without a DOM. */
  attach(): this {
    const doc = this.doc;
    if (doc === null || this.sink !== null) return this;
    const win = doc.defaultView;
    const sink = doc.createElement("textarea");
    sink.setAttribute("aria-label", "Text.js keyboard input");
    // A name (no id: every root has its own sink) keeps Chrome's Issues panel quiet about an unnamed form field.
    sink.setAttribute("name", "textjs-input");
    sink.setAttribute("autocomplete", "off");
    sink.setAttribute("autocapitalize", "off");
    sink.setAttribute("autocorrect", "off");
    sink.setAttribute("spellcheck", "false");
    // Password managers ignore autocomplete="off"; these opt the sink out of 1Password, LastPass, Bitwarden and Dashlane.
    sink.setAttribute("data-1p-ignore", "");
    sink.setAttribute("data-lpignore", "true");
    sink.setAttribute("data-bwignore", "");
    sink.setAttribute("data-form-type", "other");
    sink.setAttribute("tabindex", "-1");
    sink.setAttribute("data-textjs-input-sink", "");
    applyStyle(sink, SINK_STYLE);
    (doc.body ?? doc.documentElement).appendChild(sink);
    this.sink = sink;

    const listen = <E extends Event>(target: EventTarget, type: string, fn: (e: E) => void, opts?: AddEventListenerOptions): void => {
      const handler = fn as EventListener;
      target.addEventListener(type, handler, opts);
      this.cleanup.push(() => target.removeEventListener(type, handler, opts));
    };

    const isForeignEditable = (t: EventTarget | null): boolean => {
      if (t === sink || t === null) return false;
      const el = t as Element;
      return typeof el.closest === "function" && el.closest("input,textarea,select,[contenteditable]") !== null;
    };

    listen<KeyboardEvent>(
      doc,
      "keydown",
      (e) => {
        if (isForeignEditable(e.target)) return;
        this.handleKeyDown(e);
      },
      { capture: true },
    );
    listen<KeyboardEvent>(doc, "keyup", (e) => this.handleKeyUp(e), { capture: true });
    this.cleanup.push(this.bindTextSink(sink));
    listen<ClipboardEvent>(
      doc,
      "paste",
      (e) => {
        if (isForeignEditable(e.target) || !this.enabled) return;
        const text = e.clipboardData?.getData("text/plain") ?? "";
        e.preventDefault();
        this.handlePaste(text, Array.from(e.clipboardData?.files ?? []));
      },
      { capture: true },
    );
    if (this.options.refocusOnClick) {
      listen<MouseEvent>(doc, "mousedown", (e) => {
        const t = e.target as Element | null;
        if (t && typeof t.closest === "function" && t.closest(INTERACTIVE_SELECTOR) !== null) return;
        setTimeout(() => this.focus(), 0);
      });
    }
    if (win) {
      if (this.options.wheel) listen<WheelEvent>(win, "wheel", (e) => this.handleWheel(e), { passive: true });
      listen<FocusEvent>(win, "focus", () => this.setFocused(true));
      listen<FocusEvent>(win, "blur", () => this.setFocused(false));
    }
    listen<Event>(doc, "visibilitychange", () => this.setFocused(doc.hasFocus()));
    if (this.options.autoFocus) this.focus();
    return this;
  }

  detach(): void {
    this.releaseAll();
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
    this.sink?.remove();
    this.sink = null;
  }
}
