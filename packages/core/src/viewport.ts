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

import { DEFAULT_TYPOGRAPHY } from "./drivers/style";

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

export interface WindowLike {
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  devicePixelRatio?: number;
  addEventListener?(type: "resize", listener: () => void): void;
  removeEventListener?(type: "resize", listener: () => void): void;
}

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
}

export interface ResolvedViewport extends ViewportSize {
  dock: DockSide;
}

/** Window metrics interpreted as a DevTools dock (all lengths in device-independent pixels). */
export interface DockAnalysis {
  dock: "side" | "bottom" | "undocked";
  /** Page zoom (Chrome reports `inner*` in zoomed CSS pixels and `outer*` in DIPs). */
  zoom: number;
  /** Width and height of the DevTools panel, or `0` when undocked. */
  panelWidth: number;
  panelHeight: number;
  /** A browser chrome height observation, when DevTools isn't docked at the bottom. */
  chromeSample: number | null;
}

export const VIEWPORT_DEFAULTS = {
  minCols: 40,
  maxCols: 200,
  minRows: 12,
  maxRows: 60,
  fallbackCols: 120,
  fallbackRows: 36,
  /** Until learned: macOS Chrome with a bookmarks bar (~116px); overestimating only costs a row. */
  browserChromeHeight: 120,
  /** Measured: frames wrap unless the console is 52–55px wider than the frame. */
  consolePaddingX: 56,
  /** Measured: 27px tab strip + 28px console toolbar + ~47px prompt and message padding. */
  consoleChromeY: 104,
  debounceMs: 100,
} as const;

/** DevTools panels narrower than this are treated as absent. */
const DOCK_THRESHOLD_PX = 100;
/** The console toolbar wraps onto a second row below ~545px and a third below ~330px. */
const TOOLBAR_ROW_PX = 26;
const TOOLBAR_WRAP_PX = 560;
const TOOLBAR_WRAP2_PX = 340;
/** The splitter between the page and a side-docked DevTools panel. */
const SIDE_SPLITTER_PX = 1;
/** Plausible browser chrome heights; anything taller is a small bottom dock. */
const MAX_CHROME_PX = 160;
/** Window frame slack on the horizontal axis (Windows reports a 16px frame). */
const SLACK_X = 16;
/** Uncertainty of the browser chrome height. */
const SLACK_Y = 60;
/** Common OS display scale factors (`devicePixelRatio` at page zoom 100%). */
const DISPLAY_SCALES = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4];
const ZOOM_LEVELS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
export const CHROME_STORAGE_KEY = "textjs:browser-chrome";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** The nearest of Chrome's preset zoom levels within 5%, or `null`. */
export function snapZoom(z: number): number | null {
  if (!Number.isFinite(z) || z <= 0) return null;
  let best: number | null = null;
  for (const level of ZOOM_LEVELS) {
    const err = Math.abs(z / level - 1);
    if (err < 0.05 && (best === null || err < Math.abs(z / best - 1))) best = level;
  }
  return best;
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

/**
 * Interpret window metrics as a DevTools dock. Page zoom scales `inner*` but
 * not `outer*`, so each hypothesis (docked at the bottom, or on a side) picks
 * the zoom that makes its undocked axis line up, and the best fit wins.
 */
export function analyzeDock(win: WindowLike, browserChromeHeight: number = VIEWPORT_DEFAULTS.browserChromeHeight): DockAnalysis {
  const { innerWidth: iw, innerHeight: ih, outerWidth: ow, outerHeight: oh } = win;
  const chrome = browserChromeHeight;
  if (!(iw > 0 && ih > 0 && ow > 0 && oh > 0)) return { dock: "undocked", zoom: 1, panelWidth: 0, panelHeight: 0, chromeSample: null };
  // Page zoom is always one of Chrome's presets; each axis proposes one. `devicePixelRatio`
  // includes the zoom, so an integer ratio (the common unzoomed case) only allows zoom 1, and
  // a zoom must leave a plausible display scale. Unexplained metrics fall back to undocked.
  const candidates = new Set([1]);
  const dpr = win.devicePixelRatio;
  if (dpr === undefined || !Number.isInteger(dpr)) {
    for (const z of [snapZoom(ow / iw), snapZoom((oh - chrome) / ih)]) {
      if (z !== null && (dpr === undefined || DISPLAY_SCALES.some((s) => Math.abs(dpr / z / s - 1) < 0.02))) candidates.add(z);
    }
  }
  // Width residual for "bottom or nothing" (the width axis must line up), height residual for "side".
  let best: { side: boolean; zoom: number; score: number } | null = null;
  for (const z of candidates) {
    const dockW = ow - z * iw;
    const dockH = oh - chrome - z * ih;
    const bottomScore = dockH >= -SLACK_Y ? Math.abs(dockW) / SLACK_X : Infinity;
    const sideScore = dockW >= -SLACK_X && dockW > DOCK_THRESHOLD_PX ? Math.abs(dockH) / SLACK_Y : Infinity;
    // Prefer zoom 1 and the bottom hypothesis on ties.
    const bias = z === 1 ? 0 : 0.05;
    if (bottomScore + bias < (best?.score ?? Infinity)) best = { side: false, zoom: z, score: bottomScore + bias };
    if (sideScore + bias + 0.01 < (best?.score ?? Infinity)) best = { side: true, zoom: z, score: sideScore + bias + 0.01 };
  }
  if (best === null || best.score > 2) return { dock: "undocked", zoom: 1, panelWidth: 0, panelHeight: 0, chromeSample: null };
  const z = best.zoom;
  const sample = (): number | null => {
    const c = Math.round(oh - z * ih);
    return z === 1 && c >= 0 && c <= MAX_CHROME_PX ? c : null;
  };
  if (best.side) {
    return { dock: "side", zoom: z, panelWidth: ow - z * iw, panelHeight: z * ih, chromeSample: sample() };
  }
  const dockH = oh - chrome - z * ih;
  if (dockH > DOCK_THRESHOLD_PX && oh - z * ih > MAX_CHROME_PX) {
    return { dock: "bottom", zoom: z, panelWidth: z * iw, panelHeight: dockH, chromeSample: null };
  }
  return { dock: "undocked", zoom: z, panelWidth: 0, panelHeight: 0, chromeSample: sample() };
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
    if (this.charW === null) this.charW = measureCharWidth(o.fontSize, o.fontFamily);
    if (this.scrollbarW === null) this.scrollbarW = measureScrollbarWidth();
    if (o.browserChromeHeight === undefined) this.learn(analyzeDock(this.win, this.learnedChrome ?? VIEWPORT_DEFAULTS.browserChromeHeight).chromeSample);
    return estimateDockedConsoleSize(this.win, this.charW, o.charHeight ?? DEFAULT_TYPOGRAPHY.lineHeight, {
      ...o,
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
