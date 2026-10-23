import { useSyncExternalStore } from "react";
import type { DevToolsFrameRecord, DevToolsFrameSnapshot, DevToolsRootInfo, DevToolsTreeSnapshot } from "../protocol";
import type { Transport, TransportMessage } from "./transport";

export type Tab = "components" | "frame" | "timeline";

export interface PanelState {
  status: "connecting" | "connected" | "disconnected";
  roots: DevToolsRootInfo[];
  rootId: number | null;
  tab: Tab;
  tree: DevToolsTreeSnapshot | null;
  frame: DevToolsFrameSnapshot | null;
  records: DevToolsFrameRecord[];
  recording: boolean;
  /** Selected tree node (fiber id). */
  selected: number | null;
  showHosts: boolean;
  filter: string;
  liveFrame: boolean;
  error: string | null;
  toast: string | null;
}

export const MAX_RECORDS = 600;
const TREE_THROTTLE_MS = 300;
const FRAME_THROTTLE_MS = 200;

export class PanelStore {
  private state: PanelState = {
    status: "connecting",
    roots: [],
    rootId: null,
    tab: "components",
    tree: null,
    frame: null,
    records: [],
    recording: true,
    selected: null,
    showHosts: true,
    filter: "",
    liveFrame: true,
    error: null,
    toast: null,
  };
  private readonly listeners = new Set<() => void>();
  private treeTimer: ReturnType<typeof setTimeout> | null = null;
  private frameTimer: ReturnType<typeof setTimeout> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private highlighted: number | null = null;

  constructor(readonly transport: Transport, initial: Partial<PanelState> = {}) {
    this.state = { ...this.state, ...initial };
    transport.subscribe((m) => this.onMessage(m));
  }

  readonly subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  readonly get = (): PanelState => this.state;

