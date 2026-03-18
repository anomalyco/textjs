import { memo, useEffect, useState, type NamedExoticComponent, type ReactNode } from "react";
import type { ColorInput } from "@textjs/core";
import { useViewport } from "../hooks";
import { useTheme } from "../theme";
import { Text } from "./Text";

export type SpinnerVariant = "dots" | "pulse" | "matrix" | "line";

export const SPINNERS: Readonly<Record<SpinnerVariant, { frames: readonly string[]; interval: number }>> = Object.freeze({
  dots: { frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], interval: 80 },
  pulse: { frames: ["▼", "▼", "▽", "▽"], interval: 220 },
  matrix: { frames: ["▪⬝⬝", "⬝▪⬝", "⬝⬝▪", "⬝▪⬝"], interval: 140 },
  line: { frames: ["─", "\\", "│", "/"], interval: 100 },
});

export interface SpinnerProps {
  variant?: SpinnerVariant;
  label?: ReactNode;
  color?: ColorInput;
  labelColor?: ColorInput;
  /** Stop animating (renders the first frame). */
  paused?: boolean;
}

interface SharedTicker {
  id: ReturnType<typeof setInterval>;
  listeners: Set<() => void>;
}

const sharedTickers = new Map<number, SharedTicker>();

function subscribeSpinnerTick(interval: number, listener: () => void): () => void {
  let ticker = sharedTickers.get(interval);
  if (ticker === undefined) {
    const listeners = new Set<() => void>();
    const id = setInterval(() => {
      for (const fn of listeners) fn();
    }, interval);
    ticker = { id, listeners };
    sharedTickers.set(interval, ticker);
  }
  ticker.listeners.add(listener);
  return () => {
    const cur = sharedTickers.get(interval);
    if (!cur) return;
    cur.listeners.delete(listener);
    if (cur.listeners.size === 0) {
      clearInterval(cur.id);
      sharedTickers.delete(interval);
    }
  };
}

/** Number of active shared interval timers (for tests). */
export function activeSpinnerTickerCount(): number {
  return sharedTickers.size;
}

/** An activity indicator. Its timer stops whenever console output is paused. */
export const Spinner: NamedExoticComponent<SpinnerProps> = memo(function Spinner({
  variant = "dots",
  label,
  color,
  labelColor,
  paused = false,
}: SpinnerProps): ReactNode {
  const theme = useTheme();
  const vp = useViewport();
  const spec = SPINNERS[variant];
  const [frame, setFrame] = useState(0);
  const running = !paused && !vp.paused;
  useEffect(() => {
    if (!running) return;
    const len = spec.frames.length;
    return subscribeSpinnerTick(spec.interval, () => {
      setFrame((f) => (f + 1) % len);
    });
  }, [running, spec]);
  return (
    <Text wrap="nowrap" flexShrink={0}>
      <Text color={color ?? theme.accent}>{spec.frames[frame % spec.frames.length]}</Text>
      {label !== undefined ? <Text color={labelColor ?? theme.muted}> {label}</Text> : null}
    </Text>
  );
});
