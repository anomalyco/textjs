import { useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import {
  layoutGraphemeLines,
  segmentGraphemes,
  type ColorInput,
  type LayoutProps,
  type SceneNode,
  type SceneNodeProps,
} from "@textjs/core";
import { applyEditKey, deleteRange, insert, lineStart, lineEnd, visualMove, type EditState } from "../editing";
import { useFocus } from "../focus";
import { mergeStyleProps, TxBox, TxText } from "../host";
import { useInput, usePaste } from "../hooks";
import { FOCUSED_INPUT_PRIORITY } from "../input-manager";
import { resolveColor, useTheme } from "../theme";
import { cursorText, renderCursor, splitAtCursor, useCursor, useEditor, type FieldValueProps } from "./field";
import { useMergedRef } from "./refs";

export interface TextareaProps extends FieldValueProps, Omit<LayoutProps, "overflow"> {
  /** Replace the buffer and position the caret (UTF-16 offsets, as in String.slice). */
  editorRef?: Ref<{ replace(value: string, cursor: number): void }>;
  onCursorChange?: (cursor: number) => void;
  /** Optional foreground ranges in the buffer, e.g. file mentions. */
  highlights?: readonly { start: number; end: number; color: ColorInput }[];
  /** Enable selection and a bounded, in-memory undo history. */
  advancedEditing?: boolean;
  /** Called on Enter (without Shift / Alt / ⌘). Shift+Enter, Alt+Enter and Ctrl+J insert a newline. */
  onSubmit?: (value: string) => void;
  /** Submitted entries, oldest first. Up at the start recalls an entry; Down at the end restores the draft. */
  history?: readonly string[];
  placeholder?: string;
  /** Minimum visible rows (default `1`). */
  minRows?: number;
  /** Maximum visible rows before scrolling (default `6`). */
  maxRows?: number;
  focused?: boolean;
  autoFocus?: boolean;
  id?: string;
  isActive?: boolean;
  cursorBlink?: boolean;
  color?: ColorInput;
  placeholderColor?: ColorInput;
  bg?: ColorInput;
  className?: string;
  style?: Partial<SceneNodeProps>;
  ref?: Ref<SceneNode>;
}

const MAX_SCROLL = Number.MAX_SAFE_INTEGER;

/** Multi-line prompt composer with soft wrapping and cursor-following vertical scroll. */
export function Textarea(props: TextareaProps): ReactNode {
  const {
    onSubmit,
    editorRef,
    onCursorChange,
    highlights,
    advancedEditing,
    history,
    placeholder,
    minRows = 1,
    maxRows = 6,
    focused,
    autoFocus,
    id,
    isActive = true,
    cursorBlink = false,
    color,
    placeholderColor,
    bg,
    className,
    style,
    ref,
    value: _value,
    defaultValue: _defaultValue,
    onChange: _onChange,
    ...layout
  } = props;
  const theme = useTheme();
  const editor = useEditor(props);
  const [anchor, select] = useState<number | null>(null);
  const past = useRef<EditState[]>([]),
    future = useRef<EditState[]>([]);
  const apply = (next: EditState) => {
    const cur = editor.current();
    if (advancedEditing && next.value !== cur.value) {
      // Bound retained paste data as well as the number of edits.
      let size = cur.value.length;
      past.current = [cur, ...past.current].slice(0, 100).filter((s, i) => {
        if (i) size += s.value.length;
        return size <= 256_000;
      });
      future.current = [];
    }
    editor.apply(next);
  };
  useImperativeHandle(editorRef, () => ({
    replace(value, cursor) {
      select(null);
      apply({ value, cursor: Math.max(0, Math.min(value.length, cursor)) });
    },
  }));
  useLayoutEffect(() => {
    onCursorChange?.(editor.cursor);
  }, [editor.cursor, onCursorChange]);
  const focus = useFocus({ id, autoFocus, focused, isActive });
  const active = focus.isFocused && isActive;
  const mode = useCursor(active, cursorBlink, editor.value.length * 1e6 + editor.cursor);
  const boxRef = useRef<SceneNode | null>(null);
  const setRef = useMergedRef(boxRef, ref);
  const topRef = useRef(0);
  const goalCol = useRef<number | null>(null);
  const recall = useRef<{ index: number; draft: string } | null>(null);
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  useInput(
    (e) => {
      const cur = editor.current();
      const hasSelection = advancedEditing && anchor !== null && anchor !== cur.cursor;
      const cleared = () => (hasSelection ? deleteRange(cur, anchor!, cur.cursor) : cur);
      if (advancedEditing && ((e.meta && e.key === "z") || (e.ctrl && ["-", "."].includes(e.key)))) {
        const redo = e.key === "." || e.shift,
          from = redo ? future : past,
          to = redo ? past : future;
        const next = from.current.shift();
        if (next) {
          to.current.unshift(cur);
          select(null);
          editor.apply(next);
        }
        e.stopPropagation();
        return;
      }
      if (advancedEditing && e.meta && e.key === "a") {
        select(0);
        editor.apply({ ...cur, cursor: cur.value.length });
        e.stopPropagation();
        return;
      }
      if (advancedEditing && e.shift && (e.key === "home" || e.key === "end")) {
        select(anchor ?? cur.cursor);
        editor.apply({ ...cur, cursor: e.key === "home" ? 0 : cur.value.length });
        e.stopPropagation();
        return;
      }
      if (advancedEditing && e.shift && e.ctrl && e.key === "d") {
        const start = lineStart(cur.value, cur.cursor),
          end = lineEnd(cur.value, cur.cursor);
        select(null);
        apply(deleteRange(cur, start, Math.min(cur.value.length, end + 1)));
        e.stopPropagation();
        return;
      }
      if (e.key === "return") {
        recall.current = null;
        e.stopPropagation();
        if (e.shift || e.alt || e.meta || e.ctrl) {
          apply(insert(cleared(), "\n"));
          select(null);
        } else {
          past.current = [];
          future.current = [];
          select(null);
          submitRef.current?.(cur.value);
        }
        return;
      }
      if (e.ctrl && e.key === "j") {
        recall.current = null;
        e.stopPropagation();
        apply(insert(cleared(), "\n"));
        select(null);
        return;
      }
      if (e.key === "tab" || e.key === "escape" || e.key === "pageup" || e.key === "pagedown") return;
      if ((e.key === "up" || e.key === "down") && !e.meta && !e.ctrl && !e.alt) {
        select(advancedEditing && e.shift ? (anchor ?? cur.cursor) : null);
        const up = e.key === "up";
        if (!e.shift && history?.length && (up ? cur.cursor === 0 : cur.cursor === cur.value.length)) {
          const previous = recall.current ?? { index: history.length, draft: cur.value };
          const index = Math.max(0, Math.min(history.length, previous.index + (up ? -1 : 1)));
          if (index !== previous.index) {
            const value = history[index] ?? previous.draft;
            recall.current = index === history.length ? null : { ...previous, index };
            goalCol.current = null;
            editor.apply({ value, cursor: up ? 0 : value.length });
            e.stopPropagation();
            return;
          }
        }
        const target = visualMove(cur.value, cur.cursor, boxRef.current?.layout.contentWidth ?? 80, up ? -1 : 1, goalCol.current);
        e.stopPropagation();
        editor.apply({ value: cur.value, cursor: target.cursor });
        goalCol.current = target.col;
        return;
      }
      goalCol.current = null;
      let next = applyEditKey(
        cur,
        advancedEditing && e.alt && e.shift && ["b", "f"].includes(e.key) ? { ...e, shift: false } : e,
        true,
      );
      if (hasSelection && ["backspace", "delete"].includes(e.key)) next = cleared();
      else if (hasSelection && e.input && !e.ctrl && !e.meta && !e.alt) next = insert(cleared(), e.input);
      if (next === null) return;
      select(advancedEditing && e.shift && next.value === cur.value ? (anchor ?? cur.cursor) : null);
      if (next.value !== editor.current().value) recall.current = null;
      e.stopPropagation();
      apply(next);
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );

  usePaste(
    (e) => {
      e.stopPropagation();
      recall.current = null;
      const cur = editor.current();
      if (e.text)
        apply(insert(advancedEditing && anchor !== null ? deleteRange(cur, anchor, cur.cursor) : cur, e.text.replace(/\r\n?/g, "\n")));
      select(null);
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );

  const boxProps = mergeStyleProps(theme, className, style, { flexGrow: 1, flexShrink: 0, ...layout, bg });
  const fg = resolveColor(theme, color ?? theme.fg);
  const value = editor.value;
  const cursor = editor.cursor;
  const phResolved = resolveColor(theme, placeholderColor ?? theme.subtle);

  const split = useMemo(() => {
    if (value.length === 0 && placeholder) {
      const parts = splitAtCursor(placeholder, 0);
      return { isPlaceholder: true as const, parts, display: placeholder, cursorGrapheme: 0 };
    }
    const parts = splitAtCursor(value, cursor);
    return {
      isPlaceholder: false as const,
      parts,
      display: parts.before + cursorText(parts.glyph, mode) + parts.after,
      cursorGrapheme: parts.before.length === 0 ? 0 : segmentGraphemes(parts.before).length,
    };
  }, [value, cursor, placeholder, mode]);

  const styled = (s: string, offset: number): ReactNode => {
    const a = Math.min(anchor ?? cursor, cursor),
      b = Math.max(anchor ?? cursor, cursor);
    if (!highlights?.length && a === b) return s;
    const cuts = [
      ...new Set([
        offset,
        offset + s.length,
        ...[a, b, ...(highlights ?? []).flatMap((h) => [h.start, h.end])].filter((i) => i > offset && i < offset + s.length),
      ]),
    ].sort((a, b) => a - b);
    return cuts.slice(0, -1).map((i, j) => (
      <TxText key={i} inverse={i >= a && i < b} fg={highlights?.find((h) => h.start <= i && i < h.end)?.color}>
        {s.slice(i - offset, cuts[j + 1]! - offset)}
      </TxText>
    ));
  };
  const content: ReactNode = split.isPlaceholder ? (
    <TxText fg={phResolved}>
      {mode === "block" ? <TxText inverse>{split.parts.glyph}</TxText> : split.parts.glyph}
      {split.parts.after}
    </TxText>
  ) : (
    <>
      {styled(split.parts.before, 0)}
      {renderCursor(split.parts.glyph, mode, theme)}
      {styled(split.parts.after, value.length - split.parts.after.length)}
    </>
  );
  const display = split.display;
  const cursorGrapheme = split.cursorGrapheme;

  // Keep the cursor's visual row in view using the same wrap engine as the scene.
  const width = boxRef.current?.layout.contentWidth ?? 0;
  const wrappedLines = useMemo(
    () => (width > 0 ? layoutGraphemeLines(segmentGraphemes(display), width, "wrap") : null),
    [display, width],
  );
  let scrollY: number;
  let visibleRows: number;
  if (wrappedLines === null) {
    scrollY = MAX_SCROLL;
    visibleRows = Math.max(minRows, Math.min(maxRows, display.split("\n").length));
  } else {
    const lines = wrappedLines;
    let row = lines.length - 1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i] as { start: number; end: number };
      if (cursorGrapheme < l.end || (l.start === l.end && cursorGrapheme === l.start)) {
        row = i;
        break;
      }
    }
    const visible = Math.max(minRows, Math.min(maxRows, lines.length));
    visibleRows = visible;
    let top = topRef.current;
    if (row < top) top = row;
    else if (row >= top + visible) top = row - visible + 1;
    top = Math.max(0, Math.min(top, lines.length - visible));
    topRef.current = top;
    scrollY = top;
  }

  return (
    <TxBox
      {...boxProps}
      flexDirection="column"
      minHeight={minRows}
      maxHeight={visibleRows}
      overflow="hidden"
      scrollY={scrollY}
      ref={setRef}
    >
      <TxText wrap="wrap" fg={fg}>
        {content}
      </TxText>
    </TxBox>
  );
}
