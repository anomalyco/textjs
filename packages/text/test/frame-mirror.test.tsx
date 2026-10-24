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
  return {
    sent,
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
});
