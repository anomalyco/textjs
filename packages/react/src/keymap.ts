/**
 * Declarative keybindings. `useKeymap` routes keys through `useInput` (so
 * priorities, `stopPropagation` and modal traps apply) and publishes labeled
 * bindings to a per-root registry that powers `<KeyHelp>`, `<KeyHints>` and
 * `<CommandPalette>`.
 */

import { useContext, useId, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { ScopeContext, useRuntime, type RootRuntime, type Scope } from "./context";
import { isWithinScope } from "./focus";
import { useInput } from "./hooks";
import type { KeyEvent } from "./input-manager";
import { matchStroke, parseKeys, type KeySequence } from "./keys";

export type KeyHandler = (event: KeyEvent) => void;

export interface KeyBinding {
  /** Called when the keys match. */
  run: KeyHandler;
  /** Shown in `<KeyHelp>`, `<KeyHints>` and `<CommandPalette>`; unlabeled bindings stay hidden. */
  label?: string;
  /** Section heading in `<KeyHelp>` (defaults to the keymap's `group`). */
  group?: string;
  /** Show in `<KeyHints auto>` footers. */
  hint?: boolean;
  /** Temporarily disable this binding. */
  disabled?: boolean;
  /** Ignore auto-repeat while the key is held (default `false`). */
  noRepeat?: boolean;
  /** List labeled bindings in `<CommandPalette>` (default `true`). */
  command?: boolean;
}

/** `{ "ctrl+k": open, "j, down": { label: "Next", run: next }, "g g": top }` */
export type Keymap = Readonly<Record<string, KeyHandler | KeyBinding>>;

export interface UseKeymapOptions {
  /** Default `<KeyHelp>` section for bindings in this keymap. */
  group?: string;
  /** Disable every binding without unmounting (default `true`). */
  isActive?: boolean;
  /** `useInput` priority (default `0`). Focused editors use `10`. */
  priority?: number;
  /** Keep working while a `<Modal>` outside this component is open. */
  global?: boolean;
  /** Milliseconds to wait for the next key of a sequence (default `1000`). */
  sequenceTimeout?: number;
}

export interface RegisteredBinding {
  /** Stable id: `${keymapId}:${keys}`. */
  id: string;
  keys: string;
  label: string;
  group: string;
  hint: boolean;
  /** Listed in `<CommandPalette>`. */
  command: boolean;
  run: KeyHandler;
  /** Scope the keymap was registered in (modal traps hide outside bindings). */
  scope: Scope;
}

interface Entry {
  id: string;
  scope: Scope;
  bindings: RegisteredBinding[];
}

/** Per-root registry of labeled bindings. */
export class KeymapRegistry {
  private readonly entries = new Map<string, Entry>();
  private readonly listeners = new Set<() => void>();
  private snapshot: readonly RegisteredBinding[] = [];

  constructor(private readonly runtime: RootRuntime) {}

  readonly subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  /** Every labeled binding, in registration order. */
  readonly getSnapshot = (): readonly RegisteredBinding[] => this.snapshot;

  set(id: string, scope: Scope, bindings: RegisteredBinding[]): void {
    if (bindings.length === 0) {
      if (!this.entries.has(id)) return;
      this.entries.delete(id);
    } else this.entries.set(id, { id, scope, bindings });
    this.rebuild();
  }

  delete(id: string): void {
    if (this.entries.delete(id)) this.rebuild();
  }

  /** Bindings that would currently receive keys (respecting the innermost modal trap). */
  active(trap: Scope | null = this.runtime.focus.topTrap): RegisteredBinding[] {
    if (trap === null) return this.snapshot.slice();
    return this.snapshot.filter((b) => isWithinScope(b.scope, trap));
  }

  private rebuild(): void {
    const out: RegisteredBinding[] = [];
    for (const e of this.entries.values()) out.push(...e.bindings);
    this.snapshot = out;
    for (const l of this.listeners) l();
  }
}

const registries = new WeakMap<RootRuntime, KeymapRegistry>();

/** The keymap registry of the current console root. */
export function useKeymapRegistry(): KeymapRegistry {
  const rt = useRuntime();
  let reg = registries.get(rt);
  if (!reg) {
    reg = new KeymapRegistry(rt);
    registries.set(rt, reg);
  }
  return reg;
}

/**
 * Labeled bindings that currently receive keys (outside-modal bindings are
 * omitted while a modal is open). Re-renders when bindings or focus change.
 */
export function useKeymapBindings(options: { trap?: Scope | null } = {}): readonly RegisteredBinding[] {
  const reg = useKeymapRegistry();
  const rt = useRuntime();
  const all = useSyncExternalStore(reg.subscribe, reg.getSnapshot, reg.getSnapshot);
  const getTrap = (): Scope | null => rt.focus.topTrap;
  const currentTrap = useSyncExternalStore(rt.focus.subscribe, getTrap, getTrap);
  const trap = options.trap === undefined ? currentTrap : options.trap;
  return useMemo(() => (trap === null ? all : all.filter((b) => isWithinScope(b.scope, trap))), [all, trap]);
}

interface Compiled {
  keys: string;
  seqs: readonly KeySequence[];
  binding: KeyBinding;
}

function normalize(value: KeyHandler | KeyBinding): KeyBinding {
  return typeof value === "function" ? { run: value } : value;
}

/**
 * Bind keys declaratively:
 *
 * ```tsx
 * useKeymap({
 *   "j, down": { label: "Next", run: next },
 *   "ctrl+k": { label: "Command palette", run: open, hint: true },
 *   "g g": { label: "Top", run: top },
 *   q: () => exit(),
 * }, { group: "Navigation" });
 * ```
 *
 * Matched keys stop propagation, so lower-priority handlers never see them.
 */
export function useKeymap(keymap: Keymap, options: UseKeymapOptions = {}): void {
  const { group = "General", isActive = true, priority = 0, global = false, sequenceTimeout = 1000 } = options;
  const reg = useKeymapRegistry();
  const scope = useContext(ScopeContext);
  const id = useId();

  const compiled = useMemo<Compiled[]>(
    () => Object.keys(keymap).map((keys) => ({ keys, seqs: parseKeys(keys), binding: normalize(keymap[keys] as KeyHandler | KeyBinding) })),
    [keymap],
  );
  const latest = useRef(compiled);
  latest.current = compiled;
  const pending = useRef<{ events: KeyEvent[]; at: number }>({ events: [], at: 0 });

  // Publish labels only when the visible shape changes (inline keymap objects are fine).
  const signature = compiled
    .map((c) => `${c.keys}\u0000${c.binding.label ?? ""}\u0000${c.binding.group ?? ""}\u0000${c.binding.hint ? 1 : 0}${c.binding.command === false ? 0 : 1}\u0000${c.binding.disabled ? 1 : 0}`)
    .join("\u0001");
  useLayoutEffect(() => {
    if (!isActive) {
      reg.delete(id);
      return;
    }
    const bindings: RegisteredBinding[] = [];
    for (const c of latest.current) {
      if (!c.binding.label || c.binding.disabled) continue;
      const keys = c.keys;
      bindings.push({
        id: `${id}:${keys}`,
        keys,
        label: c.binding.label,
        group: c.binding.group ?? group,
        hint: c.binding.hint ?? false,
        command: c.binding.command ?? true,
        run: (e) => {
          const cur = latest.current.find((x) => x.keys === keys);
          cur?.binding.run(e);
        },
        scope,
      });
    }
    reg.set(id, scope, bindings);
  }, [reg, id, scope, isActive, group, signature]);
  useLayoutEffect(() => () => reg.delete(id), [reg, id]);

  useInput(
    (e) => {
      const list = latest.current;
      const now = Date.now();
      const p = pending.current;
      if (p.events.length > 0 && now - p.at > sequenceTimeout) p.events = [];
      const attempt = (events: KeyEvent[]): "run" | "partial" | "none" => {
        let partial = false;
        for (const c of list) {
          if (c.binding.disabled) continue;
          if (c.binding.noRepeat && e.repeat) continue;
          for (const seq of c.seqs) {
            if (seq.length < events.length) continue;
            let ok = true;
            for (let i = 0; i < events.length; i++) {
              if (!matchStroke(events[i] as KeyEvent, seq[i] as KeySequence[number])) {
                ok = false;
                break;
              }
            }
            if (!ok) continue;
            if (seq.length === events.length) {
              p.events = [];
              e.stopPropagation();
              c.binding.run(e);
              return "run";
            }
            partial = true;
          }
        }
        if (partial) {
          p.events = events;
          p.at = now;
          e.stopPropagation();
          return "partial";
        }
        return "none";
      };
      if (p.events.length > 0) {
        const r = attempt([...p.events, e]);
        if (r !== "none") return;
        p.events = [];
      }
      attempt([e]);
    },
    { isActive, priority, global },
  );
}
