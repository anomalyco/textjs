/**
 * React 19 host config for the Text.js scene graph (`react-reconciler@0.34`).
 *
 * Host types: `tx-box` (Yoga box), `tx-text` (text owner / inline span) and raw
 * text instances. Commits coalesce into a single `requestRender()`; the
 * renderer then lays out, rasterizes and emits at most one `console.log`.
 */

import createReconciler from "react-reconciler";
import { ConcurrentRoot, ContinuousEventPriority, DefaultEventPriority, DiscreteEventPriority, NoEventPriority } from "react-reconciler/constants";
import { createContext } from "react";
import { createNode, createRawText, type SceneNode, type SceneNodeProps } from "@textjs/core";

export { ConcurrentRoot, ContinuousEventPriority, DefaultEventPriority, DiscreteEventPriority, NoEventPriority };

export type HostType = "tx-box" | "tx-text";

export interface HostProps extends SceneNodeProps {
  children?: unknown;
}

export interface ConsoleContainer {
  /** Root scene node the React tree mounts into. */
  readonly rootNode: SceneNode;
  /** Invoked once per React commit (coalesced into one frame by the renderer). */
  onCommit(): void;
}

interface HostContext {
  readonly insideText: boolean;
}

const ROOT_CONTEXT: HostContext = Object.freeze({ insideText: false });
const TEXT_CONTEXT: HostContext = Object.freeze({ insideText: true });

/** Strip React-only props, producing the scene props object stored on the node. */
export function toSceneProps(props: HostProps): SceneNodeProps {
  const out: Record<string, unknown> = {};
  const src = props as Record<string, unknown>;
  for (const k in src) {
    if (k === "children" || k === "ref" || k === "key") continue;
    const v = src[k];
    if (v !== undefined) out[k] = v;
  }
  return out as SceneNodeProps;
}

function hasScenePropChanges(current: SceneNodeProps, next: HostProps): boolean {
  if (current === next) return false;
  const cur = current as Record<string, unknown>;
  const nxt = next as Record<string, unknown>;
  for (const k in nxt) {
    if (k === "children" || k === "ref" || k === "key") continue;
    const v = nxt[k];
    if (v !== undefined && cur[k] !== v) return true;
  }
  for (const k in cur) {
    if (cur[k] !== undefined && nxt[k] === undefined) return true;
  }
  return false;
}

function sceneType(type: string): "box" | "text" {
  if (type === "tx-box") return "box";
  if (type === "tx-text") return "text";
  throw new Error(`@textjs/react: unknown host element <${type}>. Use the exported components (<Box>, <Text>, …).`);
}

// -----------------------------------------------------------------------------
// Event priority (mirrors react-dom: discrete input → SyncLane)
// -----------------------------------------------------------------------------

let currentUpdatePriority: number = NoEventPriority;
let currentEventType: string | null = null;
let currentEventTime = -1.1;

/** Run `fn` with a React update priority and event metadata (used by the input layer). */
export function runWithPriority<T>(priority: number, fn: () => T, eventType: string | null = null): T {
  const prevPriority = currentUpdatePriority;
  const prevType = currentEventType;
  const prevTime = currentEventTime;
  currentUpdatePriority = priority;
  currentEventType = eventType;
  currentEventTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    return fn();
  } finally {
    currentUpdatePriority = prevPriority;
    currentEventType = prevType;
    currentEventTime = prevTime;
  }
}

export const HostTransitionContext = createContext<null>(null);
HostTransitionContext.displayName = "TextHostTransitionContext";

const hiddenProps = new WeakMap<SceneNode, SceneNodeProps>();
const hiddenText = new WeakMap<SceneNode, string>();

type Timeout = ReturnType<typeof setTimeout>;

const queueMicrotaskImpl: (fn: () => void) => void =
  typeof queueMicrotask === "function" ? queueMicrotask : (fn) => void Promise.resolve().then(fn);

export const reconciler = createReconciler<
  string,
  HostProps,
  ConsoleContainer,
  SceneNode,
  SceneNode,
  never,
  never,
  never,
  never,
  SceneNode,
  HostContext,
  never,
  Timeout,
  -1,
  null,
  null,
  null,
  never,
  never,
  never
