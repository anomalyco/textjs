import { describe, expect, test } from "bun:test";
import { ExtensionTransport, type TransportMessage } from "../src/panel/transport";
import { isFrameSnapshot, isTreeSnapshot, sanitizeMessage } from "../src/panel/validate";
import { PANEL_PORT } from "../src/protocol";
import { portPair, type FakePort } from "./fakes";

const rootInfo = { id: 1, name: "App", cols: 80, rows: 24, paused: false, wireframe: false, responsive: true, fps: 0, frameCount: 0, skippedFrames: 0, yogaNodes: 0, highlighted: null };

function setup() {
  const workers: FakePort[] = [];
  const runtime = {
    connect(info: { name: string }) {
      const [client, worker] = portPair(info.name);
      workers.push(worker);
      return client;
    },
  };
  const transport = new ExtensionTransport(7, runtime);
  const messages: TransportMessage[] = [];
  transport.subscribe((m) => messages.push(m));
  /** Reply to the last request the worker saw. */
  const reply = (result: unknown, ok = true) => {
    const w = workers.at(-1)!;
    const req = w.received.filter((m) => m.kind === "request").at(-1);
    w.postMessage({ kind: "response", id: req.id, ok, ...(ok ? { result } : { error: result }) });
  };
  return { transport, workers, messages, reply, worker: () => workers.at(-1)! };
}

describe("ExtensionTransport", () => {
  test("inits with the tab id and resolves validated responses", async () => {
    const { transport, worker, reply } = setup();
    expect(worker().name).toBe(PANEL_PORT);
    expect(worker().received[0]).toEqual({ kind: "init", tabId: 7 });
    const p = transport.request("copyText", 1);
    reply("hello");
    expect(await p).toBe("hello");
    const q = transport.request("tree", 1);
    reply("boom", false);
    await expect(q).rejects.toThrow("boom");
  });

  test("rejects malformed results instead of handing them to the UI", async () => {
    const { transport, reply } = setup();
    const tree = transport.request("tree", 1);
    reply({ root: 1, name: "App", nodes: [{ id: "x" }] });
    await expect(tree).rejects.toThrow("Malformed tree response");
    const info = transport.request("pause", 1);
    reply({ ...rootInfo, fps: "fast" });
    await expect(info).rejects.toThrow("Malformed pause response");
  });

  test("drops malformed events and invalid frame records", () => {
    const { worker, messages } = setup();
    worker().postMessage({ kind: "event", event: "frames", records: [{ root: 1 }, { ...rootInfo }] });
    worker().postMessage({ kind: "event", event: "root-changed", root: { id: 1 } });
    worker().postMessage({ kind: "event", event: "nope" });
    worker().postMessage({ kind: "status", page: "maybe" });
    worker().postMessage("junk");
    expect(messages).toEqual([{ kind: "event", event: "frames", records: [] }]);
  });

  test("a worker restart rejects pending requests and reconnects without reporting a page disconnect", async () => {
    const { transport, workers, messages, worker } = setup();
    // Simulate an old connection so the restart isn't treated as a refusal.
    (transport as unknown as { connectedAt: number }).connectedAt = 0;
    const pending = transport.request("tree", 1);
    worker().disconnect();
    await expect(pending).rejects.toThrow("Disconnected");
    expect(workers).toHaveLength(2);
    expect(worker().received[0]).toEqual({ kind: "init", tabId: 7 });
    expect(messages.filter((m) => m.kind === "status")).toEqual([]);
    expect(transport.connected).toBe(true);
  });

  test("suspend closes the port and rejects requests; resume reconnects", async () => {
    const { transport, workers, worker } = setup();
    let closed = false;
    worker().onDisconnect.addListener(() => (closed = true));
    const pending = transport.request("tree", 1);
    transport.suspend();
    expect(closed).toBe(true);
    await expect(pending).rejects.toThrow("Panel hidden");
    await expect(transport.request("tree", 1)).rejects.toThrow("Panel hidden");
    expect(workers).toHaveLength(1);
    transport.resume();
    expect(workers).toHaveLength(2);
    expect(worker().received[0]).toEqual({ kind: "init", tabId: 7 });
  });
});

describe("panel validation", () => {
  test("sanitizeMessage rebuilds events and statuses", () => {
    expect(sanitizeMessage({ kind: "status", page: "connected", extra: 1 })).toEqual({ kind: "status", page: "connected" });
    expect(sanitizeMessage({ kind: "event", event: "roots", roots: [rootInfo, { id: 2 }] })).toEqual({ kind: "event", event: "roots", roots: [rootInfo] });
    expect(sanitizeMessage({ kind: "event", event: "roots", roots: "x" })).toBeNull();
    expect(sanitizeMessage({ kind: "event", event: "root-removed", root: 1 })).toBeNull();
  });

  test("tree and frame snapshots are checked field by field", () => {
    const n = { id: 1, parent: null, depth: 0, kind: "host", name: "tx-box", key: null, props: { a: "1" }, hooks: [], state: null, scene: null };
    expect(isTreeSnapshot({ root: 1, name: "App", nodes: [n] })).toBe(true);
    expect(isTreeSnapshot({ root: 1, name: "App", nodes: [{ ...n, id: '"]<img>' }] })).toBe(false);
    expect(isTreeSnapshot({ root: 1, name: "App", nodes: [{ ...n, props: { a: 1 } }] })).toBe(false);
    expect(isTreeSnapshot({ root: 1, name: "App", nodes: [{ ...n, kind: "evil" }] })).toBe(false);
    const f = { root: 1, cols: 2, rows: 1, frame: 3, chars: ["a", "b"], fg: [0, 0], bg: [0, 0], attrs: [0, 0], owner: [0, 5], owners: { 5: { scene: 5, label: "x", type: "text", rect: { x: 0, y: 0, width: 1, height: 1 }, fiber: null, components: ["A"] } } };
    expect(isFrameSnapshot(f)).toBe(true);
    expect(isFrameSnapshot({ ...f, chars: ["a"] })).toBe(false);
    expect(isFrameSnapshot({ ...f, fg: ["red", 0] })).toBe(false);
    expect(isFrameSnapshot({ ...f, cols: 100_000, rows: 100_000 })).toBe(false);
    expect(isFrameSnapshot({ ...f, owners: { 5: { scene: 5 } } })).toBe(false);
  });
});
