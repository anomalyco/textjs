import { afterEach, describe, expect, test } from "bun:test";
import { createContext, useId, useReducer, useState, type ReactNode } from "react";
import { Box, Text } from "../src/index";
import {
  classifyHook,
  DEVTOOLS_HOOK_KEY,
  installDevToolsHook,
  summarize,
  summarizeProps,
  type DevToolsFrameSnapshot,
  type DevToolsRootHandle,
  type DevToolsTreeNode,
  type HookNode,
} from "../src/devtools-hook";
import { createTestRoot, type TestRoot } from "./helpers";

const g = globalThis as Record<string, unknown>;

afterEach(() => {
  delete g[DEVTOOLS_HOOK_KEY];
});

async function mount(element: ReactNode, size = { width: 20, height: 6 }): Promise<{ t: TestRoot; h: DevToolsRootHandle }> {
  const hook = installDevToolsHook();
  const t = await createTestRoot(size);
  await t.render(element);
  t.frame();
  return { t, h: [...hook.roots.values()][0]! };
}

const ownerAt = (f: DevToolsFrameSnapshot, x: number, y: number) => f.owners[f.owner[y * f.cols + x]!];
const byLabel = (nodes: DevToolsTreeNode[], label: string) => nodes.find((n) => n.scene?.label === label);
const rendererHighlight = (t: TestRoot) => (t.root.renderer as unknown as { highlighted: { id: number } | null }).highlighted;

describe("devtools hook: summaries never throw", () => {
  test("invalid dates, throwing getters, revoked proxies and odd errors", () => {
    expect(summarize(new Date(Number.NaN))).toBe("Invalid Date");
    expect(summarize(new Date(0))).toBe("1970-01-01T00:00:00.000Z");
    const getter = {
      get boom(): never {
        throw new Error("getter");
      },
    };
    expect(summarize(getter)).toBe("[Exception]");
    expect(summarize({ nested: getter })).toBe("{nested: {…}}");
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(summarize(proxy)).toBe("[Exception]");
    expect(summarize([proxy])).toBe("[[Exception]]");
    const err = new Error("x");
    (err as { message: unknown }).message = { code: 42 };
    expect(summarize(err)).toBe("Error: [object Object]");
    const weird = new Error("y");
    Object.defineProperty(weird, "message", {
      get() {
        throw new Error("nope");
      },
    });
    expect(summarize(weird)).toBe("[Exception]");
  });

  test("summarizeProps keeps a `__proto__` prop as an own key and survives throwing props", () => {
    const props = JSON.parse('{"__proto__": {"polluted": true}, "a": 1}') as Record<string, unknown>;
    Object.defineProperty(props, "bad", {
      enumerable: true,
      get() {
        throw new Error("bad");
      },
    });
    const out = summarizeProps(props);
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(Object.keys(out)).toEqual(["__proto__", "a", "bad"]);
    expect(out.a).toBe("1");
    expect(out.bad).toBe("[Exception]");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(summarizeProps(proxy)).toEqual({});
  });

  test("a component with a hostile prop still yields a tree", async () => {
    const hostile = new Proxy({}, {
      ownKeys() {
        throw new Error("no keys");
      },
    });
    function Shown(_: { value: unknown; when: Date }) {
      return <Text>ok</Text>;
    }
    const { t, h } = await mount(<Shown value={hostile} when={new Date(Number.NaN)} />);
    const node = h.tree().nodes.find((n) => n.name === "Shown")!;
    expect(node.props).toEqual({ value: "[Exception]", when: "Invalid Date" });
    await t.unmount();
  });
});

