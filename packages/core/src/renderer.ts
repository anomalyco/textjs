/**
 * ConsoleRenderer: Yoga layout → CellBuffer raster → CssConsoleDriver, on a
 * demand-driven animation-frame scheduler with rolling telemetry.
 */

import { parseColor, type ColorInput } from "./color";
import { CellBuffer } from "./cell-buffer";
import { CssConsoleDriver, type ClearMode, type ConsoleTarget, type DriverRenderOptions } from "./drivers/css-console-driver";
import type { ConsoleTypographyOptions, StyleResolveOptions } from "./drivers/style";
import { InputEngine, type FocusChangeEvent } from "./input";
import { paintScene, type PaintOptions, type SceneNode } from "./scene";
import { ViewportController, type ResolvedViewport, type ViewportOptions } from "./viewport";

export interface RendererScheduler {
  request(callback: () => void): unknown;
  cancel(handle: unknown): void;
}

export interface RendererStats {
  fps: number;
  frameCount: number;
  dirtyRows: number;
  spanCount: number;
  layoutMs: number;
  rasterMs: number;
  encodeMs: number;
  totalMs: number;
  skippedFrames: number;
  yogaNodes: number;
  cols: number;
  rows: number;
  focused: boolean;
  paused: boolean;
}

export interface FrameResult extends RendererStats {
  skipped: boolean;
}

export interface ConsoleRendererOptions {
  root?: SceneNode | null;
  viewport?: ViewportOptions | ViewportController;
  console?: ConsoleTarget;
  /** Frame replacement strategy (default `"append"`; see `ClearMode`). */
  clear?: ClearMode | boolean;
  /** In `"append"` mode, clear and start over after this many frames (default 300). */
  maxFrames?: number;
  /** Clear before the first frame (default `true`; see `CssConsoleDriverOptions.initialClear`). */
  initialClear?: boolean;
  /** Lead each appended frame with the curtain span (see `CssConsoleDriverOptions.curtain`). */
  curtain?: boolean;
  /**
   * `performance.now()` of a frame logged (and cleared) before this renderer
   * started, e.g. a prerendered shell: the first frame keeps the post-clear
   * pacing window it opened.
   */
  previousFrameAt?: number;
  typography?: Partial<ConsoleTypographyOptions>;
  style?: Partial<StyleResolveOptions>;
  scheduler?: RendererScheduler;
  /**
   * Minimum milliseconds between emitted frames. DevTools repaints new console
   * messages on a 50ms throttle that restarts when a message arrives early, so
   * frames sent faster than ~15fps are dropped and add latency rather than
   * smoothness. Defaults to 66 with the default scheduler and 0 with a custom one.
   */
  minFrameInterval?: number;
  /** Create (true), reuse (instance) or skip (false) the input engine. Defaults to `true` in browsers. */
  input?: InputEngine | boolean;
  /** Register `window.text` (or a custom global name). Defaults to `true` in browsers. */
  registerGlobal?: boolean | string;
  /** Background painted behind the scene (default: theme background). */
  background?: ColorInput;
  wireframe?: boolean;
  /** Called before layout on every scheduled frame (e.g. to flush a reconciler). */
  beforeFrame?: () => void;
  onFrame?: (result: FrameResult) => void;
}

/** The `window.text` console REPL helper. */
export interface TextConsoleApi {
  resize(cols: number, rows: number): RendererStats;
  responsive(enabled?: boolean): RendererStats;
  pause(): void;
  resume(): void;
  stats(): RendererStats;
  copyText(): string;
  wireframe(enabled?: boolean): boolean;
  help(): string;
  readonly renderer: ConsoleRenderer;
}

const now: () => number =
  typeof performance !== "undefined" && typeof performance.now === "function" ? () => performance.now() : () => Date.now();

