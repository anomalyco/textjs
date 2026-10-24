/**
 * The panel UI against a recorded snapshot (`fixture.json`, written by
 * `bun e2e/extension.e2e.ts --record`). No extension APIs involved.
 *
 *   harness.html?tab=components|frame|timeline&select=<tree node name>
 */

import { createRoot } from "react-dom/client";
import type { Method, RequestMap } from "../src/protocol";
import { App } from "../src/panel/App";
import { PanelStore, type Tab } from "../src/panel/store";
import type { Transport, TransportMessage } from "../src/panel/transport";
import fixture from "./fixture.json";

type Fixture = {
  roots: RequestMap["roots"]["result"];
  tree: RequestMap["tree"]["result"];
  frame: RequestMap["frame"]["result"];
  records: import("../src/protocol").DevToolsFrameRecord[];
};

const data = fixture as unknown as Fixture;

class RecordedTransport implements Transport {
  readonly calls: Array<{ method: Method; args: unknown[] }> = [];
  private readonly listeners = new Set<(m: TransportMessage) => void>();

  request<M extends Method>(method: M, _root: number | null, ...args: RequestMap[M]["args"]): Promise<RequestMap[M]["result"]> {
    this.calls.push({ method, args });
    const root = data.roots[0]!;
    const results: { [K in Method]: () => RequestMap[K]["result"] } = {
      roots: () => data.roots,
      tree: () => data.tree,
      frame: () => data.frame,
      highlight: () => true,
      setWireframe: () => ({ ...root, wireframe: args[0] === true }),
      pause: () => ({ ...root, paused: true }),
      resume: () => ({ ...root, paused: false }),
      resize: () => ({ ...root, cols: Number(args[0]), rows: Number(args[1]), responsive: false }),
      fit: () => ({ ...root, responsive: true }),
      copyText: () => "",
    };
    return Promise.resolve(results[method]() as RequestMap[M]["result"]);
  }

  subscribe(listener: (m: TransportMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(m: TransportMessage): void {
    for (const l of this.listeners) l(m);
  }
}

const params = new URLSearchParams(location.search);
const transport = new RecordedTransport();
const store = new PanelStore(transport, { tab: (params.get("tab") as Tab | null) ?? "components" });
transport.emit({ kind: "status", page: "connected" });
transport.emit({ kind: "event", event: "roots", roots: data.roots.map((r) => ({ ...r, fps: Math.max(r.fps, 15), highlighted: null })) });
store.set({ records: data.records });

const select = params.get("select");
if (select) {
  const pick = (): void => {
    const node = store.get().tree?.nodes.find((n) => n.name === select || n.scene?.label === select);
    if (node) store.select(node.id);
    else setTimeout(pick, 20);
  };
  pick();
}

(globalThis as Record<string, unknown>).__textjsPanel = store;
createRoot(document.getElementById("root")!).render(<App store={store} />);
