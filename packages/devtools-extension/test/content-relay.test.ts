import { describe, expect, test } from "bun:test";
import { RECONNECT_MS, startContentRelay, type RelayWindow } from "../src/content-relay";
import { CONTENT_PORT, CONTENT_SOURCE, PAGE_SOURCE } from "../src/protocol";
import { portPair, type FakePort } from "./fakes";

class RelayFakeWindow implements RelayWindow {
  posted: any[] = [];
  listeners = new Map<string, Set<(e: any) => void>>();
  timers: Array<{ fn: () => void; ms: number }> = [];
  postMessage(message: unknown): void {
    this.posted.push(message);
  }
  addEventListener(type: string, l: (e: any) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(l);
  }
  setTimeout(fn: () => void, ms: number): unknown {
    this.timers.push({ fn, ms });
    return fn;
  }
  dispatch(type: string, event: object): void {
    for (const l of this.listeners.get(type) ?? []) l(event);
  }
  fromPage(data: object, source: unknown = this): void {
    this.dispatch("message", { source, data: { ...data, source: PAGE_SOURCE } });
  }
  runTimers(): void {
    const t = this.timers;
    this.timers = [];
    for (const { fn } of t) fn();
  }
}

function setup() {
  const win = new RelayFakeWindow();
  const workers: FakePort[] = [];
  const runtime = {
    connect(info: { name: string }) {
      const [client, worker] = portPair(info.name);
      workers.push(worker);
      return client;
    },
  };
  const relay = startContentRelay(win, runtime);
  return { win, workers, relay, worker: () => workers.at(-1)! };
}

describe("content relay", () => {
  test("stays silent on pages without console roots", () => {
    const { win, workers } = setup();
    win.fromPage({ kind: "hello", roots: 0, protocol: 1 });
    win.fromPage({ kind: "event", event: "roots", roots: [] });
    expect(workers).toHaveLength(0);
  });

  test("connects on hello with roots and forwards only responses and events", () => {
    const { win, workers, worker } = setup();
    win.fromPage({ kind: "hello", roots: 2, protocol: 1 });
    expect(workers).toHaveLength(1);
    expect(worker().name).toBe(CONTENT_PORT);
    win.fromPage({ kind: "hello", roots: 3, protocol: 1 });
    expect(workers).toHaveLength(1);
    expect(worker().received).toHaveLength(0);

    win.fromPage({ kind: "response", id: 1, ok: true, result: 1 });
    win.fromPage({ kind: "event", event: "frames", records: [] });
    for (const kind of ["status", "init", "attach", "detach", "request", "ping", undefined]) win.fromPage({ kind, page: "disconnected" });
    expect(worker().received).toEqual([
      { kind: "response", id: 1, ok: true, result: 1 },
      { kind: "event", event: "frames", records: [] },
    ]);
  });

  test("ignores messages from other windows or without the page tag", () => {
    const { win, workers } = setup();
    win.fromPage({ kind: "hello", roots: 1, protocol: 1 }, {});
    win.dispatch("message", { source: win, data: { kind: "hello", roots: 1, source: "nope" } });
    win.dispatch("message", { source: win, data: null });
    win.dispatch("message", { source: win, data: "hello" });
    expect(workers).toHaveLength(0);
  });

  test("rejects malformed hello root counts", () => {
    const { win, workers } = setup();
    for (const roots of ["1", Number.NaN, -1, 1.5, null, Number.POSITIVE_INFINITY]) win.fromPage({ kind: "hello", roots });
    expect(workers).toHaveLength(0);
  });

  test("disconnects when the last root goes away", () => {
    const { win, worker, relay } = setup();
    win.fromPage({ kind: "hello", roots: 1 });
    const w = worker();
    let closed = false;
    w.onDisconnect.addListener(() => (closed = true));
    win.fromPage({ kind: "hello", roots: 0 });
    expect(closed).toBe(true);
    expect(relay.connected).toBe(false);
    expect(win.posted.at(-1)).toEqual({ kind: "detach", source: CONTENT_SOURCE });
    win.runTimers();
    expect(relay.connected).toBe(false);
  });

  test("relays only control messages from the worker to the page", () => {
    const { win, worker } = setup();
    win.fromPage({ kind: "hello", roots: 1 });
    const w = worker();
    w.postMessage({ kind: "attach" });
    w.postMessage({ kind: "request", id: 1, method: "tree", root: 1, args: [] });
    w.postMessage({ kind: "status", page: "connected" });
    w.postMessage({ kind: "hello", roots: 9 });
    w.postMessage(null);
    expect(win.posted).toEqual([
      { kind: "attach", source: CONTENT_SOURCE },
      { kind: "request", id: 1, method: "tree", root: 1, args: [], source: CONTENT_SOURCE },
    ]);
  });

  test("reconnects after the worker drops the port", () => {
    const { win, workers, worker, relay } = setup();
    win.fromPage({ kind: "hello", roots: 1 });
    worker().disconnect();
    expect(relay.connected).toBe(false);
    expect(win.posted.at(-1)).toEqual({ kind: "detach", source: CONTENT_SOURCE });
    expect(win.timers[0]!.ms).toBe(RECONNECT_MS);
    win.runTimers();
    expect(workers).toHaveLength(2);
    expect(relay.connected).toBe(true);
  });

  test("closes the port when entering the back/forward cache and reopens on restore", () => {
    const { win, workers, worker, relay } = setup();
    win.fromPage({ kind: "hello", roots: 1 });
    const first = worker();
    let closed = false;
    first.onDisconnect.addListener(() => (closed = true));
    win.dispatch("pagehide", { persisted: false });
    expect(closed).toBe(false);
    win.dispatch("pagehide", { persisted: true });
    expect(closed).toBe(true);
    expect(relay.connected).toBe(false);
    win.runTimers();
    expect(workers).toHaveLength(1);
    win.dispatch("pageshow", { persisted: true });
    expect(workers).toHaveLength(2);
    expect(relay.connected).toBe(true);
  });
});
