/**
 * Routes InputEngine events to `useInput` / `usePaste` / `useWheel` handlers
 * with priorities, propagation control and modal traps. Keyboard and paste
 * dispatch at React's discrete priority (SyncLane), commit synchronously and
 * emit the frame in the same task for zero-lag typing.
 */

import type { ConsoleRenderer, InputEngine, KeyInputEvent, PasteInputEvent, WheelInputEvent } from "@textjs/core";
import { ROOT_SCOPE, type Scope } from "./context";
import { isWithinScope, type FocusManager } from "./focus";
import { ContinuousEventPriority, DiscreteEventPriority, reconciler, runWithPriority } from "./reconciler";

export interface EventControl {
  /** Prevent lower-priority handlers (and Tab focus cycling) from receiving this event. */
  stopPropagation(): void;
  readonly propagationStopped: boolean;
}

export type KeyEvent = KeyInputEvent & EventControl;
export type PasteEvent = PasteInputEvent & EventControl;
export type WheelEvent = WheelInputEvent & EventControl;

interface EventTypes {
  key: KeyEvent;
  paste: PasteEvent;
  wheel: WheelEvent;
}

export type InputEventType = keyof EventTypes;

export interface RegisterOptions {
  /** Higher priorities run first (default `0`). Focused editors use `10`. */
  priority?: number;
  scope?: Scope;
  /** Receive events even while a modal trap is active outside this handler's scope. */
  global?: boolean;
  /**
   * An always-on shortcut (like the Dev Overlay's F2) that doesn't mean the app wants the
   * keyboard, so it never shows the focus hint by itself.
   */
  ambient?: boolean;
}

interface Entry<E> {
  handler: (event: E) => void;
  priority: number;
  seq: number;
  scope: Scope;
  global: boolean;
  ambient: boolean;
}

/** Priority used by focused text editors so typing never leaks into global shortcuts. */
export const FOCUSED_INPUT_PRIORITY = 10;

let seqCounter = 0;

function withControl<E extends object>(event: E): E & EventControl {
  let stopped = false;
  const out = { ...event } as E & { stopPropagation(): void };
  out.stopPropagation = () => {
    stopped = true;
  };
  Object.defineProperty(out, "propagationStopped", { get: () => stopped, enumerable: false });
  return out as E & EventControl;
}

export class InputManager {
  private readonly entries: { [K in InputEventType]: Array<Entry<EventTypes[K]>> } = { key: [], paste: [], wheel: [] };
  private readonly cleanup: Array<() => void> = [];
  private readonly wantListeners = new Set<() => void>();
  private wanting = 0;

  constructor(
    readonly engine: InputEngine,
    private readonly focus: FocusManager,
    private readonly renderer: Pick<ConsoleRenderer, "flushInputFrame"> | null = null,
  ) {
    this.cleanup.push(
      engine.on("key", (e) => {
        runWithPriority(DiscreteEventPriority, () => this.dispatchKey(e), "keydown");
        this.flush();
      }),
      engine.on("paste", (e) => {
        runWithPriority(DiscreteEventPriority, () => this.dispatch("paste", e), "paste");
        this.flush();
      }),
      engine.on("wheel", (e) => runWithPriority(ContinuousEventPriority, () => this.dispatch("wheel", e), "wheel")),
      focus.onEntriesChange(() => this.emitWants()),
    );
  }

  /**
   * Whether the app wants the keyboard: a key or paste handler is registered (other than
   * `ambient` ones), or Tab can reach a focus target. Drives the default focus hint.
   */
  readonly wantsKeys = (): boolean => this.wanting > 0 || this.focus.hasTargets();

  /** Called when {@link wantsKeys} may have changed. */
  readonly subscribeWants = (listener: () => void): (() => void) => {
    this.wantListeners.add(listener);
    return () => this.wantListeners.delete(listener);
  };

  private emitWants(): void {
    for (const l of this.wantListeners) l();
  }

  /** Count an external keyboard consumer (such as `useKeyState`) toward {@link wantsKeys}. */
  claimKeys(): () => void {
    if (++this.wanting === 1) this.emitWants();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      if (--this.wanting === 0) this.emitWants();
    };
  }

  private flush(): void {
    if (this.renderer === null) return;
    reconciler.flushSyncWork();
    this.renderer.flushInputFrame();
  }

  register<K extends InputEventType>(type: K, handler: (event: EventTypes[K]) => void, options: RegisterOptions = {}): () => void {
    const list = this.entries[type] as Array<Entry<EventTypes[K]>>;
    const entry: Entry<EventTypes[K]> = {
      handler,
      priority: options.priority ?? 0,
      seq: ++seqCounter,
      scope: options.scope ?? ROOT_SCOPE,
      global: options.global ?? false,
      ambient: options.ambient ?? false,
    };
    const counts = type !== "wheel" && !entry.ambient;
    // Keep sorted: priority desc, then most recently registered first.
    let i = 0;
    while (i < list.length && ((list[i] as Entry<EventTypes[K]>).priority > entry.priority || ((list[i] as Entry<EventTypes[K]>).priority === entry.priority && (list[i] as Entry<EventTypes[K]>).seq > entry.seq))) i++;
    list.splice(i, 0, entry);
    if (counts && ++this.wanting === 1) this.emitWants();
    return () => {
      const idx = list.indexOf(entry);
      if (idx < 0) return;
      list.splice(idx, 1);
      if (counts && --this.wanting === 0) this.emitWants();
    };
  }

  /** Number of registered handlers (diagnostics / tests). */
  handlerCount(type: InputEventType): number {
    return this.entries[type].length;
  }

  private dispatch<K extends InputEventType>(type: K, raw: Omit<EventTypes[K], keyof EventControl>): EventTypes[K] {
    const event = withControl(raw) as EventTypes[K];
    const trap = this.focus.topTrap;
    const list = (this.entries[type] as Array<Entry<EventTypes[K]>>).slice();
    for (const e of list) {
      if (event.propagationStopped) break;
      if (trap !== null && !e.global && !isWithinScope(e.scope, trap)) continue;
      e.handler(event);
    }
    return event;
  }

  private dispatchKey(raw: KeyInputEvent): void {
    const event = this.dispatch("key", raw);
    if (event.propagationStopped || raw.key !== "tab" || raw.ctrl || raw.meta || raw.alt || !this.focus.isEnabled) return;
    if (raw.shift) this.focus.focusPrevious();
    else this.focus.focusNext();
  }

  dispose(): void {
    for (const fn of this.cleanup) fn();
    this.cleanup.length = 0;
    this.entries.key.length = 0;
    this.entries.paste.length = 0;
    this.entries.wheel.length = 0;
    this.wanting = 0;
    this.wantListeners.clear();
  }
}