const SYNC_FLUSH_INTERVAL_MS = 8;
const DEFAULT_FRAME_INTERVAL_MS = 66;
/**
 * After `console.clear() + console.log(frame)`, DevTools' synthetic "Console was
 * cleared" row takes `viewportThrottler`'s immediate slot and pushes `frame` onto
 * a 50ms timer (`lastCompleteTime ≈ t_emit + 52ms`). Waiting ≥110ms before the
 * next frame ensures `now - lastCompleteTime > 50ms` so every subsequent frame
 * hits DevTools' 0ms fast path (~12ms display lag instead of ~63ms phase-locked lag).
 */
const POST_CLEAR_INTERVAL_MS = 110;
const FRAME_RING_CAP = 256;
const FRAME_RING_MASK = FRAME_RING_CAP - 1;

const DRIVER_NORMAL: Readonly<DriverRenderOptions> = Object.freeze({ force: false });
const DRIVER_FORCE: Readonly<DriverRenderOptions> = Object.freeze({ force: true });

const hasWindow = typeof window !== "undefined" && typeof document !== "undefined";

function isAttached(node: SceneNode, root: SceneNode): boolean {
  if (node.isDestroyed) return false;
  let cur: SceneNode = node;
  while (cur.parent !== null) cur = cur.parent;
  return cur === root;
}

function makeFrameResult(t: RendererStats, skipped: boolean): FrameResult {
  return {
    fps: t.fps,
    frameCount: t.frameCount,
    dirtyRows: t.dirtyRows,
    spanCount: t.spanCount,
    layoutMs: t.layoutMs,
    rasterMs: t.rasterMs,
    encodeMs: t.encodeMs,
    totalMs: t.totalMs,
    skippedFrames: t.skippedFrames,
    yogaNodes: t.yogaNodes,
    cols: t.cols,
    rows: t.rows,
    focused: t.focused,
    paused: t.paused,
    skipped,
  };
}

export function createDefaultScheduler(): RendererScheduler {
  if (typeof requestAnimationFrame === "function") {
    return {
      request: (cb) => requestAnimationFrame(cb),
      cancel: (h) => cancelAnimationFrame(h as number),
    };
  }
  return {
    request: (cb) => setTimeout(cb, 16),
    cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  };
}

const HELP = `▼ Text.js · window.text
  text.resize(cols, rows)   pin the console grid size
  text.responsive(true)     follow the docked DevTools size
  text.pause() / resume()   freeze output (select & copy freely)
  text.stats()              frame telemetry
  text.copyText()           copy the current frame as plain text
  text.wireframe(on?)       toggle the layout wireframe overlay
  text.help()               this message`;

export class ConsoleRenderer {
  readonly buffer: CellBuffer;
  readonly driver: CssConsoleDriver;
  readonly viewport: ViewportController;
  readonly input: InputEngine | null;
  private root: SceneNode | null;
  private readonly scheduler: RendererScheduler;
  private readonly options: ConsoleRendererOptions;
  private readonly background: number;
  private handle: unknown = null;
  private delay: ReturnType<typeof setTimeout> | null = null;
  private scheduled = false;
  private readonly frameInterval: number;
  private readonly postClearInterval: number;
  private lastEmitAt = -Infinity;
  private lastEmitCleared = false;
  private pendingForce = false;
  private pendingWhileHidden = false;
  private docHidden = false;
  private isPaused = false;
  private disposed = false;
  private wireframe: boolean;
  private highlighted: SceneNode | null = null;
  private focusedNode: SceneNode | null = null;
  private readonly paintOpts: PaintOptions;
  private readonly frameTimes = new Float64Array(FRAME_RING_CAP);
  private frameRingHead = 0;
  private frameRingSize = 0;
  private readonly cleanup: Array<() => void> = [];
  private readonly focusListeners = new Set<(focused: boolean) => void>();
  private globalName: string | null = null;
  private lastSyncFlushAt = -Infinity;
  private telemetry: RendererStats;

