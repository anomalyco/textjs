import { useCallback, type ReactNode } from "react";
import type { CellBuffer, ComputedRect, LayoutProps, PackedColor } from "@textjs/core";
import { TxBox } from "../host";

/** A live framebuffer: row-major packed `0xRRGGBBAA` colors, the format every Text.js color uses. */
export interface PixelSource {
  width: number;
  height: number;
  data: Uint32Array;
}

export interface PixelsProps extends Omit<LayoutProps, "width" | "height"> {
  source: PixelSource;
  /** Bump to repaint after writing new pixels into `source.data` (the array is read in place). */
  frame: number;
  /** Width in cells (default: fill the box). */
  width?: number;
  /** Height in rows; each row holds two pixels. */
  height?: number;
  /** `"contain"` (default) letterboxes at the source aspect, `"fill"` stretches. */
  fit?: "contain" | "fill";
  /** Width ÷ height of one source pixel as displayed (Doom's 320×200 is shown at 4:3, so 1.2 ÷ 1 → `5 / 6`). */
  pixelAspect?: number;
  /**
   * Snap every pixel to the nearest of these packed colors. Fewer colors make longer runs of
   * identical cells, so frames need fewer `%c` spans and DevTools paints them faster.
   */
  palette?: readonly PackedColor[];
  /** `"nearest"` (default) picks one source pixel per cell half; `"average"` box-filters, which smooths noisy textures into longer runs (pair it with `palette`). */
  sample?: "nearest" | "average";
}

const quantizers = new WeakMap<readonly PackedColor[], (c: PackedColor) => PackedColor>();

/** Nearest-color lookup (red-mean weighted RGB), memoized per input color. */
export function quantizer(palette: readonly PackedColor[]): (c: PackedColor) => PackedColor {
  let q = quantizers.get(palette);
  if (q) return q;
  const memo = new Map<PackedColor, PackedColor>();
  q = (c) => {
    if ((c & 255) === 0) return c;
    let hit = memo.get(c);
    if (hit !== undefined) return hit;
    const r = c >>> 24;
    const g = (c >>> 16) & 255;
    const b = (c >>> 8) & 255;
    let best = Infinity;
    hit = c;
    for (const p of palette) {
      const dr = r - (p >>> 24);
      const dg = g - ((p >>> 16) & 255);
      const db = b - ((p >>> 8) & 255);
      const rm = (r + (p >>> 24)) / 2;
      const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
      if (d < best) {
        best = d;
        hit = p;
      }
    }
    if (memo.size > 65536) memo.clear();
    memo.set(c, hit);
    return hit;
  };
  quantizers.set(palette, q);
  return q;
}

/**
 * Paint `src` into `rect` as `▀` half-blocks (top pixel in the foreground, bottom in the background),
 * nearest-neighbour sampled so a palette-indexed source never produces colors outside its palette
 * and the console driver's style cache stays bounded.
 */
export function paintHalfBlocks(
  buf: CellBuffer,
  rect: Readonly<ComputedRect>,
  src: PixelSource,
  fit: "contain" | "fill" = "contain",
  pixelAspect = 1,
  palette?: readonly PackedColor[],
  sample: "nearest" | "average" = "nearest",
): void {
  if (rect.width <= 0 || rect.height <= 0 || src.width <= 0 || src.height <= 0) return;
  const boxW = rect.width;
  const boxH = rect.height * 2;
  let tw = boxW;
  let th = boxH;
  if (fit === "contain") {
    const aspect = (src.width * pixelAspect) / src.height;
    if (boxW / boxH > aspect) tw = Math.max(1, Math.round(boxH * aspect));
    else th = Math.max(1, Math.round(boxW / aspect));
  }
  const offX = (boxW - tw) >> 1;
  const offY = (boxH - th) >> 1;
  const d = src.data;
  const sw = src.width;
  const snap = palette ? quantizer(palette) : null;
  const xs = new Int32Array(boxW);
  for (let x = 0; x < boxW; x++) xs[x] = x < offX || x >= offX + tw ? -1 : Math.min(sw - 1, Math.floor(((x - offX) + 0.5) * (sw / tw)));
  const row = (y: number): number => (y < offY || y >= offY + th ? -1 : Math.min(src.height - 1, Math.floor(((y - offY) + 0.5) * (src.height / th))) * sw);
  const kx = sample === "average" ? Math.max(1, Math.floor(sw / tw)) : 1;
  const ky = sample === "average" ? Math.max(1, Math.floor(src.height / th)) : 1;
  // Box-filter a kx×ky block centred on the nearest sample.
  const at = (rowStart: number, sx: number): PackedColor => {
    if (kx === 1 && ky === 1) return d[rowStart + sx] as number;
    const y0 = Math.max(0, Math.floor(rowStart / sw) - (ky >> 1));
    const x0 = Math.max(0, sx - (kx >> 1));
    const y1 = Math.min(src.height, y0 + ky);
    const x1 = Math.min(sw, x0 + kx);
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const c = d[y * sw + x] as number;
        r += c >>> 24;
        g += (c >>> 16) & 255;
        b += (c >>> 8) & 255;
        n++;
      }
    }
    return (((r / n) << 24) | ((g / n) << 16) | ((b / n) << 8) | 255) >>> 0;
  };
  for (let cy = 0; cy < rect.height; cy++) {
    const top = row(cy * 2);
    const bottom = row(cy * 2 + 1);
    for (let cx = 0; cx < boxW; cx++) {
      const sx = xs[cx] as number;
      let t: PackedColor = sx < 0 || top < 0 ? 0 : at(top, sx);
      let b: PackedColor = sx < 0 || bottom < 0 ? 0 : at(bottom, sx);
      if (snap) {
        t = snap(t);
        b = snap(b);
      }
      if (t === 0 && b === 0) continue;
      if (t === b) buf.setCell(rect.x + cx, rect.y + cy, " ", t, t);
      else buf.setCell(rect.x + cx, rect.y + cy, "▀", t, b);
    }
  }
}

/** A live half-block framebuffer (games, emulators, video). Static images belong in `<Image>`. */
export function Pixels({ source, frame, width, height, fit = "contain", pixelAspect = 1, palette, sample = "nearest", ...layout }: PixelsProps): ReactNode {
  // `frame` is a dependency so a new frame is a new paint function, which damages the box.
  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => paintHalfBlocks(buf, r, source, fit, pixelAspect, palette, sample),
    [source, frame, fit, pixelAspect, palette, sample],
  );
  return <TxBox width={width} height={height} flexGrow={width === undefined ? 1 : 0} flexShrink={1} minWidth={1} minHeight={1} {...layout} customPaint={paint} />;
}
