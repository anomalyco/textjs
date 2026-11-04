/**
 * Viewport sizing: fixed dimensions, or responsive sizing estimated from the
 * docked DevTools panel.
 *
 * A page cannot read the DevTools console's size. It can see its own window
 * metrics: docking DevTools shrinks `innerWidth` (left/right) or
 * `innerHeight` (bottom) while `outerWidth`/`outerHeight` stay put, so the
 * difference is the DevTools panel. The console constants below were measured
 * against the real DevTools frontend (Chrome 14x, macOS, DevTools zoom 100%).
 *
 * What can't be seen from the page: undocked DevTools (a separate window),
 * DevTools' own zoom, the Console sidebar, and the Console opened as a drawer
 * under another panel. Those fall back to a fixed size or need `text.resize()`.
 */

import { consoleProfile, type ConsoleBrowser } from "./drivers/console-browser";
import { DEFAULT_TYPOGRAPHY } from "./drivers/style";
import { analyzeDock, CHROME_STORAGE_KEY, DEFAULT_CHROME_PX, MAX_CHROME_PX, type WindowLike } from "./dock";

export { analyzeDock, CHROME_STORAGE_KEY, MAX_CHROME_PX, snapZoom, type DockAnalysis, type WindowLike } from "./dock";

export interface ViewportSize {
  cols: number;
  rows: number;
}

/**
 * - `bottom` / `side`: DevTools is docked (left and right look identical from the page).
 * - `undocked`: DevTools is closed or in its own window; the size can't be measured.
 * - `fixed`: a pinned size.
 */
export type DockSide = "side" | "bottom" | "undocked" | "fixed";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ViewportOptions {
  /** Fixed column count (also the fallback when responsive and DevTools can't be measured). */
  width?: number;
  /** Fixed row count (also the fallback when responsive and DevTools can't be measured). */
  height?: number;
  /** Estimate the docked DevTools console size and follow window resizes. */
  responsive?: boolean;
  minCols?: number;
  maxCols?: number;
  minRows?: number;
  maxRows?: number;
  /** Size used when DevTools is undocked or closed (default `width`×`height`, else `120×36`). */
  fallbackCols?: number;
  fallbackRows?: number;
  /** Measured cell width in CSS pixels (measured via canvas when omitted). */
  charWidth?: number;
  /** Row pitch in CSS pixels (defaults to the console line height). */
  charHeight?: number;
  fontSize?: number;
  fontFamily?: string;
  /**
   * Browser tab strip + toolbar height (`outerHeight - innerHeight` with
   * DevTools closed). Learned automatically when omitted.
   */
  browserChromeHeight?: number;
  /** Horizontal console chrome: gutter, message padding (default `56`). */
  consolePaddingX?: number;
  /** Vertical DevTools chrome: tab strip, console toolbar, prompt (default `104`). */
  consoleChromeY?: number;
  /** Classic scrollbar width in CSS pixels (measured on the page when omitted; `0` for overlay scrollbars). */
  scrollbarWidth?: number;
  /** DevTools' own zoom factor (`⌘+` inside DevTools), which the page can't detect (default `1`). */
  devtoolsZoom?: number;
  /** Trailing debounce for window resizes, in ms (default `100`). Dock changes apply immediately. */
  debounceMs?: number;
  /** Where the learned browser chrome height is remembered (default `localStorage`, `null` to disable). */
  storage?: StorageLike | null;
  window?: WindowLike | null;
  /** The console being fitted, for its row pitch and horizontal chrome (default: detected, see `ConsoleBrowser`). */
  browser?: ConsoleBrowser;
}

export interface ResolvedViewport extends ViewportSize {
  dock: DockSide;
}

export const VIEWPORT_DEFAULTS = {
  minCols: 40,
  maxCols: 200,
  minRows: 12,
  maxRows: 60,
  fallbackCols: 120,
  fallbackRows: 36,
  browserChromeHeight: DEFAULT_CHROME_PX,
  /** Measured: frames wrap unless the console is 52–55px wider than the frame. */
  consolePaddingX: 56,
  /** Measured: 27px tab strip + 28px console toolbar + ~47px prompt and message padding. */
  consoleChromeY: 104,
  debounceMs: 100,
} as const;

/** The console toolbar wraps onto a second row below ~545px and a third below ~330px. */
const TOOLBAR_ROW_PX = 26;
const TOOLBAR_WRAP_PX = 560;
const TOOLBAR_WRAP2_PX = 340;
/** The splitter between the page and a side-docked DevTools panel. */
const SIDE_SPLITTER_PX = 1;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Measure the width of one monospace cell with canvas, falling back to `fontSize × 0.6`. */
export function measureCharWidth(fontSize: number = DEFAULT_TYPOGRAPHY.fontSize, fontFamily: string = DEFAULT_TYPOGRAPHY.fontFamily): number {
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    try {
      const ctx = document.createElement("canvas").getContext("2d");
      if (ctx) {
        ctx.font = `${fontSize}px ${fontFamily}`;
        const w = ctx.measureText("M".repeat(100)).width / 100;
        if (w > 0) return w;
      }
    } catch {
      // Fall through to the estimate.
    }
  }
  return fontSize * 0.6;
}

