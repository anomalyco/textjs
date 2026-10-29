/**
 * `globalThis.__TEXTJS_DEVTOOLS_HOOK__`: the bridge between console roots and
 * the Text.js DevTools extension (the same shape as React DevTools' global hook).
 *
 * The extension installs the hook at `document_start`. Roots created afterwards
 * register a handle with it. When the hook is absent, `connectDevTools()` returns
 * `null` and roots do nothing else: no allocations, no listeners, no work per frame.
 * When it is present but no DevTools client is attached (`hook.active === false`),
 * the per-frame cost is one property read. Tree and frame snapshots are computed
 * only when the panel asks for them.
 *
 * This module has no runtime imports so the extension's page script can bundle
 * `installDevToolsHook()` without pulling in React or Yoga.
 */

import type { ConsoleRenderer, FrameResult, SceneNode } from "@textjs/core";

export const DEVTOOLS_HOOK_KEY = "__TEXTJS_DEVTOOLS_HOOK__";
export const DEVTOOLS_PROTOCOL = 1;

// -----------------------------------------------------------------------------
// Wire types (JSON-safe: they cross postMessage and extension ports)
// -----------------------------------------------------------------------------

export interface DevToolsRootInfo {
  id: number;
  name: string;
  cols: number;
  rows: number;
  paused: boolean;
  wireframe: boolean;
  responsive: boolean;
  fps: number;
  frameCount: number;
  skippedFrames: number;
  yogaNodes: number;
  highlighted: number | null;
}

export interface DevToolsFrameRecord {
  root: number;
  /** `performance.now()` when the frame finished. */
  t: number;
  /** Emitted frame number (unchanged for skipped frames). */
  frame: number;
  /** No cells changed, so nothing was logged. */
  skipped: boolean;
  /** React commits since the previous frame. */
  commits: number;
  /** Synchronous React work flushed at the start of the frame. */
  reactMs: number;
  layoutMs: number;
  paintMs: number;
  encodeMs: number;
  totalMs: number;
  dirtyRows: number;
  spanCount: number;
  cols: number;
  rows: number;
  /** Milliseconds since the previous emitted frame (0 for the first one and for skipped frames). */
  interval: number;
}

export interface DevToolsRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DevToolsSceneInfo {
  id: number;
  type: "box" | "text" | "raw-text";
  label: string | null;
  layout: DevToolsRect;
  content: DevToolsRect;
  screen: DevToolsRect;
  painted: boolean;
  text?: string;
  /** An inline span inside another text node: it has no layout of its own. */
  inline?: boolean;
  /** For inline spans, the text node that lays out and paints them. */
  owner?: number;
}

export interface DevToolsHookValue {
  kind: "state" | "reducer" | "store" | "effect" | "layout-effect" | "insertion-effect" | "memo" | "callback" | "ref" | "id" | "hook";
  value: string;
}

export type DevToolsNodeKind = "component" | "host" | "text" | "provider" | "suspense" | "portal";

export interface DevToolsTreeNode {
  id: number;
  parent: number | null;
  depth: number;
  kind: DevToolsNodeKind;
  name: string;
  key: string | null;
  props: Record<string, string>;
  hooks: DevToolsHookValue[];
  state: string | null;
  scene: DevToolsSceneInfo | null;
}

export interface DevToolsTreeSnapshot {
  root: number;
  name: string;
  nodes: DevToolsTreeNode[];
}

export interface DevToolsCellOwner {
  scene: number;
  label: string;
  type: "box" | "text" | "raw-text";
  rect: DevToolsRect;
  /** Tree node id of the host fiber for this scene node. */
  fiber: number | null;
  /** Nearest component ancestors, innermost first. */
  components: string[];
}

export interface DevToolsFrameSnapshot {
  root: number;
  cols: number;
  rows: number;
  frame: number;
  /** One grapheme per cell, row-major; `""` for the second half of a wide cell. */
  chars: string[];
  /** Packed `0xRRGGBBAA`. */
  fg: number[];
  bg: number[];
  attrs: number[];
  /** Scene node id at each cell (topmost in paint order), `0` for none. */
  owner: number[];
  owners: Record<number, DevToolsCellOwner>;
}

/** What a console root exposes to the hook. Every method is lazy. */
export interface DevToolsRootHandle {
  info(): DevToolsRootInfo;
  tree(): DevToolsTreeSnapshot;
  frame(): DevToolsFrameSnapshot;
  /** Highlight a scene node in the live console (`null` clears). */
  highlight(sceneId: number | null): boolean;
  setWireframe(enabled: boolean): void;
  pause(): void;
  resume(): void;
  resize(cols: number, rows: number): void;
  /** Follow the docked DevTools size again. */
  fit(): void;
  /** The current frame as plain text. */
  copyText(): string;
}

