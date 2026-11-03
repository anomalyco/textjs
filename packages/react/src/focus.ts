/**
 * Focus management: tab order, auto-focus and modal focus traps.
 */

import { useCallback, useContext, useId, useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { ScopeContext, useRuntime, type Scope } from "./context";

export function isWithinScope(scope: Scope, ancestor: Scope): boolean {
  let s: Scope | null = scope;
  while (s !== null) {
    if (s === ancestor) return true;
    s = s.parent;
  }
  return false;
}

interface FocusEntry {
  id: string;
  scope: Scope;
  active: boolean;
  autoFocus: boolean;
}

interface Trap {
  scope: Scope;
  restore: string | null;
}

export class FocusManager {
  private readonly entries = new Map<string, FocusEntry>();
  private readonly traps: Trap[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly entryListeners = new Set<() => void>();
  private activeId: string | null = null;
  private enabled = true;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getActiveId = (): string | null => this.activeId;

  /** Number of registered focus targets. */
  get size(): number {
    return this.entries.size;
  }

  /** Called when a focus target registers or unregisters. */
  onEntriesChange(listener: () => void): () => void {
    this.entryListeners.add(listener);
    return () => this.entryListeners.delete(listener);
  }

  private emitEntries(): void {
    for (const l of this.entryListeners) l();
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Innermost active focus/input trap (e.g. an open `<Modal>`). */
  get topTrap(): Scope | null {
    const t = this.traps[this.traps.length - 1];
    return t ? t.scope : null;
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  private setActiveId(id: string | null): void {
    if (this.activeId === id) return;
    this.activeId = id;
    this.emit();
  }

  private eligible(e: FocusEntry | undefined): e is FocusEntry {
    if (!e || !e.active) return false;
    const trap = this.topTrap;
    return trap === null || isWithinScope(e.scope, trap);
  }

  register(id: string, scope: Scope, options: { autoFocus?: boolean; active?: boolean } = {}): void {
    const entry: FocusEntry = { id, scope, active: options.active ?? true, autoFocus: options.autoFocus ?? false };
    const added = !this.entries.has(id);
    this.entries.set(id, entry);
    if (added) this.emitEntries();
    if (entry.autoFocus && this.eligible(entry) && !this.eligible(this.activeId === null ? undefined : this.entries.get(this.activeId))) {
      this.setActiveId(id);
    }
  }

  unregister(id: string): void {
    if (this.entries.delete(id)) this.emitEntries();
    for (const t of this.traps) if (t.restore === id) t.restore = null;
    if (this.activeId === id) this.setActiveId(null);
  }

  setActive(id: string, active: boolean): void {
    const e = this.entries.get(id);
    if (!e || e.active === active) return;
    e.active = active;
    if (!active && this.activeId === id) this.setActiveId(null);
    else if (active && e.autoFocus && this.activeId === null && this.eligible(e)) this.setActiveId(id);
  }

  focus(id: string): void {
    if (this.eligible(this.entries.get(id))) this.setActiveId(id);
  }

  blur(): void {
    this.setActiveId(null);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  /** Registered focus ids in Tab order; `tabbable` is false when inactive or outside the top focus trap. */
  snapshot(): Array<{ id: string; tabbable: boolean }> {
    return [...this.entries.values()].map((e) => ({ id: e.id, tabbable: this.eligible(e) }));
  }

  private ordered(): FocusEntry[] {
    const out: FocusEntry[] = [];
    for (const e of this.entries.values()) if (this.eligible(e)) out.push(e);
    return out;
  }

  focusNext(): void {
    const list = this.ordered();
    if (list.length === 0) return;
    const idx = list.findIndex((e) => e.id === this.activeId);
    this.setActiveId((list[(idx + 1) % list.length] as FocusEntry).id);
  }

  focusPrevious(): void {
    const list = this.ordered();
    if (list.length === 0) return;
    const idx = list.findIndex((e) => e.id === this.activeId);
    const prev = idx <= 0 ? list.length - 1 : idx - 1;
    this.setActiveId((list[prev] as FocusEntry).id);
  }

  /** Confine focus and input to `scope` until the returned release function is called. */
  pushTrap(scope: Scope): () => void {
    const trap: Trap = { scope, restore: this.activeId };
    this.traps.push(trap);
    const current = this.activeId === null ? undefined : this.entries.get(this.activeId);
    if (!this.eligible(current)) {
      const list = this.ordered();
      const target = list.find((e) => e.autoFocus) ?? list[0];
      this.setActiveId(target ? target.id : null);
    } else this.emit();
    return () => {
      const i = this.traps.indexOf(trap);
      if (i < 0) return;
      this.traps.splice(i, 1);
      const restore = trap.restore === null ? undefined : this.entries.get(trap.restore);
      if (this.eligible(restore)) this.setActiveId(restore.id);
      else if (!this.eligible(this.activeId === null ? undefined : this.entries.get(this.activeId))) this.setActiveId(null);
      else this.emit();
    };
  }
}

export interface UseFocusOptions {
  /** Stable focus id (defaults to a generated id). */
  id?: string;
  /** Focus this component on mount when nothing else is focused. */
  autoFocus?: boolean;
  /** Include in Tab order (default `true`). */
  isActive?: boolean;
  /** Controlled focus: overrides the focus manager and removes the component from Tab order. */
  focused?: boolean;
}

export interface UseFocusResult {
  isFocused: boolean;
  id: string;
  focus(): void;
  blur(): void;
}

/** Key of the hook-state marker `useFocus()` leaves on the component that registered a focus id. */
export const FOCUS_OWNER = Symbol.for("textjs.focusOwner");

export function useFocus(options: UseFocusOptions = {}): UseFocusResult {
  const { focus: manager } = useRuntime();
  const scope = useContext(ScopeContext);
  const generated = useId();
  const id = options.id ?? generated;
  // Hook state marker: inspectors (`text mcp`) attribute the focus id to this component.
  useMemo(() => ({ [FOCUS_OWNER]: id }), [id]);
  const controlled = options.focused !== undefined;
  const active = (options.isActive ?? true) && !controlled;
  const autoFocus = options.autoFocus ?? false;

  useLayoutEffect(() => {
    manager.register(id, scope, { autoFocus, active });
    return () => manager.unregister(id);
    // `active` changes are applied below without losing tab order.
  }, [manager, id, scope]);

  useLayoutEffect(() => {
    manager.setActive(id, active);
  }, [manager, id, active]);

  const activeId = useSyncExternalStore(manager.subscribe, manager.getActiveId, manager.getActiveId);
  const focus = useCallback(() => manager.focus(id), [manager, id]);
  const blur = useCallback(() => {
    if (manager.getActiveId() === id) manager.blur();
  }, [manager, id]);
  const isFocused = controlled ? options.focused === true : activeId === id;
  return useMemo(() => ({ isFocused, id, focus, blur }), [isFocused, id, focus, blur]);
}

export interface FocusManagerApi {
  focusNext(): void;
  focusPrevious(): void;
  focus(id: string): void;
  blur(): void;
  enableFocus(): void;
  disableFocus(): void;
  activeId: string | null;
}

export function useFocusManager(): FocusManagerApi {
  const { focus: manager } = useRuntime();
  const activeId = useSyncExternalStore(manager.subscribe, manager.getActiveId, manager.getActiveId);
  return useMemo(
    () => ({
      focusNext: () => manager.focusNext(),
      focusPrevious: () => manager.focusPrevious(),
      focus: (id: string) => manager.focus(id),
      blur: () => manager.blur(),
      enableFocus: () => manager.enable(),
      disableFocus: () => manager.disable(),
      activeId,
    }),
    [manager, activeId],
  );
}