/** Width of a classic (space-taking) scrollbar on this page, `0` for overlay scrollbars. */
export function measureScrollbarWidth(): number {
  if (typeof document === "undefined" || !document.body) return 0;
  try {
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;top:-999px;left:-999px;width:100px;height:100px;overflow:scroll;visibility:hidden";
    document.body.appendChild(el);
    const w = el.offsetWidth - el.clientWidth;
    el.remove();
    return w > 0 && w < 40 ? w : 0;
  } catch {
    return 0;
  }
}

/** Grid that fits a DevTools console panel of `width × height` CSS pixels without wrapping or scrolling. */
export function consoleGridFor(
  width: number,
  height: number,
  charWidth: number,
  charHeight: number,
  options: Pick<ViewportOptions, "consolePaddingX" | "consoleChromeY" | "scrollbarWidth"> = {},
): ViewportSize {
  const padX = (options.consolePaddingX ?? VIEWPORT_DEFAULTS.consolePaddingX) + (options.scrollbarWidth ?? 0);
  const toolbar = width < TOOLBAR_WRAP2_PX ? 2 * TOOLBAR_ROW_PX : width < TOOLBAR_WRAP_PX ? TOOLBAR_ROW_PX : 0;
  const chromeY = (options.consoleChromeY ?? VIEWPORT_DEFAULTS.consoleChromeY) + toolbar;
  return {
    cols: Math.max(1, Math.floor((width - padX) / charWidth)),
    rows: Math.max(1, Math.floor((height - chromeY) / charHeight)),
  };
}

/** Estimate the console grid size from window metrics. */
export function estimateDockedConsoleSize(win: WindowLike, charWidth: number, charHeight: number, options: ViewportOptions = {}): ResolvedViewport {
  const o = { ...VIEWPORT_DEFAULTS, ...stripUndefined(options) };
  const a = analyzeDock(win, o.browserChromeHeight);
  if (a.dock === "undocked") {
    return { cols: Math.floor(options.fallbackCols ?? options.width ?? o.fallbackCols), rows: Math.floor(options.fallbackRows ?? options.height ?? o.fallbackRows), dock: "undocked" };
  }
  const dz = o.devtoolsZoom ?? 1;
  const w = (a.dock === "side" ? a.panelWidth - SIDE_SPLITTER_PX : a.panelWidth) / dz;
  const h = a.panelHeight / dz;
  const g = consoleGridFor(w, h, charWidth, charHeight, o);
  return { cols: clamp(g.cols, o.minCols, o.maxCols), rows: clamp(g.rows, o.minRows, o.maxRows), dock: a.dock };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(o) as Array<keyof T>) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

type SizeListener = (size: ResolvedViewport) => void;