export type DevToolsHookEvent =
  | { type: "root-added"; root: DevToolsRootInfo }
  | { type: "root-removed"; root: number }
  | { type: "root-changed"; root: DevToolsRootInfo }
  | { type: "frame"; record: DevToolsFrameRecord };

export interface TextDevToolsHook {
  readonly protocol: number;
  /** Set by the DevTools client while it is attached. Roots skip all telemetry while `false`. */
  active: boolean;
  readonly roots: Map<number, DevToolsRootHandle>;
  register(handle: DevToolsRootHandle): number;
  unregister(id: number): void;
  emit(event: DevToolsHookEvent): void;
  subscribe(listener: (event: DevToolsHookEvent) => void): () => void;
}

// -----------------------------------------------------------------------------
// Hook installation (used by the extension's page script and by tests)
// -----------------------------------------------------------------------------

/** Install the hook on `target` (default `globalThis`), or return the existing one. */
export function installDevToolsHook(target: object = globalThis): TextDevToolsHook {
  const g = target as Record<string, unknown>;
  const existing = g[DEVTOOLS_HOOK_KEY] as TextDevToolsHook | undefined;
  if (existing && typeof existing.register === "function") return existing;
  const listeners = new Set<(event: DevToolsHookEvent) => void>();
  let nextId = 1;
  const hook: TextDevToolsHook = {
    protocol: DEVTOOLS_PROTOCOL,
    active: false,
    roots: new Map(),
    register(handle) {
      const id = nextId++;
      hook.roots.set(id, handle);
      if (listeners.size > 0) hook.emit({ type: "root-added", root: handle.info() });
      return id;
    },
    unregister(id) {
      if (!hook.roots.delete(id)) return;
      hook.emit({ type: "root-removed", root: id });
    },
    emit(event) {
      for (const l of listeners) {
        try {
          l(event);
        } catch {
          // A broken listener never breaks the app.
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  Object.defineProperty(g, DEVTOOLS_HOOK_KEY, { value: hook, configurable: true, enumerable: false, writable: false });
  return hook;
}

/** The installed hook, or `null`. */
export function getDevToolsHook(target: object = globalThis): TextDevToolsHook | null {
  const hook = (target as Record<string, unknown>)[DEVTOOLS_HOOK_KEY] as TextDevToolsHook | undefined;
  return hook && typeof hook.register === "function" ? hook : null;
}

// -----------------------------------------------------------------------------
// Root connection
// -----------------------------------------------------------------------------

export interface DevToolsConnectOptions {
  fiberRoot: unknown;
  rootNode: SceneNode;
  renderer: ConsoleRenderer;
}

/** Per-root bridge. Only exists while the hook is installed. */
export interface DevToolsConnection {
  /** `true` while a DevTools client is attached. */
  readonly active: boolean;
  /** Count a React commit. */
  commit(): void;
  /** Record time spent flushing React work before layout. */
  setReactMs(ms: number): void;
  /** Forward a renderer frame. */
  frame(frame: FrameResult): void;
  dispose(): void;
}

const now: () => number =
  typeof performance !== "undefined" && typeof performance.now === "function" ? () => performance.now() : () => Date.now();

/** Register a root with the hook. Returns `null` (and allocates nothing) when the hook is absent. */
export function connectDevTools(options: DevToolsConnectOptions): DevToolsConnection | null {
  const hook = getDevToolsHook();
  if (hook === null) return null;
  const { fiberRoot, rootNode, renderer } = options;
  const ids = new FiberIds();
  let highlighted: SceneNode | null = null;
  let id = 0;
  let commits = 0;
  let reactMs = 0;
  let lastEmitAt = -1;
  let lastInfoKey = -1;

  /** The highlighted node, dropped once it is unmounted or detached from this root. */
  const liveHighlight = (): SceneNode | null => {
    if (highlighted !== null && !isAttached(highlighted, rootNode)) {
      highlighted = null;
      renderer.setHighlightedNode(null);
    }
    return highlighted;
  };

  /** Paused renderers don't schedule frames; repaint the buffer (no console output) so inspector actions show. */
  const repaintIfPaused = (): void => {
    if (renderer.paused) renderer.rasterize();
  };

  const info = (): DevToolsRootInfo => {
    const s = renderer.stats();
    return {
      id,
      name: rootName(fiberRoot),
      cols: s.cols,
      rows: s.rows,
      paused: s.paused,
      wireframe: readWireframe(renderer),
      responsive: renderer.viewport.responsive,
      fps: s.fps,
      frameCount: s.frameCount,
      skippedFrames: s.skippedFrames,
      yogaNodes: s.yogaNodes,
      highlighted: liveHighlight()?.id ?? null,
    };
  };

  const changed = (): void => {
    if (!hook.active) return;
    const i = info();
    lastInfoKey = stateKey(i.cols, i.rows, i.paused, i.wireframe, i.responsive);
    hook.emit({ type: "root-changed", root: i });
  };

  const handle: DevToolsRootHandle = {
    info,
    tree: () => snapshotTree(id, fiberRoot, ids),
    frame: () => snapshotFrame(id, fiberRoot, rootNode, renderer, ids),
    highlight(sceneId) {
      const node = sceneId === null ? null : findScene(rootNode, sceneId);
      // Inline spans have no box of their own; highlight the text that lays them out.
      highlighted = node !== null && node.isInline ? node.textOwner() : node;
      renderer.setHighlightedNode(highlighted);
      repaintIfPaused();
      return node !== null || sceneId === null;
    },
    setWireframe(enabled) {
      renderer.setWireframe(enabled);
      repaintIfPaused();
      changed();
    },
    pause() {
      renderer.pause();
      changed();
    },
    resume() {
      renderer.resume();
      changed();
    },
    resize(cols, rows) {
      renderer.resize(cols, rows);
      repaintIfPaused();
      changed();
    },
    fit() {
      renderer.viewport.setResponsive(true);
      repaintIfPaused();
      changed();
    },
    copyText: () => renderer.buffer.toPlainString(true).replace(/\n+$/, ""),
  };
  id = hook.register(handle);

  return {
    get active() {
      return hook.active;
    },
    commit() {
      if (hook.active) commits++;
    },
    setReactMs(ms) {
      reactMs = ms;
    },
    frame(f) {
      if (!hook.active) {
        commits = 0;
        reactMs = 0;
        return;
      }
      if (highlighted !== null) liveHighlight();
      const t = now();
      const interval = f.skipped || lastEmitAt < 0 ? 0 : t - lastEmitAt;
      if (!f.skipped) lastEmitAt = t;
      hook.emit({
        type: "frame",
        record: {
          root: id,
          t,
          frame: f.frameCount,
          skipped: f.skipped,
          commits,
          reactMs,
          layoutMs: Math.max(0, f.layoutMs - reactMs),
          paintMs: f.rasterMs,
          encodeMs: f.encodeMs,
          totalMs: f.totalMs,
          dirtyRows: f.skipped ? 0 : f.dirtyRows,
          spanCount: f.spanCount,
          cols: f.cols,
          rows: f.rows,
          interval,
        },
      });
      commits = 0;
      reactMs = 0;
      // Size / pause / wireframe changes made outside the panel (e.g. `text.resize()`).
      const key = stateKey(f.cols, f.rows, f.paused, readWireframe(renderer), renderer.viewport.responsive);
      if (key !== lastInfoKey) {
        lastInfoKey = key;
        hook.emit({ type: "root-changed", root: info() });
      }
    },
    dispose() {
      if (highlighted) renderer.setHighlightedNode(null);
      highlighted = null;
      hook.unregister(id);
    },
  };
}

function stateKey(cols: number, rows: number, paused: boolean, wireframe: boolean, responsive: boolean): number {
  return ((cols * 1024 + rows) * 8 + (paused ? 4 : 0) + (wireframe ? 2 : 0) + (responsive ? 1 : 0));
}

function readWireframe(renderer: ConsoleRenderer): boolean {
  return (renderer as unknown as { wireframe?: unknown }).wireframe === true;
}

function isAttached(node: SceneNode, root: SceneNode): boolean {
  if (node.isDestroyed) return false;
  let cur: SceneNode = node;
  while (cur.parent !== null) cur = cur.parent;
  return cur === root;
}

function findScene(node: SceneNode, id: number): SceneNode | null {
  if (node.id === id) return node;
  for (const c of node.children) {
    const hit = findScene(c, id);
    if (hit) return hit;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Fiber walking
// -----------------------------------------------------------------------------

interface Fiber {
  tag: number;
  type: unknown;
  elementType: unknown;
  key: string | null;
  memoizedProps: unknown;
  memoizedState: unknown;
  stateNode: unknown;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
  alternate: Fiber | null;
}

const enum Tag {
  FunctionComponent = 0,
  ClassComponent = 1,
  HostRoot = 3,
  HostPortal = 4,
  HostComponent = 5,
  HostText = 6,
  Fragment = 7,
  Mode = 8,
  ContextConsumer = 9,
  ContextProvider = 10,
  ForwardRef = 11,
  Profiler = 12,
  Suspense = 13,
  Memo = 14,
  SimpleMemo = 15,
  Lazy = 16,
  Offscreen = 22,
}

/** Stable ids across fiber double-buffering. */
class FiberIds {
  private readonly map = new WeakMap<object, number>();
  private next = 1;
  get(f: Fiber): number {
    let id = this.map.get(f);
    if (id === undefined && f.alternate) id = this.map.get(f.alternate);
    if (id === undefined) id = this.next++;
    this.map.set(f, id);
    if (f.alternate) this.map.set(f.alternate, id);
    return id;
  }
}

function currentFiber(fiberRoot: unknown): Fiber | null {
  return ((fiberRoot as { current?: Fiber } | null)?.current as Fiber | undefined) ?? null;
}

function fnName(fn: unknown): string | null {
  if (typeof fn !== "function") return null;
  const f = fn as { displayName?: unknown; name?: unknown };
  if (typeof f.displayName === "string" && f.displayName) return f.displayName;
  if (typeof f.name === "string" && f.name) return f.name;
  return null;
}

function typeName(type: unknown, depth = 0): string {
  if (typeof type === "string") return type;
  const n = fnName(type);
  if (n) return n;
  if (type && typeof type === "object" && depth < 4) {
    const t = type as { displayName?: unknown; render?: unknown; type?: unknown };
    if (typeof t.displayName === "string" && t.displayName) return t.displayName;
    if (t.render) return typeName(t.render, depth + 1);
    if (t.type) return typeName(t.type, depth + 1);
  }
  return "Anonymous";
}

interface Classified {
  kind: DevToolsNodeKind;
  name: string;
}

/** `null` for fibers that are hidden from the tree (fragments, modes, offscreen). */
function classify(f: Fiber): Classified | null {
  switch (f.tag) {
    case Tag.FunctionComponent:
    case Tag.ClassComponent:
    case Tag.SimpleMemo:
    case Tag.Lazy:
      return { kind: "component", name: typeName(f.type) };
    case Tag.ForwardRef:
    case Tag.Memo: {
      const inner = typeName(f.elementType ?? f.type);
      return { kind: "component", name: f.tag === Tag.Memo ? `Memo(${inner})` : inner };
    }
    case Tag.HostComponent:
      return { kind: "host", name: typeof f.type === "string" ? f.type : "host" };
    case Tag.HostText:
      return { kind: "text", name: "#text" };
    case Tag.ContextProvider: {
      const ctx = f.type as { displayName?: string; _context?: { displayName?: string } } | null;
      const dn = ctx?.displayName ?? ctx?._context?.displayName;
      return { kind: "provider", name: `${dn || "Context"}.Provider` };
    }
    case Tag.ContextConsumer: {
      const t = f.type as { displayName?: string; _context?: { displayName?: string } } | null;
      const dn = t?._context?.displayName ?? t?.displayName;
      return { kind: "provider", name: `${dn || "Context"}.Consumer` };
    }
    case Tag.Suspense:
      return { kind: "suspense", name: "Suspense" };
    case Tag.HostPortal:
      return { kind: "portal", name: "Portal" };
    case Tag.Fragment:
      return f.key !== null ? { kind: "component", name: "Fragment" } : null;
    default:
      return null;
  }
}

const isComponent = (f: Fiber): boolean =>
  f.tag === Tag.FunctionComponent || f.tag === Tag.ClassComponent || f.tag === Tag.ForwardRef || f.tag === Tag.Memo || f.tag === Tag.SimpleMemo;

function walk(root: Fiber, visit: (f: Fiber, parent: number | null, depth: number) => number | null): void {
  const stack: Array<{ f: Fiber; parent: number | null; depth: number }> = [];
  for (let c = root.child; c; c = c.sibling) stack.push({ f: c, parent: null, depth: 0 });
  stack.reverse();
  while (stack.length > 0) {
    const { f, parent, depth } = stack.pop() as { f: Fiber; parent: number | null; depth: number };
    const id = visit(f, parent, depth);
    const nextParent = id === null ? parent : id;
    const nextDepth = id === null ? depth : depth + 1;
    const kids: Fiber[] = [];
    for (let c = f.child; c; c = c.sibling) kids.push(c);
    for (let i = kids.length - 1; i >= 0; i--) stack.push({ f: kids[i] as Fiber, parent: nextParent, depth: nextDepth });
  }
}

/** Tracks the root's display name during a preorder walk: the first component inside the `app` host box. */
class RootNamer {
  private seenApp = false;
  name: string | null = null;
  /** Returns `true` once the name is known. */
  visit(f: Fiber): boolean {
    if (this.name !== null) return true;
    if (!this.seenApp) {
      if (f.tag === Tag.HostComponent && (f.stateNode as SceneNode | null)?.props?.wireframeLabel === "app") this.seenApp = true;
    } else if (isComponent(f)) this.name = classify(f)?.name ?? null;
    return this.name !== null;
  }
}

function rootName(fiberRoot: unknown): string {
  const root = currentFiber(fiberRoot);
  if (!root) return "Root";
  const namer = new RootNamer();
  const stack: Fiber[] = [];
  for (let c = root.child; c; c = c.sibling) stack.push(c);
  stack.reverse();
  while (stack.length > 0) {
    const f = stack.pop() as Fiber;
    if (namer.visit(f)) break;
    const kids: Fiber[] = [];
    for (let c = f.child; c; c = c.sibling) kids.push(c);
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i] as Fiber);
  }
  return namer.name ?? "Root";
}

function snapshotTree(rootId: number, fiberRoot: unknown, ids: FiberIds): DevToolsTreeSnapshot {
  const nodes: DevToolsTreeNode[] = [];
  const root = currentFiber(fiberRoot);
  const namer = new RootNamer();
  if (root) {
    walk(root, (f, parent, depth) => {
      namer.visit(f);
      const c = classify(f);
      if (c === null) return null;
      const id = ids.get(f);
      const scene = f.tag === Tag.HostComponent || f.tag === Tag.HostText ? sceneInfo(f.stateNode as SceneNode | null) : null;
      nodes.push({
        id,
        parent,
        depth,
        kind: c.kind,
        name: c.name,
        key: f.key,
        props: c.kind === "text" ? {} : summarizeProps(f.tag === Tag.HostComponent ? ((f.stateNode as SceneNode | null)?.props ?? f.memoizedProps) : f.memoizedProps),
        hooks: f.tag === Tag.FunctionComponent || f.tag === Tag.ForwardRef || f.tag === Tag.SimpleMemo ? summarizeHooks(f.memoizedState) : [],
        state: f.tag === Tag.ClassComponent ? summarize(f.memoizedState, 1) : null,
        scene,
      });
      return id;
    });
  }
  return { root: rootId, name: namer.name ?? "Root", nodes };
}

function rect(r: { x: number; y: number; width: number; height: number }): DevToolsRect {
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function sceneInfo(node: SceneNode | null): DevToolsSceneInfo | null {
  if (!node || typeof node.id !== "number") return null;
  const L = node.layout;
  const S = node.screenRect;
  const out: DevToolsSceneInfo = {
    id: node.id,
    type: node.type,
    label: typeof node.props.wireframeLabel === "string" ? node.props.wireframeLabel : null,
    layout: rect(L),
    content: { x: L.contentX, y: L.contentY, width: L.contentWidth, height: L.contentHeight },
    screen: rect(S),
    painted: node.painted,
  };
  if (node.type === "raw-text") out.text = truncate(node.text, 120);
  if (node.isInline) {
    out.inline = true;
    out.owner = node.textOwner().id;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Value summaries
// -----------------------------------------------------------------------------

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

const REACT_ELEMENT = Symbol.for("react.transitional.element");
const REACT_ELEMENT_LEGACY = Symbol.for("react.element");

/** A short, display-only string for any value. Never throws: getters, revoked proxies and odd objects become `"[Exception]"`. */
export function summarize(value: unknown, depth = 0): string {
  try {
    return summarizeUnsafe(value, depth);
  } catch {
    return "[Exception]";
  }
}

function summarizeUnsafe(value: unknown, depth: number): string {
  switch (typeof value) {
    case "string":
      return JSON.stringify(truncate(value, 80));
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    case "undefined":
      return "undefined";
    case "symbol":
      return value.toString();
    case "function":
      return `ƒ ${fnName(value) ?? "anonymous"}()`;
  }
  if (value === null) return "null";
  const o = value as Record<string | symbol, unknown>;
  if (o.$$typeof === REACT_ELEMENT || o.$$typeof === REACT_ELEMENT_LEGACY) return `<${typeName(o.type)} />`;
  if (Array.isArray(value)) {
    if (depth >= 1 || value.length > 6) return `Array(${value.length})`;
    return `[${value.map((v) => summarize(v, depth + 1)).join(", ")}]`;
  }
  if (value instanceof Map) return `Map(${value.size})`;
  if (value instanceof Set) return `Set(${value.size})`;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  if (value instanceof Error) return `${safeString(value.name, "Error")}: ${truncate(safeString(value.message, ""), 60)}`;
  if (ArrayBuffer.isView(value)) return `${value.constructor.name}(${(value as unknown as { length?: number }).length ?? value.byteLength})`;
  const keys = Object.keys(o);
  const ctor = (Object.getPrototypeOf(o) as { constructor?: { name?: string } } | null)?.constructor?.name;
  const prefix = ctor && ctor !== "Object" ? `${ctor} ` : "";
  if (depth >= 1) return keys.length === 0 ? `${prefix}{}` : `${prefix}{…}`;
  const shown = keys.slice(0, 4).map((k) => `${k}: ${summarize(o[k], depth + 1)}`);
  if (keys.length > 4) shown.push("…");
  return truncate(`${prefix}{${shown.join(", ")}}`, 160);
}

function safeString(v: unknown, fallback: string): string {
  if (typeof v === "string") return v;
  try {
    return v === undefined || v === null ? fallback : String(v);
  } catch {
    return fallback;
  }
}

/** @internal Exported for tests. */
export function summarizeProps(props: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!props || typeof props !== "object") return out;
  const p = props as Record<string, unknown>;
  let keys: string[];
  try {
    keys = Object.keys(p);
  } catch {
    return out;
  }
  // `defineProperty` so a prop named `__proto__` stays an own key instead of swapping the prototype.
  const set = (k: string, v: string): void => void Object.defineProperty(out, k, { value: v, enumerable: true, writable: true, configurable: true });
  for (const k of keys) {
    let v: unknown;
    try {
      v = p[k];
    } catch {
      set(k, "[Exception]");
      continue;
    }
    if (k === "children") {
      if (typeof v === "string" || typeof v === "number") set(k, summarize(v));
      else if (v !== undefined && v !== null) set(k, Array.isArray(v) ? `[${v.length}]` : summarize(v, 1));
      continue;
    }
    if (v === undefined) continue;
    set(k, summarize(v, 0));
  }
  return out;
}

/** @internal */
export interface HookNode {
  memoizedState: unknown;
  queue: unknown;
  next: HookNode | null;
}

function summarizeHooks(first: unknown): DevToolsHookValue[] {
  const out: DevToolsHookValue[] = [];
  let h = first as HookNode | null;
  let guard = 0;
  try {
    while (h && typeof h === "object" && "next" in h && guard++ < 64) {
      out.push(classifyHook(h));
      h = h.next;
    }
  } catch {
    out.push({ kind: "hook", value: "[Exception]" });
  }
  return out;
}

const stateReducers = new WeakMap<object, boolean>();
/** React's `basicStateReducer` source: `(s, a) => typeof a === "function" ? a(s) : a` (minified names vary). */
const BASIC_STATE_REDUCER = /^function\s*[\w$]*\s*\(\s*([\w$]+)\s*,\s*([\w$]+)\s*\)\s*\{\s*return\s*(?:typeof\s*\2\s*={2,3}\s*["']function["']|["']function["']\s*={2,3}\s*typeof\s*\2)\s*\?\s*\2\s*\(\s*\1\s*\)\s*:\s*\2\s*;?\s*\}$/;

/** Whether a hook queue's reducer is `useState`'s, recognized by shape since builds minify its name. */
function isStateReducer(reducer: unknown): boolean {
  if (reducer === null || reducer === undefined) return true;
  if (typeof reducer !== "function") return false;
  let known = stateReducers.get(reducer);
  if (known === undefined) {
    if (reducer.name === "basicStateReducer") known = true;
    else {
      let src = "";
      try {
        src = Function.prototype.toString.call(reducer);
      } catch {
        // Revoked proxy or exotic function.
      }
      known = src.length < 200 && BASIC_STATE_REDUCER.test(src);
    }
    stateReducers.set(reducer, known);
  }
  return known;
}

/** `useId()` values across React versions and `identifierPrefix`es: `:r0:`, `:R1:`, `«r0»`, `_r_0_`, `_txr_1h_`. */
const USE_ID = /^(?::[\w-]*r[\w-]*:|«[\w-]*r[\w-]*»|_[\w-]*r_[\w-]*_)$/i;

/** @internal Exported for tests. */
export function classifyHook(h: HookNode): DevToolsHookValue {
  const q = h.queue as { dispatch?: unknown; lastRenderedReducer?: unknown; getSnapshot?: unknown } | null;
  const ms = h.memoizedState;
  if (q && typeof q === "object") {
    if (typeof q.getSnapshot === "function") return { kind: "store", value: summarize(ms) };
    if ("dispatch" in q) return { kind: isStateReducer(q.lastRenderedReducer) ? "state" : "reducer", value: summarize(ms) };
  }
  if (ms && typeof ms === "object") {
    const e = ms as { tag?: unknown; deps?: unknown; next?: unknown; current?: unknown };
    if (typeof e.tag === "number" && "deps" in e && "next" in e) {
      const tag = e.tag;
      const kind = tag & 4 ? "layout-effect" : tag & 2 ? "insertion-effect" : "effect";
      return { kind, value: Array.isArray(e.deps) ? `deps(${e.deps.length})` : "every render" };
    }
    if (Array.isArray(ms) && ms.length === 2 && (ms[1] === null || Array.isArray(ms[1]))) {
      return typeof ms[0] === "function" ? { kind: "callback", value: summarize(ms[0]) } : { kind: "memo", value: summarize(ms[0]) };
    }
    const keys = Object.keys(ms);
    if (keys.length === 1 && keys[0] === "current") return { kind: "ref", value: summarize(e.current, 1) };
  }
  if (typeof ms === "string" && q === null && ms.length <= 64 && USE_ID.test(ms)) return { kind: "id", value: ms };
  return { kind: "hook", value: summarize(ms) };
}

// -----------------------------------------------------------------------------
// Frame snapshot + cell ownership (mirrors the painter's traversal)
// -----------------------------------------------------------------------------

interface Clip {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Deferred {
  node: SceneNode;
  ox: number;
  oy: number;
  clip: Clip;
  z: number;
  order: number;
  overlay: boolean;
}

const enum Surface {
  /** Paints nothing: transparent box inside an overlay. */
  None,
  /** Paints only its border. */
  Border,
  /** Paints its whole rect. */
  Fill,
}

/**
 * Which cells a node owns. Text and in-flow boxes own their rect, as before.
 * Transparent absolute boxes (a full-screen `<Toaster>` layer, `<Modal
 * backdropDim={0}>`) paint nothing, and neither do the transparent boxes
 * inside them, so they never steal ownership of the content underneath.
 */
function surfaceOf(node: SceneNode, overlay: boolean): Surface {
  if (node.type !== "box" || !overlay) return Surface.Fill;
  const s = node.resolved;
  if (s.backdrop !== 0 || (s.bg !== null && (s.bg & 255) !== 0) || node.props.customPaint) return Surface.Fill;
  return s.borderStyle !== "none" ? Surface.Border : Surface.None;
}

/** Scene node id painted last (topmost) at each cell, in the painter's traversal order (clip, scroll, `zIndex`). */
export function paintOwners(root: SceneNode, cols: number, rows: number, out: Int32Array): void {
  const deferred: Deferred[] = [];
  const fill = (id: number, x0: number, y0: number, x1: number, y1: number, clip: Clip): void => {
    const ax = Math.max(clip.x0, x0, 0);
    const ay = Math.max(clip.y0, y0, 0);
    const bx = Math.min(clip.x1, x1, cols);
    const by = Math.min(clip.y1, y1, rows);
    if (bx <= ax) return;
    for (let yy = ay; yy < by; yy++) out.fill(id, yy * cols + ax, yy * cols + bx);
  };
  const visit = (node: SceneNode, ox: number, oy: number, clip: Clip, inOverlay: boolean): void => {
    const p = node.props;
    if (p.display === "none" || !node.painted) return;
    const L = node.layout;
    const x = L.x + ox;
    const y = L.y + oy;
    const overlay = inOverlay || (node.type === "box" && p.position === "absolute");
    const surface = surfaceOf(node, overlay);
    if (surface === Surface.Fill) fill(node.id, x, y, x + L.width, y + L.height, clip);
    else if (surface === Surface.Border && L.width > 0 && L.height > 0) {
      if (p.borderTop !== false) fill(node.id, x, y, x + L.width, y + 1, clip);
      if (p.borderBottom !== false) fill(node.id, x, y + L.height - 1, x + L.width, y + L.height, clip);
      if (p.borderLeft !== false) fill(node.id, x, y, x + 1, y + L.height, clip);
      if (p.borderRight !== false) fill(node.id, x + L.width - 1, y, x + L.width, y + L.height, clip);
    }
    if (node.type !== "box") return;
    // Children of a box that paints its whole surface are ordinary content again.
    const childOverlay = overlay && surface !== Surface.Fill;
    let next = clip;
    let cox = ox;
    let coy = oy;
    if ((p.overflow ?? "visible") !== "visible") {
      const none = node.resolved.borderStyle === "none";
      const bl = p.borderLeft === false || none ? 0 : 1;
      const bt = p.borderTop === false || none ? 0 : 1;
      const br = p.borderRight === false || none ? 0 : 1;
      const bb = p.borderBottom === false || none ? 0 : 1;
      next = {
        x0: Math.max(clip.x0, x + bl),
        y0: Math.max(clip.y0, y + bt),
        x1: Math.min(clip.x1, x + L.width - br),
        y1: Math.min(clip.y1, y + L.height - bb),
      };
      cox -= Math.min(Math.max(0, L.scrollWidth - L.contentWidth), Math.max(0, Math.floor(p.scrollX ?? 0)));
      coy -= Math.min(Math.max(0, L.scrollHeight - L.contentHeight), Math.max(0, Math.floor(p.scrollY ?? 0)));
    }
    for (const c of node.paintOrder()) {
      if (c.yoga === null) continue;
      const cz = c.props.zIndex ?? 0;
      if (cz > 0 && c.props.position === "absolute") {
        deferred.push({ node: c, ox: cox, oy: coy, clip: next, z: cz, order: deferred.length, overlay: childOverlay });
        continue;
      }
      visit(c, cox, coy, next, childOverlay);
    }
  };
  visit(root, 0, 0, { x0: 0, y0: 0, x1: cols, y1: rows }, false);
  while (deferred.length > 0) {
    deferred.sort((a, b) => a.z - b.z || a.order - b.order);
    const d = deferred.shift() as Deferred;
    visit(d.node, d.ox, d.oy, d.clip, d.overlay);
  }
}

function snapshotFrame(rootId: number, fiberRoot: unknown, rootNode: SceneNode, renderer: ConsoleRenderer, ids: FiberIds): DevToolsFrameSnapshot {
  const buf = renderer.buffer;
  const cols = buf.width;
  const rows = buf.height;
  const n = cols * rows;
  const chars: string[] = new Array(n);
  const fg: number[] = new Array(n);
  const bg: number[] = new Array(n);
  const attrs: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const code = buf.chars[i] as number;
    chars[i] = code === 0 ? "" : buf.cellText(i);
    fg[i] = buf.fg[i] as number;
    bg[i] = buf.bg[i] as number;
    attrs[i] = buf.attrs[i] as number;
  }
  const ownerIds = new Int32Array(n);
  paintOwners(rootNode, cols, rows, ownerIds);

  // Scene node → host fiber + component chain.
  const byScene = new Map<number, { fiber: number; components: string[] }>();
  const root = currentFiber(fiberRoot);
  if (root) {
    const chain: string[] = [];
    const visit = (f: Fiber): void => {
      const comp = isComponent(f);
      if (comp) chain.push(classify(f)?.name ?? "Anonymous");
      if (f.tag === Tag.HostComponent) {
        const s = f.stateNode as SceneNode | null;
        if (s && typeof s.id === "number") byScene.set(s.id, { fiber: ids.get(f), components: chain.slice(-6).reverse() });
      }
      for (let c = f.child; c; c = c.sibling) visit(c);
      if (comp) chain.pop();
    };
    visit(root);
  }

  const sceneById = new Map<number, SceneNode>();
  const index = (s: SceneNode): void => {
    sceneById.set(s.id, s);
    for (const c of s.children) index(c);
  };
  index(rootNode);

  const owners: Record<number, DevToolsCellOwner> = {};
  const owner: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const sid = ownerIds[i] as number;
    owner[i] = sid;
    if (sid === 0 || owners[sid]) continue;
    const node = sceneById.get(sid);
    if (!node) continue;
    const link = byScene.get(sid);
    const label = typeof node.props.wireframeLabel === "string" ? node.props.wireframeLabel : node.type === "box" ? "tx-box" : "tx-text";
    owners[sid] = {
      scene: sid,
      label,
      type: node.type,
      rect: rect(node.screenRect),
      fiber: link?.fiber ?? null,
      components: link?.components ?? [],
    };
  }
  return { root: rootId, cols, rows, frame: renderer.stats().frameCount, chars, fg, bg, attrs, owner, owners };
}
