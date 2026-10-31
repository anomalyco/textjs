/**
 * Shared state + cursor rendering for `<Input>` and `<Textarea>`.
 */

import { useEffect, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRuntime } from "../context";
import { nextBoundary, type EditState } from "../editing";
import { TxText } from "../host";
import { ACTIVITY_FOCUSED, ACTIVITY_HIDDEN, ACTIVITY_PAUSED } from "../stores";
import type { TextTheme } from "../theme";

export interface FieldValueProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

interface FieldState extends EditState {
  lastProp: string | undefined;
}

export interface Editor {
  value: string;
  cursor: number;
  /** Commit an edit. Returns `true` when the value changed. */
  apply(next: EditState): boolean;
  /** Latest state, readable synchronously between renders. */
  current(): EditState;
}

/** Controlled / uncontrolled value with a synchronously-updated cursor. */
export function useEditor(props: FieldValueProps): Editor {
  const controlled = props.value !== undefined;
  const ref = useRef<FieldState | null>(null);
  if (ref.current === null) {
    const v = props.value ?? props.defaultValue ?? "";
    ref.current = { value: v, cursor: v.length, lastProp: props.value };
  }
  const s = ref.current;
  if (controlled && props.value !== s.lastProp) {
    s.lastProp = props.value;
    if (props.value !== s.value) {
      s.value = props.value as string;
      s.cursor = s.value.length;
    }
  }
  const onChange = useRef(props.onChange);
  onChange.current = props.onChange;
  const [, force] = useReducer((x: number) => x + 1, 0);
  const value = controlled ? (props.value as string) : s.value;
  return {
    value,
    cursor: Math.min(s.cursor, value.length),
    apply(next) {
      const changed = next.value !== s.value;
      s.value = next.value;
      s.cursor = next.cursor;
      if (changed) onChange.current?.(next.value);
      force();
      return changed;
    },
    current: () => ({ value: s.value, cursor: s.cursor }),
  };
}

export type CursorMode = "block" | "hidden" | "hollow" | "off";

/**
 * Cursor visibility. Steady inverse block by default; with `blink` the block
 * toggles every 530 ms only while the field is focused, the page has focus and
 * output is not paused. An unfocused page shows a static tinted cell and runs
 * no timers, so idle apps emit zero frames.
 */
export function useCursor(isFocused: boolean, blink: boolean, editVersion: unknown): CursorMode {
  const rt = useRuntime();
  const flags = useSyncExternalStore(rt.viewport.subscribe, rt.viewport.getActivityFlags, rt.viewport.getActivityFlags);
  const pageFocused = (flags & ACTIVITY_FOCUSED) !== 0;
  const pagePaused = (flags & ACTIVITY_PAUSED) !== 0;
  const pageHidden = (flags & ACTIVITY_HIDDEN) !== 0;
  const [blinkOn, setBlinkOn] = useState(true);
  const blinking = blink && isFocused && pageFocused && !pagePaused && !pageHidden;
  useEffect(() => {
    setBlinkOn(true);
    if (!blinking) return;
    const id = setInterval(() => setBlinkOn((v) => !v), 530);
    return () => clearInterval(id);
  }, [blinking, editVersion]);
  if (!isFocused) return "hidden";
  if (!pageFocused) return "hollow";
  if (blinking && !blinkOn) return "off";
  return "block";
}

/** Non-breaking space: keeps the cursor cell from being trimmed at wrap points. */
export const CURSOR_SPACE = "\u00a0";

export interface CursorParts {
  before: string;
  glyph: string;
  after: string;
}

/** Split display text around the cursor so the cursor always occupies one grapheme cell. */
export function splitAtCursor(display: string, cursor: number): CursorParts {
  const before = display.slice(0, cursor);
  const rest = display.slice(cursor);
  if (rest.length === 0 || rest.charCodeAt(0) === 10) return { before, glyph: CURSOR_SPACE, after: rest };
  const len = nextBoundary(rest, 0);
  const glyph = rest.slice(0, len);
  return { before, glyph: glyph === " " ? CURSOR_SPACE : glyph, after: rest.slice(len) };
}

/**
 * The literal text drawn for the cursor cell (used for both rendering and
 * layout math). Every mode reuses the cell's own glyph: a cursor only swaps
 * colors, so no symbol font fallback can change the row's line box.
 */
export function cursorText(glyph: string, mode: CursorMode): string {
  if (mode === "hidden" && glyph === CURSOR_SPACE) return "";
  return glyph;
}

export function renderCursor(glyph: string, mode: CursorMode, theme: TextTheme): ReactNode {
  const text = cursorText(glyph, mode);
  // The blank cursor cell is a no-break space (Bidi_Class CS), which would join
  // the numbers on either side into one (W4) and swap their order in RTL text.
  // Isolated, it stays neutral like the space it stands for. Letters are never
  // isolated, so Arabic keeps joining across the cursor.
  const dir = glyph === CURSOR_SPACE ? "auto" : undefined;
  switch (mode) {
    case "block":
      return (
        <TxText inverse dir={dir}>
          {text}
        </TxText>
      );
    case "hollow":
      return (
        <TxText bg={theme.selection} dir={dir}>
          {text}
        </TxText>
      );
    default:
      return dir === undefined || text === "" ? text : <TxText dir={dir}>{text}</TxText>;
  }
}
