/**
 * External stores feeding `useViewport` and `useConsoleStats`.
 */

import type { ConsoleRenderer, DockSide, FrameResult } from "@textjs/core";

export interface ViewportState {
  cols: number;
  rows: number;
  responsive: boolean;
  /** Whether the page (and therefore keyboard capture) has focus. */
  focused: boolean;
  /** Whether console output is paused (`window.text.pause()`). */
  paused: boolean;
  dock: DockSide;
}

export const ACTIVITY_FOCUSED = 1 << 0;
export const ACTIVITY_PAUSED = 1 << 1;
export const ACTIVITY_HIDDEN = 1 << 2;

function isDocHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

export class ViewportStore {
  private snapshot: ViewportState;
  private activityFlags: number;
  private readonly listeners = new Set<() => void>();
  private readonly cleanup: Array<() => void> = [];

  constructor(private readonly renderer: ConsoleRenderer) {
    this.snapshot = this.read();
    this.activityFlags = this.readActivityFlags();
    this.cleanup.push(renderer.viewport.subscribe(() => this.refresh()));
    this.cleanup.push(renderer.onFocusChange(() => this.refresh()));
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      const onVis = (): void => this.refresh();
      document.addEventListener("visibilitychange", onVis);
      this.cleanup.push(() => document.removeEventListener("visibilitychange", onVis));
    }
    // Observe pause/resume however they are triggered (hooks, FocusPad or the `window.text` REPL).
    const pause = renderer.pause;
    const resume = renderer.resume;
    renderer.pause = () => {
      pause.call(renderer);
      this.refresh();
    };
    renderer.resume = () => {
      resume.call(renderer);
      this.refresh();
    };
    this.cleanup.push(() => {
      renderer.pause = pause;
      renderer.resume = resume;
    });
  }

  private read(): ViewportState {
    const r = this.renderer;
    return {
      cols: r.buffer.width,
      rows: r.buffer.height,
      responsive: r.viewport.responsive,
      focused: r.focused,
      paused: r.paused,
      dock: r.viewport.dock,
    };
  }

  private readActivityFlags(): number {
    const r = this.renderer;
    return (r.focused ? ACTIVITY_FOCUSED : 0) | (r.paused ? ACTIVITY_PAUSED : 0) | (isDocHidden() ? ACTIVITY_HIDDEN : 0);
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): ViewportState => this.snapshot;

  /** Primitive bitmask of `(focused, paused, hidden)` so timers/cursors skip resize re-renders. */
  readonly getActivityFlags = (): number => this.activityFlags;

  /** Re-read renderer state and notify subscribers when anything changed. */
  refresh(): void {
    const next = this.read();
    const nextFlags = this.readActivityFlags();
    const prev = this.snapshot;
    const snapSame =
      next.cols === prev.cols &&
      next.rows === prev.rows &&
      next.responsive === prev.responsive &&
      next.focused === prev.focused &&
      next.paused === prev.paused &&
      next.dock === prev.dock;
    if (snapSame && nextFlags === this.activityFlags) {
      return;
    }
    if (!snapSame) this.snapshot = next;
    this.activityFlags = nextFlags;
    for (const l of this.listeners) l();
  }

  dispose(): void {
    for (const fn of this.cleanup) fn();
    this.cleanup.length = 0;
    this.listeners.clear();
  }
}

export interface ConsoleStats {
  fps: number;
  totalMs: number;
  layoutMs: number;
  rasterMs: number;
  encodeMs: number;
  spanCount: number;
  dirtyRows: number;
  yogaNodes: number;
  frameCount: number;
  skippedFrames: number;
  cols: number;
  rows: number;
}

const STAT_KEYS: ReadonlyArray<keyof ConsoleStats> = [
  "fps",
  "totalMs",
  "layoutMs",
  "rasterMs",
  "encodeMs",
  "spanCount",
  "dirtyRows",
  "yogaNodes",
  "frameCount",
  "skippedFrames",
  "cols",
  "rows",
];

function pickStats(f: FrameResult | ConsoleStats | ReturnType<ConsoleRenderer["stats"]>): ConsoleStats {
  const out = {} as ConsoleStats;
  for (const k of STAT_KEYS) out[k] = f[k];
  return out;
}

const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * Throttled frame telemetry. Publishing stats re-renders subscribers, which
 * produces a frame of its own; that self-induced frame is recorded but never
 * schedules another publish, so a mounted HUD cannot feed itself into an
 * infinite render loop and an idle app stays at zero `console.log` calls.
 */
export class StatsStore {
  private lastFrame: FrameResult | null = null;
  private snapshot: ConsoleStats;
  private readonly listeners = new Set<() => void>();
  private readonly intervals = new Map<() => void, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastPublish = now();
  private selfPending = false;
  private readonly frameListeners = new Set<(frame: FrameResult) => void>();

  constructor(private readonly renderer: ConsoleRenderer) {
    this.snapshot = pickStats(renderer.stats());
  }

  readonly getSnapshot = (): ConsoleStats => this.snapshot;

  subscribe(listener: () => void, interval = 250): () => void {
    if (this.listeners.size === 0) this.lastPublish = now();
    this.listeners.add(listener);
    this.intervals.set(listener, Math.max(16, interval));
    return () => {
      this.listeners.delete(listener);
      this.intervals.delete(listener);
      if (this.listeners.size === 0 && this.timer !== null) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    };
  }

  /** Raw per-frame listeners (DOM HUDs). They never cause React renders in the console tree. */
  onFrame(listener: (frame: FrameResult) => void): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  private get interval(): number {
    let min = Infinity;
    for (const v of this.intervals.values()) if (v < min) min = v;
    return min === Infinity ? 250 : min;
  }

  /** Called by the root for every renderer frame. */
  handleFrame(frame: FrameResult): void {
    this.lastFrame = frame;
    if (this.frameListeners.size > 0) {
      for (const l of this.frameListeners) l(frame);
    }
    if (this.selfPending) {
      this.selfPending = false;
      return;
    }
    if (this.listeners.size === 0 || frame.skipped) return;
    this.schedule();
  }

  private schedule(): void {
    if (this.listeners.size === 0 || this.timer !== null) return;
    const wait = Math.max(0, this.interval - (now() - this.lastPublish));
    this.timer = setTimeout(() => {
      this.timer = null;
      this.publish();
    }, wait);
  }

  /** Publish the latest stats immediately (on-demand refresh). */
  publish(): void {
    this.lastPublish = now();
    const latest = this.lastFrame ?? this.renderer.stats();
    const prev = this.snapshot;
    let changed = false;
    for (const k of STAT_KEYS) {
      if (prev[k] !== latest[k]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.snapshot = pickStats(latest);
    this.selfPending = this.listeners.size > 0;
    for (const l of this.listeners) l();
  }

  dispose(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
    this.intervals.clear();
    this.frameListeners.clear();
  }
}
