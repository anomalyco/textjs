import { useCallback, useState, type ReactNode } from "react";
import { parseColor, type CellBuffer, type ColorInput, type ComputedRect } from "@textjs/core";
import { TxBox } from "../host";
import { useAnimationFrame } from "../hooks/timers";
import { resolveColor, useTheme } from "../theme";
import { Text } from "./Text";

/** Left-aligned eighth blocks: index `n` fills `n/8` of a cell. */
export const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"] as const;

export type ProgressBarVariant = "block" | "line" | "thin";

export interface ProgressBarProps {
  /** Progress `0..max`. Omit for an indeterminate (animated) bar. */
  value?: number;
  /** Default `1`. */
  max?: number;
  /** Bar width in cells (default: fill the row). */
  width?: number;
  /** `"block"` (smooth ▉ eighths, default), `"line"` (━ on ─) or `"thin"` (▬ dots). */
  variant?: ProgressBarVariant;
  /** Leading label. */
  label?: ReactNode;
  /** Show `42%` after the bar (default `true` for determinate bars). */
  showValue?: boolean;
  /** Custom trailing value text. */
  formatValue?: (value: number, max: number) => string;
  color?: ColorInput;
  trackColor?: ColorInput;
}

function paintBar(
  buf: CellBuffer,
  r: Readonly<ComputedRect>,
  variant: ProgressBarVariant,
  from: number,
  to: number,
  fill: number,
  track: number,
): void {
  const W = r.width;
  if (W <= 0) return;
  const y = r.y;
  if (variant === "block") {
    const a = from * W;
    const b = to * W;
    for (let x = 0; x < W; x++) {
      const cover = Math.max(0, Math.min(x + 1, b) - Math.max(x, a));
      if (cover >= 0.999) buf.setCell(r.x + x, y, "█", fill, 0);
      else if (cover <= 0.001) buf.setCell(r.x + x, y, "░", track, 0);
      else if (Math.max(x, a) === x) {
        const eighth = Math.max(1, Math.round(cover * 8));
        buf.setCell(r.x + x, y, EIGHTHS[eighth] as string, fill, track);
      } else {
        // Leading partial (indeterminate segment start): right-aligned fill isn't
        // available in block elements, so round to the nearer whole cell.
        buf.setCell(r.x + x, y, cover >= 0.5 ? "█" : "░", cover >= 0.5 ? fill : track, 0);
      }
    }
    return;
  }
  const on = variant === "line" ? "━" : "▬";
  const off = variant === "line" ? "─" : "▬";
  const a = Math.round(from * W);
  const b = Math.round(to * W);
  for (let x = 0; x < W; x++) {
    const filled = x >= a && x < b;
    buf.setCell(r.x + x, y, filled ? on : off, filled ? fill : track, 0);
  }
}

/** A smooth progress bar with eighth-cell precision, or an indeterminate sweep. */
export function ProgressBar({
  value,
  max = 1,
  width,
  variant = "block",
  label,
  showValue,
  formatValue,
  color,
  trackColor,
}: ProgressBarProps): ReactNode {
  const theme = useTheme();
  const indeterminate = value === undefined || !Number.isFinite(value);
  const ratio = indeterminate ? 0 : Math.max(0, Math.min(1, (value as number) / (max || 1)));
  const fill = parseColor(resolveColor(theme, color ?? theme.accent));
  const track = parseColor(resolveColor(theme, trackColor ?? theme.border));
  const [phase, setPhase] = useState(0);
  useAnimationFrame((dt) => setPhase((p) => (p + dt / 1400) % 1), { isActive: indeterminate });
  const seg = 0.28;
  const head = phase * (1 + seg);
  const from = indeterminate ? Math.max(0, head - seg) : 0;
  const to = indeterminate ? Math.min(1, head) : ratio;
  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => paintBar(buf, r, variant, from, to, fill, track),
    [variant, from, to, fill, track],
  );
  const showVal = showValue ?? !indeterminate;
  const valueText = indeterminate ? "" : formatValue ? formatValue(value as number, max) : `${Math.round(ratio * 100)}%`;
  return (
    <TxBox flexDirection="row" height={1} maxHeight={1} flexShrink={0} flexGrow={width === undefined ? 1 : 0} alignSelf="stretch">
      {label !== undefined ? (
        <Text color={theme.muted} wrap="nowrap" flexShrink={0}>
          {label}{" "}
        </Text>
      ) : null}
      <TxBox
        height={1}
        width={width}
        flexGrow={width === undefined ? 1 : 0}
        flexShrink={width === undefined ? 1 : 0}
        minWidth={1}
        customPaint={paint}
      />
      {showVal ? (
        <Text color={theme.muted} wrap="nowrap" flexShrink={0}>
          {` ${formatValue ? valueText : valueText.padStart(4)}`}
        </Text>
      ) : null}
    </TxBox>
  );
}
