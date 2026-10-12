import { Fragment, useCallback, useMemo, useState, type ReactNode } from "react";
import { parseColor, type CellBuffer, type ColorInput, type ComputedRect, type Dimension } from "@textjs/core";
import { useFocus } from "../focus";
import { useInput, useViewport, useWheel } from "../hooks";
import { useMeasure } from "../hooks/measure";
import { FOCUSED_INPUT_PRIORITY } from "../input-manager";
import { mergeStyleProps, TxBox } from "../host";
import { useTheme } from "../theme";
import type { BoxProps } from "./Box";
import { Text } from "./Text";
import { handleListKey, Scrollbar, useCursor, useWheelSteps, useWindowStart } from "./virtual";

export type SortDirection = "asc" | "desc";

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  /** Column id; also the default accessor (`row[key]`). */
  key: string;
  header?: string;
  /** Fixed width in cells or a percentage. Columns without a width share the remaining space. */
  width?: Dimension;
  /** Share of the remaining space (default `1`). */
  grow?: number;
  minWidth?: number;
  align?: "left" | "right" | "center";
  /** Value used for display (when `render` is absent) and sorting. */
  value?: (row: T) => string | number | null | undefined;
  /** Custom cell content. */
  render?: (row: T, state: { highlighted: boolean; selected: boolean }) => ReactNode;
  /** Allow sorting by this column (default `true` when the table is sortable). */
  sortable?: boolean;
  compare?: (a: T, b: T) => number;
  color?: ColorInput;
}

export interface TableProps<T> extends Omit<BoxProps, "children" | "onSelect" | "ref" | "height"> {
  columns: ReadonlyArray<TableColumn<T>>;
  rows: readonly T[];
  getRowKey?: (row: T, index: number) => string | number;
  /** Visible body rows. Default: fill the parent. */
  height?: number;
  /** Enter on the highlighted row. */
  onSelect?: (row: T, index: number) => void;
  onHighlight?: (row: T, index: number) => void;
  /** Space toggles row selection. */
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: ReadonlySet<string | number>;
  defaultSelectedKeys?: Iterable<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  /** Enable sorting: `s` cycles the sort column, `S` flips direction, or press a column's number. */
  sortable?: boolean;
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  /** Hide the header row. */
  hideHeader?: boolean;
  /** Blank cells between columns (default `2`). */
  columnGap?: number;
  emptyText?: string;
  scrollbar?: boolean;
  focused?: boolean;
  autoFocus?: boolean;
  id?: string;
  isActive?: boolean;
}

