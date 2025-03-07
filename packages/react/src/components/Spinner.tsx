import { useEffect, useState, type ReactNode } from "react";
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

/** An activity indicator. Its timer stops whenever console output is paused. */
export function Spinner({ variant = "dots", label, color, labelColor, paused = false }: SpinnerProps): ReactNode {
  const theme = useTheme();
  const vp = useViewport();
  const spec = SPINNERS[variant];
  const [frame, setFrame] = useState(0);
  const running = !paused && !vp.paused;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % spec.frames.length), spec.interval);
    return () => clearInterval(id);
  }, [running, spec]);
  return (
    <Text wrap="nowrap" flexShrink={0}>
      <Text color={color ?? theme.accent}>{spec.frames[frame % spec.frames.length]}</Text>
      {label !== undefined ? <Text color={labelColor ?? theme.muted}> {label}</Text> : null}
    </Text>
  );
}
