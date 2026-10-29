import { afterEach, describe, expect, test } from "bun:test";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text } from "../src/index";
import {
  DEVTOOLS_HOOK_KEY,
  getDevToolsHook,
  installDevToolsHook,
  summarize,
  type DevToolsFrameRecord,
  type DevToolsHookEvent,
  type DevToolsTreeNode,
} from "../src/devtools-hook";
import { createTestRoot } from "./helpers";

const g = globalThis as Record<string, unknown>;

afterEach(() => {
  delete g[DEVTOOLS_HOOK_KEY];
});

let bump: () => void = () => undefined;

function Counter({ label }: { label: string }) {
  const [count, setCount] = useState(3);
  const ref = useRef(0);
  const doubled = useMemo(() => count * 2, [count]);
  useEffect(() => {
    ref.current++;
  }, [count]);
  bump = () => setCount((c) => c + 1);
  return (
    <Box flexDirection="row" wireframeLabel="counter">
      <Text color="#22c55e">{`${label} ${count} ${doubled}`}</Text>
    </Box>
  );
}

const Badge = memo(function Badge({ tone }: { tone: string }) {
  return <Text>{`[${tone}]`}</Text>;
});

function App() {
  return (
    <Box flexDirection="column">
      <Counter key="main" label="count" />
      <Badge tone="ok" />
    </Box>
  );
}

const byName = (nodes: DevToolsTreeNode[], name: string): DevToolsTreeNode | undefined => nodes.find((n) => n.name === name);

