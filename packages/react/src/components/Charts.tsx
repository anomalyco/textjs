import { Fragment, useCallback, useMemo, type ReactNode } from "react";
import { parseColor, stringWidth, type CellBuffer, type ColorInput, type ComputedRect } from "@textjs/core";
import { DotCanvas, dataRange, formatCompact, SPARK_BLOCKS, type DotMarker } from "../charts";
import { TxBox } from "../host";
import { resolveColor, useTheme, type TextTheme } from "../theme";
import { EIGHTHS } from "./ProgressBar";
import { Text } from "./Text";

function color(theme: TextTheme, c: ColorInput | undefined, fallback: string): number {
  return parseColor(resolveColor(theme, c ?? fallback));
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

export interface SparklineProps {
  data: readonly number[];
  /** Width in cells (default: fill). The most recent `width` points are shown. */
  width?: number;
  /** Height in rows (default `1`). Taller sparklines render as a filled area. */
  height?: number;
  /** Lower bound (default `0`). */
  min?: number;
  /** Upper bound (default: the data maximum). */
  max?: number;
  color?: ColorInput;
}

/** Eighth-block sparkline / area chart that fills its box. */
export function Sparkline({ data, width, height = 1, min = 0, max, color: c }: SparklineProps): ReactNode {
  const theme = useTheme();
  const fg = color(theme, c, theme.accent);
  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      const W = r.width;
      const H = r.height;
      if (W <= 0 || H <= 0) return;
      const values = data.length > W ? data.slice(data.length - W) : data;
      const range = dataRange(values, min, max);
      for (let i = 0; i < values.length; i++) {
        const v = values[i] as number;
        const t = Number.isFinite(v) ? Math.max(0, Math.min(1, (v - range.min) / (range.max - range.min))) : 0;
        let eighths = Math.round(t * H * 8);
        if (eighths === 0 && t > 0) eighths = 1;
        for (let row = 0; row < H; row++) {
          const level = Math.max(0, Math.min(8, eighths - row * 8));
          if (level === 0) break;
          buf.setCell(r.x + i, r.y + H - 1 - row, SPARK_BLOCKS[level] as string, fg, 0);
        }
      }
    },
    [data, min, max, fg],
  );
  return (
    <TxBox
      height={height}
      maxHeight={height}
      width={width}
      flexGrow={width === undefined ? 1 : 0}
      flexShrink={width === undefined ? 1 : 0}
      alignSelf="stretch"
      customPaint={paint}
    />
  );
}

// ---------------------------------------------------------------------------
// BarChart
// ---------------------------------------------------------------------------

export interface BarDatum {
  label: string;
  value: number;
  color?: ColorInput;
}

export interface BarChartProps {
  data: readonly BarDatum[];
  /** Scale maximum (default: the largest value). */
  max?: number;
  /** Show values after bars (default `true`). */
  showValues?: boolean;
  formatValue?: (value: number) => string;
  color?: ColorInput;
  /** Blank rows between bars (default `0`). */
  gap?: number;
}

/** Horizontal bars with eighth-cell precision, aligned labels and values. */
export function BarChart({ data, max, showValues = true, formatValue = formatCompact, color: c, gap = 0 }: BarChartProps): ReactNode {
  const theme = useTheme();
  const top = max ?? Math.max(0, ...data.map((d) => d.value));
  const labelW = Math.max(0, ...data.map((d) => stringWidth(d.label)));
  const values = data.map((d) => formatValue(d.value));
  const valueW = showValues ? Math.max(0, ...values.map((v) => stringWidth(v))) : 0;
  return (
    <TxBox flexDirection="column" flexShrink={0} rowGap={gap}>
      {data.map((d, i) => (
        <TxBox key={`${d.label}:${i}`} flexDirection="row" height={1} flexShrink={0}>
          <Text color={theme.muted} wrap="nowrap" flexShrink={0} width={labelW + 1}>
            {d.label}
          </Text>
          <Bar ratio={top > 0 ? d.value / top : 0} fg={color(theme, d.color ?? c, theme.accent)} />
          {showValues ? (
            <Text color={theme.subtle} wrap="nowrap" flexShrink={0} width={valueW + 1} align="right">
              {values[i]}
            </Text>
          ) : null}
        </TxBox>
      ))}
    </TxBox>
  );
}

function Bar({ ratio, fg }: { ratio: number; fg: number }): ReactNode {
  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      const cells = Math.max(0, Math.min(1, ratio)) * r.width;
      const full = Math.floor(cells);
      for (let x = 0; x < full; x++) buf.setCell(r.x + x, r.y, "█", fg, 0);
      const part = Math.round((cells - full) * 8);
      if (part > 0 && full < r.width) buf.setCell(r.x + full, r.y, EIGHTHS[part] as string, fg, 0);
    },
    [ratio, fg],
  );
  return <TxBox height={1} flexGrow={1} flexShrink={1} minWidth={1} customPaint={paint} />;
}