export class ViewportController {
  private options: ViewportOptions;
  private current: ResolvedViewport;
  private readonly listeners = new Set<SizeListener>();
  private readonly win: WindowLike | null;
  private readonly storage: StorageLike | null;
  private charW: number | null;
  private scrollbarW: number | null;
  private learnedChrome: number | null = null;
  private fallback: ViewportSize;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly onResize = (): void => {
    const wait = this.options.debounceMs ?? VIEWPORT_DEFAULTS.debounceMs;
    // Opening, closing or moving DevTools applies at once; drag-resizing settles first.
    if (wait <= 0 || this.compute().dock !== this.current.dock) {
      this.cancelTimer();
      this.refresh();
      return;
    }
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.refresh();
    }, wait);
  };
  private listening = false;

  constructor(options: ViewportOptions = {}) {
    this.options = options;
    this.win = options.window !== undefined ? options.window : typeof window !== "undefined" ? window : null;
    this.storage = options.storage !== undefined ? options.storage : this.win !== null ? defaultStorage() : null;
    this.fallback = {
      cols: Math.max(1, Math.floor(options.fallbackCols ?? options.width ?? VIEWPORT_DEFAULTS.fallbackCols)),
      rows: Math.max(1, Math.floor(options.fallbackRows ?? options.height ?? VIEWPORT_DEFAULTS.fallbackRows)),
    };
    this.charW = options.charWidth ?? null;
    this.scrollbarW = options.scrollbarWidth ?? null;
    const stored = Number(this.storage?.getItem(CHROME_STORAGE_KEY) ?? Number.NaN);
    if (Number.isFinite(stored) && stored >= 0 && stored <= MAX_CHROME_PX) this.learnedChrome = stored;
    this.current = this.compute();
    this.syncListening();
  }

  get cols(): number {
    return this.current.cols;
  }

  get rows(): number {
    return this.current.rows;
  }

  get dock(): DockSide {
    return this.current.dock;
  }

  get responsive(): boolean {
    return this.options.responsive === true;
  }

  getSize(): ResolvedViewport {
    return { ...this.current };
  }

  /** The size `responsive` mode would pick right now, whether or not it's enabled. */
  measure(): ResolvedViewport {
    if (this.win === null) return { ...this.fallback, dock: "undocked" };
    const o = this.options;
    const profile = consoleProfile(o.browser);
    if (this.charW === null) this.charW = measureCharWidth(o.fontSize, o.fontFamily ?? profile.typography.fontFamily);
    if (this.scrollbarW === null) this.scrollbarW = measureScrollbarWidth();
    if (o.browserChromeHeight === undefined) this.learn(analyzeDock(this.win, this.learnedChrome ?? VIEWPORT_DEFAULTS.browserChromeHeight).chromeSample);
    return estimateDockedConsoleSize(this.win, this.charW, o.charHeight ?? profile.rowHeight, {
      ...o,
      consolePaddingX: o.consolePaddingX ?? profile.consolePaddingX,
      browserChromeHeight: o.browserChromeHeight ?? this.learnedChrome ?? VIEWPORT_DEFAULTS.browserChromeHeight,
      scrollbarWidth: this.scrollbarW,
      fallbackCols: this.fallback.cols,
      fallbackRows: this.fallback.rows,
    });
  }

  private learn(sample: number | null): void {
    if (sample === null || sample === this.learnedChrome) return;
    this.learnedChrome = sample;
    try {
      this.storage?.setItem(CHROME_STORAGE_KEY, String(sample));
    } catch {
      // Storage may be full or blocked.
    }
  }

  private fixedSize(): ViewportSize {
    const o = this.options;
    return {
      cols: o.width !== undefined ? Math.max(1, Math.floor(o.width)) : this.fallback.cols,
      rows: o.height !== undefined ? Math.max(1, Math.floor(o.height)) : this.fallback.rows,
    };
  }

  private compute(): ResolvedViewport {
    if (!this.options.responsive || this.win === null) return { ...this.fixedSize(), dock: "fixed" };
    return this.measure();
  }

  private syncListening(): void {
    const want = this.options.responsive === true && this.win?.addEventListener !== undefined;
    if (want && !this.listening) {
      this.win?.addEventListener?.("resize", this.onResize);
      this.listening = true;
    } else if (!want && this.listening) {
      this.win?.removeEventListener?.("resize", this.onResize);
      this.listening = false;
      this.cancelTimer();
    }
  }

  private cancelTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Recompute and notify subscribers when the size (or `force`) changed. Returns the current size. */
  refresh(force = false): ResolvedViewport {
    const next = this.compute();
    const changed = force || next.cols !== this.current.cols || next.rows !== this.current.rows || next.dock !== this.current.dock;
    this.current = next;
    if (changed) for (const l of this.listeners) l({ ...next });
    return { ...next };
  }

  /** Switch to a fixed size. */
  setSize(cols: number, rows: number): void {
    const wasResponsive = this.responsive;
    this.options = { ...this.options, responsive: false, width: cols, height: rows };
    this.syncListening();
    this.refresh(wasResponsive);
  }

  setResponsive(responsive: boolean): void {
    const changed = responsive !== this.responsive;
    this.options = { ...this.options, responsive };
    this.syncListening();
    this.refresh(changed);
  }

  /** Merge sizing options (limits, fallback size, console constants) and re-measure. */
  configure(options: Omit<ViewportOptions, "window" | "storage" | "responsive" | "width" | "height">): ResolvedViewport {
    this.options = { ...this.options, ...options };
    this.fallback = {
      cols: Math.max(1, Math.floor(options.fallbackCols ?? this.fallback.cols)),
      rows: Math.max(1, Math.floor(options.fallbackRows ?? this.fallback.rows)),
    };
    if (options.charWidth !== undefined) this.charW = options.charWidth;
    else if (options.fontSize !== undefined || options.fontFamily !== undefined) this.charW = null;
    if (options.scrollbarWidth !== undefined) this.scrollbarW = options.scrollbarWidth;
    return this.refresh();
  }

  subscribe(listener: SizeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.listeners.clear();
    this.cancelTimer();
    if (this.listening) this.win?.removeEventListener?.("resize", this.onResize);
    this.listening = false;
  }
}