describe("devtools hook: hook classification", () => {
  test("useId is recognized across React id formats and identifier prefixes", async () => {
    let id = "";
    function WithId() {
      id = useId();
      return <Text>{id}</Text>;
    }
    const { t, h } = await mount(<WithId />);
    const node = h.tree().nodes.find((n) => n.name === "WithId")!;
    expect(node.hooks).toEqual([{ kind: "id", value: id }]);
    for (const v of [":r0:", ":R1:", "«r0»", "«txr1h»", "_r_0_", "_txr_0_", "_txr_1h_", ":txr3:"]) {
      expect(classifyHook({ memoizedState: v, queue: null, next: null })).toEqual({ kind: "id", value: v });
    }
    for (const v of ["ready", "_private", "r", ":nope"]) expect(classifyHook({ memoizedState: v, queue: null, next: null }).kind).toBe("hook");
    await t.unmount();
  });

  test("useState is told apart from useReducer by reducer shape, not name", async () => {
    function Both() {
      const [n] = useState(1);
      const [m] = useReducer((s: number, a: number) => s + a, 2);
      return <Text>{`${n}${m}`}</Text>;
    }
    const { t, h } = await mount(<Both />);
    expect(h.tree().nodes.find((n) => n.name === "Both")!.hooks.map((x) => x.kind)).toEqual(["state", "reducer"]);
    await t.unmount();

    const minified = new Function('return function a(e,t){return"function"==typeof t?t(e):t}')() as (...a: unknown[]) => unknown;
    const pretty = new Function('return function (state, action) {\n  return typeof action === "function" ? action(state) : action;\n}')() as (...a: unknown[]) => unknown;
    const reducer = new Function('return function a(e,t){return"function"==typeof t?t(e):e+t}')() as (...a: unknown[]) => unknown;
    const hook = (lastRenderedReducer: unknown): HookNode => ({ memoizedState: 5, queue: { dispatch() {}, lastRenderedReducer }, next: null });
    expect(classifyHook(hook(minified)).kind).toBe("state");
    expect(classifyHook(hook(pretty)).kind).toBe("state");
    expect(classifyHook(hook(null)).kind).toBe("state");
    expect(classifyHook(hook(reducer)).kind).toBe("reducer");
    expect(classifyHook(hook((s: number) => s)).kind).toBe("reducer");
  });

  test("context consumers use the context's display name", async () => {
    const Theme = createContext("dark");
    Theme.displayName = "Theme";
    const { t, h } = await mount(<Theme.Consumer>{(v) => <Text>{v}</Text>}</Theme.Consumer>);
    expect(h.tree().nodes.some((n) => n.name === "Theme.Consumer")).toBe(true);
    await t.unmount();
  });
});

describe("devtools hook: highlight lifecycle", () => {
  test("unmounting a highlighted node clears the highlight and re-enables incremental painting", async () => {
    let setShow: (v: boolean) => void = () => undefined;
    function Toggle() {
      const [show, set] = useState(true);
      setShow = set;
      return (
        <Box flexDirection="column">
          <Text>always</Text>
          {show ? (
            <Box wireframeLabel="doomed">
              <Text>doomed</Text>
            </Box>
          ) : null}
        </Box>
      );
    }
    const hook = installDevToolsHook();
    const t = await createTestRoot({ width: 20, height: 4 });
    await t.render(<Toggle />);
    t.frame();
    const h = [...hook.roots.values()][0]!;
    hook.active = true;
    const doomed = byLabel(h.tree().nodes, "doomed")!.scene!.id;
    expect(h.highlight(doomed)).toBe(true);
    t.frame();
    expect(rendererHighlight(t)?.id).toBe(doomed);

    await t.act(() => setShow(false));
    t.frame();
    t.frame();
    expect(h.info().highlighted).toBeNull();
    expect(rendererHighlight(t)).toBeNull();
    expect((t.root.renderer.buffer as unknown as { _paintedHighlightedId: number })._paintedHighlightedId).toBe(0);
    expect(t.frame()).not.toContain("doomed");
    await t.unmount();
  });

  test("the renderer drops a destroyed highlighted node on its own and destroy() clears `painted`", async () => {
    const { t, h } = await mount(
      <Box wireframeLabel="keep">
        <Text>x</Text>
      </Box>,
    );
    const id = byLabel(h.tree().nodes, "keep")!.scene!.id;
    h.highlight(id);
    t.frame();
    const node = rendererHighlight(t) as unknown as { painted: boolean; isDestroyed: boolean; destroy(): void };
    expect(node.painted).toBe(true);
    node.destroy();
    expect(node.isDestroyed).toBe(true);
    expect(node.painted).toBe(false);
    t.root.renderer.requestRender(true);
    t.frame();
    expect(rendererHighlight(t)).toBeNull();
    await t.unmount();
  });

  test("inline text spans report their owner and highlight the owning text", async () => {
    const { t, h } = await mount(
      <Text>
        {"plain "}
        <Text color="red">red</Text>
      </Text>,
    );
    const nodes = h.tree().nodes;
    const texts = nodes.filter((n) => n.kind === "host" && n.name === "tx-text");
    const [outer, inner] = texts;
    expect(outer!.scene!.inline).toBeUndefined();
    expect(inner!.scene).toMatchObject({ inline: true, owner: outer!.scene!.id });
    expect(h.highlight(inner!.scene!.id)).toBe(true);
    expect(h.info().highlighted).toBe(outer!.scene!.id);
    expect(rendererHighlight(t)?.id).toBe(outer!.scene!.id);
    await t.unmount();
  });
});

