import { useMemo, useRef, type ReactNode, type Ref } from "react";
import { layoutGraphemeLines, segmentGraphemes, type ColorInput, type LayoutProps, type SceneNode, type SceneNodeProps } from "@textjs/core";
import { applyEditKey, insert, lineStart, verticalMove } from "../editing";
import { useFocus } from "../focus";
import { mergeStyleProps, TxBox, TxText } from "../host";
import { useInput, usePaste } from "../hooks";
import { FOCUSED_INPUT_PRIORITY } from "../input-manager";
import { resolveColor, useTheme } from "../theme";
import { cursorText, renderCursor, splitAtCursor, useCursor, useEditor, type FieldValueProps } from "./field";
import { useMergedRef } from "./refs";

export interface TextareaProps extends FieldValueProps, Omit<LayoutProps, "overflow"> {
  /** Called on Enter (without Shift / Alt / ⌘). Shift+Enter, Alt+Enter and Ctrl+J insert a newline. */
  onSubmit?: (value: string) => void;
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
  const focus = useFocus({ id, autoFocus, focused, isActive });
  const active = focus.isFocused && isActive;
  const mode = useCursor(active, cursorBlink, editor.value.length * 1e6 + editor.cursor);
  const boxRef = useRef<SceneNode | null>(null);
  const setRef = useMergedRef(boxRef, ref);
  const topRef = useRef(0);
  const goalCol = useRef<number | null>(null);
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  useInput(
    (e) => {
      if (e.key === "return") {
        e.stopPropagation();
        if (e.shift || e.alt || e.meta || e.ctrl) editor.apply(insert(editor.current(), "\n"));
        else submitRef.current?.(editor.current().value);
        return;
      }
      if (e.ctrl && e.key === "j") {
        e.stopPropagation();
        editor.apply(insert(editor.current(), "\n"));
        return;
      }
      if (e.key === "tab" || e.key === "escape" || e.key === "pageup" || e.key === "pagedown") return;
      if ((e.key === "up" || e.key === "down") && !e.meta && !e.ctrl && !e.alt) {
        const cur = editor.current();
        const col = goalCol.current ?? cur.cursor - lineStart(cur.value, cur.cursor);
        const target = verticalMove(cur.value, cur.cursor, e.key === "up" ? -1 : 1, col);
        e.stopPropagation();
        editor.apply({ value: cur.value, cursor: target });
        goalCol.current = col;
        return;
      }
      goalCol.current = null;
      const next = applyEditKey(editor.current(), e, true);
      if (next === null) return;
      e.stopPropagation();
      editor.apply(next);
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );

  usePaste(
    (e) => {
      e.stopPropagation();
      editor.apply(insert(editor.current(), e.text.replace(/\r\n?/g, "\n")));
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

  const content: ReactNode = split.isPlaceholder ? (
    <TxText fg={phResolved}>
      {mode === "block" ? <TxText inverse>{split.parts.glyph}</TxText> : split.parts.glyph}
      {split.parts.after}
    </TxText>
  ) : (
    <>
      {split.parts.before}
      {renderCursor(split.parts.glyph, mode, theme)}
      {split.parts.after}
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
    <TxBox {...boxProps} flexDirection="column" minHeight={minRows} maxHeight={visibleRows} overflow="hidden" scrollY={scrollY} ref={setRef}>
      <TxText wrap="wrap" fg={fg}>
        {content}
      </TxText>
    </TxBox>
  );
}