  constructor(options: ConsoleRendererOptions = {}) {
    this.options = options;
    this.root = options.root ?? null;
    this.viewport = options.viewport instanceof ViewportController ? options.viewport : new ViewportController(options.viewport ?? {});
    this.buffer = new CellBuffer(this.viewport.cols, this.viewport.rows);
    this.driver = new CssConsoleDriver({
      console: options.console,
      clear: options.clear,
      maxFrames: options.maxFrames,
      initialClear: options.initialClear,
      curtain: options.curtain,
      typography: options.typography,
      style: options.style,
    });
    this.scheduler = options.scheduler ?? createDefaultScheduler();
    this.frameInterval = Math.max(0, options.minFrameInterval ?? (options.scheduler ? 0 : DEFAULT_FRAME_INTERVAL_MS));
    this.postClearInterval =
      options.minFrameInterval === undefined && options.scheduler === undefined ? POST_CLEAR_INTERVAL_MS : this.frameInterval;
    this.background = parseColor(options.background);
    this.wireframe = options.wireframe ?? false;
    if (options.previousFrameAt !== undefined && Number.isFinite(options.previousFrameAt)) {
      this.lastEmitAt = options.previousFrameAt;
      this.lastEmitCleared = true;
    }
    this.paintOpts = {
      clearBg: this.background,
      wireframe: this.wireframe,
      highlightedNode: null,
      focusedNode: null,
    };
    const inputOpt = options.input ?? hasWindow;
    this.input = inputOpt instanceof InputEngine ? inputOpt : inputOpt ? new InputEngine() : null;
    this.telemetry = {
      fps: 0,
      frameCount: 0,
      dirtyRows: 0,
      spanCount: 0,
      layoutMs: 0,
      rasterMs: 0,
      encodeMs: 0,
      totalMs: 0,
      skippedFrames: 0,
      yogaNodes: 0,
      cols: this.buffer.width,
      rows: this.buffer.height,
      focused: this.input?.focused ?? true,
      paused: false,
    };
    this.cleanup.push(this.viewport.subscribe((size) => this.applySize(size)));
    if (this.input) {
      if (!(inputOpt instanceof InputEngine)) this.input.attach();
      this.cleanup.push(this.input.on("focus", (e: FocusChangeEvent) => this.setFocused(e.focused)));
    }
    if (!options.scheduler && hasWindow && typeof document.addEventListener === "function") {
      this.docHidden = document.visibilityState === "hidden";
      const onVis = (): void => {
        const hidden = document.visibilityState === "hidden";
        if (hidden === this.docHidden) return;
        this.docHidden = hidden;
        if (hidden) {
          if (this.scheduled) {
            this.cancelScheduled();
            this.pendingWhileHidden = true;
          }
        } else if (this.pendingWhileHidden) {
          this.pendingWhileHidden = false;
          this.requestRender(this.pendingForce);
        }
      };
      document.addEventListener("visibilitychange", onVis);
      this.cleanup.push(() => document.removeEventListener("visibilitychange", onVis));
    }
    const reg = options.registerGlobal ?? hasWindow;
    if (reg) {
      const name = typeof reg === "string" ? reg : "text";
      // Implicit registration never steals `window.text` from another live renderer.
      const existing = (globalThis as Record<string, unknown>)[name] as TextConsoleApi | undefined;
      const owned = existing?.renderer instanceof ConsoleRenderer && !existing.renderer.disposed;
      if (options.registerGlobal !== undefined || !owned) this.registerGlobal(name);
    }
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------

  setRoot(root: SceneNode | null): void {
    this.root = root;
    this.requestRender(true);
  }

  getRoot(): SceneNode | null {
    return this.root;
  }

  setWireframe(enabled: boolean): void {
    this.wireframe = enabled;
    this.requestRender();
  }

  setHighlightedNode(node: SceneNode | null): void {
    this.highlighted = node;
    this.requestRender();
  }

  setFocusedNode(node: SceneNode | null): void {
    this.focusedNode = node;
    this.requestRender();
  }

  get focused(): boolean {
    return this.telemetry.focused;
  }

  get paused(): boolean {
    return this.isPaused;
  }

  onFocusChange(listener: (focused: boolean) => void): () => void {
    this.focusListeners.add(listener);
    return () => this.focusListeners.delete(listener);
  }

  /** Update page focus state (driven by the input engine; callable manually). */
  setFocused(focused: boolean): void {
    if (this.telemetry.focused === focused) return;
    this.telemetry.focused = focused;
    for (const l of this.focusListeners) l(focused);
    this.requestRender();
  }

  // ---------------------------------------------------------------------------
  // Scheduling
  // ---------------------------------------------------------------------------

  /**
   * Schedule a frame on the next animation frame (coalesced), or once
   * `minFrameInterval` has passed since the last emitted frame.
   */
  requestRender(force = false): void {
    if (this.disposed) return;
    if (force) this.pendingForce = true;
    if (this.docHidden) {
      this.pendingWhileHidden = true;
      return;
    }
    if (this.isPaused || this.scheduled) return;
    this.scheduled = true;
    const interval = this.lastEmitCleared ? this.postClearInterval : this.frameInterval;
    const wait = this.lastEmitAt + interval - now();
    if (wait > 1) this.delay = setTimeout(this.runScheduled, wait);
    else this.handle = this.scheduler.request(this.runScheduled);
  }

  private readonly runScheduled = (): void => {
    this.scheduled = false;
    this.handle = null;
    this.delay = null;
    const f = this.pendingForce;
    this.pendingForce = false;
    this.renderNow(f);
  };

  private cancelScheduled(): void {
    if (this.handle !== null) this.scheduler.cancel(this.handle);
    if (this.delay !== null) clearTimeout(this.delay);
    this.handle = null;
    this.delay = null;
    this.scheduled = false;
  }

  /**
   * Render discrete input (a keypress, a paste) synchronously in the same task
   * instead of waiting for the next animation frame. Within `minFrameInterval`
   * of the last frame (and always at >120fps) it coalesces into a scheduled frame.
   */
  flushInputFrame(): FrameResult | null {
    if (this.disposed || this.isPaused) return null;
    const t = now();
    const interval = this.lastEmitCleared ? this.postClearInterval : this.frameInterval;
    if (t - this.lastSyncFlushAt < SYNC_FLUSH_INTERVAL_MS || t - this.lastEmitAt < interval) {
      this.requestRender();
      return null;
    }
    this.lastSyncFlushAt = t;
    this.cancelScheduled();
    const f = this.pendingForce;
    this.pendingForce = false;
    return this.renderNow(f);
  }

  /** Lay out, paint and emit a frame synchronously. */
  renderNow(force = false): FrameResult {
    const t = this.telemetry;
    if (this.disposed || this.isPaused) return makeFrameResult(t, true);
    const t0 = now();
    this.options.beforeFrame?.();
    const root = this.root;
    const buf = this.buffer;
    if (root) {
      if (force) root._fullDamage = true;
      root.calculateLayout(buf.width, buf.height);
    }
    const t1 = now();
    this.paint(root);
    const t2 = now();
    const result = this.driver.render(buf, force ? DRIVER_FORCE : DRIVER_NORMAL);
    const t3 = now();
    t.layoutMs = t1 - t0;
    t.rasterMs = t2 - t1;
    t.encodeMs = t3 - t2;
    t.totalMs = t3 - t0;
    t.cols = buf.width;
    t.rows = buf.height;
    if (result.skipped) t.skippedFrames++;
    else {
      this.lastEmitAt = t3;
      this.lastEmitCleared = result.cleared === true;
      t.frameCount++;
      t.dirtyRows = result.dirtyRows;
      t.spanCount = result.spanCount;
      const ring = this.frameTimes;
      let head = this.frameRingHead;
      let size = this.frameRingSize;
      const cutoff = t3 - 1000;
      while (size > 0 && (ring[head] as number) < cutoff) {
        head = (head + 1) & FRAME_RING_MASK;
        size--;
      }
      if (size < FRAME_RING_CAP) {
        ring[(head + size) & FRAME_RING_MASK] = t3;
        size++;
      } else {
        ring[head] = t3;
        head = (head + 1) & FRAME_RING_MASK;
      }
      this.frameRingHead = head;
      this.frameRingSize = size;
      t.fps = size;
      if (root && t.frameCount % 30 === 1) t.yogaNodes = root.countYogaNodes();
    }
    const frame = makeFrameResult(t, result.skipped);
    this.options.onFrame?.(frame);
    return frame;
  }

  private paint(root: SceneNode | null): void {
    const buf = this.buffer;
    if (!root) {
      buf.clear(this.background);
      return;
    }
    // A highlighted node that was unmounted would otherwise keep incremental painting off.
    if (this.highlighted !== null && !isAttached(this.highlighted, root)) this.highlighted = null;
    const po = this.paintOpts;
    po.wireframe = this.wireframe;
    po.highlightedNode = this.highlighted;
    po.focusedNode = this.focusedNode;
    paintScene(root, buf, po);
  }

  /**
   * Lay out and paint into `buffer` without emitting a console frame, even while
   * paused. Inspectors use it so a resize, wireframe or highlight is reflected in
   * the buffer (and `copyText()`) while output is frozen.
   */
  rasterize(): void {
    if (this.disposed) return;
    const root = this.root;
    if (root) {
      root._fullDamage = true;
      root.calculateLayout(this.buffer.width, this.buffer.height);
    }
    this.paint(root);
  }

  // ---------------------------------------------------------------------------
  // Control
  // ---------------------------------------------------------------------------

  private applySize(size: ResolvedViewport): void {
    if (size.cols === this.buffer.width && size.rows === this.buffer.height) return;
    this.buffer.resize(size.cols, size.rows);
    this.telemetry.cols = size.cols;
    this.telemetry.rows = size.rows;
    this.requestRender(true);
  }

  resize(cols: number, rows: number): void {
    this.viewport.setSize(Math.max(1, Math.floor(cols)), Math.max(1, Math.floor(rows)));
    this.applySize(this.viewport.getSize());
  }

  pause(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.telemetry.paused = true;
    this.cancelScheduled();
  }

  resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.telemetry.paused = false;
    this.driver.invalidate();
    this.requestRender(true);
  }