function cellValue<T>(col: TableColumn<T>, row: T): string | number | null | undefined {
  if (col.value) return col.value(row);
  const v = (row as Record<string, unknown>)[col.key];
  return v === null || v === undefined ? v : typeof v === "number" ? v : String(v);
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/**
 * A virtualized data table: aligned columns, keyboard row cursor, sorting and
 * single / multiple selection.
 */
export function Table<T>(props: TableProps<T>): ReactNode {
  const {
    columns,
    rows,
    getRowKey = (_row: T, i: number) => i,
    height,
    onSelect,
    onHighlight,
    selectionMode = "none",
    selectedKeys,
    defaultSelectedKeys,
    onSelectionChange,
    sortable = false,
    sort: sortProp,
    defaultSort = null,
    onSortChange,
    hideHeader = false,
    columnGap = 2,
    emptyText = "No rows",
    scrollbar = true,
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
  const [innerSort, setInnerSort] = useState<SortState | null>(defaultSort);
  const sort = sortProp === undefined ? innerSort : sortProp;
  const [innerSel, setInnerSel] = useState<Set<string | number>>(() => new Set(defaultSelectedKeys ?? []));
  const selection = selectedKeys ?? innerSel;

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.column);
    if (!col) return rows;
    const cmp = col.compare ?? ((a: T, b: T) => compareValues(cellValue(col, a), cellValue(col, b)));
    const dir = sort.direction === "asc" ? 1 : -1;
    return rows
      .map((r, i) => ({ r, i }))
      .sort((a, b) => cmp(a.r, b.r) * dir || a.i - b.i)
      .map((x) => x.r);
  }, [rows, columns, sort]);

  const [measureRef, size] = useMeasure({ enabled: height === undefined });
  const headerRows = hideHeader ? 0 : 2;
  const bodyRows = Math.max(1, height ?? (size.height > 0 ? size.height - headerRows : Math.min(sorted.length || 1, vp.rows)));
  const cursor = useCursor({ count: sorted.length, onChange: (i) => onHighlight?.(sorted[i] as T, i) });
  const start = useWindowStart(sorted.length, bodyRows, cursor.index);
  const wheelSteps = useWheelSteps();

  const setSort = (next: SortState | null): void => {
    if (sortProp === undefined) setInnerSort(next);
    onSortChange?.(next);
  };
  const sortableCols = columns.filter((c) => c.sortable ?? true);
  const toggle = (key: string | number): void => {
    const next = new Set(selection);
    if (next.has(key)) next.delete(key);
    else {
      if (selectionMode === "single") next.clear();
      next.add(key);
    }
    if (selectedKeys === undefined) setInnerSel(next);
    onSelectionChange?.(next);
  };

  useInput(
    (e) => {
      const plain = !e.ctrl && !e.meta && !e.alt;
      if (handleListKey(e, cursor, Math.max(1, bodyRows - 1), sorted.length)) e.stopPropagation();
      else if (e.key === "return" && cursor.index >= 0) {
        onSelect?.(sorted[cursor.index] as T, cursor.index);
        e.stopPropagation();
      } else if (e.key === "space" && selectionMode !== "none" && cursor.index >= 0) {
        toggle(getRowKey(sorted[cursor.index] as T, cursor.index));
        e.stopPropagation();
      } else if (sortable && plain && e.key === "s" && sortableCols.length > 0) {
        if (e.shift) {
          if (sort) setSort({ ...sort, direction: sort.direction === "asc" ? "desc" : "asc" });
        } else {
          const i = sort ? sortableCols.findIndex((c) => c.key === sort.column) : -1;
          const next = sortableCols[i + 1];
          setSort(next ? { column: next.key, direction: "asc" } : null);
        }
        e.stopPropagation();
      } else if (sortable && plain && /^[1-9]$/.test(e.input)) {
        const col = columns[Number(e.input) - 1];
        if (col && (col.sortable ?? true)) {
          setSort(sort?.column === col.key ? { column: col.key, direction: sort.direction === "asc" ? "desc" : "asc" } : { column: col.key, direction: "asc" });
          e.stopPropagation();
        }
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

  const marker = selectionMode === "multiple" ? 4 : 2;
  const cellProps = (c: TableColumn<T>) => ({
    width: c.width,
    flexGrow: c.width === undefined ? (c.grow ?? 1) : 0,
    flexShrink: c.width === undefined ? 1 : 0,
    flexBasis: c.width === undefined ? 0 : undefined,
    minWidth: c.minWidth ?? 1,
  });

  const overflowing = scrollbar && sorted.length > bodyRows;
  const ruleColor = parseColor(theme.border);
  const paintRule = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      for (let x = 0; x < r.width; x++) buf.setCell(r.x + x, r.y, "─", ruleColor, 0);
    },
    [ruleColor],
  );

  const outer = mergeStyleProps(theme, className, style, rest);
  const fill = height === undefined;
  const visible = sorted.slice(start, start + bodyRows);
  return (
    <TxBox
      ref={measureRef}
      flexDirection="column"
      flexGrow={fill ? 1 : undefined}
      flexBasis={fill ? 0 : undefined}
      flexShrink={fill ? 1 : 0}
      minHeight={headerRows + 1}
      {...outer}
      height={height === undefined ? undefined : height + headerRows}
      overflow="hidden"
    >
      {hideHeader ? null : (
        <>
          <TxBox flexDirection="row" height={1} flexShrink={0} columnGap={columnGap} paddingLeft={marker} paddingRight={overflowing ? 2 : 0}>
            {columns.map((c) => {
              const on = sort?.column === c.key;
              const arrow = on ? (sort?.direction === "asc" ? " ↑" : " ↓") : "";
              return (
                <Text key={c.key} {...cellProps(c)} color={on ? theme.fg : theme.muted} bold wrap="truncate-end" align={c.align}>
                  {(c.header ?? c.key) + arrow}
                </Text>
              );
            })}
          </TxBox>
          <TxBox height={1} flexShrink={0} customPaint={paintRule} />
        </>
      )}
      <TxBox flexDirection="row" flexGrow={1} flexShrink={1} minHeight={0}>
        <TxBox flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
          {sorted.length === 0 ? (
            <Text color={theme.subtle} italic wrap="nowrap">
              {`  ${emptyText}`}
            </Text>
          ) : null}
          {visible.map((row, i) => {
            const index = start + i;
            const key = getRowKey(row, index);
            const hi = index === cursor.index;
            const sel = selection.has(key);
            return (
              <TxBox key={key} flexDirection="row" height={1} flexShrink={0} bg={hi && active ? theme.selection : undefined}>
                <Text color={hi ? theme.accent : theme.subtle} wrap="nowrap" flexShrink={0} width={marker}>
                  {hi ? "›" : " "}
                  {selectionMode === "multiple" ? <Text color={sel ? theme.accent : theme.subtle}>{sel ? " ✓" : " ·"}</Text> : null}
                </Text>
                <TxBox flexDirection="row" flexGrow={1} flexShrink={1} columnGap={columnGap} minWidth={0}>
                  {columns.map((c) => (
                    <Fragment key={c.key}>
                      {c.render ? (
                        <TxBox {...cellProps(c)} flexDirection="row" height={1} overflow="hidden" justifyContent={c.align === "right" ? "flex-end" : c.align === "center" ? "center" : "flex-start"}>
                          {c.render(row, { highlighted: hi, selected: sel })}
                        </TxBox>
                      ) : (
                        <Text
                          {...cellProps(c)}
                          color={c.color ?? (sel || hi ? theme.fg : theme.muted)}
                          bold={sel && selectionMode === "single"}
                          wrap="truncate-end"
                          align={c.align}
                        >
                          {String(cellValue(c, row) ?? "")}
                        </Text>
                      )}
                    </Fragment>
                  ))}
                </TxBox>
              </TxBox>
            );
          })}
        </TxBox>
        {scrollbar ? <Scrollbar total={sorted.length} visible={bodyRows} start={start} active={active} gap={1} /> : null}
      </TxBox>
    </TxBox>
  );
}
