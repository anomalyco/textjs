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
  /** `component` (React function/class), `box` / `text` (host scene nodes), `suspense`. */
  kind: "component" | "box" | "text" | "suspense";
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
  /** Max nesting depth of the returned tree (default 40). */
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

/** Strings appearing in a fiber's hook state (useId values, useCallback deps). */
function hookStrings(fiber: Fiber, wanted: ReadonlySet<string>): string | undefined {
  if (fiber.tag !== FunctionComponent && fiber.tag !== ForwardRef && fiber.tag !== SimpleMemoComponent) return undefined;
  let hook = fiber.memoizedState as { memoizedState?: unknown; next?: unknown } | null;
  let guard = 0;
  while (hook && typeof hook === "object" && guard++ < 200) {
    const v = hook.memoizedState;
    if (typeof v === "string" && wanted.has(v)) return v;
    // `useCallback(fn, [manager, id])` inside `useFocus` (covers explicit `id` options).
    if (Array.isArray(v) && Array.isArray(v[1])) {
      const dep = (v[1] as unknown[]).find((d) => typeof d === "string" && wanted.has(d));
      if (typeof dep === "string") return dep;
    }
    hook = (hook.next ?? null) as typeof hook;
  }
  return undefined;
}

export interface InspectResult {
  tree: TreeNode | null;
  focusables: FocusableInfo[];
  activeFocusId: string | null;
}

/**
 * Walk the React tree under `probe`. Components are attributed to the focus id
 * they registered with `useFocus()` when the id is visible in their hook state
 * (the generated `useId()` value).
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

  /** Returns the built nodes for `fiber` (several when the fiber itself is transparent). */
  const visit = (fiber: Fiber, depth: number): { nodes: TreeNode[]; bounds: Bounds | null } => {
    if (isHiddenOffscreen(fiber)) return { nodes: [], bounds: null };
    const name = displayName(fiber);
    const scene = sceneOf(fiber);
    const isSuspense = fiber.tag === SuspenseComponent;
    const visible = name !== null || (hosts && scene !== null) || isSuspense;
    const childDepth = visible ? depth + 1 : depth;
    const kids: TreeNode[] = [];
    let bounds: Bounds | null = scene ? rectOf(scene) : null;
    // Raw text inside <Text> has no own layout; its owner's rect covers it.
    if (scene?.type === "raw-text") bounds = null;
    if (fiber.tag !== HostText) {
      for (let c = fiber.child; c; c = c.sibling) {
        if (c.tag === HostPortal) continue;
        const r = visit(c, childDepth);
        kids.push(...r.nodes);
        bounds = union(bounds, r.bounds);
      }
    }
    if (!visible) return { nodes: kids, bounds };
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
    }
    if (fiber.key !== null) node.key = fiber.key;
    if (bounds) node.bounds = bounds;
    if (name !== null) {
      const fid = hookStrings(fiber, wanted);
      if (fid !== undefined) {
        node.focusId = fid;
        if (fid === activeFocusId) node.focused = true;
        if (!focusBounds.has(fid)) focusBounds.set(fid, { component: name, bounds });
      }
    }
    // Text hosts already carry their text; raw-text children add nothing.
    const children = node.kind === "text" ? kids.filter((k) => k.kind !== "text" || k.text !== node.text) : kids;
    if (children.length > 0) node.children = children;
    if (hideEmpty && node.kind === "component" && !bounds && children.length === 0 && node.focusId === undefined) return { nodes: [], bounds };
    if (depth >= maxDepth) {
      delete node.children;
      return { nodes: [node], bounds };
    }
    return { nodes: [node], bounds };
  };

  let tree: TreeNode | null = null;
  if (probeFiber) {
    const nodes: TreeNode[] = [];
    let bounds: Bounds | null = null;
    for (let c = probeFiber.child; c; c = c.sibling) {
      const r = visit(c, 0);
      nodes.push(...r.nodes);
      bounds = union(bounds, r.bounds);
    }
    tree = { kind: "component", name: "App", ...(bounds ? { bounds } : {}), children: nodes };
    if (needle) {
      const matches: TreeNode[] = [];
      const search = (n: TreeNode): void => {
        if (n.kind === "component" && n.name.toLowerCase().includes(needle)) {
          matches.push(n);
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
  let line = `${indent}${node.kind === "component" || node.kind === "suspense" ? node.name : node.kind}`;
  if (node.key !== undefined) line += ` key=${JSON.stringify(node.key)}`;
  if (node.label) line += ` (${node.label})`;
  if (node.bounds) line += `  [${node.bounds.x},${node.bounds.y} ${node.bounds.width}×${node.bounds.height}]`;
  if (node.text !== undefined) line += `  ${JSON.stringify(node.text)}`;
  if (node.focusId !== undefined) line += `  focus=${node.focusId}${node.focused ? " (focused)" : ""}`;
  const lines = [line];
  for (const c of node.children ?? []) lines.push(formatTree(c, `${indent}  `));
  return lines.join("\n");
}

/** Deepest painted host scene node containing cell `(x, y)` and the nearest component above it. */
export function hitTest(probe: FiberProbe | null, x: number, y: number): { component: string | null; path: string[] } {
  const root = currentRoot(probe);
  const start = root ? findProbe(root) : null;
  if (!start) return { component: null, path: [] };
  let best: { depth: number; path: string[] } | null = null;
  const walk = (fiber: Fiber, path: string[], depth: number): void => {
    if (isHiddenOffscreen(fiber)) return;
    const name = displayName(fiber);
    const next = name !== null ? [...path, name] : path;
    const scene = sceneOf(fiber);
    if (scene && scene.type !== "raw-text") {
      const r = rectOf(scene);
      if (r && x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height && (!best || depth >= best.depth)) best = { depth, path: next };
    }
    for (let c = fiber.child; c; c = c.sibling) if (c.tag !== HostPortal) walk(c, next, depth + 1);
  };
  walk(start, [], 0);
  const found = best as { depth: number; path: string[] } | null;
  if (!found) return { component: null, path: [] };
  return { component: found.path[found.path.length - 1] ?? null, path: found.path };
}
