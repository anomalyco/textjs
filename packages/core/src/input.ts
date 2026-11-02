/**
 * Keyboard, paste, wheel and focus input via a hidden `<textarea>` sink.
 */

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

export type InputEvent = KeyInputEvent | PasteInputEvent | WheelInputEvent | FocusChangeEvent;

export interface InputEventMap {
  key: KeyInputEvent;
  paste: PasteInputEvent;
  wheel: WheelInputEvent;
  focus: FocusChangeEvent;
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
 * delivered once on `compositionend` (Chromium fires the last `input` before it,
 * Firefox after it). Returns a function that removes the listeners.
 */
export function bindTextSink(sink: HTMLTextAreaElement | HTMLInputElement, onText: (text: string) => void): () => void {
  let composing = false;
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
  sink.addEventListener("compositionstart", onStart);
  sink.addEventListener("input", onInput);
  sink.addEventListener("compositionend", onEnd);
  return () => {
    sink.removeEventListener("compositionstart", onStart);
    sink.removeEventListener("input", onInput);
    sink.removeEventListener("compositionend", onEnd);
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
  };
  private readonly anyListeners = new Set<Listener<InputEvent>>();
  private readonly doc: Document | null;
  private readonly options: Required<Omit<InputEngineOptions, "document" | "shouldCapture">>;
  private readonly shouldCapture: (() => boolean) | null;
  private sink: HTMLTextAreaElement | null = null;
  private cleanup: Array<() => void> = [];
  private isFocused = true;

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
    for (const l of this.anyListeners) l(event);
  }

  /**
   * Process a keydown. Returns `true` when the event was consumed (and its
   * default prevented). Browser and DevTools shortcuts always pass through.
   */
  handleKeyDown(e: KeyboardEventLike): boolean {
    if (!this.enabled || isPassthroughShortcut(e)) return false;
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

  /** Text committed by the sink (IME, dead keys, autocorrect). */
  handleTextInput(text: string): void {
    if (text.length === 0) return;
    if (text.includes("\n") || text.length > 16) {
      this.emit("paste", { type: "paste", text });
      return;
    }
    this.emit("key", {
      type: "key",
      key: isSingleGrapheme(text) ? text.toLowerCase() : text,
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
   * consoles that keep their own textarea instead of calling `attach()`. Returns a cleanup.
   */
  bindTextSink(sink: HTMLTextAreaElement | HTMLInputElement): () => void {
    return bindTextSink(sink, (text) => this.handleTextInput(text));
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
    sink.setAttribute("autocomplete", "off");
    sink.setAttribute("autocapitalize", "off");
    sink.setAttribute("autocorrect", "off");
    sink.setAttribute("spellcheck", "false");
    sink.setAttribute("tabindex", "-1");
    sink.setAttribute("data-textjs-input-sink", "");
    sink.style.cssText = SINK_STYLE;
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
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
    this.sink?.remove();
    this.sink = null;
  }
}
