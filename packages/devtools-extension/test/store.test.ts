import { describe, expect, test } from "bun:test";
import type { DevToolsFrameRecord, DevToolsRootInfo, DevToolsTreeNode, DevToolsTreeSnapshot, Method, RequestMap } from "../src/protocol";
import { MAX_RECORDS, PanelStore } from "../src/panel/store";
import type { Transport, TransportMessage } from "../src/panel/transport";

interface Call {
  method: Method;
  root: number | null;
  args: unknown[];
  resolve(v: unknown): void;
  reject(e: Error): void;
}

class MockTransport implements Transport {
  calls: Call[] = [];
  listeners = new Set<(m: TransportMessage) => void>();
  suspended = 0;
  resumed = 0;
  request<M extends Method>(method: M, root: number | null, ...args: RequestMap[M]["args"]): Promise<RequestMap[M]["result"]> {
    return new Promise((resolve, reject) => this.calls.push({ method, root, args, resolve: resolve as (v: unknown) => void, reject }));
  }
  subscribe(l: (m: TransportMessage) => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  suspend(): void {
    this.suspended++;
  }
  resume(): void {
    this.resumed++;
  }
  emit(m: TransportMessage): void {
    for (const l of this.listeners) l(m);
  }
  of(method: Method): Call[] {
    return this.calls.filter((c) => c.method === method);
  }
}

const rootInfo = (id: number, over: Partial<DevToolsRootInfo> = {}): DevToolsRootInfo => ({
  id,
  name: `App${id}`,
  cols: 80,
  rows: 24,
  paused: false,
  wireframe: false,
  responsive: true,
  fps: 0,
  frameCount: 0,
  skippedFrames: 0,
  yogaNodes: 0,
  highlighted: null,
  ...over,
});

const node = (id: number, parent: number | null, depth: number, over: Partial<DevToolsTreeNode> = {}): DevToolsTreeNode => ({
  id,
  parent,
  depth,
  kind: "component",
  name: `N${id}`,
  key: null,
  props: {},
  hooks: [],
  state: null,
  scene: null,
  ...over,
});

const scene = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  type: "box" as const,
  label: null,
  layout: { x: 0, y: 0, width: 1, height: 1 },
  content: { x: 0, y: 0, width: 1, height: 1 },
  screen: { x: 0, y: 0, width: 1, height: 1 },
  painted: true,
  ...over,
});

const tree = (root: number, nodes: DevToolsTreeNode[]): DevToolsTreeSnapshot => ({ root, name: "App", nodes });

