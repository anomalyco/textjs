import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { packRGBA, txError, type CellBuffer, type ComputedRect, type LayoutProps } from "@textjs/core";
import { drawPixels, type PixelEncoding, type PixelRenderMode, type PixelSource } from "@textjs/core/experimental";
import { TxBox } from "../host";
import { useTheme } from "../theme";
import { Text } from "./Text";

/** Raw RGBA pixels (row-major, 4 bytes per pixel). */
export interface PixelData {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

/** Area-average resample to `tw × th` pixels. */
export function resamplePixels(src: PixelData, tw: number, th: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tw * th * 4);
  const sx = src.width / tw;
  const sy = src.height / th;
  const d = src.data;
  for (let y = 0; y < th; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.min(src.height, Math.floor((y + 1) * sy)));
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.min(src.width, Math.floor((x + 1) * sx)));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * src.width + xx) * 4;
          const pa = (d[i + 3] as number) / 255;
          r += (d[i] as number) * pa;
          g += (d[i + 1] as number) * pa;
          b += (d[i + 2] as number) * pa;
          a += pa;
          n++;
        }
      }
      const o = (y * tw + x) * 4;
      if (a > 0) {
        out[o] = r / a;
        out[o + 1] = g / a;
        out[o + 2] = b / a;
      }
      out[o + 3] = n > 0 ? (a / n) * 255 : 0;
    }
  }
  return out;
}

/** Load an image URL into pixels via a canvas (browser only; the server must allow CORS). */
export function loadImagePixels(src: string, maxWidth = 256, maxHeight = 256): Promise<PixelData> {
  if (typeof document === "undefined") return Promise.reject(txError("TX011"));
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(txError("TX012"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const data = ctx.getImageData(0, 0, w, h);
        resolve({ width: w, height: h, data: data.data });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(txError("TX013", src));
    img.src = src;
  });
}

/** Indexed sprites (pixel art) keep up to 8 × 16 source pixels per cell; RGBA photos, which cost more bytes per pixel, 4 × 8. */
const INDEXED_PX_PER_CELL = [8, 16] as const;
const RGBA_PX_PER_CELL = [4, 8] as const;

interface ImageSprite {
  source: PixelSource;
  encoding: PixelEncoding;
}

/** Resample `crop` to fit `cols × rows` cells at `perCell` pixels, as packed colors, noting whether it fits an indexed PNG. */
function packSprite(crop: PixelData, cols: number, rows: number, perCell: readonly [number, number]): ImageSprite {
  const shrink = Math.min(1, (cols * perCell[0]) / crop.width, (rows * perCell[1]) / crop.height);
  const tw = Math.max(1, Math.round(crop.width * shrink));
  const th = Math.max(1, Math.round(crop.height * shrink));
  const px = tw === crop.width && th === crop.height ? crop.data : resamplePixels(crop, tw, th);
  const data = new Uint32Array(tw * th);
  const colors = new Set<number>();
  let indexed = true;
  for (let i = 0; i < data.length; i++) {
    const a = px[i * 4 + 3] as number;
    // The half-blocks drop pixels below 16 alpha too.
    if (a < 16) continue;
    const c = packRGBA(px[i * 4] as number, px[i * 4 + 1] as number, px[i * 4 + 2] as number, a);
    data[i] = c;
    if (indexed && (a !== 255 || (colors.add(c), colors.size > 255))) indexed = false;
  }
  return { source: { width: tw, height: th, data }, encoding: indexed ? "indexed" : "rgba" };
}

/**
 * The pixels a `cols × rows` sprite stretches over: `cover` crops to the box first (in the same
 * two-pixels-per-row space as the half-blocks), and large images shrink to the per-cell cap. Images
 * that fit a 256-color palette with on/off alpha stay indexed (small, and they can batch when they
 * animate); anything else is RGBA at the lower cap.
 */
function spriteFor(img: PixelData, cols: number, rows: number, fit: "contain" | "cover" | "fill"): ImageSprite {
  let crop: PixelData = img;
  if (fit === "cover") {
    const scale = Math.max(cols / img.width, (rows * 2) / img.height);
    const sw = Math.min(img.width, Math.max(1, Math.round(cols / scale)));
    const sh = Math.min(img.height, Math.max(1, Math.round((rows * 2) / scale)));
    const sx = Math.floor((img.width - sw) / 2);
    const sy = Math.floor((img.height - sh) / 2);
    if (sx !== 0 || sy !== 0 || sw !== img.width || sh !== img.height) {
      const data = new Uint8ClampedArray(sw * sh * 4);
      for (let y = 0; y < sh; y++) {
        for (let i = 0; i < sw * 4; i++) data[y * sw * 4 + i] = img.data[((sy + y) * img.width + sx) * 4 + i] as number;
      }
      crop = { width: sw, height: sh, data };
    }
  }
  const sprite = packSprite(crop, cols, rows, INDEXED_PX_PER_CELL);
  return sprite.encoding === "indexed" ? sprite : packSprite(crop, cols, rows, RGBA_PX_PER_CELL);
}

/**
 * Where `fit` puts the image in a `width × height` cell box, in half-block pixels (one per column,
 * two per row): its size and its offset. Shared by the half-blocks and the sprite so both land on the same cells.
 */
function placement(img: PixelData, width: number, height: number, fit: "contain" | "cover" | "fill"): { tw: number; th: number; offX: number; offY: number } {
  const boxW = width;
  const boxH = height * 2;
  if (fit === "fill") return { tw: boxW, th: boxH, offX: 0, offY: 0 };
  const scale = fit === "contain" ? Math.min(boxW / img.width, boxH / img.height) : Math.max(boxW / img.width, boxH / img.height);
  const tw = Math.max(1, Math.round(img.width * scale));
  const th = Math.max(1, Math.round(img.height * scale));
  if (fit === "cover") return { tw, th, offX: -Math.floor((tw - boxW) / 2), offY: -Math.floor((th - boxH) / 2) };
  return { tw, th, offX: Math.floor((boxW - tw) / 2), offY: Math.floor((boxH - th) / 2) };
}