  stats(): RendererStats {
    return { ...this.telemetry };
  }

  /** Plain-text copy of the current frame (also written to the clipboard when possible). */
  copyText(): string {
    const text = this.buffer.toPlainString(true).replace(/\n+$/, "");
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
    return text;
  }

  private registerGlobal(name: string): void {
    const api: TextConsoleApi = {
      resize: (cols, rows) => {
        this.resize(cols, rows);
        return this.stats();
      },
      responsive: (enabled = true) => {
        this.viewport.setResponsive(enabled);
        this.applySize(this.viewport.getSize());
        return this.stats();
      },
      pause: () => this.pause(),
      resume: () => this.resume(),
      stats: () => this.stats(),
      copyText: () => this.copyText(),
      wireframe: (enabled) => {
        this.setWireframe(enabled ?? !this.wireframe);
        return this.wireframe;
      },
      help: () => {
        if (typeof console !== "undefined") console.log(HELP);
        return HELP;
      },
      renderer: this,
    };
    (globalThis as Record<string, unknown>)[name] = api;
    this.globalName = name;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelScheduled();
    for (const fn of this.cleanup) fn();
    if (this.input && !(this.options.input instanceof InputEngine)) this.input.detach();
    this.viewport.dispose();
    if (this.globalName !== null) {
      const g = globalThis as Record<string, unknown>;
      if ((g[this.globalName] as TextConsoleApi | undefined)?.renderer === this) delete g[this.globalName];
    }
  }
}
