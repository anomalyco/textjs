import { describe, expect, test } from "bun:test";
import { useState } from "react";
import { Text, useInput } from "@textjs/react";
import { connectFrameMirror } from "../src/frame-mirror";
import { FrameDecoder, frameToText, type WireFrame } from "../src/frame-protocol";
import { createMemoryHistory } from "../src/history";
import { createTestRoot } from "./helpers";

function fakeHot() {
  const listeners = new Map<string, Set<(p: any) => void>>();
  const sent: Array<{ event: string; data: unknown }> = [];
  const disposers: Array<(data: unknown) => void> = [];
  return {
    sent,
    disposers,
    dispose(cb: (data: unknown) => void) {
      disposers.push(cb);
    },
    listenerCount() {
      let n = 0;
      for (const set of listeners.values()) n += set.size;
      return n;
    },
    on(event: string, cb: (p: any) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
    },
    off(event: string, cb: (p: any) => void) {
      listeners.get(event)?.delete(cb);
    },
    send(event: string, data?: unknown) {
      sent.push({ event, data });
    },
    emit(event: string, payload: unknown) {
      for (const cb of listeners.get(event) ?? []) cb(payload);
    },
  };
}

function Counter() {
  const [n, setN] = useState(0);
  useInput((e) => {
    if (e.key === "up") setN((c) => c + 1);
  });
  return <Text>count={n}</Text>;
}

describe("connectFrameMirror", () => {
  test("is idle until a watcher appears, then streams frames and applies input", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    await t.render(<Counter />);
    const hot = fakeHot();
    const history = createMemoryHistory("/start");
    const dispose = connectFrameMirror(t.root, hot, history);
    expect(hot.sent.map((m) => m.event)).toEqual(["textjs:hello"]);

    t.frame();
    expect(hot.sent.filter((m) => m.event === "textjs:frame")).toHaveLength(0);

    hot.emit("textjs:mirror", { active: true });
    const frames = () => hot.sent.filter((m) => m.event === "textjs:frame").map((m) => m.data as WireFrame);
    expect(frames()).toHaveLength(1);
    expect(frames()[0]).toMatchObject({ full: true, meta: { path: "/start" } });

    await t.act(() => hot.emit("textjs:input", { type: "key", key: "ArrowUp", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }));
    t.frame();
    const dec = new FrameDecoder();
    for (const f of frames()) dec.apply(f);
    expect(frameToText(dec.frame!)).toBe("count=1");
    expect(frames().at(-1)?.full).toBe(false);

    hot.emit("textjs:input", { type: "navigate", href: "/logs" });
    expect(history.getLocation().pathname).toBe("/logs");
    hot.emit("textjs:input", { type: "navigate", href: "https://evil.example" });
    expect(history.getLocation().pathname).toBe("/logs");

    hot.emit("textjs:mirror", { active: false });
    const count = frames().length;
    await t.act(() => hot.emit("textjs:input", { type: "key", key: "ArrowUp", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }));
    t.frame();
    expect(frames()).toHaveLength(count);
    dispose();
    await t.unmount();
  });

  test("a navigation right before the watcher leaves sends nothing afterwards", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    await t.render(<Counter />);
    const hot = fakeHot();
    const history = createMemoryHistory("/a");
    const dispose = connectFrameMirror(t.root, hot, history);
    const frames = () => hot.sent.filter((m) => m.event === "textjs:frame");
    hot.emit("textjs:mirror", { active: true });
    expect(frames()).toHaveLength(1);
    history.push("/b"); // schedules a deferred send
    hot.emit("textjs:mirror", { active: false });
    await new Promise((r) => setTimeout(r, 20));
    expect(frames()).toHaveLength(1);
    // Same race with teardown instead of the watcher leaving.
    hot.emit("textjs:mirror", { active: true });
    const n = frames().length;
    history.push("/c");
    dispose();
    await new Promise((r) => setTimeout(r, 20));
    expect(frames()).toHaveLength(n);
    await t.unmount();
  });

  test("teardown cancels pending flushes and is registered with hot.dispose", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    await t.render(<Counter />);
    const hot = fakeHot();
    const g = globalThis as { document?: unknown };
    const savedDocument = g.document;
    g.document = { visibilityState: "hidden", title: "" };
    let flushes = 0;
    const original = t.root.flushSyncRender.bind(t.root);
    t.root.flushSyncRender = () => {
      flushes++;
      original();
    };
    try {
      connectFrameMirror(t.root, hot, createMemoryHistory("/"));
      expect(hot.disposers).toHaveLength(1);
      expect(hot.listenerCount()).toBeGreaterThan(0);
      await t.act(() => hot.emit("textjs:input", { type: "key", key: "ArrowUp", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }));
      // Module replaced (HMR): Vite calls the disposer.
      // A slow machine may flush before the disposer runs; count only what happens after it.
      hot.disposers[0]!(undefined);
      flushes = 0;
      const framesBefore = hot.sent.filter((m) => m.event === "textjs:frame").length;
      expect(hot.listenerCount()).toBe(0);
      await new Promise((r) => setTimeout(r, 20));
      expect(flushes).toBe(0);
      expect(hot.sent.filter((m) => m.event === "textjs:frame")).toHaveLength(framesBefore);
    } finally {
      t.root.flushSyncRender = original;
      g.document = savedDocument;
      await t.unmount();
    }
  });
});
