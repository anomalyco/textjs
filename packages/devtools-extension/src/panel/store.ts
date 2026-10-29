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
/** A worker restart briefly reports the page as gone until its content script reconnects. */
export const DISCONNECT_GRACE_MS = 1500;

/** One snapshot request at a time; a request made meanwhile runs once the current one settles. */
interface Fetcher {
  inFlight: boolean;
  again: boolean;
  seq: number;
}

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
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private highlighted: number | null = null;
  private visible = true;
  private readonly treeFetch: Fetcher = { inFlight: false, again: false, seq: 0 };
  private readonly frameFetch: Fetcher = { inFlight: false, again: false, seq: 0 };

  constructor(
    readonly transport: Transport,
    initial: Partial<PanelState> = {},
    private readonly options: { disconnectGraceMs?: number } = {},
  ) {
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
      if (m.page === "connected") {
        this.cancelDisconnect();
        this.set({ status: "connected" });
      } else if (this.state.roots.length === 0) this.clearPage();
      else if (this.disconnectTimer === null) this.disconnectTimer = setTimeout(() => this.clearPage(), this.options.disconnectGraceMs ?? DISCONNECT_GRACE_MS);
      return;
    }
    switch (m.event) {
      case "roots": {
        this.cancelDisconnect();
        const rootId = m.roots.some((r) => r.id === this.state.rootId) ? this.state.rootId : (m.roots[0]?.id ?? null);
        const changed = rootId !== this.state.rootId;
        this.set({ status: "connected", roots: m.roots, rootId, ...(changed ? { tree: null, frame: null, records: [], selected: null } : {}) });
        this.refresh();
        break;
      }
      case "root-changed":
        this.set({ roots: this.state.roots.map((r) => (r.id === m.root.id ? m.root : r)) });
        break;
      case "frames": {
        const mine = m.records.filter((r) => r.root === this.state.rootId);
        if (mine.length === 0) break;
        if (this.state.recording) {
          const records = this.state.records.concat(mine);
          this.set({ records: records.length > MAX_RECORDS ? records.slice(records.length - MAX_RECORDS) : records });
        }
        if (this.state.tab === "components" && mine.some((r) => r.commits > 0)) this.scheduleTree();
        if (this.state.liveFrame && this.state.tab === "frame" && mine.some((r) => !r.skipped)) this.scheduleFrame();
        break;
      }
    }
  }

  private cancelDisconnect(): void {
    if (this.disconnectTimer !== null) clearTimeout(this.disconnectTimer);
    this.disconnectTimer = null;
  }

  private clearPage(): void {
    this.cancelDisconnect();
    this.highlighted = null;
    this.set({ status: "disconnected", roots: [], rootId: null, tree: null, frame: null, selected: null });
  }

  /** DevTools shows or hides the panel: hidden panels detach so the page stops streaming. */
  setVisible(visible: boolean): void {
    if (visible === this.visible) return;
    this.visible = visible;
    if (!visible) {
      for (const t of [this.treeTimer, this.frameTimer]) if (t !== null) clearTimeout(t);
      this.treeTimer = null;
      this.frameTimer = null;
      // The page clears its highlight when the panel detaches.
      this.highlighted = null;
      this.transport.suspend?.();
    } else {
      // Re-attaching sends a fresh `roots` event, which refreshes the current tab.
      this.transport.resume?.();
    }
  }

  get isVisible(): boolean {
    return this.visible;
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

  /** Run `run` unless a request is already in flight, in which case run it once more afterwards. Stale replies are dropped. */
  private fetch<T extends { root: number }>(f: Fetcher, run: (root: number) => Promise<T>, apply: (value: T) => void): void {
    const id = this.state.rootId;
    if (id === null || !this.visible) return;
    if (f.inFlight) {
      f.again = true;
      return;
    }
    f.inFlight = true;
    f.again = false;
    const seq = ++f.seq;
    const done = (): void => {
      f.inFlight = false;
      if (f.again) this.fetch(f, run, apply);
    };
    run(id).then(
      (value) => {
        if (seq === f.seq && value.root === this.state.rootId) apply(value);
        done();
      },
      (e: Error) => {
        if (seq === f.seq) this.set({ error: e.message });
        done();
      },
    );
  }

  fetchTree(): void {
    this.fetch(this.treeFetch, (id) => this.transport.request("tree", id), (tree) => {
      const selected = this.state.selected;
      if (selected !== null && !tree.nodes.some((n) => n.id === selected)) {
        // The selected component unmounted: drop the selection and its highlight.
        this.set({ tree, selected: null, error: null });
        this.highlight(null);
      } else this.set({ tree, error: null });
    });
  }

  fetchFrame(): void {
    this.fetch(this.frameFetch, (id) => this.transport.request("frame", id), (frame) => this.set({ frame, error: null }));
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
    // Inline spans have no box; the owning text node is what gets highlighted.
    if (node.scene && node.kind === "host") return node.scene.owner ?? node.scene.id;
    for (let j = i + 1; j < tree.nodes.length; j++) {
      const n = tree.nodes[j]!;
      if (n.depth <= node.depth) break;
      if (n.kind === "host" && n.scene) return n.scene.id;
    }
    return null;
  }

  /** Tree node that owns a scene node. */
  nodeForScene(sceneId: number): number | null {
    return this.state.tree?.nodes.find((n) => n.kind === "host" && n.scene?.id === sceneId && !n.scene.inline)?.id ?? null;
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
