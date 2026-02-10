/**
 * Viewport sizing: fixed dimensions, or responsive sizing estimated from the
 * docked DevTools panel.
 */

import { DEFAULT_TYPOGRAPHY } from "./drivers/style";

export interface ViewportSize {
  cols: number;
  rows: number;
}

export type DockSide = "right" | "bottom" | "undocked" | "fixed";

export interface WindowLike {
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  addEventListener?(type: "resize", listener: () => void): void;
  removeEventListener?(type: "resize", listener: () => void): void;
}

export interface ViewportOptions {
  /** Fixed column count. */
  width?: number;
  /** Fixed row count. */
  height?: number;
  /** Estimate the docked DevTools console size and follow window resizes. */
  responsive?: boolean;
  minCols?: number;
  maxCols?: number;
  minRows?: number;
  maxRows?: number;
  /** Size used when DevTools appears undocked (default `100×32`). */
  fallbackCols?: number;
  fallbackRows?: number;
  /** Measured cell width in CSS pixels (measured via canvas when omitted). */
  charWidth?: number;
  /** Cell height in CSS pixels (defaults to the console line height). */
  charHeight?: number;
  fontSize?: number;
  fontFamily?: string;
  /** Browser toolbar height included in `outerHeight - innerHeight` (default `88`). */
  browserChromeHeight?: number;
  /** Horizontal console chrome: gutters, scrollbar (default `32`). */
  consolePaddingX?: number;
  /** Vertical DevTools chrome: tab strip, console toolbar, prompt line (default `84`). */
  consoleChromeY?: number;
  window?: WindowLike | null;
}

export interface ResolvedViewport extends ViewportSize {
  dock: DockSide;
}

const DEFAULTS = {
  minCols: 60,
  maxCols: 180,
  minRows: 18,
  maxRows: 60,
  fallbackCols: 100,
  fallbackRows: 32,
  browserChromeHeight: 88,
  consolePaddingX: 32,
  consoleChromeY: 84,
} as const;

const DOCK_THRESHOLD_PX = 120;

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

/** Estimate the console grid size from window metrics. */
export function estimateDockedConsoleSize(
  win: WindowLike,
  charWidth: number,
  charHeight: number,
  options: ViewportOptions = {},
): ResolvedViewport {
  const o = { ...DEFAULTS, ...stripUndefined(options) };
  const dockW = win.outerWidth - win.innerWidth;
  const dockH = win.outerHeight - win.innerHeight - o.browserChromeHeight;
  let cols: number;
  let rows: number;
  let dock: DockSide;
  if (dockW > DOCK_THRESHOLD_PX && dockW >= dockH) {
    dock = "right";
    cols = Math.floor((dockW - o.consolePaddingX) / charWidth);
    rows = Math.floor((win.outerHeight - o.browserChromeHeight - o.consoleChromeY) / charHeight);
  } else if (dockH > DOCK_THRESHOLD_PX) {
    dock = "bottom";
    cols = Math.floor((win.innerWidth - o.consolePaddingX) / charWidth);
    rows = Math.floor((dockH - o.consoleChromeY) / charHeight);
  } else {
    return { cols: o.fallbackCols, rows: o.fallbackRows, dock: "undocked" };
  }
  return { cols: clamp(cols, o.minCols, o.maxCols), rows: clamp(rows, o.minRows, o.maxRows), dock };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(o) as Array<keyof T>) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

type SizeListener = (size: ResolvedViewport) => void;

export class ViewportController {
  private options: ViewportOptions;
  private current: ResolvedViewport;
  private readonly listeners = new Set<SizeListener>();
  private readonly win: WindowLike | null;
  private charW: number | null;
  private readonly onResize = (): void => {
    this.refresh();
  };
  private listening = false;

  constructor(options: ViewportOptions = {}) {
    this.options = options;
    this.win = options.window !== undefined ? options.window : typeof window !== "undefined" ? window : null;
    this.charW = options.charWidth ?? null;
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

  private compute(): ResolvedViewport {
    const o = this.options;
    if (!o.responsive || this.win === null) {
      return {
        cols: Math.max(1, Math.floor(o.width ?? o.fallbackCols ?? DEFAULTS.fallbackCols)),
        rows: Math.max(1, Math.floor(o.height ?? o.fallbackRows ?? DEFAULTS.fallbackRows)),
        dock: "fixed",
      };
    }
    if (this.charW === null) this.charW = measureCharWidth(o.fontSize, o.fontFamily);
    const charH = o.charHeight ?? DEFAULT_TYPOGRAPHY.lineHeight;
    return estimateDockedConsoleSize(this.win, this.charW, charH, o);
  }

  private syncListening(): void {
    const want = this.options.responsive === true && this.win?.addEventListener !== undefined;
    if (want && !this.listening) {
      this.win?.addEventListener?.("resize", this.onResize);
      this.listening = true;
    } else if (!want && this.listening) {
      this.win?.removeEventListener?.("resize", this.onResize);
      this.listening = false;
    }
  }

  /** Recompute and notify subscribers when the size changed. Returns the current size. */
  refresh(): ResolvedViewport {
    const next = this.compute();
    const changed = next.cols !== this.current.cols || next.rows !== this.current.rows || next.dock !== this.current.dock;
    this.current = next;
    if (changed) for (const l of this.listeners) l({ ...next });
    return { ...next };
  }

  /** Switch to a fixed size. */
  setSize(cols: number, rows: number): void {
    this.options = { ...this.options, responsive: false, width: cols, height: rows };
    this.syncListening();
    this.refresh();
  }

  setResponsive(responsive: boolean): void {
    this.options = { ...this.options, responsive };
    this.syncListening();
    this.refresh();
  }

  subscribe(listener: SizeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.listeners.clear();
    if (this.listening) this.win?.removeEventListener?.("resize", this.onResize);
    this.listening = false;
  }
}
