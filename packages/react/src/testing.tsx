/**
 * `@textjs/react/testing` — render Text.js apps headlessly, drive them with
 * keys and assert on the frame as plain text.
 *
 * ```tsx
 * const app = await render(<Counter />, { cols: 40, rows: 6 });
 * await app.press("up");
 * expect(app.lastFrame()).toContain("count = 1");
 * ```
 */

import { act, type ReactNode } from "react";
import {
  initYoga,
  InputEngine,
  renderToAnsi,
  type AnsiRenderOptions,
  type ConsoleTarget,
  type PackedColor,
  type RendererScheduler,
} from "@textjs/core";
import { keyEventFromCombo } from "./keys";
import { createConsoleRootSync, type ConsoleRoot, type ConsoleRootOptions } from "./root";

// Yoga's WebAssembly loads through `fetch` (a data: URL). Start it on import, before a test can stub `fetch`.
void initYoga();

function enableActEnvironment(): void {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
}

class NullConsole implements ConsoleTarget {
  logs = 0;
  clear(): void {}
  log(): void {
    this.logs++;
  }
}

class ManualScheduler implements RendererScheduler {
  queue: Array<() => void> = [];
  request(cb: () => void): unknown {
    this.queue.push(cb);
    return cb;
  }
  cancel(handle: unknown): void {
    this.queue = this.queue.filter((c) => c !== handle);
  }
  flush(): boolean {
    const q = this.queue;
    if (q.length === 0) return false;
    this.queue = [];
    for (const cb of q) cb();
    return true;
  }
}

export interface RenderOptions extends Omit<ConsoleRootOptions, "console" | "scheduler" | "input" | "width" | "height"> {
  /** Grid width in cells (default `80`). */
  cols?: number;
  /** Grid height in cells (default `24`). */
  rows?: number;
}

export interface FrameOptions {
  /** Keep trailing blank lines and trailing spaces (default `false`). */
  raw?: boolean;
}

export interface CellInfo {
  char: string;
  /** Packed `0xRRGGBBAA`. */
  fg: PackedColor;
  bg: PackedColor;
  attrs: number;
}

export interface WaitOptions {
  /** Default `1000` ms. */
  timeout?: number;
  /** Poll interval (default `10` ms). */
  interval?: number;
}

export interface RenderResult {
  readonly root: ConsoleRoot;
  readonly engine: InputEngine;
  /** The current frame as plain text (trailing whitespace trimmed). */
  lastFrame(options?: FrameOptions): string;
  /** The current frame as lines. */
  lines(): string[];
  /** The current frame as a truecolor ANSI string (for snapshots and terminals). */
  toAnsi(options?: AnsiRenderOptions): string;
  /** Every distinct frame emitted so far, as plain text. */
  readonly frames: readonly string[];
  /** Cell at `(x, y)`. */
  cell(x: number, y: number): CellInfo | null;
  /** Position of the first occurrence of `text`, or `null`. */
  locate(text: string): { x: number; y: number } | null;
  /** Re-render with a new element. */
  rerender(element: ReactNode): Promise<void>;
  /** Press a key combo: `"down"`, `"ctrl+k"`, `"shift+tab"`, `"G"`, `"?"`. Space-separated combos press in order. */
  press(keys: string): Promise<void>;
  /** Type text one key at a time. */
  type(text: string): Promise<void>;
  paste(text: string): Promise<void>;
  /** Scroll by `rows` (positive scrolls down). */
  wheel(rows: number): Promise<void>;
  /** Resize the grid. */
  resize(cols: number, rows: number): Promise<void>;
  /** Run `fn` inside `act()` and flush the resulting frame. */
  act(fn: () => void | Promise<void>): Promise<void>;
  /** Let `ms` of real time pass (timers, animations), then flush. */
  wait(ms: number): Promise<void>;
  /** Poll until `fn` stops throwing / returns non-false, flushing frames between attempts. */
  waitFor<T>(fn: () => T, options?: WaitOptions): Promise<T>;
  /** Wait until the frame contains `text`. */
  waitForText(text: string, options?: WaitOptions): Promise<void>;
  unmount(): Promise<void>;
}

const mounted = new Set<RenderResult>();