  set(patch: Partial<PanelState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  get root(): DevToolsRootInfo | null {
    return this.state.roots.find((r) => r.id === this.state.rootId) ?? null;
  }

  private onMessage(m: TransportMessage): void {
    if (m.kind === "status") {
      if (m.page === "disconnected") this.set({ status: "disconnected", roots: [], rootId: null, tree: null, frame: null });
      else this.set({ status: "connected" });
      return;
    }
    switch (m.event) {
      case "roots": {
        const rootId = m.roots.some((r) => r.id === this.state.rootId) ? this.state.rootId : (m.roots[0]?.id ?? null);
        const changed = rootId !== this.state.rootId;
        this.set({ status: "connected", roots: m.roots, rootId, ...(changed ? { tree: null, frame: null, records: [], selected: null } : {}) });
        this.refresh();
        break;
      }
      case "root-changed":
        this.set({ roots: this.state.roots.map((r) => (r.id === m.root.id ? m.root : r)) });
        break;
      case "root-removed": {
        const roots = this.state.roots.filter((r) => r.id !== m.root);
        const rootId = m.root === this.state.rootId ? (roots[0]?.id ?? null) : this.state.rootId;
        this.set({ roots, rootId });
        if (m.root !== rootId) this.refresh();
        break;
      }
      case "frames": {
        const mine = m.records.filter((r) => r.root === this.state.rootId);
        if (mine.length === 0) break;
        if (this.state.recording) {
          const records = this.state.records.concat(mine);
          this.set({ records: records.length > MAX_RECORDS ? records.slice(records.length - MAX_RECORDS) : records });
        }
        if (m.committed && this.state.tab === "components") this.scheduleTree();
        if (this.state.liveFrame && this.state.tab === "frame" && mine.some((r) => !r.skipped)) this.scheduleFrame();
        break;
      }
    }
  }

  /** Fetch whatever the current tab shows. */
  refresh(): void {
    if (this.state.rootId === null) return;
    if (this.state.tab === "components") this.fetchTree();
    else if (this.state.tab === "frame") {
      this.fetchFrame();
      if (this.state.tree === null) this.fetchTree();
    }
  }

  private scheduleTree(): void {
    if (this.treeTimer !== null) return;
    this.treeTimer = setTimeout(() => {
      this.treeTimer = null;
      this.fetchTree();
    }, TREE_THROTTLE_MS);
  }

  private scheduleFrame(): void {
    if (this.frameTimer !== null) return;
    this.frameTimer = setTimeout(() => {
      this.frameTimer = null;
      this.fetchFrame();
    }, FRAME_THROTTLE_MS);
  }

  fetchTree(): void {
    const id = this.state.rootId;
    if (id === null) return;
    this.transport.request("tree", id).then(
      (tree) => {
        if (tree.root === this.state.rootId) this.set({ tree, error: null });
      },
      (e: Error) => this.set({ error: e.message }),
    );
  }

  fetchFrame(): void {
    const id = this.state.rootId;
    if (id === null) return;
    this.transport.request("frame", id).then(
      (frame) => {
        if (frame.root === this.state.rootId) this.set({ frame, error: null });
      },
      (e: Error) => this.set({ error: e.message }),
    );
  }

  setTab(tab: Tab): void {
    if (tab === this.state.tab) return;
    this.set({ tab });
    this.refresh();
  }

  selectRoot(rootId: number): void {
    if (rootId === this.state.rootId) return;
    this.highlight(null);
    this.set({ rootId, tree: null, frame: null, records: [], selected: null });
    this.refresh();
  }

  select(id: number | null): void {
    this.set({ selected: id });
    this.highlight(this.sceneFor(id));
  }

  /** Highlight a scene node in the live console (deduplicated). */
  highlight(sceneId: number | null): void {
    if (sceneId === this.highlighted || this.state.rootId === null) return;
    this.highlighted = sceneId;
    this.transport.request("highlight", this.state.rootId, sceneId).catch(() => undefined);
  }

  /** Restore the highlight to the current selection (after a hover ends). */
  unhover(): void {
    this.highlight(this.sceneFor(this.state.selected));
  }

  /** The scene node to highlight for a tree node: itself, or its first host descendant. */
  sceneFor(id: number | null): number | null {
    const tree = this.state.tree;
    if (id === null || !tree) return null;
    const i = tree.nodes.findIndex((n) => n.id === id);
    if (i < 0) return null;
    const node = tree.nodes[i]!;
    if (node.scene && node.kind === "host") return node.scene.id;
    for (let j = i + 1; j < tree.nodes.length; j++) {
      const n = tree.nodes[j]!;
      if (n.depth <= node.depth) break;
      if (n.kind === "host" && n.scene) return n.scene.id;
    }
    return null;
  }

  /** Tree node that owns a scene node. */
  nodeForScene(sceneId: number): number | null {
    return this.state.tree?.nodes.find((n) => n.kind === "host" && n.scene?.id === sceneId)?.id ?? null;
  }

  private control(p: Promise<DevToolsRootInfo>): void {
    p.then(
      (root) => {
        this.set({ roots: this.state.roots.map((r) => (r.id === root.id ? root : r)) });
        if (this.state.tab === "frame") this.scheduleFrame();
      },
      (e: Error) => this.set({ error: e.message }),
    );
  }

  togglePause(): void {
    const r = this.root;
    if (!r) return;
    this.control(this.transport.request(r.paused ? "resume" : "pause", r.id));
  }

  toggleWireframe(): void {
    const r = this.root;
    if (!r) return;
    this.control(this.transport.request("setWireframe", r.id, !r.wireframe));
  }

  resize(cols: number, rows: number): void {
    const r = this.root;
    if (!r) return;
    this.control(this.transport.request("resize", r.id, cols, rows));
  }

  fit(): void {
    const r = this.root;
    if (!r) return;
    this.control(this.transport.request("fit", r.id));
  }

  copyFrame(): void {
    const r = this.root;
    if (!r) return;
    this.transport.request("copyText", r.id).then(
      (text) => {
        copyToClipboard(text);
        this.notify(`Copied ${r.cols}×${r.rows} frame`);
      },
      (e: Error) => this.set({ error: e.message }),
    );
  }

  clearRecords(): void {
    this.set({ records: [] });
  }

  notify(toast: string): void {
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.set({ toast });
    this.toastTimer = setTimeout(() => this.set({ toast: null }), 1600);
  }
}

/** `navigator.clipboard` is unavailable in DevTools panels without focus; fall back to execCommand. */
function copyToClipboard(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    ta.remove();
  }
}

export function usePanel<T>(store: PanelStore, pick: (s: PanelState) => T): T {
  return useSyncExternalStore(store.subscribe, () => pick(store.get()));
}
