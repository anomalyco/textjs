import { afterEach, describe, expect, test } from "bun:test";
import { DEVTOOLS_HOOK_KEY, type DevToolsFrameRecord, type DevToolsRootHandle, type DevToolsRootInfo } from "@textjs/react/devtools-hook";
import { FRAME_BATCH_MS, startPageBridge, type BridgeWindow, type PageBridge } from "../src/page-bridge";
import { CONTENT_SOURCE, PAGE_SOURCE } from "../src/protocol";

type Listener = (event: { source: unknown; data: unknown }) => void;

class FakeWindow implements BridgeWindow {
  posted: any[] = [];
  listeners = new Set<Listener>();
  timers: Array<() => void> = [];
  postMessage(message: unknown): void {
    this.posted.push(message);
  }
  addEventListener(_: "message", l: Listener): void {
    this.listeners.add(l);
  }
  removeEventListener(_: "message", l: Listener): void {
    this.listeners.delete(l);
  }
  setTimeout(fn: () => void): unknown {
    this.timers.push(fn);
    return fn;
  }
  clearTimeout(h: unknown): void {
    this.timers = this.timers.filter((t) => t !== h);
  }
  /** Deliver a message as the content script would (same window, tagged). */
  fromContent(data: object, source: unknown = this): void {
    for (const l of this.listeners) l({ source, data: { ...data, source: CONTENT_SOURCE } });
  }
  runTimers(): void {
    const t = this.timers;
    this.timers = [];
    for (const fn of t) fn();
  }
  ofKind(kind: string, event?: string): any[] {
    return this.posted.filter((m) => m.kind === kind && (event === undefined || m.event === event));
  }
}

function fakeRoot(): DevToolsRootHandle & { calls: string[]; info(): DevToolsRootInfo } {
  const calls: string[] = [];
  const state = { paused: false, wireframe: false, cols: 80, rows: 24, responsive: true, highlighted: null as number | null };
  return {
    calls,
    info: () => ({ id: 1, name: "App", fps: 0, frameCount: 0, skippedFrames: 0, yogaNodes: 0, ...state }),
    tree: () => (calls.push("tree"), { root: 1, name: "App", nodes: [] }),
    frame: () => (calls.push("frame"), { root: 1, cols: 1, rows: 1, frame: 0, chars: [" "], fg: [0], bg: [0], attrs: [0], owner: [0], owners: {} }),
    highlight: (id) => (calls.push(`highlight:${id}`), (state.highlighted = id), true),
    setWireframe: (on) => void (state.wireframe = on),
    pause: () => void (state.paused = true),
    resume: () => void (state.paused = false),
    resize: (c, r) => void Object.assign(state, { cols: c, rows: r, responsive: false }),
    fit: () => void (state.responsive = true),
    copyText: () => "hello",
  };
}

const record = (over: Partial<DevToolsFrameRecord> = {}): DevToolsFrameRecord => ({
  root: 1,
  t: 0,
  frame: 1,
  skipped: false,
  commits: 0,
  reactMs: 0,
  layoutMs: 0,
  paintMs: 0,
  encodeMs: 0,
  totalMs: 0,
  dirtyRows: 0,
  spanCount: 0,
  cols: 80,
  rows: 24,
  interval: 0,
  ...over,
});

let bridge: PageBridge | null = null;
afterEach(() => {
  bridge?.dispose();
  bridge = null;
  delete (globalThis as Record<string, unknown>)[DEVTOOLS_HOOK_KEY];
});

describe("page bridge", () => {
  test("announces roots, stays idle until attached, then answers requests", () => {
    const win = new FakeWindow();
    bridge = startPageBridge(win, globalThis);
    expect(win.posted).toHaveLength(0);
    const root = fakeRoot();
    const id = bridge.hook.register(root);
    expect(win.ofKind("hello")).toEqual([{ kind: "hello", roots: 1, protocol: 1, source: PAGE_SOURCE }]);
    expect(win.ofKind("event")).toHaveLength(0);
    expect(bridge.hook.active).toBe(false);

    win.fromContent({ kind: "attach" });
    expect(bridge.hook.active).toBe(true);
    expect(win.ofKind("event", "roots")[0].roots[0].name).toBe("App");

    win.fromContent({ kind: "request", id: 7, method: "tree", root: id, args: [] });
    expect(win.ofKind("response").at(-1)).toMatchObject({ id: 7, ok: true, result: { name: "App" } });
    win.fromContent({ kind: "request", id: 8, method: "resize", root: id, args: [9999, "x"] });
    expect(win.ofKind("response").at(-1).result).toMatchObject({ cols: 400, rows: 80, responsive: false });
    win.fromContent({ kind: "request", id: 9, method: "copyText", root: id, args: [] });
    expect(win.ofKind("response").at(-1).result).toBe("hello");
    win.fromContent({ kind: "request", id: 10, method: "tree", root: 42, args: [] });
    expect(win.ofKind("response").at(-1)).toMatchObject({ id: 10, ok: false, error: "No console root #42" });
  });

  test("ignores messages from other windows or without the content tag", () => {
    const win = new FakeWindow();
    bridge = startPageBridge(win, globalThis);
    bridge.hook.register(fakeRoot());
    win.fromContent({ kind: "attach" }, {});
    for (const l of win.listeners) l({ source: win, data: { kind: "attach", source: "someone-else" } });
    expect(bridge.hook.active).toBe(false);
  });

  test("batches frame records and flags commits", () => {
    const win = new FakeWindow();
    bridge = startPageBridge(win, globalThis);
    bridge.hook.register(fakeRoot());
    bridge.hook.emit({ type: "frame", record: record() });
    expect(win.timers).toHaveLength(0);
    win.fromContent({ kind: "attach" });
    bridge.hook.emit({ type: "frame", record: record({ frame: 1 }) });
    bridge.hook.emit({ type: "frame", record: record({ frame: 2, commits: 2 }) });
    bridge.hook.emit({ type: "frame", record: record({ frame: 2, skipped: true }) });
    expect(win.timers).toHaveLength(1);
    expect(win.ofKind("event", "frames")).toHaveLength(0);
    win.runTimers();
    const [batch] = win.ofKind("event", "frames");
    expect(batch.records.map((r: DevToolsFrameRecord) => r.frame)).toEqual([1, 2, 2]);
    expect(batch.committed).toBe(true);
    expect(FRAME_BATCH_MS).toBeGreaterThanOrEqual(100);
  });

  test("detach deactivates the hook and clears highlights", () => {
    const win = new FakeWindow();
    bridge = startPageBridge(win, globalThis);
    const root = fakeRoot();
    const id = bridge.hook.register(root);
    win.fromContent({ kind: "attach" });
    win.fromContent({ kind: "request", id: 1, method: "highlight", root: id, args: [5] });
    win.fromContent({ kind: "detach" });
    expect(bridge.hook.active).toBe(false);
    expect(root.calls).toEqual(["highlight:5", "highlight:null"]);
  });

  test("reports roots registered before the bridge started", () => {
    const win = new FakeWindow();
    const first = startPageBridge(new FakeWindow(), globalThis);
    first.hook.register(fakeRoot());
    first.dispose();
    bridge = startPageBridge(win, globalThis);
    expect(bridge.hook).toBe(first.hook);
    expect(win.ofKind("hello")[0].roots).toBe(1);
  });
});
