import { act, type ReactNode } from "react";
import { initYoga, InputEngine, type ConsoleTarget, type RendererScheduler } from "@textjs/core";
import { createConsoleRootSync, type ConsoleRoot, type ConsoleRootOptions } from "@textjs/react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Captures what the renderer would send to DevTools. */
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

/** rAF stand-in: frames only run when the test flushes. */
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
  render(element: ReactNode): Promise<void>;
  /** Flush pending frames and return the plain-text grid. */
  frame(): string;
  press(key: string, mods?: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean; altKey?: boolean; repeat?: boolean }): Promise<void>;
  type(text: string): Promise<void>;
  /** Let timers / fetches settle inside act() without flushing frames. */
  settle(ms?: number): Promise<void>;
  /** Poll until `check()` is truthy (flushing frames between polls). */
  waitFor(check: () => unknown, label?: string, timeoutMs?: number): Promise<void>;
  unmount(): Promise<void>;
}

export async function createTestRoot(options: ConsoleRootOptions = {}): Promise<TestRoot> {
  await initYoga();
  const con = new FakeConsole();
  const scheduler = new ManualScheduler();
  const engine = new InputEngine({ document: null });
  const root = createConsoleRootSync({ console: con, scheduler, input: engine, registerGlobal: false, ...options });
  const frame = (): string => {
    scheduler.flush();
    return root.renderer.buffer.toPlainString(true).replace(/\n+$/, "");
  };
  const press: TestRoot["press"] = async (key, mods = {}) => {
    await act(async () => {
      engine.handleKeyDown({ key, code: "", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, preventDefault() {}, ...mods });
    });
  };
  const settle = async (ms = 15): Promise<void> => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, ms));
    });
  };
  return {
    root,
    console: con,
    scheduler,
    async render(element) {
      await act(async () => {
        root.render(element);
      });
      // The first frame can update state (useMeasure reads layout on frame), so it runs inside act() too.
      await act(async () => {
        scheduler.flush();
      });
    },
    frame,
    press,
    async type(text) {
      for (const ch of text) await press(ch);
    },
    settle,
    async waitFor(check, label = "condition", timeoutMs = 5000) {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        frame();
        if (check()) return;
        if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}\n${frame()}`);
        await settle(15);
      }
    },
    async unmount() {
      await act(async () => {
        root.unmount();
      });
    },
  };
}
