import { useCallback, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { parseColor, type CellBuffer, type ColorInput, type ComputedRect, type SceneNode } from "@textjs/core";
import { useFocus } from "../focus";
import { mergeStyleProps, TxBox } from "../host";
import { useInput, useWheel } from "../hooks";
import { resolveColor, useTheme } from "../theme";
import type { BoxProps } from "./Box";

export interface ScrollBoxHandle {
  scrollTo(top: number): void;
  scrollBy(delta: number): void;
  scrollToTop(): void;
  scrollToBottom(): void;
  /** Current scroll offset in rows (clamped to the content). */
  getScrollTop(): number;
  /** Whether the view is pinned to the bottom. */
  isSticky(): boolean;
  /** The scrolling viewport node. */
  readonly node: SceneNode | null;
}

export interface ScrollBoxProps extends Omit<BoxProps, "ref" | "overflow" | "scrollX" | "scrollY" | "focused"> {
  /** Pin to the bottom as content grows; scrolling up releases, returning to the bottom re-engages. */
  stickyScroll?: boolean;
  /** Draw a 1-column scrollbar when content overflows (default `true`). */
  showScrollbar?: boolean;
  /** Rows per Up/Down key press (default `1`). */
  scrollStep?: number;
  /** Controlled focus for keyboard scrolling. */
  focused?: boolean;
  /** Register in Tab order for keyboard scrolling. */
  focusable?: boolean;
  autoFocus?: boolean;
  id?: string;
  /** Respond to keyboard / wheel input (default `true`). */
  isActive?: boolean;
  /** Respond to wheel events (default `true`). */
  wheel?: boolean;
  scrollbarColor?: ColorInput;
  scrollbarTrackColor?: ColorInput;
  /** Initial scroll offset. */
  initialScrollTop?: number;
  onScroll?: (top: number) => void;
  ref?: Ref<ScrollBoxHandle>;
}

const BOTTOM = Number.MAX_SAFE_INTEGER;

function maxScroll(node: SceneNode | null): number {
  if (node === null) return 0;
  const L = node.layout;
  return Math.max(0, L.scrollHeight - L.contentHeight);
}

/** A clipping, scrollable column with keyboard, wheel and sticky-bottom support. */
export function ScrollBox(props: ScrollBoxProps): ReactNode {
  const {
    stickyScroll = false,
    showScrollbar = true,
    scrollStep = 1,
    focused,
    focusable = false,
    autoFocus,
    id,
    isActive = true,
    wheel = true,
    scrollbarColor,
    scrollbarTrackColor,
    initialScrollTop,
    onScroll,
    ref,
    className,
    style,
    children,
    focusedBorderColor,
    backgroundColor,
    color,
    flexDirection,
    gap,
    rowGap,
    columnGap,
    alignItems,
    justifyContent,
    padding,
    paddingX,
    paddingY,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    ...outer
  } = props;
  const theme = useTheme();
  const viewport = useRef<SceneNode | null>(null);
  const [sticky, setSticky] = useState(stickyScroll && initialScrollTop === undefined);
  const [top, setTop] = useState(initialScrollTop ?? 0);
  const wheelRemainder = useRef(0);
  const state = useRef({ top, sticky });
  state.current = { top, sticky };
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;

  const focus = useFocus({ id, autoFocus, focused, isActive: focusable && isActive });
  const keyboardActive = isActive && (focused ?? (focusable && focus.isFocused));

  const effectiveTop = (): number => {
    const max = maxScroll(viewport.current);
    return state.current.sticky ? max : Math.min(state.current.top, max);
  };

  const scrollTo = useCallback(
    (target: number) => {
      const max = maxScroll(viewport.current);
      const next = Math.max(0, Math.min(max, Math.round(target)));
      const pinned = stickyScroll && max - next < 1;
      state.current = { top: next, sticky: pinned };
      setTop(next);
      setSticky(pinned);
      onScrollRef.current?.(next);
    },
    [stickyScroll],
  );

  const scrollBy = useCallback((delta: number) => scrollTo(effectiveTop() + delta), [scrollTo]);

  useImperativeHandle(
    ref,
    () => ({
      scrollTo,
      scrollBy,
      scrollToTop: () => scrollTo(0),
      scrollToBottom: () => {
        if (stickyScroll) {
          state.current = { top: BOTTOM, sticky: true };
          setSticky(true);
          setTop(BOTTOM);
        } else scrollTo(BOTTOM);
      },
      getScrollTop: () => effectiveTop(),
      isSticky: () => state.current.sticky,
      get node() {
        return viewport.current;
      },
    }),
    [scrollTo, scrollBy, stickyScroll],
  );

  useInput(
    (e) => {
      const page = Math.max(1, (viewport.current?.layout.contentHeight ?? 1) - 1);
      let handled = true;
      if (e.key === "up" || (e.key === "k" && !e.ctrl && !e.meta)) scrollBy(-scrollStep);
      else if (e.key === "down" || (e.key === "j" && !e.ctrl && !e.meta)) scrollBy(scrollStep);
      else if (e.key === "pageup" || (e.key === "u" && e.ctrl)) scrollBy(-page);
      else if (e.key === "pagedown" || (e.key === "d" && e.ctrl) || e.key === "space") scrollBy(page);
      else if (e.key === "home" || (e.key === "g" && !e.shift)) scrollTo(0);
      else if (e.key === "end" || (e.key === "g" && e.shift)) scrollTo(BOTTOM);
      else handled = false;
      if (handled) e.stopPropagation();
    },
    { isActive: keyboardActive },
  );

  useWheel(
    (e) => {
      const total = wheelRemainder.current + e.rows;
      const whole = Math.trunc(total);
      wheelRemainder.current = total - whole;
      if (whole !== 0) scrollBy(whole);
      if (keyboardActive) e.stopPropagation();
    },
    { isActive: isActive && wheel, priority: keyboardActive ? 1 : 0 },
  );

  const scrollY = sticky ? BOTTOM : top;
  const thumb = parseColor(resolveColor(theme, scrollbarColor ?? (keyboardActive ? theme.muted : theme.subtle)));
  const track = parseColor(resolveColor(theme, scrollbarTrackColor ?? theme.border));

  const paintScrollbar = useCallback(
    (buf: CellBuffer, rect: Readonly<ComputedRect>) => {
      const node = viewport.current;
      if (node === null) return;
      const L = node.layout;
      const h = rect.height;
      if (h <= 0 || L.scrollHeight <= L.contentHeight) return;
      const max = L.scrollHeight - L.contentHeight;
      const offset = Math.min(max, Math.max(0, Math.floor(node.props.scrollY ?? 0)));
      const size = Math.max(1, Math.round((h * L.contentHeight) / L.scrollHeight));
      const pos = max === 0 ? 0 : Math.round(((h - size) * offset) / max);
      for (let y = 0; y < h; y++) {
        const on = y >= pos && y < pos + size;
        buf.setCell(rect.x, rect.y + y, on ? "┃" : "│", on ? thumb : track, 0);
      }
    },
    [thumb, track],
  );

  const outerProps = mergeStyleProps(theme, className, style, {
    ...outer,
    bg: outer.bg ?? backgroundColor,
    fg: outer.fg ?? color,
    borderColor: keyboardActive ? (focusedBorderColor ?? theme.borderFocus) : outer.borderColor,
  });
  // A growing scroll area must not take its (unbounded) content height as its flex basis,
  // or it squeezes its siblings instead of scrolling.
  if (outerProps.flexBasis === undefined && (outerProps.flexGrow ?? 0) > 0 && outerProps.height === undefined) outerProps.flexBasis = 0;
  const setViewport = useCallback((n: SceneNode | null) => {
    viewport.current = n;
  }, []);

  return (
    <TxBox flexDirection="row" {...outerProps} overflow="hidden">
      <TxBox
        ref={setViewport}
        flexDirection={flexDirection ?? "column"}
        flexGrow={1}
        flexShrink={1}
        flexBasis={0}
        minWidth={0}
        overflow="scroll"
        scrollY={scrollY}
        gap={gap}
        rowGap={rowGap}
        columnGap={columnGap}
        alignItems={alignItems}
        justifyContent={justifyContent}
        padding={padding}
        paddingX={paddingX}
        paddingY={paddingY}
        paddingTop={paddingTop}
        paddingRight={paddingRight}
        paddingBottom={paddingBottom}
        paddingLeft={paddingLeft}
        wireframeLabel="scroll"
      >
        {children}
      </TxBox>
      {showScrollbar ? <TxBox width={1} flexShrink={0} alignSelf="stretch" customPaint={paintScrollbar} /> : null}
    </TxBox>
  );
}
