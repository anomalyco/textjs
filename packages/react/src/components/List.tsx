import { type ReactNode } from "react";
import { useFocus } from "../focus";
import { useInput, useViewport, useWheel } from "../hooks";
import { useMeasure } from "../hooks/measure";
import { FOCUSED_INPUT_PRIORITY } from "../input-manager";
import { mergeStyleProps, TxBox } from "../host";
import { useTheme } from "../theme";
import type { BoxProps } from "./Box";
import { Text } from "./Text";
import { handleListKey, Scrollbar, useCursor, useWheelSteps, useWindowStart } from "./virtual";

export interface ListItemState {
  index: number;
  /** The keyboard cursor is on this item. */
  highlighted: boolean;
  /** The list has focus. */
  focused: boolean;
}

export interface ListProps<T> extends Omit<BoxProps, "children" | "onSelect" | "ref" | "height"> {
  items: readonly T[];
  /** Render one row (rows are one cell tall). Strings render as truncated text. */
  renderItem?: (item: T, state: ListItemState) => ReactNode;
  /** Text for the default renderer (default `String(item)`). */
  getLabel?: (item: T) => string;
  getKey?: (item: T, index: number) => string | number;
  /** Visible rows. Default: fill the parent (measured after layout). */
  height?: number;
  /** Controlled cursor. */
  highlightedIndex?: number;
  defaultHighlightedIndex?: number;
  onHighlight?: (index: number, item: T) => void;
  /** Enter on the highlighted item. */
  onSelect?: (item: T, index: number) => void;
  isItemDisabled?: (item: T, index: number) => boolean;
  /** Draw a scrollbar when items overflow (default `true`). */
  scrollbar?: boolean;
  /** Show the `›` cursor marker (default `true`). */
  marker?: boolean;
  emptyText?: string;
  /** j/k/g/G navigation (default `true`; disable when rows contain typing). */
  vimKeys?: boolean;
  focused?: boolean;
  autoFocus?: boolean;
  id?: string;
  isActive?: boolean;
}

/**
 * A virtualized, keyboard-driven list. Only visible rows are rendered, so
 * 100,000 items cost the same as 20.
 */
export function List<T>(props: ListProps<T>): ReactNode {
  const {
    items,
    renderItem,
    getLabel = String,
    getKey,
    height,
    highlightedIndex,
    defaultHighlightedIndex,
    onHighlight,
    onSelect,
    isItemDisabled,
    scrollbar = true,
    marker = true,
    emptyText = "No items",
    vimKeys = true,
    focused,
    autoFocus,
    id,
    isActive = true,
    className,
    style,
    ...rest
  } = props;
  const theme = useTheme();
  const vp = useViewport();
  const focus = useFocus({ id, autoFocus, focused, isActive });
  const active = focus.isFocused && isActive;
  const [measureRef, size] = useMeasure({ enabled: height === undefined });
  const rows = Math.max(1, height ?? (size.height > 0 ? size.height : Math.min(items.length || 1, vp.rows)));
  const cursor = useCursor({
    count: items.length,
    index: highlightedIndex,
    defaultIndex: defaultHighlightedIndex,
    onChange: (i) => onHighlight?.(i, items[i] as T),
    isDisabled: isItemDisabled ? (i) => isItemDisabled(items[i] as T, i) : undefined,
  });
  const start = useWindowStart(items.length, rows, cursor.index);
  const wheelSteps = useWheelSteps();

  useInput(
    (e) => {
      if (handleListKey(e, cursor, Math.max(1, rows - 1), items.length, vimKeys)) e.stopPropagation();
      else if (e.key === "return" && cursor.index >= 0) {
        const item = items[cursor.index] as T;
        if (!isItemDisabled?.(item, cursor.index)) onSelect?.(item, cursor.index);
        e.stopPropagation();
      }
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );
  useWheel(
    (e) => {
      const n = wheelSteps(e.rows);
      if (n !== 0) cursor.moveBy(n);
      if (active) e.stopPropagation();
    },
    { isActive, priority: active ? 1 : 0 },
  );

  const outer = mergeStyleProps(theme, className, style, rest);
  const fill = height === undefined;
  const visible = items.slice(start, start + rows);
  return (
    <TxBox
      flexDirection="row"
      flexGrow={fill ? 1 : undefined}
      flexBasis={fill ? 0 : undefined}
      minHeight={1}
      flexShrink={fill ? 1 : 0}
      {...outer}
      height={height}
      overflow="hidden"
    >
      <TxBox ref={measureRef} flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
        {items.length === 0 ? (
          <Text color={theme.subtle} italic wrap="nowrap">
            {`  ${emptyText}`}
          </Text>
        ) : null}
        {visible.map((item, i) => {
          const index = start + i;
          const hi = index === cursor.index;
          const disabled = isItemDisabled?.(item, index) ?? false;
          return (
            <TxBox
              key={getKey ? getKey(item, index) : index}
              flexDirection="row"
              height={1}
              flexShrink={0}
              bg={hi && active ? theme.selection : undefined}
            >
              {marker ? (
                <Text color={hi ? theme.accent : theme.subtle} wrap="nowrap" flexShrink={0}>
                  {hi ? "› " : "  "}
                </Text>
              ) : null}
              {renderItem ? (
                renderItem(item, { index, highlighted: hi, focused: active })
              ) : (
                <Text color={disabled ? theme.subtle : hi ? theme.fg : theme.muted} bold={hi && active} wrap="truncate-end" flexGrow={1}>
                  {getLabel(item)}
                </Text>
              )}
            </TxBox>
          );
        })}
      </TxBox>
      {scrollbar ? <Scrollbar total={items.length} visible={rows} start={start} active={active} /> : null}
    </TxBox>
  );
}