export interface ImageProps extends Omit<LayoutProps, "width" | "height"> {
  /** URL (browser; CORS-enabled). */
  src?: string;
  /** Raw RGBA pixels (any environment). */
  pixels?: PixelData;
  /** Width in cells. With only one dimension the aspect ratio is kept. */
  width?: number;
  /** Height in rows (each row holds two pixels). */
  height?: number;
  /** `"contain"` (default) letterboxes, `"cover"` crops, `"fill"` stretches. */
  fit?: "contain" | "cover" | "fill";
  /** Shown while loading or on error. */
  alt?: string;
  /**
   * `"auto"` (default) draws a pixel sprite in Chromium and Firefox consoles and `▀` half-blocks
   * elsewhere. `"halfblock"` draws half-blocks everywhere, as `<Image>` did in 1.3.
   */
  renderMode?: PixelRenderMode;
}

/**
 * An image from a URL, canvas data or raw RGBA. Chromium and Firefox consoles show it as a crisp
 * pixel sprite; Safari, terminals and text exports get `▀` half-blocks (two pixels per cell).
 */
export function Image({ src, pixels, width, height, fit = "contain", alt = "", renderMode = "auto", ...layout }: ImageProps): ReactNode {
  const theme = useTheme();
  const [loaded, setLoaded] = useState<PixelData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (pixels || !src) return;
    let live = true;
    setFailed(false);
    loadImagePixels(src).then(
      (p) => live && setLoaded(p),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [src, pixels]);
  const img = pixels ?? loaded;
  const cache = useRef<{ key: string; img: PixelData; data: Uint8ClampedArray } | null>(null);
  const spriteCache = useRef<{ key: string; img: PixelData; sprite: ImageSprite } | null>(null);

  let w = width;
  let h = height;
  if (img && w !== undefined && h === undefined) h = Math.max(1, Math.round((w * img.height) / img.width / 2));
  else if (img && h !== undefined && w === undefined) w = Math.max(1, Math.round((h * 2 * img.width) / img.height));
  else if (img && w === undefined && h === undefined) {
    w = img.width;
    h = Math.ceil(img.height / 2);
  }

  // Paints the 1.3 half-blocks over the whole box. The sprite's fallback calls it with the sprite's
  // cell rect, which covers every cell the half-blocks touch, so it ignores that rect.
  const paintHalfBlocks = (buf: CellBuffer, r: Readonly<ComputedRect>, image: PixelData): void => {
    const { tw, th, offX, offY } = placement(image, r.width, r.height, fit);
    const key = `${tw}x${th}`;
    if (cache.current?.key !== key || cache.current.img !== image) cache.current = { key, img: image, data: resamplePixels(image, tw, th) };
    const px = cache.current.data;
    const at = (x: number, y: number): number => {
      const ix = x - offX;
      const iy = y - offY;
      if (ix < 0 || iy < 0 || ix >= tw || iy >= th) return 0;
      const i = (iy * tw + ix) * 4;
      const a = px[i + 3] as number;
      return a < 16 ? 0 : packRGBA(px[i] as number, px[i + 1] as number, px[i + 2] as number, a);
    };
    for (let cy = 0; cy < r.height; cy++) {
      for (let cx = 0; cx < r.width; cx++) {
        const top = at(cx, cy * 2);
        const bottom = at(cx, cy * 2 + 1);
        if (top === 0 && bottom === 0) continue;
        if (top === 0) buf.setCell(r.x + cx, r.y + cy, "▄", bottom, 0);
        else buf.setCell(r.x + cx, r.y + cy, "▀", top, bottom);
      }
    }
  };

  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      if (!img || r.width <= 0 || r.height <= 0 || img.width <= 0 || img.height <= 0) return;
      const fallback = (b: CellBuffer): void => paintHalfBlocks(b, r, img);
      // The sprite covers the whole cells the half-blocks touch and stretches over them.
      const { tw, th, offX, offY } = placement(img, r.width, r.height, fit);
      const x0 = Math.max(0, offX);
      const x1 = Math.min(r.width, offX + tw);
      const y0 = Math.max(0, Math.floor(offY / 2));
      const y1 = Math.min(r.height, Math.ceil((offY + th) / 2));
      const cols = x1 - x0;
      const rows = y1 - y0;
      if (cols <= 0 || rows <= 0) return;
      const key = `${cols}x${rows}:${fit}`;
      if (spriteCache.current?.key !== key || spriteCache.current.img !== img) {
        spriteCache.current = { key, img, sprite: spriteFor(img, cols, rows, fit) };
      }
      const { source, encoding } = spriteCache.current.sprite;
      drawPixels(buf, { x: r.x + x0, y: r.y + y0, width: cols, height: rows, source, fit: "fill", encoding, renderMode, fallback });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [img, fit, renderMode],
  );

  if (!img) {
    return (
      <TxBox width={width} height={height ?? 1} flexShrink={0} alignItems="center" justifyContent="center" {...layout}>
        <Text color={failed ? theme.danger : theme.subtle} italic wrap="truncate-end">
          {alt || (failed ? "Image failed to load" : "Loading…")}
        </Text>
      </TxBox>
    );
  }
  return <TxBox width={w} height={h} flexShrink={0} {...layout} customPaint={paint} />;
}
