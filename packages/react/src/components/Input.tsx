import { useRef, type ReactNode, type Ref } from "react";
import { useMergedRef } from "./refs";
import { stringWidth, type ColorInput, type LayoutProps, type SceneNode, type SceneNodeProps } from "@textjs/core";
import { applyEditKey, insert } from "../editing";
import { useFocus } from "../focus";
import { mergeStyleProps, TxBox, TxText } from "../host";
import { usePaste, useInput } from "../hooks";
import { FOCUSED_INPUT_PRIORITY } from "../input-manager";
import { useTheme } from "../theme";
import { cursorText, renderCursor, splitAtCursor, useCursor, useEditor, type FieldValueProps } from "./field";

export interface InputProps extends FieldValueProps, LayoutProps {
  onSubmit?: (value: string) => void;
  placeholder?: string;
  /** Mask character for secrets (e.g. `"•"`). */
  mask?: string;
  /** Controlled focus (removes the field from Tab order). */
  focused?: boolean;
  autoFocus?: boolean;
  /** Focus id for `useFocusManager().focus(id)`. */
  id?: string;
  /** Read-only when `false`. */
  isActive?: boolean;
  /** Blink the cursor while focused (default steady block, zero idle frames). */
  cursorBlink?: boolean;
  color?: ColorInput;
  placeholderColor?: ColorInput;
  bg?: ColorInput;
  className?: string;
  style?: Partial<SceneNodeProps>;
  ref?: Ref<SceneNode>;
}

const MAX_SCROLL = Number.MAX_SAFE_INTEGER;

function maskText(value: string, mask: string | undefined): string {
  if (!mask) return value;
  return Array.from(value, () => mask).join("");
}

/** Single-line text input with readline-style editing and horizontal scrolling. */
export function Input(props: InputProps): ReactNode {
  const {
    onSubmit,
    placeholder,
    mask,
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
  const offsetRef = useRef(0);
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  useInput(
    (e) => {
      if (e.key === "return" && !e.shift && !e.alt) {
        e.stopPropagation();
        submitRef.current?.(editor.current().value);
        return;
      }
      if (e.key === "tab" || e.key === "escape" || e.key === "up" || e.key === "down" || e.key === "pageup" || e.key === "pagedown") return;
      const next = applyEditKey(editor.current(), e, false);
      if (next === null) return;
      e.stopPropagation();
      editor.apply(next);
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );

  usePaste(
    (e) => {
      e.stopPropagation();
      editor.apply(insert(editor.current(), e.text.replace(/\r?\n/g, " ")));
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );

  const boxProps = mergeStyleProps(theme, className, style, { flexGrow: 1, flexShrink: 1, minWidth: 1, maxHeight: 1, ...layout, bg });
  const fg = mergeStyleProps(theme, undefined, undefined, { fg: color ?? theme.fg }).fg;
  const value = editor.value;

  let content: ReactNode;
  let display: string;
  let cursorCol = 0;
  if (value.length === 0 && placeholder) {
    const parts = splitAtCursor(placeholder, 0);
    const phColor = mergeStyleProps(theme, undefined, undefined, { fg: placeholderColor ?? theme.subtle }).fg;
    const head = mode === "block" ? <TxText inverse>{parts.glyph}</TxText> : mode === "hollow" ? <TxText fg={phColor} underline>{parts.glyph}</TxText> : parts.glyph;
    content = (
      <>
        <TxText fg={phColor}>{head}</TxText>
        <TxText fg={phColor}>{parts.after}</TxText>
      </>
    );
    display = placeholder;
  } else {
    const masked = maskText(value, mask);
    const cursorIdx = mask ? Array.from(value.slice(0, editor.cursor)).length * mask.length : editor.cursor;
    const parts = splitAtCursor(masked, cursorIdx);
    content = (
      <>
        {parts.before}
        {renderCursor(parts.glyph, mode, theme)}
        {parts.after}
      </>
    );
    display = parts.before + cursorText(parts.glyph, mode) + parts.after;
    cursorCol = stringWidth(parts.before);
  }

  const totalWidth = stringWidth(display);
  const viewWidth = boxRef.current?.layout.contentWidth ?? 0;
  let scrollX: number;
  if (viewWidth <= 0) {
    scrollX = cursorCol >= totalWidth - 1 && totalWidth > 0 ? MAX_SCROLL : 0;
  } else {
    let off = offsetRef.current;
    if (cursorCol < off) off = cursorCol;
    else if (cursorCol >= off + viewWidth) off = cursorCol - viewWidth + 1;
    off = Math.max(0, Math.min(off, totalWidth - viewWidth));
    offsetRef.current = off;
    scrollX = off;
  }

  const setRef = useMergedRef(boxRef, ref);

  return (
    <TxBox height={1} {...boxProps} flexDirection="row" overflow="hidden" scrollX={scrollX} ref={setRef}>
      <TxText wrap="nowrap" fg={fg} width={Math.max(1, totalWidth)} flexShrink={0}>
        {content}
      </TxText>
    </TxBox>
  );
}