/** Render `element` into an offscreen console grid. */
export async function render(element: ReactNode, options: RenderOptions = {}): Promise<RenderResult> {
  enableActEnvironment();
  await initYoga();
  const { cols = 80, rows = 24, ...rootOptions } = options;
  const scheduler = new ManualScheduler();
  const engine = new InputEngine({ document: null });
  const root = createConsoleRootSync({
    registerGlobal: false,
    ...rootOptions,
    width: cols,
    height: rows,
    console: new NullConsole(),
    scheduler,
    input: engine,
  });
  const frames: string[] = [];
  const snapshot = (): string => root.renderer.buffer.toPlainString(true).replace(/\n+$/, "");
  root.onFrame((f) => {
    if (f.skipped) return;
    const text = snapshot();
    if (frames[frames.length - 1] !== text) frames.push(text);
  });

  // Frames can schedule follow-up work (measurement, effects); settle a few rounds.
  const flush = async (): Promise<void> => {
    for (let i = 0; i < 8; i++) {
      let ran = false;
      await act(async () => {
        ran = scheduler.flush();
      });
      if (!ran) break;
    }
  };

  const runAct = async (fn: () => void | Promise<void>): Promise<void> => {
    await act(async () => {
      await fn();
    });
    await flush();
  };

  const emitKey = async (combo: string): Promise<void> => {
    const event = keyEventFromCombo(combo);
    await runAct(() => engine.emit("key", event));
  };

  const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

  const result: RenderResult = {
    root,
    engine,
    lastFrame(opts = {}) {
      if (opts.raw) return root.renderer.buffer.toPlainString(false);
      return snapshot();
    },
    lines() {
      return snapshot().split("\n");
    },
    toAnsi(opts) {
      return renderToAnsi(root.renderer.buffer, { trimEnd: true, ...opts });
    },
    frames,
    cell(x, y) {
      return root.renderer.buffer.getCell(x, y);
    },
    locate(text) {
      const lines = snapshot().split("\n");
      for (let y = 0; y < lines.length; y++) {
        const x = (lines[y] as string).indexOf(text);
        if (x >= 0) return { x, y };
      }
      return null;
    },
    async rerender(next) {
      await runAct(() => root.render(next));
    },
    async press(keys) {
      const trimmed = keys.trim();
      if (trimmed === "") {
        await emitKey("space");
        return;
      }
      for (const combo of trimmed.split(/\s+/)) await emitKey(combo);
    },
    async type(text) {
      for (const ch of text) {
        if (ch === "\n") {
          await emitKey("return");
          continue;
        }
        const upper = ch.length === 1 && ch >= "A" && ch <= "Z";
        await runAct(() =>
          engine.emit("key", {
            type: "key",
            key: ch === " " ? "space" : ch.toLowerCase(),
            input: ch,
            code: "",
            repeat: false,
            ctrl: false,
            meta: false,
            shift: upper,
            alt: false,
          }),
        );
      }
    },
    async paste(text) {
      await runAct(() => engine.handlePaste(text));
    },
    async wheel(r) {
      await runAct(() =>
        engine.emit("wheel", { type: "wheel", deltaX: 0, deltaY: r * 16, rows: r, cols: 0, ctrl: false, meta: false, shift: false, alt: false }),
      );
    },
    async resize(c, r) {
      await runAct(() => root.renderer.resize(c, r));
    },
    act: runAct,
    async wait(ms) {
      await act(async () => {
        await sleep(ms);
      });
      await flush();
    },
    async waitFor(fn, opts = {}) {
      const timeout = opts.timeout ?? 1000;
      const interval = opts.interval ?? 10;
      const start = Date.now();
      let lastError: unknown;
      for (;;) {
        await flush();
        try {
          const v = fn();
          if ((v as unknown) !== false) return v;
          lastError = new Error("waitFor: callback returned false");
        } catch (e) {
          lastError = e;
        }
        if (Date.now() - start > timeout) throw lastError;
        await act(async () => {
          await sleep(interval);
        });
      }
    },
    async waitForText(text, opts) {
      await result.waitFor(() => {
        if (!snapshot().includes(text)) throw new Error(`waitForText: "${text}" not found in frame:\n${snapshot()}`);
      }, opts);
    },
    async unmount() {
      mounted.delete(result);
      if (root.unmounted) return;
      await act(async () => {
        root.unmount();
      });
    },
  };
  mounted.add(result);
  try {
    await runAct(() => root.render(element));
  } catch (error) {
    // React leaves its act() queue open when an act callback throws, which breaks every later
    // update outside act(). The caller never gets a handle here, so unmount (closing the queue) ourselves.
    await result.unmount().catch(() => {});
    throw error;
  }
  return result;
}

/** Unmount every root created by `render()` (call from `afterEach`). */
export async function cleanup(): Promise<void> {
  for (const r of [...mounted]) await r.unmount();
}

/** Render once and return the frame as plain text. */
export async function renderToString(element: ReactNode, options: RenderOptions = {}): Promise<string> {
  const r = await render(element, options);
  const text = r.lastFrame();
  await r.unmount();
  return text;
}

export { keyEventFromCombo } from "./keys";
