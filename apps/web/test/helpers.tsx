import { act, type ReactNode } from "react";
import { initYoga, InputEngine, type ConsoleTarget, type RendererScheduler } from "@textjs/core";
import { createConsoleRootSync, type ConsoleRoot, type ThemeName } from "@textjs/react";

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

export interface Harness {
  root: ConsoleRoot;
  console: FakeConsole;
  frame(): string;
  key(key: string, mods?: { ctrl?: boolean; shift?: boolean; input?: string }): Promise<void>;
  type(text: string): Promise<void>;
  wait(ms: number): Promise<void>;
  unmount(): Promise<void>;
}

export async function mount(element: ReactNode, opts: { cols: number; rows: number; theme?: ThemeName; tabFocus?: boolean }): Promise<Harness> {
  await initYoga();
  const con = new FakeConsole();
  const scheduler = new ManualScheduler();
  const engine = new InputEngine({ document: null });
  const root = createConsoleRootSync({
    width: opts.cols,
    height: opts.rows,
    console: con,
    scheduler,
    input: engine,
    registerGlobal: false,
    theme: opts.theme,
    tabFocus: opts.tabFocus ?? true,
  });
  await act(async () => root.render(element));
  // The first frame can update state (useMeasure reads layout on frame), so it runs inside act() too.
  await act(async () => {
    scheduler.flush();
  });
  const frame = (): string => {
    scheduler.flush();
    return root.renderer.buffer.toPlainString(true).replace(/\n+$/, "");
  };
  const key = async (k: string, mods: { ctrl?: boolean; shift?: boolean; input?: string } = {}): Promise<void> => {
    await act(async () => {
      engine.emit("key", { type: "key", key: k, input: mods.input ?? (k.length === 1 ? k : ""), code: "", repeat: false, ctrl: mods.ctrl ?? false, meta: false, alt: false, shift: mods.shift ?? false });
    });
  };
  return {
    root,
    console: con,
    frame,
    key,
    async type(text) {
      for (const ch of text) await key(ch === " " ? "space" : ch.toLowerCase(), { input: ch });
    },
    async wait(ms) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, ms));
      });
    },
    async unmount() {
      await act(async () => root.unmount());
    },
  };
}
