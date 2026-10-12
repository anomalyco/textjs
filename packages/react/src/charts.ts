/**
 * Pure chart rasterizers: eighth-block sparklines and braille line plots.
 */

/** Bottom-aligned eighth blocks: index `n` fills `n/8` of a cell. */
export const SPARK_BLOCKS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

export interface Range {
  min: number;
  max: number;
}

/** Data range with optional fixed bounds (degenerate ranges widen to ±1). */
export function dataRange(values: Iterable<number>, min?: number, max?: number): Range {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo === Infinity) {
    lo = 0;
    hi = 1;
  }
  const outMin = min ?? lo;
  let outMax = max ?? hi;
  if (outMax <= outMin) outMax = outMin + 1;
  return { min: outMin, max: outMax };
}

/** One-row sparkline string: `sparkline([1, 5, 3])` → `"▁█▄"`. */
export function sparkline(values: readonly number[], options: { min?: number; max?: number } = {}): string {
  const { min, max } = dataRange(values, options.min ?? 0, options.max);
  let s = "";
  for (const v of values) {
    const t = Number.isFinite(v) ? Math.max(0, Math.min(1, (v - min) / (max - min))) : 0;
    s += SPARK_BLOCKS[Math.round(t * 8)] as string;
  }
  return s;
}

/** Braille dot bit for `(dx, dy)` within a 2×4 cell. */
const BRAILLE_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
] as const;

/** Quadrant bit for `(dx, dy)` within a 2×2 cell. */
const QUADRANT_BITS = [
  [1, 2],
  [4, 8],
] as const;

/** Quadrant block characters indexed by bitmask (TL=1, TR=2, BL=4, BR=8). */
export const QUADRANTS = [" ", "▘", "▝", "▀", "▖", "▌", "▞", "▛", "▗", "▚", "▐", "▜", "▄", "▙", "▟", "█"] as const;

/**
 * `"braille"`: 2×4 dots per cell (finest; ideal in terminals, but Menlo — the
 * macOS DevTools console font — lacks braille, so the fallback glyphs are wider
 * than a cell). `"quadrant"`: 2×2 block elements, cell-exact in every monospace font.
 */
export type DotMarker = "braille" | "quadrant";

/** A dot canvas that rasterizes to braille or quadrant-block characters. */
export class DotCanvas {
  readonly bits: Uint8Array;
  /** Series index that last drew each cell (`-1` = empty). */
  readonly owner: Int16Array;
  readonly dotWidth: number;
  readonly dotHeight: number;
  private readonly rowsPerCell: number;

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly marker: DotMarker = "braille",
  ) {
    this.bits = new Uint8Array(cols * rows);
    this.owner = new Int16Array(cols * rows).fill(-1);
    this.rowsPerCell = marker === "braille" ? 4 : 2;
    this.dotWidth = cols * 2;
    this.dotHeight = rows * this.rowsPerCell;
  }

  set(x: number, y: number, series = 0): void {
    if (x < 0 || y < 0 || x >= this.dotWidth || y >= this.dotHeight) return;
    const k = this.rowsPerCell;
    const cy = Math.floor(y / k);
    const i = cy * this.cols + (x >> 1);
    const bit = this.marker === "braille" ? BRAILLE_BITS[y & 3]![x & 1]! : QUADRANT_BITS[y & 1]![x & 1]!;
    this.bits[i] = (this.bits[i] as number) | bit;
    this.owner[i] = series;
  }

  /** Bresenham line in dot space. */
  line(x0: number, y0: number, x1: number, y1: number, series = 0): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, series);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Plot `values` across the full width, scaled into `range`. */
  plot(values: readonly number[], range: Range, series = 0): void {
    const n = values.length;
    if (n === 0) return;
    const W = this.dotWidth - 1;
    const H = this.dotHeight - 1;
    const yOf = (v: number): number => H - Math.max(0, Math.min(1, (v - range.min) / (range.max - range.min))) * H;
    if (n === 1) {
      this.set(0, Math.round(yOf(values[0] as number)), series);
      return;
    }
    let px = 0;
    let py = yOf(values[0] as number);
    for (let i = 1; i < n; i++) {
      const v = values[i] as number;
      if (!Number.isFinite(v)) continue;
      const x = (i / (n - 1)) * W;
      const y = yOf(v);
      this.line(px, py, x, y, series);
      px = x;
      py = y;
    }
  }

  char(cx: number, cy: number): string {
    const b = this.bits[cy * this.cols + cx] as number;
    if (b === 0) return " ";
    return this.marker === "braille" ? String.fromCharCode(0x2800 + b) : (QUADRANTS[b] as string);
  }

  toString(): string {
    const lines: string[] = [];
    for (let y = 0; y < this.rows; y++) {
      let s = "";
      for (let x = 0; x < this.cols; x++) s += this.char(x, y);
      lines.push(s);
    }
    return lines.join("\n");
  }
}

/** Compact axis labels: `1234` → `1.2k`, `0.5` → `0.5`. */
export function formatCompact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${+(v / 1e9).toFixed(1)}b`;
  if (a >= 1e6) return `${+(v / 1e6).toFixed(1)}m`;
  if (a >= 1e4) return `${Math.round(v / 1e3)}k`;
  if (a >= 1e3) return `${+(v / 1e3).toFixed(1)}k`;
  if (a >= 100 || Number.isInteger(v)) return String(Math.round(v));
  return String(+v.toFixed(a >= 10 ? 1 : 2));
}

/** A 2×4 braille `DotCanvas`. */
export class BrailleCanvas extends DotCanvas {
  constructor(cols: number, rows: number) {
    super(cols, rows, "braille");
  }
}
