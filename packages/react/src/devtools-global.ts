/**
 * `globalThis.__TEXTJS_DEVTOOLS_HOOK__`, the object the Text.js DevTools extension
 * installs at `document_start`, and the JSON-safe types that cross it.
 *
 * Roots check for the hook here and import `./devtools-hook` (the connection
 * code) only when it exists. In code-split builds, pages without the extension
 * never download it.
 *
 * This module has no imports. The extension's page script bundles
 * `installDevToolsHook()` from it without pulling in React or Yoga.
 */

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