const record = (root: number, over: Partial<DevToolsFrameRecord> = {}): DevToolsFrameRecord => ({
  root,
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

const flush = () => new Promise((r) => setTimeout(r, 0));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setup(initial = {}) {
  const transport = new MockTransport();
  const store = new PanelStore(transport, initial, { disconnectGraceMs: 30 });
  const connect = (roots = [rootInfo(1)]) => {
    transport.emit({ kind: "status", page: "connected" });
    transport.emit({ kind: "event", event: "roots", roots });
  };
  return { transport, store, connect };
}

describe("PanelStore", () => {
  test("roots select the first root and fetch the tree", async () => {
    const { transport, store, connect } = setup();
    connect([rootInfo(1), rootInfo(2)]);
    expect(store.get()).toMatchObject({ status: "connected", rootId: 1 });
    expect(transport.of("tree")).toHaveLength(1);
    transport.of("tree")[0]!.resolve(tree(1, [node(1, null, 0)]));
    await flush();
    expect(store.get().tree?.nodes).toHaveLength(1);
  });

  test("one tree request at a time; a request made meanwhile runs once afterwards", async () => {
    const { transport, store, connect } = setup();
    connect();
    store.fetchTree();
    store.fetchTree();
    store.fetchTree();
    expect(transport.of("tree")).toHaveLength(1);
    transport.of("tree")[0]!.resolve(tree(1, [node(1, null, 0)]));
    await flush();
    expect(transport.of("tree")).toHaveLength(2);
    transport.of("tree")[1]!.resolve(tree(1, [node(1, null, 0), node(2, 1, 1)]));
    await flush();
    expect(transport.of("tree")).toHaveLength(2);
    expect(store.get().tree?.nodes).toHaveLength(2);
  });

  test("replies for another root are dropped", async () => {
    const { transport, store, connect } = setup();
    connect([rootInfo(1), rootInfo(2)]);
    const first = transport.of("tree")[0]!;
    store.selectRoot(2);
    first.resolve(tree(1, [node(1, null, 0)]));
    await flush();
    expect(store.get().tree).toBeNull();
    const second = transport.of("tree").at(-1)!;
    expect(second.root).toBe(2);
    second.resolve(tree(2, [node(5, null, 0)]));
    await flush();
    expect(store.get().tree?.root).toBe(2);
  });

  test("clears the selection and highlight when the selected node unmounts", async () => {
    const { transport, store, connect } = setup();
    connect();
    transport.of("tree")[0]!.resolve(tree(1, [node(1, null, 0), node(2, 1, 1, { kind: "host", name: "tx-box", scene: scene(42) })]));
    await flush();
    store.select(2);
    expect(transport.of("highlight").at(-1)!.args).toEqual([42]);
    store.fetchTree();
    transport.of("tree").at(-1)!.resolve(tree(1, [node(1, null, 0)]));
    await flush();
    expect(store.get().selected).toBeNull();
    expect(transport.of("highlight").at(-1)!.args).toEqual([null]);
  });

  test("inline spans resolve to their owning text node", async () => {
    const { transport, store, connect } = setup();
    connect();
    transport.of("tree")[0]!.resolve(
      tree(1, [
        node(1, null, 0, { kind: "host", name: "tx-text", scene: scene(10, { type: "text" }) }),
        node(2, 1, 1, { kind: "host", name: "tx-text", scene: scene(11, { type: "text", inline: true, owner: 10 }) }),
      ]),
    );
    await flush();
    expect(store.sceneFor(2)).toBe(10);
    expect(store.nodeForScene(10)).toBe(1);
    expect(store.nodeForScene(11)).toBeNull();
  });

  test("frame batches: commits are judged per root", async () => {
    const { transport, store, connect } = setup();
    connect([rootInfo(1), rootInfo(2)]);
    transport.of("tree")[0]!.resolve(tree(1, []));
    await flush();
    const before = transport.of("tree").length;
    transport.emit({ kind: "event", event: "frames", records: [record(1), record(2, { commits: 3 })] });
    await sleep(350);
    expect(transport.of("tree")).toHaveLength(before);
    expect(store.get().records).toHaveLength(1);
    transport.emit({ kind: "event", event: "frames", records: [record(1, { commits: 1 })] });
    await sleep(350);
    expect(transport.of("tree")).toHaveLength(before + 1);
  });

  test("keeps at most MAX_RECORDS records", () => {
    const { transport, store, connect } = setup();
    connect();
    transport.emit({ kind: "event", event: "frames", records: Array.from({ length: MAX_RECORDS + 10 }, (_, i) => record(1, { frame: i })) });
    expect(store.get().records).toHaveLength(MAX_RECORDS);
    expect(store.get().records[0]!.frame).toBe(10);
  });

  test("a brief disconnect (worker restart) keeps the panel; a lasting one clears it", async () => {
    const { transport, store, connect } = setup();
    connect();
    transport.emit({ kind: "status", page: "disconnected" });
    expect(store.get().roots).toHaveLength(1);
    transport.emit({ kind: "status", page: "connected" });
    connect();
    await sleep(50);
    expect(store.get()).toMatchObject({ status: "connected", rootId: 1 });

    transport.emit({ kind: "status", page: "disconnected" });
    await sleep(50);
    expect(store.get()).toMatchObject({ status: "disconnected", roots: [], rootId: null, tree: null, selected: null });
  });

  test("a disconnect with no roots shows the empty state at once", () => {
    const { transport, store } = setup();
    transport.emit({ kind: "status", page: "disconnected" });
    expect(store.get().status).toBe("disconnected");
  });

  test("hiding the panel suspends the transport and stops fetching; showing resumes", async () => {
    const { transport, store, connect } = setup();
    connect();
    transport.of("tree")[0]!.resolve(tree(1, []));
    await flush();
    store.setVisible(false);
    expect(transport.suspended).toBe(1);
    const before = transport.calls.length;
    store.fetchTree();
    store.refresh();
    transport.emit({ kind: "event", event: "frames", records: [record(1, { commits: 1 })] });
    await sleep(350);
    expect(transport.calls).toHaveLength(before);
    store.setVisible(false);
    expect(transport.suspended).toBe(1);
    store.setVisible(true);
    expect(transport.resumed).toBe(1);
    connect();
    expect(transport.calls.length).toBeGreaterThan(before);
  });

  test("request errors surface as a message instead of throwing", async () => {
    const { transport, store, connect } = setup();
    connect();
    transport.of("tree")[0]!.reject(new Error("Malformed tree response"));
    await flush();
    expect(store.get().error).toBe("Malformed tree response");
  });

  test("controls update the root from the reply", async () => {
    const { transport, store, connect } = setup();
    connect();
    store.togglePause();
    const call = transport.of("pause")[0]!;
    call.resolve(rootInfo(1, { paused: true }));
    await flush();
    expect(store.root?.paused).toBe(true);
    store.togglePause();
    expect(transport.of("resume")).toHaveLength(1);
  });
});
