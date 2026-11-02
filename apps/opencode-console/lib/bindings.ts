import { createContext, useEffect, useMemo, useRef } from "react";
import { matchStroke, parseKeys, matchesKey, keyEventFromCombo, useInput, type KeyEvent } from "@textjs/app";
import { binding, defaults } from "./key-config";
export { binding, defaults, validBinding } from "./key-config";
import { useStoreState } from "./store";
import type { KeySettings } from "./types";

export type Commands = Record<string, (() => void | false) | undefined>;
export const NativeActions = createContext<Commands>({});
/** Translate configured input chords at the editor, suppressing the old binding. */
export function editorMap(cfg: KeySettings) {
  const entries = Object.keys(cfg.keybinds)
    .filter((k) => k.startsWith("input.") && !!defaults[k])
    .map((id) => ({
      current: binding(id, cfg),
      original: defaults[id]![0]!,
      key: id === "input.buffer.home" ? "meta+up" : id === "input.buffer.end" ? "meta+down" : defaults[id]![0]!.split(",")[0]!,
    }));
  return (e: KeyEvent) => {
    for (const r of entries)
      if (matchesKey(e, r.current) && r.key !== "none") return { ...e, ...keyEventFromCombo(r.key), repeat: e.repeat };
    if (entries.some((r) => r.original !== "none" && matchesKey(e, r.original)))
      return e.input && !e.ctrl && !e.alt && !e.meta ? { ...e, key: "text" } : null;
    return e;
  };
}
/** One sequence matcher per scope. A timeout or Escape cancels the pending sequence without editing the prompt. */
export function useCommandKeys(commands: Commands, priority: number, onPending?: (keys: string[]) => void, active = true) {
  const cfg = useStoreState((s) => s.keys),
    pending = useRef<KeyEvent[]>([]),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callback = useRef(onPending);
  const signature = Object.keys(commands)
    .filter((id) => commands[id])
    .join("|");
  const compiled = useMemo(() => signature.split("|").map((id) => ({ id, seqs: parseKeys(binding(id, cfg)) })), [signature, cfg]);
  callback.current = onPending;
  function clear() {
    clearTimeout(timer.current);
    if (pending.current.length) {
      pending.current = [];
      callback.current?.([]);
    }
  }
  useEffect(() => {
    clear();
    return () => {
      clearTimeout(timer.current);
      pending.current = [];
    };
  }, [cfg, active]);
  useInput(
    (e) => {
      if (pending.current.length && (e.key === "escape" || e.key === "backspace")) {
        clear();
        e.stopPropagation();
        return;
      }
      function tryMatch(events: KeyEvent[]) {
        const completions: string[] = [];
        for (const { id, seqs } of compiled) {
          const run = commands[id];
          if (!run) continue;
          for (const seq of seqs) {
            if (seq.length < events.length || !events.every((ev, i) => matchStroke(ev, seq[i]!))) continue;
            if (seq.length === events.length) {
              if ((!e.repeat || !id.match(/toggle|delete|close/)) && run() === false) continue;
              clear();
              e.stopPropagation();
              return true;
            }
            completions.push(id);
          }
        }
        if (!completions.length) return false;
        pending.current = events;
        callback.current?.(completions);
        clearTimeout(timer.current);
        timer.current = setTimeout(clear, cfg.timeout);
        e.stopPropagation();
        return true;
      }
      if (pending.current.length && tryMatch([...pending.current, e])) return;
      clear();
      tryMatch([e]);
    },
    { priority, isActive: active },
  );
}
