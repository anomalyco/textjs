import type { ReactNode } from "react";
import { Box, Image, KeyHint, Text, useViewport, type PixelData } from "@textjs/react";
import type { Hint } from "../store";

/** Same header and key row as the companion's own views. */
export function EggFrame({ crumb, hints = [], side, children }: { crumb: string; hints?: readonly Hint[]; side?: ReactNode; children: ReactNode }): ReactNode {
  return (
    <Box className="flex-col grow pt-1">
      <Box className="flex-row h-1 shrink-0 px-2 gap-1">
        <Text bold color="fg" wrap="nowrap">
          ▼ Text.js
        </Text>
        {crumb ? <Text color="subtle" wrap="nowrap">{` / ${crumb}`}</Text> : null}
        {side}
      </Box>
      <Box className="flex-col grow overflow-hidden px-2" paddingTop={1}>
        {children}
      </Box>
      <Box className="flex-row h-1 shrink-0 px-2 gap-3">
        {[...hints, { keys: "Esc", label: "back" }].map((h) => (
          <KeyHint key={h.keys} keys={h.keys} label={h.label} />
        ))}
      </Box>
    </Box>
  );
}

/**
 * Pixel art at 2× (2 × 2 pixels per pixel) when the console has room for it, else 1×.
 * `reserve` is the rows the rest of the column needs; `besides` the columns beside it.
 */
export function Pixels({ pixels, reserve = 0, besides = 0 }: { pixels: PixelData; reserve?: number; besides?: number }): ReactNode {
  const vp = useViewport();
  // Header, its gap, the key row and a row of air.
  const rows = vp.rows - 5 - reserve;
  const big = pixels.height <= rows && pixels.width * 2 + besides + 4 <= vp.cols;
  return <Image pixels={pixels} width={big ? pixels.width * 2 : pixels.width} />;
}

export type Fact = readonly [label: string, value: ReactNode, color?: string];

/** A two-column spec table: muted labels, plain values. */
export function Facts({ rows, gap = 3 }: { rows: readonly Fact[]; gap?: number }): ReactNode {
  const w = Math.max(...rows.map(([l]) => l.length)) + gap;
  return (
    <Box className="flex-col shrink-0">
      {rows.map(([label, value, color]) => (
        <Box key={label} className="flex-row h-1 shrink-0">
          <Text color="muted" wrap="nowrap" width={w} flexShrink={0}>
            {label}
          </Text>
          {typeof value === "string" ? (
            <Text color={color ?? "fg"} wrap="truncate-end">
              {value}
            </Text>
          ) : (
            value
          )}
        </Box>
      ))}
    </Box>
  );
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A small RGBA canvas for `<Image pixels>`: one pixel per column, two per row. */
export class Raster implements PixelData {
  readonly data: Uint8ClampedArray;
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }
  px(x: number, y: number, color: string | null): this {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return this;
    const i = (y * this.width + x) * 4;
    if (color === null) {
      this.data[i + 3] = 0;
      return this;
    }
    const [r, g, b] = rgb(color);
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = 255;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, color: string | null): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, color);
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string | null): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        // Slightly inside the edge, so the poles don't end in single-pixel nubs.
        if (dx * dx + dy * dy <= 0.92) this.px(x, y, color);
      }
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, color: string, thick = 1): this {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const y = y0 + ((y1 - y0) * i) / steps;
      if (thick <= 1) this.px(x, y, color);
      else this.ellipse(x, y, thick / 2, thick / 2, color);
    }
    return this;
  }
  /** Paint a sprite (see `sprite`) with its top-left corner at `x, y`. */
  stamp(x: number, y: number, rows: readonly string[], palette: Readonly<Record<string, string>>): this {
    rows.forEach((row, yy) => {
      for (let xx = 0; xx < row.length; xx++) {
        const c = palette[row[xx] as string];
        if (c) this.px(x + xx, y + yy, c);
      }
    });
    return this;
  }
}

/** Pixel art from rows of palette keys. Keys missing from the palette (`.`) are transparent. */
export function sprite(rows: readonly string[], palette: Readonly<Record<string, string>>): Raster {
  const w = Math.max(...rows.map((r) => r.length));
  return new Raster(w, rows.length).stamp(0, 0, rows, palette);
}

/** Warm brown tones, like an old print. */
export function sepia(src: PixelData): Raster {
  const out = new Raster(src.width, src.height);
  for (let i = 0; i < src.width * src.height * 4; i += 4) {
    const r = src.data[i] as number;
    const g = src.data[i + 1] as number;
    const b = src.data[i + 2] as number;
    out.data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
    out.data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
    out.data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    out.data[i + 3] = src.data[i + 3] as number;
  }
  return out;
}

/** Deterministic pseudo-random numbers in [0, 1). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