>({
  // Modes
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: false,
  warnsIfNotActing: false,

  rendererPackageName: "@textjs/react",
  rendererVersion: "0.3.0",
  extraDevToolsConfig: null,

  bindToConsole(methodName, args, _badgeName) {
    const c = console as unknown as Record<string, (...a: unknown[]) => unknown>;
    const fn = c[methodName] ?? c.log;
    return Function.prototype.bind.apply(fn as (...a: unknown[]) => unknown, [console, ...args] as [unknown, ...unknown[]]) as () => unknown;
  },

  // Instances
  createInstance(type, props, _root, hostContext) {
    const kind = sceneType(type);
    if (kind === "box" && hostContext.insideText) {
      throw new Error("@textjs/react: <Box> cannot be nested inside <Text>.");
    }
    return createNode(kind, toSceneProps(props));
  },
  createTextInstance(text) {
    return createRawText(text);
  },
  appendInitialChild(parent, child) {
    parent.appendChild(child);
  },
  finalizeInitialChildren() {
    return false;
  },
  shouldSetTextContent() {
    return false;
  },
  getRootHostContext() {
    return ROOT_CONTEXT;
  },
  getChildHostContext(parent, type) {
    const insideText = type === "tx-text";
    return insideText === parent.insideText ? parent : insideText ? TEXT_CONTEXT : ROOT_CONTEXT;
  },
  getPublicInstance(instance) {
    return instance;
  },
  prepareForCommit() {
    return null;
  },
  resetAfterCommit(container) {
    container.onCommit();
  },
  preparePortalMount() {},

  // Scheduling
  scheduleTimeout: (fn, delay) => setTimeout(fn, delay),
  cancelTimeout: (id) => clearTimeout(id),
  noTimeout: -1,
  supportsMicrotasks: true,
  scheduleMicrotask: queueMicrotaskImpl,

  getInstanceFromNode() {
    return null;
  },
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  prepareScopeUpdate() {},
  getInstanceFromScope() {
    return null;
  },
  detachDeletedInstance(node) {
    // Subtrees are destroyed in `removeChild`; this is a safety net for detached roots.
    if (node.parent === null && node.yoga !== null) node.destroy();
  },

  // Mutation
  appendChild(parent, child) {
    parent.appendChild(child);
  },
  appendChildToContainer(container, child) {
    container.rootNode.appendChild(child);
  },
  insertBefore(parent, child, before) {
    parent.insertBefore(child, before);
  },
  insertInContainerBefore(container, child, before) {
    container.rootNode.insertBefore(child, before);
  },
  removeChild(parent, child) {
    parent.removeChild(child);
    child.destroy();
  },
  removeChildFromContainer(container, child) {
    container.rootNode.removeChild(child);
    child.destroy();
  },
  resetTextContent() {},
  commitTextUpdate(textInstance, _old, next) {
    textInstance.setText(next);
  },
  commitMount() {},
  commitUpdate(instance, _type, _prev, next) {
    if (hiddenProps.has(instance)) {
      const props = toSceneProps(next);
      hiddenProps.set(instance, props);
      instance.updateProps({ ...props, display: "none" });
      return;
    }
    if (!hasScenePropChanges(instance.props, next)) return;
    instance.updateProps(toSceneProps(next));
  },
  hideInstance(instance) {
    hiddenProps.set(instance, instance.props);
    instance.updateProps({ ...instance.props, display: "none" });
  },
  hideTextInstance(textInstance) {
    hiddenText.set(textInstance, textInstance.text);
    textInstance.setText("");
  },
  unhideInstance(instance, props) {
    hiddenProps.delete(instance);
    instance.updateProps(toSceneProps(props));
  },
  unhideTextInstance(textInstance, text) {
    hiddenText.delete(textInstance);
    textInstance.setText(text);
  },
  clearContainer(container) {
    for (const child of container.rootNode.children.slice()) child.destroy();
  },

  // Transitions & priorities
  NotPendingTransition: null,
  HostTransitionContext,
  setCurrentUpdatePriority(priority) {
    currentUpdatePriority = priority;
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority;
  },
  resolveUpdatePriority() {
    return currentUpdatePriority !== NoEventPriority ? currentUpdatePriority : DefaultEventPriority;
  },
  resetFormInstance() {},
  requestPostPaintCallback(callback) {
    setTimeout(() => callback(typeof performance !== "undefined" ? performance.now() : Date.now()), 0);
  },
  shouldAttemptEagerTransition() {
    return false;
  },
  trackSchedulerEvent() {},
  resolveEventType() {
    return currentEventType;
  },
  resolveEventTimeStamp() {
    return currentEventTime;
  },

  // Suspensey commits (no async resources in a console)
  maySuspendCommit() {
    return false;
  },
  maySuspendCommitOnUpdate() {
    return false;
  },
  maySuspendCommitInSyncRender() {
    return false;
  },
  preloadInstance() {
    return true;
  },
  startSuspendingCommit() {
    return null;
  },
  suspendInstance() {},
  suspendOnActiveViewTransition() {},
  waitForCommitToBeReady() {
    return null;
  },
  getSuspendedCommitReason() {
    return null;
  },

  // View transitions: no animation layer, commit immediately.
  applyViewTransitionName() {},
  restoreViewTransitionName() {},
  cancelViewTransitionName() {},
  cancelRootViewTransitionName() {},
  restoreRootViewTransitionName() {},
  measureInstance() {
    return null;
  },
  measureClonedInstance() {
    return null;
  },
  wasInstanceInViewport() {
    return true;
  },
  hasInstanceChanged() {
    return false;
  },
  hasInstanceAffectedParent() {
    return false;
  },
  startViewTransition(
    _state,
    _root,
    _types,
    mutationCallback,
    layoutCallback,
    _afterMutationCallback,
    spawnedWorkCallback,
    _passiveCallback,
    _errorCallback,
    _blockedCallback,
    finishedAnimation,
  ) {
    // Same fallback react-dom uses when `document.startViewTransition` is unavailable.
    mutationCallback();
    layoutCallback();
    finishedAnimation?.();
    spawnedWorkCallback();
    return null;
  },
  stopViewTransition() {},
  addViewTransitionFinishedListener(_t, callback) {
    callback();
  },
  createViewTransitionInstance(name) {
    return { name };
  },
});

let devToolsInjected = false;

/** Register with React DevTools / Fast Refresh once per page. */
export function injectDevTools(): void {
  if (devToolsInjected) return;
  devToolsInjected = true;
  try {
    reconciler.injectIntoDevTools();
  } catch {
    // DevTools hook unavailable.
  }
}
