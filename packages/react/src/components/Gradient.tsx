import { useMemo, type ReactNode } from "react";
import { mixColors, parseColor, segmentGraphemes, stringWidth, type ColorInput, type LayoutProps, type PackedColor } from "@textjs/core";
import { resolveColor, useTheme } from "../theme";
import { Box } from "./Box";
import { Text } from "./Text";

/** Named gradients tuned for dark consoles. */
export const GRADIENTS = Object.freeze({
  geist: ["#ff4d8d", "#c472fb", "#3291ff"],
  dusk: ["#fab283", "#e06c75", "#9d7cd8"],
  ocean: ["#5c9cf5", "#56b6c2", "#7fd88f"],
  mono: ["#ededed", "#6b6b70"],
  ember: ["#f5a524", "#e5484d"],
} as const);

export type GradientName = keyof typeof GRADIENTS;

/** Sample a multi-stop gradient at `t` (0..1). */
export function sampleGradient(stops: readonly PackedColor[], t: number): PackedColor {
  if (stops.length === 0) return 0;
  if (stops.length === 1) return stops[0] as PackedColor;
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return mixColors(stops[i] as PackedColor, stops[i + 1] as PackedColor, x - i);
}

export interface GradientProps extends LayoutProps {
  /** A string; `\n` separates lines (all lines share one horizontal gradient). */
  children: string;
  /** Color stops (theme tokens allowed) or a named gradient (default `"geist"`). */
  colors?: readonly ColorInput[] | GradientName;
  bold?: boolean;
}

/** Text with a horizontal color gradient, per cell. Pairs well with `<AsciiFont>` rows. */
export function Gradient({ children, colors = "geist", bold, ...layout }: GradientProps): ReactNode {
  const theme = useTheme();
  const stopsKey = typeof colors === "string" ? colors : colors.join("|");
  const lines = useMemo(() => {
    const raw = typeof colors === "string" ? GRADIENTS[colors] : colors;
    const stops = raw.map((c) => parseColor(resolveColor(theme, c)));
    const rows = children.split("\n");
    const width = Math.max(1, ...rows.map((r) => stringWidth(r)));
    return rows.map((row) => {
      const out: Array<{ text: string; fg: PackedColor }> = [];
      let col = 0;
      for (const g of segmentGraphemes(row)) {
        const fg = sampleGradient(stops, width <= 1 ? 0 : col / (width - 1));
        col += g.width;
        out.push({ text: g.grapheme, fg });
      }
      return out;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, stopsKey, theme]);
  return (
    <Box flexDirection="column" flexShrink={0} {...layout}>
      {lines.map((parts, i) => (
        <Text key={i} wrap="nowrap" bold={bold}>
          {parts.length === 0 ? " " : parts.map((p, j) => (p.text === " " ? " " : <Text key={j} fg={p.fg}>{p.text}</Text>))}
        </Text>
      ))}
    </Box>
  );
}
