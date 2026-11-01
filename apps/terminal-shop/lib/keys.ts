import { useInput, type KeyEvent } from "@textjs/app";

/** Bubble Tea's `tea.KeyMsg.String()` names for a Text.js key event. */
export function keyString(e: Pick<KeyEvent, "key" | "input" | "ctrl" | "shift" | "alt" | "meta">): string {
  const named: Record<string, string> = {
    return: "enter",
    escape: "esc",
    pageup: "pgup",
    pagedown: "pgdown",
    space: " ",
  };
  let k = named[e.key] ?? e.key;
  if (k === "tab" && e.shift) return "shift+tab";
  if (e.ctrl && k.length === 1) return `ctrl+${k.toLowerCase()}`;
  if (e.alt && k.length === 1) return `alt+${k}`;
  if (k.length === 1 && e.input) k = e.input;
  return k;
}

export const isPrintable = (e: Pick<KeyEvent, "input" | "ctrl" | "meta" | "alt">): boolean =>
  !!e.input && !e.ctrl && !e.meta && !e.alt && [...e.input].every((c) => c >= " " && c !== "\u007f");

/** `useInput` with Bubble Tea key names; return `true` to consume the key. */
export function useKeys(handler: (key: string, e: KeyEvent) => boolean | void, options: { priority?: number; isActive?: boolean } = {}): void {
  useInput(
    (e) => {
      if (e.meta) return;
      if (handler(keyString(e), e)) e.stopPropagation();
    },
    { priority: options.priority ?? 0, isActive: options.isActive ?? true },
  );
}
