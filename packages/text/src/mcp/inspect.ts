/**
 * Component + scene tree inspection for `text mcp`.
 *
 * The React tree is read from fibers: `<FiberProbe>` (a class component
 * mounted around the app) exposes its fiber via `_reactInternals`, which React
 * sets on every class instance in development and production builds alike.
 * Host fibers (`tx-box` / `tx-text` / raw text) point at their `SceneNode`
 * (`stateNode`), whose `screenRect` from the last paint gives cell bounds.
 */

import { Component, type ReactNode } from "react";
import type { SceneNode } from "@textjs/core";
import type { FocusManager } from "@textjs/react";
import { paintOwners } from "@textjs/react/devtools-hook";

/** The subset of React's internal Fiber shape this module reads. */
interface Fiber {
  tag: number;
  type: unknown;
  elementType?: unknown;
  key: string | null;
  stateNode: unknown;
  return: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  alternate: Fiber | null;
  memoizedProps: Record<string, unknown> | null;
  memoizedState: unknown;
}

// React 19 work tags (react-reconciler/src/ReactWorkTags.js).
const FunctionComponent = 0;
const ClassComponent = 1;
const HostRoot = 3;
const HostPortal = 4;
const HostComponent = 5;
const HostText = 6;
const ForwardRef = 11;
const SuspenseComponent = 13;
const MemoComponent = 14;
const SimpleMemoComponent = 15;
const OffscreenComponent = 22;
const ActivityComponent = 31;

export class FiberProbe extends Component<{ children?: ReactNode }> {
  render(): ReactNode {
    return this.props.children;
  }
}

