/**
 * Shared windowing, cursor and scrollbar helpers for `<List>`, `<Table>` and `<Tree>`.
 */

import { useCallback, useRef, useState, type ReactNode } from "react";
import { parseColor, type CellBuffer, type ComputedRect } from "@textjs/core";
import { TxBox } from "../host";
import type { KeyEvent } from "../input-manager";
import { useTheme } from "../theme";

/** Keep `index` inside a `rows`-tall window over `count` items; returns the first visible index. */
export function useWindowStart(count: number, rows: number, index: number): number {
  const ref = useRef(0);
  let start = ref.current;
  if (index >= 0) {
    if (index < start) start = index;
    else if (index >= start + rows) start = index - rows + 1;
  }
  start = Math.max(0, Math.min(start, count - rows));
  ref.current = start;
  return start;
}

export interface CursorOptions {
  count: number;
  index?: number;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  isDisabled?: (index: number) => boolean;
}

export interface Cursor {
  index: number;
  /** Move to `to`, skipping disabled items in the direction of travel. */
  moveTo(to: number): void;
  moveBy(delta: number): void;
}

/** Controlled / uncontrolled highlighted index that skips disabled items. */
export function useCursor({ count, index, defaultIndex = 0, onChange, isDisabled }: CursorOptions): Cursor {
  const [inner, setInner] = useState(defaultIndex);
  const raw = index ?? inner;
  const cur = count === 0 ? -1 : Math.max(0, Math.min(count - 1, raw));
  const latest = useRef({ cur, count, isDisabled, onChange, controlled: index !== undefined });
  latest.current = { cur, count, isDisabled, onChange, controlled: index !== undefined };
  const moveTo = useCallback((to: number) => {
    const { cur: from, count: n, isDisabled: disabled, onChange: change, controlled } = latest.current;
    if (n === 0) return;
    const clamped = Math.max(0, Math.min(n - 1, to));
    const dir = clamped >= from ? 1 : -1;
    let next = clamped;
    if (disabled) {
      while (next >= 0 && next < n && disabled(next)) next += dir;
      if (next < 0 || next >= n) {
        next = clamped;
        while (next >= 0 && next < n && disabled(next)) next -= dir;
      }
      if (next < 0 || next >= n) return;
    }
    if (next === from) return;
    latest.current.cur = next;
    if (!controlled) setInner(next);
    change?.(next);
  }, []);
  const moveBy = useCallback((delta: number) => moveTo(latest.current.cur + delta), [moveTo]);
  return { index: cur, moveTo, moveBy };
}

/**
 * Standard list navigation: ↑/↓ (and j/k unless `vim` is off), PgUp/PgDn,
 * Home/End (g/G), Ctrl+U/D half pages. Returns `true` when handled.
 */
export function handleListKey(e: KeyEvent, cursor: Cursor, page: number, count: number, vim = true): boolean {
  const plain = !e.ctrl && !e.meta && !e.alt;
  if (e.key === "up" || (vim && plain && e.key === "k") || (e.ctrl && e.key === "p")) cursor.moveBy(-1);
  else if (e.key === "down" || (vim && plain && e.key === "j") || (e.ctrl && e.key === "n")) cursor.moveBy(1);
  else if (e.key === "pageup") cursor.moveBy(-page);
  else if (e.key === "pagedown") cursor.moveBy(page);
  else if (e.ctrl && e.key === "u") cursor.moveBy(-Math.max(1, page >> 1));
  else if (e.ctrl && e.key === "d") cursor.moveBy(Math.max(1, page >> 1));
  else if (e.key === "home" || (vim && plain && e.key === "g" && !e.shift)) cursor.moveTo(0);
  else if (e.key === "end" || (vim && plain && e.key === "g" && e.shift)) cursor.moveTo(count - 1);
  else return false;
  return true;
}

/** Accumulate fractional wheel rows into whole steps. */
export function useWheelSteps(): (rows: number) => number {
  const rem = useRef(0);
  return useCallback((rows: number) => {
    const total = rem.current + rows;
    const whole = Math.trunc(total);
    rem.current = total - whole;
    return whole;
  }, []);
}

export interface ScrollbarProps {
  total: number;
  visible: number;
  start: number;
  active?: boolean;
  /** Blank cells before the bar (default `0`). */
  gap?: number;
}

/** A 1-column scrollbar for windowed content (renders nothing when everything fits). */
export function Scrollbar({ total, visible, start, active = false, gap = 0 }: ScrollbarProps): ReactNode {
  const theme = useTheme();
  const thumb = parseColor(active ? theme.muted : theme.subtle);
  const track = parseColor(theme.border);
  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      const h = r.height;
      if (h <= 0 || total <= visible) return;
      const max = total - visible;
      const size = Math.max(1, Math.round((h * visible) / total));
      const pos = max === 0 ? 0 : Math.round(((h - size) * Math.min(max, start)) / max);
      for (let y = 0; y < h; y++) {
        const on = y >= pos && y < pos + size;
        buf.setCell(r.x, r.y + y, on ? "┃" : "│", on ? thumb : track, 0);
      }
    },
    [total, visible, start, thumb, track],
  );
  if (total <= visible) return null;
  return <TxBox width={1} marginLeft={gap} flexShrink={0} alignSelf="stretch" customPaint={paint} />;
}