describe("devtools hook: controls while paused", () => {
  test("resize, wireframe and highlight repaint the buffer without emitting", async () => {
    const { t, h } = await mount(
      <Box wireframeLabel="panel" flexDirection="column">
        <Text>hello paused</Text>
      </Box>,
    );
    h.pause();
    const logs = t.console.logs.length;
    h.resize(16, 3);
    expect(t.root.renderer.buffer.width).toBe(16);
    expect(h.copyText()).toContain("hello paused");
    const plain = t.root.renderer.buffer.getCell(15, 0)!.char;
    h.setWireframe(true);
    expect(t.root.renderer.buffer.getCell(15, 0)!.char).not.toBe(plain);
    h.setWireframe(false);
    h.highlight(byLabel(h.tree().nodes, "panel")!.scene!.id);
    expect(t.root.renderer.buffer.getCell(0, 0)!.bg).not.toBe(0);
    h.fit();
    t.frame();
    expect(t.console.logs.length).toBe(logs);
    h.resume();
    t.frame();
    expect(t.console.logs.length).toBeGreaterThan(logs);
    await t.unmount();
  });
});

describe("devtools hook: cell ownership", () => {
  test("transparent absolute layers (toasters, backdrop-less modals) don't steal content cells", async () => {
    const { t, h } = await mount(
      <Box flexDirection="column" width="100%" height="100%">
        <Text wireframeLabel="content">{"c".repeat(20)}</Text>
        <Text>{"d".repeat(20)}</Text>
        <Box position="absolute" top={0} left={0} right={0} bottom={0} zIndex={60} flexDirection="column" justifyContent="flex-end" alignItems="flex-end" wireframeLabel="toaster">
          <Box flexDirection="column" wireframeLabel="stack">
            <Box width={6} height={2} flexDirection="column" bg="#334155" wireframeLabel="toast">
              <Text>hi</Text>
            </Box>
          </Box>
        </Box>
        <Box position="absolute" top={0} left={10} width={6} height={3} border="single" zIndex={5} wireframeLabel="frame" />
      </Box>,
    );
    const f = h.frame();
    expect(ownerAt(f, 0, 0)?.label).toBe("content");
    expect(ownerAt(f, 0, 5)?.label).not.toBe("toaster");
    expect(ownerAt(f, 0, 5)?.label).not.toBe("stack");
    expect(ownerAt(f, 19, 5)?.label).toBe("toast");
    expect(ownerAt(f, 14, 4)?.type).toBe("text");
    expect(ownerAt(f, 14, 5)?.label).toBe("toast");
    // Border-only absolute box: perimeter owned, interior shows what's beneath.
    expect(ownerAt(f, 10, 0)?.label).toBe("frame");
    expect(ownerAt(f, 15, 2)?.label).toBe("frame");
    expect(ownerAt(f, 12, 1)?.label).not.toBe("frame");
    expect(ownerAt(f, 12, 1)?.type).toBe("text");
    await t.unmount();
  });

  test("backdrops own the whole screen; in-flow boxes keep owning their rect", async () => {
    const { t, h } = await mount(
      <Box flexDirection="column" width="100%" height="100%" wireframeLabel="page">
        <Text>{"c".repeat(20)}</Text>
        <Box position="absolute" top={0} left={0} right={0} bottom={0} zIndex={10} backdropDim={0.5} wireframeLabel="modal" alignItems="center" justifyContent="center">
          <Box width={6} height={2} bg="#111111" wireframeLabel="dialog" />
        </Box>
      </Box>,
    );
    const f = h.frame();
    expect(ownerAt(f, 0, 0)?.label).toBe("modal");
    expect(ownerAt(f, 10, 3)?.label).toBe("dialog");
    await t.unmount();
  });

  test("zIndex order, clipping and scroll offsets match the painter", async () => {
    const { t, h } = await mount(
      <Box flexDirection="column" width="100%" height="100%">
        <Box height={3} overflow="hidden" scrollY={2} flexDirection="column" wireframeLabel="scroller">
          {[0, 1, 2, 3, 4].map((i) => (
            <Text key={i} wireframeLabel={`line-${i}`}>{`line ${i}`}</Text>
          ))}
        </Box>
        <Box position="absolute" top={3} left={0} width={8} height={2} bg="#ff0000" zIndex={9} wireframeLabel="high" />
        <Box position="absolute" top={3} left={4} width={8} height={2} bg="#00ff00" zIndex={2} wireframeLabel="low" />
      </Box>,
    );
    const f = h.frame();
    expect(ownerAt(f, 0, 0)?.label).toBe("line-2");
    expect(ownerAt(f, 0, 2)?.label).toBe("line-4");
    expect(f.chars.slice(0, 6).join("")).toBe("line 2");
    expect(ownerAt(f, 5, 3)?.label).toBe("high");
    expect(ownerAt(f, 10, 3)?.label).toBe("low");
    const nodes = h.tree().nodes;
    expect(byLabel(nodes, "line-0")!.scene!.painted).toBe(false);
    expect(byLabel(nodes, "line-2")!.scene!.screen).toMatchObject({ x: 0, y: 0 });
    await t.unmount();
  });
});