describe("devtools hook", () => {
  test("absent hook: roots register nothing and define no global", async () => {
    expect(getDevToolsHook()).toBeNull();
    const t = await createTestRoot({ width: 30, height: 3 });
    await t.render(<App />);
    expect(t.frame()).toContain("count 3 6");
    expect(DEVTOOLS_HOOK_KEY in g).toBe(false);
    await t.act(() => bump());
    expect(t.frame()).toContain("count 4 8");
    expect(DEVTOOLS_HOOK_KEY in g).toBe(false);
    await t.unmount();
  });

  test("absent hook: the global is read once per root, never per frame", async () => {
    let reads = 0;
    Object.defineProperty(globalThis, DEVTOOLS_HOOK_KEY, {
      configurable: true,
      get() {
        reads++;
        return undefined;
      },
    });
    const t = await createTestRoot({ width: 30, height: 3 });
    expect(reads).toBe(1);
    await t.render(<App />);
    for (let i = 0; i < 5; i++) {
      await t.act(() => bump());
      t.frame();
    }
    expect(t.frame()).toContain("count 8 16");
    expect(reads).toBe(1);
    await t.unmount();
    expect(reads).toBe(1);
  });

  test("the hook module has no runtime imports (the extension's page script bundles it alone)", async () => {
    const src = await Bun.file(new URL("../src/devtools-hook.ts", import.meta.url)).text();
    const imports = src.match(/^import\s.*$/gm) ?? [];
    expect(imports.length).toBeGreaterThan(0);
    for (const line of imports) expect(line).toMatch(/^import type /);
  });

  test("installDevToolsHook is idempotent and non-enumerable", () => {
    const a = installDevToolsHook();
    const b = installDevToolsHook();
    expect(a).toBe(b);
    expect(Object.keys(globalThis)).not.toContain(DEVTOOLS_HOOK_KEY);
    expect(a.active).toBe(false);
    expect(a.protocol).toBe(1);
  });

  test("roots register on create and unregister on unmount", async () => {
    const hook = installDevToolsHook();
    const events: DevToolsHookEvent[] = [];
    hook.subscribe((e) => events.push(e));
    const t = await createTestRoot({ width: 30, height: 3 });
    expect(hook.roots.size).toBe(1);
    expect(events[0]?.type).toBe("root-added");
    await t.render(<App />);
    t.frame();
    const [id, handle] = [...hook.roots][0]!;
    expect(handle.info()).toMatchObject({ id, name: "App", cols: 30, rows: 3, paused: false, wireframe: false });
    await t.unmount();
    expect(hook.roots.size).toBe(0);
    expect(events.at(-1)).toEqual({ type: "root-removed", root: id });
  });

  test("inactive hook: frames are rendered but nothing is emitted", async () => {
    const hook = installDevToolsHook();
    const events: DevToolsHookEvent[] = [];
    hook.subscribe((e) => events.push(e));
    const t = await createTestRoot({ width: 30, height: 3 });
    await t.render(<App />);
    t.frame();
    await t.act(() => bump());
    t.frame();
    expect(events.filter((e) => e.type === "frame")).toHaveLength(0);
    await t.unmount();
  });

  test("tree snapshot: components, keys, props, hooks and host scene nodes", async () => {
    const hook = installDevToolsHook();
    const t = await createTestRoot({ width: 30, height: 3 });
    await t.render(<App />);
    t.frame();
    const tree = [...hook.roots.values()][0]!.tree();
    expect(tree.name).toBe("App");
    const counter = byName(tree.nodes, "Counter")!;
    expect(counter.kind).toBe("component");
    expect(counter.key).toBe("main");
    expect(counter.props.label).toBe('"count"');
    expect(counter.hooks.map((h) => h.kind)).toEqual(["state", "ref", "memo", "effect"]);
    expect(counter.hooks[0]!.value).toBe("3");
    expect(counter.hooks[2]!.value).toBe("6");
    expect(byName(tree.nodes, "Badge")?.props.tone).toBe('"ok"');

    expect(tree.nodes.find((n) => n.parent === counter.id)?.name).toBe("Box");
    const box = tree.nodes.find((n) => n.scene?.label === "counter")!;
    expect(tree.nodes.find((n) => n.id === box.parent)?.name).toBe("Box");
    expect(box.kind).toBe("host");
    expect(box.name).toBe("tx-box");
    expect(box.scene).toMatchObject({ type: "box", label: "counter", painted: true });
    expect(box.scene!.layout).toMatchObject({ x: 0, y: 0, width: 30, height: 1 });
    const text = tree.nodes.find((n) => n.kind === "text" && n.scene?.text === "count 3 6");
    expect(text).toBeDefined();
    // Preorder with consistent depths.
    for (const n of tree.nodes) {
      if (n.parent === null) continue;
      const parent = tree.nodes.find((p) => p.id === n.parent)!;
      expect(n.depth).toBe(parent.depth + 1);
      expect(tree.nodes.indexOf(parent)).toBeLessThan(tree.nodes.indexOf(n));
    }
    // Ids are stable across commits (fiber alternates).
    await t.act(() => bump());
    t.frame();
    const again = [...hook.roots.values()][0]!.tree();
    expect(byName(again.nodes, "Counter")!.id).toBe(counter.id);
    expect(byName(again.nodes, "Counter")!.hooks[0]!.value).toBe("4");
    // JSON-safe.
    expect(JSON.parse(JSON.stringify(again))).toEqual(again);
    await t.unmount();
  });

  test("frame snapshot: cells and the scene node that painted each one", async () => {
    const hook = installDevToolsHook();
    const t = await createTestRoot({ width: 20, height: 3 });
    await t.render(<App />);
    t.frame();
    const frame = [...hook.roots.values()][0]!.frame();
    expect(frame.cols).toBe(20);
    expect(frame.rows).toBe(3);
    expect(frame.chars).toHaveLength(60);
    expect(frame.chars.slice(0, 9).join("")).toBe("count 3 6");
    expect(frame.fg[0]).toBe(0x22c55eff);
    const owner = frame.owners[frame.owner[0]!]!;
    expect(owner.type).toBe("text");
    expect(owner.components[0]).toBe("Text");
    expect(owner.components).toContain("Counter");
    expect(owner.fiber).not.toBeNull();
    // Cell (15, 0) is the counter row's box, not the text.
    expect(frame.owners[frame.owner[15]!]?.label).toBe("counter");
    expect(frame.owners[frame.owner[20]!]?.components).toContain("Badge");
    expect(JSON.parse(JSON.stringify(frame))).toEqual(frame);
    await t.unmount();
  });

  test("controls: highlight, wireframe, pause/resume, resize, fit, copy", async () => {
    const hook = installDevToolsHook();
    const t = await createTestRoot({ width: 20, height: 3 });
    await t.render(<App />);
    t.frame();
    const h = [...hook.roots.values()][0]!;
    const tree = h.tree();
    const box = tree.nodes.find((n) => n.scene?.label === "counter")!;
    expect(h.highlight(box.scene!.id)).toBe(true);
    t.frame();
    expect(h.info().highlighted).toBe(box.scene!.id);
    expect(t.root.renderer.buffer.getCell(0, 0)!.bg).not.toBe(0);
    expect(h.highlight(null)).toBe(true);
    expect(h.highlight(999_999)).toBe(false);
    h.setWireframe(true);
    expect(h.info().wireframe).toBe(true);
    h.setWireframe(false);
    h.pause();
    expect(h.info().paused).toBe(true);
    h.resume();
    expect(h.info().paused).toBe(false);
    h.resize(24, 4);
    expect(h.info()).toMatchObject({ cols: 24, rows: 4, responsive: false });
    h.fit();
    expect(h.info().responsive).toBe(true);
    t.frame();
    expect(h.copyText().split("\n")[0]).toBe("count 3 6");
    await t.unmount();
  });

  test("active hook: per-frame telemetry with commits and phase timings", async () => {
    const hook = installDevToolsHook();
    const frames: DevToolsFrameRecord[] = [];
    hook.subscribe((e) => {
      if (e.type === "frame") frames.push(e.record);
    });
    const t = await createTestRoot({ width: 20, height: 3 });
    await t.render(<App />);
    t.frame();
    hook.active = true;
    await t.act(() => bump());
    t.frame();
    const emitted = frames.filter((f) => !f.skipped);
    expect(emitted.length).toBeGreaterThan(0);
    const last = emitted.at(-1)!;
    expect(last.commits).toBeGreaterThanOrEqual(1);
    expect(last.cols).toBe(20);
    for (const k of ["reactMs", "layoutMs", "paintMs", "encodeMs", "totalMs"] as const) expect(last[k]).toBeGreaterThanOrEqual(0);
    expect(last.reactMs + last.layoutMs).toBeLessThanOrEqual(last.totalMs + 1e-6);
    // A no-op frame is reported as skipped.
    t.root.renderer.requestRender();
    t.frame();
    expect(frames.at(-1)!.skipped).toBe(true);
    await t.unmount();
  });

  test("summarize keeps values short and display-only", () => {
    expect(summarize("x".repeat(200)).length).toBeLessThan(90);
    expect(summarize(function onClick() {})).toBe("ƒ onClick()");
    expect(summarize({ a: 1, b: [1, 2], c: { d: 1 } })).toBe("{a: 1, b: Array(2), c: {…}}");
    expect(summarize(<Badge tone="x" />)).toBe("<Badge />");
    expect(summarize(new Map([[1, 2]]))).toBe("Map(1)");
  });
});
