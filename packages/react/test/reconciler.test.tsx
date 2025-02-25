import { describe, expect, test } from "bun:test";
import { Suspense, use, useEffect, useState, useTransition } from "react";
import { initYoga, type SceneNode } from "@textjs/core";
import { Box, createConsoleRoot, createConsoleRootSync, renderToConsole, Text, useInput } from "../src/index";
import { captureWarnings, createTestRoot, FakeConsole, ManualScheduler, withoutActEnvironment } from "./helpers";

describe("React 19 reconciler", () => {
  test("mounts host boxes, text and nested spans into the scene graph", async () => {
    const t = await createTestRoot({ width: 30, height: 4 });
    let boxRef: SceneNode | null = null;
    await t.render(
      <Box ref={(n) => void (boxRef = n)} flexDirection="column" padding={1}>
        <Text>
          Hello <Text bold color="#22c55e">world</Text>!
        </Text>
      </Box>,
    );
    expect(t.lines()[1]).toBe(" Hello world!");
    expect(boxRef).not.toBeNull();
    expect((boxRef as unknown as SceneNode).type).toBe("box");
    const textNode = (boxRef as unknown as SceneNode).children[0] as SceneNode;
    expect(textNode.type).toBe("text");
    expect(textNode.getTextModel().text).toBe("Hello world!");
    const cell = t.root.renderer.buffer.getCell(7, 1);
    expect(cell?.char).toBe("w");
    expect(cell?.fg).toBe(0x22c55eff);
    await t.unmount();
  });

  test("state updates re-render and coalesce into one console.log per frame", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    let bump: () => void = () => undefined;
    function Counter() {
      const [n, setN] = useState(0);
      bump = () => setN((v) => v + 1);
      return <Text>count {n}</Text>;
    }
    await t.render(<Counter />);
    expect(t.console.logs.length).toBe(1);
    await t.act(() => {
      bump();
      bump();
      bump();
    });
    await t.act(() => bump());
    // Four updates across two acts, but only one scheduled frame.
    expect(t.scheduler.queue.length).toBe(1);
    expect(t.frame()).toBe("count 4");
    expect(t.console.logs.length).toBe(2);
    expect(t.console.clears).toBe(2);
    // Nothing changed: no further frames scheduled or logged.
    t.frame();
    expect(t.console.logs.length).toBe(2);
    await t.unmount();
  });

  test("conditional rendering and keyed list reordering use insertBefore/removeChild", async () => {
    const t = await createTestRoot({ width: 10, height: 6 });
    let setItems: (v: string[]) => void = () => undefined;
    let setShow: (v: boolean) => void = () => undefined;
    const nodes = new Map<string, SceneNode>();
    function List() {
      const [items, set] = useState(["a", "b", "c"]);
      const [show, setS] = useState(true);
      setItems = set;
      setShow = setS;
      return (
        <Box flexDirection="column">
          {show ? <Text>header</Text> : null}
          {items.map((id) => (
            <Text key={id} ref={(n) => void (n ? nodes.set(id, n) : nodes.delete(id))}>
              {id}
            </Text>
          ))}
        </Box>
      );
    }
    await t.render(<List />);
    expect(t.lines()).toEqual(["header", "a", "b", "c"]);
    const before = new Map(nodes);
    await t.act(() => setItems(["c", "a", "b"]));
    expect(t.lines()).toEqual(["header", "c", "a", "b"]);
    // Same scene nodes were moved, not recreated.
    expect(nodes.get("c")).toBe(before.get("c") as SceneNode);
    expect(nodes.get("a")).toBe(before.get("a") as SceneNode);
    await t.act(() => setShow(false));
    expect(t.lines()).toEqual(["c", "a", "b"]);
    await t.act(() => setItems(["b", "d"]));
    expect(t.lines()).toEqual(["b", "d"]);
    await t.act(() => setShow(true));
    expect(t.lines()).toEqual(["header", "b", "d"]);
    await t.unmount();
  });

  test("text instance updates and raw strings in boxes", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    let set: (s: string) => void = () => undefined;
    function App() {
      const [s, setS] = useState("one");
      set = setS;
      return <Box>{s}</Box>;
    }
    await t.render(<App />);
    expect(t.frame()).toBe("one");
    await t.act(() => set("three"));
    expect(t.frame()).toBe("three");
    await t.unmount();
  });

  test("unmount frees every Yoga node and input handler (no leaks)", async () => {
    const t = await createTestRoot({ width: 20, height: 5 });
    function Leaf({ i }: { i: number }) {
      useInput(() => undefined);
      return <Text>leaf {i}</Text>;
    }
    function App({ n }: { n: number }) {
      return (
        <Box flexDirection="column">
          {Array.from({ length: n }, (_, i) => (
            <Box key={i}>
              <Leaf i={i} />
            </Box>
          ))}
        </Box>
      );
    }
    const rootNode = t.root.rootNode;
    await t.render(<App n={20} />);
    expect(rootNode.countYogaNodes()).toBeGreaterThan(40);
    await t.render(<App n={2} />);
    // root + shell + column + 2 × (box + text)
    expect(rootNode.countYogaNodes()).toBe(7);
    for (let i = 0; i < 25; i++) {
      await t.render(<App n={i % 5} />);
    }
    await t.render(<App n={0} />);
    expect(rootNode.countYogaNodes()).toBe(3);
    await t.render(null);
    expect(rootNode.countYogaNodes()).toBe(2);
    await t.unmount();
    expect(rootNode.children.length).toBe(0);
    expect(rootNode.countYogaNodes()).toBe(1);
  });

  test("Suspense hides and reveals instances", async () => {
    const t = await createTestRoot({ width: 20, height: 3 });
    let resolve: (v: string) => void = () => undefined;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    function Data() {
      const v = use(promise);
      return <Text>{v}</Text>;
    }
    await t.render(
      <Suspense fallback={<Text>loading…</Text>}>
        <Data />
      </Suspense>,
    );
    expect(t.frame()).toBe("loading…");
    await t.act(async () => {
      resolve("ready");
      await promise;
    });
    expect(t.frame()).toBe("ready");
    await t.unmount();
  });

  test("transitions commit through the host transition context", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    let go: () => void = () => undefined;
    function App() {
      const [v, setV] = useState("idle");
      const [pending, start] = useTransition();
      go = () => start(() => setV("done"));
      return <Text>{pending ? "pending" : v}</Text>;
    }
    await t.render(<App />);
    await t.act(() => go());
    expect(t.frame()).toBe("done");
    await t.unmount();
  });

  test("keyboard input is dispatched at discrete priority and flushes before the next task", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    function App() {
      const [keys, setKeys] = useState("");
      useInput((e) => setKeys((k) => k + e.input));
      return <Text>{keys || "-"}</Text>;
    }
    await t.render(<App />);
    const warnings = await captureWarnings(() =>
      withoutActEnvironment(async () => {
        // No act(): discrete updates flush in a microtask (SyncLane), not a scheduler task.
        t.engine.handleKeyDown({ key: "h", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, preventDefault() {} });
        t.engine.handleKeyDown({ key: "i", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, preventDefault() {} });
        await Promise.resolve();
        expect(t.frame()).toBe("hi");
      }),
    );
    expect(warnings).toEqual([]);
    await t.unmount();
  });

  test("createConsoleRoot / renderToConsole boot Yoga with zero runtime warnings", async () => {
    const warnings = await captureWarnings(() => withoutActEnvironment(() => bootRoots()));
    expect(warnings).toEqual([]);
  });

  async function bootRoots(): Promise<void> {
    const con = new FakeConsole();
    const scheduler = new ManualScheduler();
    const root = await renderToConsole(<Text>booted</Text>, { console: con, scheduler, width: 10, height: 1, registerGlobal: false });
    scheduler.flush();
    expect(root.renderer.buffer.toPlainString(true).trim()).toBe("booted");
    expect(con.logs.length).toBe(1);
    root.unmount();
    expect(root.unmounted).toBe(true);
    await root.waitUntilExit();

    const r2 = await createConsoleRoot({ console: con, scheduler, width: 10, height: 1, registerGlobal: false });
    let exited = false;
    function Quit() {
      useEffect(() => undefined, []);
      return <Text>bye</Text>;
    }
    r2.render(<Quit />);
    r2.waitUntilExit().then(() => {
      exited = true;
    });
    r2.unmount();
    await Promise.resolve();
    expect(exited).toBe(true);
  }

  test("createConsoleRootSync renders synchronously and flushSyncRender emits immediately", async () => {
    await initYoga();
    const con = new FakeConsole();
    const warnings = await captureWarnings(() =>
      withoutActEnvironment(() => {
        const root = createConsoleRootSync({ console: con, scheduler: new ManualScheduler(), width: 12, height: 1, registerGlobal: false });
        root.render(<Text>sync</Text>);
        const frame = root.flushSyncRender();
        expect(frame.skipped).toBe(false);
        root.unmount();
      }),
    );
    expect(warnings).toEqual([]);
    expect(con.logs.length).toBe(1);
    expect(String(con.logs[0]?.[0])).toContain("sync");
  });

  test("Box inside Text throws a helpful error", async () => {
    const t = await createTestRoot();
    let thrown: unknown = null;
    await captureWarnings(async () => {
      try {
        await t.render(
          <Text>
            <Box />
          </Text>,
        );
      } catch (error) {
        thrown = error;
      }
    });
    expect(String(thrown)).toContain("cannot be nested inside <Text>");
  });
});