/** The current HostRoot fiber of the tree `probe` is mounted in. */
function currentRoot(probe: FiberProbe | null): Fiber | null {
  const fiber = (probe as unknown as { _reactInternals?: Fiber } | null)?._reactInternals;
  if (!fiber) return null;
  let f: Fiber = fiber;
  while (f.return) f = f.return;
  if (f.tag !== HostRoot) return null;
  const root = f.stateNode as { current?: Fiber } | null;
  return root?.current ?? f;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreeNode {
  /**
   * `component` (React function/class), `box` / `text` (host scene nodes),
   * `suspense`, or `portal` (content `<Modal>` / `<Dialog>` / toasts render
   * into the root layer; its bounds are not part of the parent's).
   */
  kind: "component" | "box" | "text" | "suspense" | "portal";
  name: string;
  key?: string;
  /** Screen bounds from the last painted frame (union of painted host descendants for components). */
  bounds?: Bounds;
  /** Text content (text hosts; truncated). */
  text?: string;
  /** Focus id owned by this component (`useFocus`), when it can be attributed. */
  focusId?: string;
  focused?: boolean;
  /** `wireframeLabel` / `title` of a box host, when set. */
  label?: string;
  children?: TreeNode[];
}

export interface FocusableInfo {
  id: string;
  focused: boolean;
  /** Included in Tab order and not blocked by a focus trap (e.g. an open `<Modal>`). */
  tabbable: boolean;
  component?: string;
  bounds?: Bounds;
}

export interface InspectOptions {
  /** Include host `box` / `text` nodes (default `true`). */
  hosts?: boolean;
  /** Levels of the returned tree (default 40), counted from the top level, or from each match with `component`. */
  maxDepth?: number;
  /** Only return subtrees rooted at components whose name matches (case-insensitive substring). */
  component?: string;
  /** Hide components that render nothing visible (default `true`). */
  hideEmpty?: boolean;
}

function displayName(fiber: Fiber): string | null {
  const t = fiber.type as { displayName?: string; name?: string; render?: { displayName?: string; name?: string }; type?: unknown } | null;
  switch (fiber.tag) {
    case FunctionComponent:
    case ClassComponent:
    case SimpleMemoComponent:
      return (t && (t.displayName || t.name)) || "Anonymous";
    case ForwardRef: {
      const r = t?.render;
      return t?.displayName || (r && (r.displayName || r.name)) || "ForwardRef";
    }
    case MemoComponent: {
      const inner = t?.type as { displayName?: string; name?: string; render?: { name?: string } } | undefined;
      return t?.displayName || inner?.displayName || inner?.name || inner?.render?.name || "Memo";
    }
    default:
      return null;
  }
}

function sceneOf(fiber: Fiber): SceneNode | null {
  if (fiber.tag !== HostComponent && fiber.tag !== HostText) return null;
  const node = fiber.stateNode as SceneNode | null;
  return node && typeof node === "object" && "screenRect" in node ? node : null;
}

function rectOf(node: SceneNode): Bounds | null {
  if (!node.painted) return null;
  const r = node.screenRect;
  if (r.width <= 0 || r.height <= 0) return null;
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function union(a: Bounds | null | undefined, b: Bounds | null | undefined): Bounds | null {
  if (!a) return b ?? null;
  if (!b) return a;
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.width, b.x + b.width);
  const y1 = Math.max(a.y + a.height, b.y + b.height);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function textOf(node: SceneNode): string {
  if (node.type === "raw-text") return node.text;
  let s = "";
  for (const c of node.children) s += textOf(c);
  return s;
}

function isHiddenOffscreen(fiber: Fiber): boolean {
  return (fiber.tag === OffscreenComponent || fiber.tag === ActivityComponent) && fiber.memoizedState !== null;
}

/** `Symbol.for("textjs.focusOwner")`: the marker `useFocus()` leaves in hook state (`@textjs/react` `FOCUS_OWNER`). */
const FOCUS_OWNER = Symbol.for("textjs.focusOwner");

type Hook = { memoizedState?: unknown; next?: unknown } | null;

function hooksOf(fiber: Fiber): Hook {
  if (fiber.tag !== FunctionComponent && fiber.tag !== ForwardRef && fiber.tag !== SimpleMemoComponent) return null;
  return fiber.memoizedState as Hook;
}

/** Focus ids this component registered with `useFocus()` (tagged `useMemo` state). */
function focusOwnerIds(fiber: Fiber): string[] {
  const out: string[] = [];
  let hook = hooksOf(fiber);
  let guard = 0;
  while (hook && typeof hook === "object" && guard++ < 200) {
    const v = hook.memoizedState;
    const value = Array.isArray(v) ? v[0] : undefined;
    const id = value !== null && typeof value === "object" ? (value as Record<symbol, unknown>)[FOCUS_OWNER] : undefined;
    if (typeof id === "string") out.push(id);
    hook = (hook.next ?? null) as Hook;
  }
  return out;
}

/**
 * Fallback for focus ids registered without the marker (older `@textjs/react`):
 * strings in hook state (`useId()` values, `useCallback` deps).
 */
function hookStrings(fiber: Fiber, wanted: ReadonlySet<string>): string | undefined {
  let hook = hooksOf(fiber);
  let guard = 0;
  while (hook && typeof hook === "object" && guard++ < 200) {
    const v = hook.memoizedState;
    if (typeof v === "string" && wanted.has(v)) return v;
    // `useCallback(fn, [manager, id])` inside `useFocus` (covers explicit `id` options).
    if (Array.isArray(v) && Array.isArray(v[1])) {
      const dep = (v[1] as unknown[]).find((d) => typeof d === "string" && wanted.has(d));
      if (typeof dep === "string") return dep;
    }
    hook = (hook.next ?? null) as Hook;
  }
  return undefined;
}

/** The focus id `fiber` owns: its `useFocus()` marker, else an unclaimed id seen in its hook state. */
function focusIdOf(fiber: Fiber, wanted: ReadonlySet<string>, claimed: ReadonlySet<string>): string | undefined {
  const tagged = focusOwnerIds(fiber).find((id) => wanted.has(id));
  if (tagged !== undefined) return tagged;
  if (claimed.size >= wanted.size) return undefined;
  const fallback = hookStrings(fiber, wanted);
  return fallback !== undefined && !claimed.has(fallback) ? fallback : undefined;
}

/** Every registered focus id claimed by a `useFocus()` marker under `start`. */
function claimedFocusIds(start: Fiber, wanted: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  const stack: Fiber[] = [start];
  while (stack.length > 0) {
    const f = stack.pop() as Fiber;
    for (const id of focusOwnerIds(f)) if (wanted.has(id)) out.add(id);
    for (let c = f.child; c; c = c.sibling) stack.push(c);
  }
  return out;
}

export interface InspectResult {
  tree: TreeNode | null;
  focusables: FocusableInfo[];
  activeFocusId: string | null;
}

/**
 * Walk the React tree under `probe`. Components are attributed to the focus id
 * they registered with `useFocus()` (its `FOCUS_OWNER` hook-state marker).
 */
export function inspect(probe: FiberProbe | null, focus: FocusManager, options: InspectOptions = {}): InspectResult {
  const { hosts = true, maxDepth = 40, component, hideEmpty = true } = options;
  const activeFocusId = focus.getActiveId();
  const entries = focus.snapshot();
  const wanted = new Set(entries.map((e) => e.id));
  const focusBounds = new Map<string, { component: string; bounds: Bounds | null }>();
  const root = currentRoot(probe);
  const probeFiber = root ? findProbe(root) : null;
  const needle = component?.toLowerCase();
  const claimed = probeFiber ? claimedFocusIds(probeFiber, wanted) : new Set<string>();

  /**
   * Returns the built nodes for `fiber` (several when the fiber itself is
   * transparent), its painted bounds, and the bounds of portals rendered
   * below it (kept apart: they paint in the root layer).
   */
  const visit = (fiber: Fiber): { nodes: TreeNode[]; bounds: Bounds | null; portal: Bounds | null } => {
    if (isHiddenOffscreen(fiber)) return { nodes: [], bounds: null, portal: null };
    const name = displayName(fiber);
    const scene = sceneOf(fiber);
    const isSuspense = fiber.tag === SuspenseComponent;
    const isPortal = fiber.tag === HostPortal;
    const visible = name !== null || (hosts && scene !== null) || isSuspense || isPortal;
    const kids: TreeNode[] = [];
    let bounds: Bounds | null = scene ? rectOf(scene) : null;
    let portalBounds: Bounds | null = null;
    // Raw text inside <Text> has no own layout; its owner's rect covers it.
    if (scene?.type === "raw-text") bounds = null;
    if (fiber.tag !== HostText) {
      for (let c = fiber.child; c; c = c.sibling) {
        const r = visit(c);
        kids.push(...r.nodes);
        // A portal paints in the root layer, not inside its logical parent.
        if (c.tag === HostPortal) portalBounds = union(portalBounds, r.bounds);
        else bounds = union(bounds, r.bounds);
        portalBounds = union(portalBounds, r.portal);
      }
    }
    if (isPortal) {
      bounds = union(bounds, portalBounds);
      portalBounds = null;
    }
    if (!visible) return { nodes: kids, bounds, portal: portalBounds };
    // A component that only renders a portal (<Modal>) is shown where the portal paints.
    const shown = bounds ?? portalBounds;
    const node: TreeNode = { kind: "component", name: name ?? "" };
    if (scene) {
      node.kind = scene.type === "box" ? "box" : "text";
      node.name = scene.type === "box" ? "box" : "text";
      if (scene.type !== "box") {
        const t = textOf(scene);
        node.text = t.length > 120 ? `${t.slice(0, 117)}…` : t;
      } else {
        const label = scene.props.title ?? scene.props.wireframeLabel;
        if (label) node.label = String(label).trim();
      }
    } else if (isSuspense) {
      node.kind = "suspense";
      node.name = "Suspense";
    } else if (isPortal) {
      node.kind = "portal";
      node.name = "Portal";
    }
    if (fiber.key !== null) node.key = fiber.key;
    if (shown) node.bounds = shown;
    if (name !== null) {
      const fid = focusIdOf(fiber, wanted, claimed);
      if (fid !== undefined) {
        node.focusId = fid;
        if (fid === activeFocusId) node.focused = true;
        if (!focusBounds.has(fid)) focusBounds.set(fid, { component: name, bounds: shown });
      }
    }
    // Text hosts already carry their text; raw-text children add nothing.
    const children = node.kind === "text" ? kids.filter((k) => k.kind !== "text" || k.text !== node.text) : kids;
    if (children.length > 0) node.children = children;
    if (hideEmpty && (node.kind === "component" || node.kind === "portal") && !shown && children.length === 0 && node.focusId === undefined) return { nodes: [], bounds, portal: portalBounds };
    return { nodes: [node], bounds, portal: portalBounds };
  };

  let tree: TreeNode | null = null;
  if (probeFiber) {
    const nodes: TreeNode[] = [];
    let bounds: Bounds | null = null;
    for (let c = probeFiber.child; c; c = c.sibling) {
      const r = visit(c);
      nodes.push(...r.nodes);
      bounds = union(bounds, r.bounds);
    }
    // The whole tree is walked (bounds and focus attribution need every host);
    // `maxDepth` limits what is returned, counted from the matched roots.
    const trim = (n: TreeNode, depth: number): TreeNode => {
      if (!n.children) return n;
      if (depth + 1 >= maxDepth) {
        const { children: _children, ...rest } = n;
        return rest;
      }
      return { ...n, children: n.children.map((c) => trim(c, depth + 1)) };
    };
    tree = { kind: "component", name: "App", ...(bounds ? { bounds } : {}), children: nodes.map((n) => trim(n, 0)) };
    if (needle) {
      const matches: TreeNode[] = [];
      const search = (n: TreeNode): void => {
        if (n.kind === "component" && n.name.toLowerCase().includes(needle)) {
          matches.push(trim(n, 0));
          return;
        }
        n.children?.forEach(search);
      };
      nodes.forEach(search);
      tree = { kind: "component", name: `App (matching "${component}")`, children: matches };
    }
  }

  const focusables: FocusableInfo[] = entries.map((e) => {
    const hit = focusBounds.get(e.id);
    return {
      id: e.id,
      focused: e.id === activeFocusId,
      tabbable: e.tabbable,
      ...(hit ? { component: hit.component } : {}),
      ...(hit?.bounds ? { bounds: hit.bounds } : {}),
    };
  });
  return { tree, focusables, activeFocusId };
}

function findProbe(root: Fiber): Fiber | null {
  const stack: Fiber[] = [root];
  while (stack.length > 0) {
    const f = stack.pop() as Fiber;
    if (f.tag === ClassComponent && f.type === FiberProbe) return f;
    for (let c = f.child; c; c = c.sibling) stack.push(c);
  }
  return null;
}

/** Render a tree as indented text: `Name  [x,y w×h]  "text"  focus=id`. */
export function formatTree(node: TreeNode, indent = ""): string {
  let line = `${indent}${node.kind === "component" || node.kind === "suspense" || node.kind === "portal" ? node.name : node.kind}`;
  if (node.key !== undefined) line += ` key=${JSON.stringify(node.key)}`;
  if (node.label) line += ` (${node.label})`;
  if (node.bounds) line += `  [${node.bounds.x},${node.bounds.y} ${node.bounds.width}×${node.bounds.height}]`;
  if (node.text !== undefined) line += `  ${JSON.stringify(node.text)}`;
  if (node.focusId !== undefined) line += `  focus=${node.focusId}${node.focused ? " (focused)" : ""}`;
  const lines = [line];
  for (const c of node.children ?? []) lines.push(formatTree(c, `${indent}  `));
  return lines.join("\n");
}

export interface SceneGrid {
  /** The console root's scene node (`ConsoleRoot.rootNode`). */
  root: SceneNode;
  cols: number;
  rows: number;
}

export interface HitResult {
  /** Nearest component above the topmost painted host at the cell. */
  component: string | null;
  /** Component names from the app root down to `component`. */
  path: string[];
}

/**
 * Hit-tester for cells: the topmost painted host scene node at `(x, y)` in
 * paint order (overflow clipping, scroll offsets, absolute `zIndex` layers
 * and portals such as `<Modal>`), attributed to its component chain.
 * Ownership is computed once per tester.
 */
export function createHitTester(probe: FiberProbe | null, grid: SceneGrid): (x: number, y: number) => HitResult {
  const none: HitResult = { component: null, path: [] };
  const root = currentRoot(probe);
  const start = root ? findProbe(root) : null;
  if (!start) return () => none;
  const { cols, rows } = grid;
  const owners = new Int32Array(cols * rows);
  paintOwners(grid.root, cols, rows, owners);
  const hosts = new Map<number, Fiber>();
  const stack: Fiber[] = [];
  for (let c = start.child; c; c = c.sibling) stack.push(c);
  while (stack.length > 0) {
    const f = stack.pop() as Fiber;
    if (isHiddenOffscreen(f)) continue;
    const scene = sceneOf(f);
    if (scene) hosts.set(scene.id, f);
    for (let c = f.child; c; c = c.sibling) stack.push(c);
  }
  return (x, y) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return none;
    const host = hosts.get(owners[y * cols + x] as number);
    if (!host) return none;
    const path: string[] = [];
    for (let f: Fiber | null = host; f && f !== start; f = f.return) {
      const name = displayName(f);
      if (name !== null) path.push(name);
    }
    path.reverse();
    return { component: path[path.length - 1] ?? null, path };
  };
}

/** {@link createHitTester} for a single cell. */
export function hitTest(probe: FiberProbe | null, grid: SceneGrid, x: number, y: number): HitResult {
  return createHitTester(probe, grid)(x, y);
}
