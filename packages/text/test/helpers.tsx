import { act, type ReactNode } from "react";
import { initYoga, InputEngine, type ConsoleTarget, type KeyboardEventLike, type RendererScheduler } from "@textjs/core";
import { createConsoleRootSync, type ConsoleRoot, type ConsoleRootOptions } from "@textjs/react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export class FakeConsole implements ConsoleTarget {
  clears = 0;
  logs: unknown[][] = [];
  clear(): void {
    this.clears++;
  }
  log(...args: unknown[]): void {
    this.logs.push(args);
  }
}

export class ManualScheduler implements RendererScheduler {
  queue: Array<() => void> = [];
  request(cb: () => void): unknown {
    this.queue.push(cb);
    return cb;
  }
  cancel(handle: unknown): void {
    this.queue = this.queue.filter((c) => c !== handle);
  }
  flush(): void {
    const q = this.queue;
    this.queue = [];
    for (const cb of q) cb();
  }
}

export interface TestRoot {
  root: ConsoleRoot;
  console: FakeConsole;
  scheduler: ManualScheduler;
  engine: InputEngine;
  /** Render (inside act) and flush one frame. */
  render(element: ReactNode): Promise<void>;
  /** Flush scheduled frames and return the plain-text frame. */
  frame(): string;
  lines(): string[];
  press(key: string, mods?: Partial<KeyboardEventLike>): Promise<void>;
  /** Emit a normalized key event directly (bypasses browser-shortcut passthrough). */
  emitKey(key: string, mods?: { ctrl?: boolean; meta?: boolean; alt?: boolean; shift?: boolean; input?: string }): Promise<void>;
  type(text: string): Promise<void>;
  paste(text: string): Promise<void>;
  wheel(rows: number): Promise<void>;
  act(fn: () => void | Promise<void>): Promise<void>;
  unmount(): Promise<void>;
}

export async function setup(): Promise<void> {
  await initYoga();
}

export async function createTestRoot(options: ConsoleRootOptions = {}): Promise<TestRoot> {
  await initYoga();
  const con = new FakeConsole();
  const scheduler = new ManualScheduler();
  const engine = new InputEngine({ document: null });
  const root = createConsoleRootSync({
    width: 40,
    height: 10,
    console: con,
    scheduler,
    input: engine,
    registerGlobal: false,
    ...options,
  });
  const frame = (): string => {
    scheduler.flush();
    return root.renderer.buffer.toPlainString(true).replace(/\n+$/, "");
  };
  const press = async (key: string, mods: Partial<KeyboardEventLike> = {}): Promise<void> => {
    await act(async () => {
      engine.handleKeyDown({
        key,
        code: "",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault() {},
        ...mods,
      });
    });
  };
  return {
    root,
    console: con,
    scheduler,
    engine,
    async render(element) {
      await act(async () => {
        root.render(element);
      });
      scheduler.flush();
    },
    frame,
    async emitKey(key, mods = {}) {
      await act(async () => {
        engine.emit("key", {
          type: "key",
          key,
          input: mods.input ?? "",
          code: "",
          repeat: false,
          ctrl: mods.ctrl ?? false,
          meta: mods.meta ?? false,
          alt: mods.alt ?? false,
          shift: mods.shift ?? false,
        });
      });
    },
    lines: () => frame().split("\n"),
    press,
    async type(text) {
      for (const ch of text) await press(ch);
    },
    async paste(text) {
      await act(async () => {
        engine.handlePaste(text);
      });
    },
    async wheel(rows) {
      await act(async () => {
        engine.handleWheel({ deltaX: 0, deltaY: rows * 16, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false });
      });
    },
    async act(fn) {
      await act(async () => {
        await fn();
      });
    },
    async unmount() {
      await act(async () => {
        root.unmount();
      });
    },
  };
}

/** Run outside the act() test environment, like production code. */
export async function withoutActEnvironment<T>(fn: () => Promise<T> | T): Promise<T> {
  const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const prev = g.IS_REACT_ACT_ENVIRONMENT;
  g.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    return await fn();
  } finally {
    // Restore whatever the surrounding test file set (not unconditionally `true`).
    g.IS_REACT_ACT_ENVIRONMENT = prev;
  }
}

/** Capture console.error / console.warn output while `fn` runs. */
export async function captureWarnings(fn: () => Promise<void> | void): Promise<unknown[][]> {
  const out: unknown[][] = [];
  const e = console.error;
  const w = console.warn;
  console.error = (...a: unknown[]) => void out.push(a);
  console.warn = (...a: unknown[]) => void out.push(a);
  try {
    await fn();
  } finally {
    console.error = e;
    console.warn = w;
  }
  return out;
}