// ---------------------------------------------------------------------------
// LineChart
// ---------------------------------------------------------------------------

export interface LineSeries {
  data: readonly number[];
  label?: string;
  color?: ColorInput;
}

export interface LineChartProps {
  /** One or more series (or pass `data` for a single series). */
  series?: readonly LineSeries[];
  data?: readonly number[];
  /** Plot height in rows (default `8`). */
  height?: number;
  /** Plot width in cells (default: fill). */
  width?: number;
  min?: number;
  max?: number;
  /** Show the y-axis with min / max labels (default `true`). */
  axis?: boolean;
  formatValue?: (value: number) => string;
  /** Show a legend for labeled series (default: when more than one series is labeled). */
  legend?: boolean;
  color?: ColorInput;
  /**
   * `"quadrant"` (default): 2×2 block dots, cell-exact in every console font.
   * `"braille"`: 2×4 dots, finer; best in terminals (Menlo lacks braille, so
   * DevTools draws it with a wider fallback font).
   */
  marker?: DotMarker;
}

const SERIES_TOKENS = ["accent", "success", "warning", "info", "danger"] as const;

/** Dot-matrix line plot (quadrant or braille dots) with an optional y-axis and legend. */
export function LineChart({
  series,
  data,
  height = 8,
  width,
  min,
  max,
  axis = true,
  formatValue = formatCompact,
  legend,
  color: c,
  marker = "quadrant",
}: LineChartProps): ReactNode {
  const theme = useTheme();
  const list = useMemo<readonly LineSeries[]>(() => series ?? (data ? [{ data, color: c }] : []), [series, data, c]);
  const range = useMemo(() => dataRange(list.flatMap((s) => s.data as number[]), min, max), [list, min, max]);
  const colors = list.map((s, i) => color(theme, s.color, theme[SERIES_TOKENS[i % SERIES_TOKENS.length] as (typeof SERIES_TOKENS)[number]]));
  const colorKey = colors.join(",");
  const axisColor = parseColor(theme.border);
  const hi = formatValue(range.max);
  const lo = formatValue(range.min);
  const labelW = axis ? Math.max(stringWidth(hi), stringWidth(lo)) : 0;

  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      const W = r.width;
      const H = r.height;
      if (W <= 0 || H <= 0) return;
      const canvas = new DotCanvas(W, H, marker);
      list.forEach((s, i) => canvas.plot(s.data, range, i));
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (canvas.bits[i] === 0) continue;
          buf.setCell(r.x + x, r.y + y, canvas.char(x, y), colors[canvas.owner[i] as number] ?? colors[0] ?? 0, 0);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, range, colorKey, marker],
  );

  const axisPaint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      for (let y = 0; y < r.height; y++) buf.setCell(r.x, r.y + y, y === 0 || y === r.height - 1 ? "┤" : "│", axisColor, 0);
    },
    [axisColor],
  );

  const labeled = list.filter((s) => s.label);
  const showLegend = legend ?? labeled.length > 1;
  return (
    <TxBox flexDirection="column" flexShrink={0} flexGrow={width === undefined ? 1 : 0} maxHeight={height + (showLegend ? 1 : 0)} alignSelf="stretch">
      <TxBox flexDirection="row" height={height} flexShrink={0}>
        {axis ? (
          <>
            <TxBox flexDirection="column" width={labelW} flexShrink={0} height={height}>
              <Text color={theme.subtle} wrap="nowrap" align="right">
                {hi}
              </Text>
              <TxBox flexGrow={1} />
              <Text color={theme.subtle} wrap="nowrap" align="right">
                {lo}
              </Text>
            </TxBox>
            <TxBox width={1} marginLeft={1} flexShrink={0} height={height} customPaint={axisPaint} />
          </>
        ) : null}
        <TxBox height={height} width={width} flexGrow={width === undefined ? 1 : 0} flexShrink={width === undefined ? 1 : 0} customPaint={paint} />
      </TxBox>
      {showLegend ? (
        <TxBox flexDirection="row" height={1} flexShrink={0} paddingLeft={axis ? labelW + 2 : 0} columnGap={2}>
          {list.map((s, i) =>
            s.label ? (
              <Fragment key={`${s.label}:${i}`}>
                <Text wrap="nowrap" flexShrink={0}>
                  <Text fg={colors[i]}>{"━ "}</Text>
                  <Text color={theme.muted}>{s.label}</Text>
                </Text>
              </Fragment>
            ) : null,
          )}
        </TxBox>
      ) : null}
    </TxBox>
  );
}
