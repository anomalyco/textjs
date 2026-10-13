import { Children, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { parseColor, type CellBuffer, type ComputedRect, type Length } from "@textjs/core";
import { createScope, ScopeContext, useRuntime } from "../context";
import { useFocus } from "../focus";
import { useInput } from "../hooks";
import { FOCUSED_INPUT_PRIORITY } from "../input-manager";
import { TxBox } from "../host";
import { useTheme } from "../theme";
import { Box, type BoxProps } from "./Box";
import { Divider } from "./primitives";
import { useMeasure } from "../hooks/measure";

/** Center children on both axes, filling the parent. */
export function Center({ children, ...box }: BoxProps): ReactNode {
  return (
    <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" {...box}>
      {children}
    </Box>
  );
}

export interface StackProps extends Omit<BoxProps, "flexDirection"> {
  /** `"column"` (default) or `"row"`. */
  direction?: "column" | "row";
  /** Cells between children (default `0`). */
  gap?: Length;
  /** Draw a divider between children. */
  divider?: boolean;
}

/** Children in a row or column with a gap and optional dividers. */
export function Stack({ direction = "column", gap = 0, divider = false, children, ...box }: StackProps): ReactNode {
  const items = Children.toArray(children);
  return (
    <Box flexDirection={direction} gap={gap} {...box}>
      {divider
        ? items.flatMap((c, i) => (i === 0 ? [c] : [<Divider key={`divider-${i}`} vertical={direction === "row"} />, c]))
        : children}
    </Box>
  );
}

export interface GridProps extends Omit<BoxProps, "flexDirection"> {
  /** Columns per row. */
  columns: number;
  gap?: Length;
  rowGap?: Length;
  columnGap?: Length;
}

/** Equal-width columns; children flow left to right, top to bottom. */
export function Grid({ columns, gap, rowGap, columnGap, children, ...box }: GridProps): ReactNode {
  const items = Children.toArray(children);
  const n = Math.max(1, Math.floor(columns));
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));
  return (
    <Box flexDirection="column" rowGap={rowGap ?? gap} {...box}>
      {rows.map((row, r) => (
        <Box key={r} flexDirection="row" columnGap={columnGap ?? gap} flexShrink={0}>
          {Array.from({ length: n }, (_, c) => (
            <Box key={c} flexDirection="column" flexGrow={1} flexBasis={0} minWidth={0}>
              {row[c] ?? null}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

export interface SplitPaneProps extends Omit<BoxProps, "flexDirection" | "children"> {
  /** `"row"` (side by side, default) or `"column"` (stacked). */
  direction?: "row" | "column";
  /** Exactly two panes. */
  children: [ReactNode, ReactNode];
  /** Controlled first-pane size: a fraction (`0.3`) or cells (`24`). */
  size?: number;
  /** Initial first-pane size (default `0.5`). */
  defaultSize?: number;
  onSizeChange?: (size: number) => void;
  /** Smallest pane size in cells (default `4`). */
  minSize?: number;
  /** Make the divider focusable: arrows resize by one cell (Shift: five). */
  resizable?: boolean;
  focused?: boolean;
  autoFocus?: boolean;
  id?: string;
}

/** Two panes and a divider; resizable from the keyboard when focused. */
export function SplitPane({
  direction = "row",
  children,
  size,
  defaultSize = 0.5,
  onSizeChange,
  minSize = 4,
  resizable = false,
  focused,
  autoFocus,
  id,
  ...box
}: SplitPaneProps): ReactNode {
  const theme = useTheme();
  const [inner, setInner] = useState(defaultSize);
  const current = size ?? inner;
  const focus = useFocus({ id, autoFocus, focused, isActive: resizable });
  const active = resizable && (focused ?? focus.isFocused);
  const row = direction === "row";
  const [measureRef, rect] = useMeasure();
  const total = row ? rect.contentWidth : rect.contentHeight;
  const cells = current > 0 && current <= 1 ? Math.round(current * total) : Math.round(current);
  const clamped = total > 0 ? Math.max(minSize, Math.min(total - 1 - minSize, cells)) : cells;

  const set = (nextCells: number): void => {
    if (total <= 0) return;
    const c = Math.max(minSize, Math.min(total - 1 - minSize, nextCells));
    const next = current > 0 && current <= 1 ? c / total : c;
    if (size === undefined) setInner(next);
    onSizeChange?.(next);
  };
  useInput(
    (e) => {
      const step = e.shift ? 5 : 1;
      const dec = row ? e.key === "left" : e.key === "up";
      const inc = row ? e.key === "right" : e.key === "down";
      if (!dec && !inc) return;
      e.stopPropagation();
      set(clamped + (inc ? step : -step));
    },
    { isActive: active, priority: FOCUSED_INPUT_PRIORITY },
  );

  const lineColor = parseColor(active ? theme.borderFocus : theme.border);
  const paintDivider = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      if (row) for (let y = 0; y < r.height; y++) buf.setCell(r.x, r.y + y, active ? "┃" : "│", lineColor, 0);
      else for (let x = 0; x < r.width; x++) buf.setCell(r.x + x, r.y, active ? "━" : "─", lineColor, 0);
    },
    [row, active, lineColor],
  );
  const first = total > 0 ? clamped : undefined;
  return (
    <Box ref={measureRef} flexDirection={row ? "row" : "column"} flexGrow={1} {...box}>
      <TxBox
        flexDirection="column"
        flexShrink={0}
        flexGrow={first === undefined ? 1 : 0}
        flexBasis={first === undefined ? 0 : undefined}
        width={row ? first : undefined}
        height={row ? undefined : first}
        minWidth={0}
        minHeight={0}
        overflow="hidden"
      >
        {children[0]}
      </TxBox>
      <TxBox width={row ? 1 : undefined} height={row ? undefined : 1} flexShrink={0} alignSelf="stretch" customPaint={paintDivider} />
      <TxBox flexDirection="column" flexGrow={1} flexShrink={1} flexBasis={0} minWidth={0} minHeight={0} overflow="hidden">
        {children[1]}
      </TxBox>
    </Box>
  );
}

export interface FocusScopeProps {
  /** Confine Tab order and `useInput` to this subtree while `true` (default `true`). */
  trap?: boolean;
  children?: ReactNode;
}

/** A focus / input boundary. With `trap`, it behaves like an invisible `<Modal>`. */
export function FocusScope({ trap = true, children }: FocusScopeProps): ReactNode {
  const rt = useRuntime();
  const parent = useContext(ScopeContext);
  const scope = useMemo(() => createScope(parent, trap), [parent, trap]);
  useLayoutEffect(() => (trap ? rt.focus.pushTrap(scope) : undefined), [rt, scope, trap]);
  return <ScopeContext value={scope}>{children}</ScopeContext>;
}
