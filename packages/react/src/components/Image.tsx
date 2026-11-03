import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { packRGBA, txError, type CellBuffer, type ComputedRect, type LayoutProps } from "@textjs/core";
import { drawPixels, type PixelEncoding, type PixelFit, type PixelRect, type PixelSource } from "@textjs/core/experimental";
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

/** Sprite resolution cap per cell: about one source pixel per CSS pixel at the default console font. */
const SPRITE_PX_PER_COL = 8;
const SPRITE_PX_PER_ROW = 16;

interface ImageSprite {
  source: PixelSource;
  fit: PixelFit;
  encoding: PixelEncoding;
}

/**
 * The pixels a `cols × rows` sprite shows: `cover` crops to the box first (in the same two-pixels-per-row
 * space as the half-blocks), and large images shrink to the resolution cap. Images that fit a 256-color
 * palette with on/off alpha stay indexed (smallest, and they can batch when they animate); anything else is RGBA.
 */
function spriteFor(img: PixelData, cols: number, rows: number, fit: "contain" | "cover" | "fill"): ImageSprite {
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (fit === "cover") {
    const scale = Math.max(cols / img.width, (rows * 2) / img.height);
    sw = Math.min(img.width, Math.max(1, Math.round(cols / scale)));
    sh = Math.min(img.height, Math.max(1, Math.round((rows * 2) / scale)));
    sx = Math.floor((img.width - sw) / 2);
    sy = Math.floor((img.height - sh) / 2);
  }
  let crop: PixelData = img;
  if (sx !== 0 || sy !== 0 || sw !== img.width || sh !== img.height) {
    const data = new Uint8ClampedArray(sw * sh * 4);
    for (let y = 0; y < sh; y++) {
      for (let i = 0; i < sw * 4; i++) data[y * sw * 4 + i] = img.data[((sy + y) * img.width + sx) * 4 + i] as number;
    }
    crop = { width: sw, height: sh, data };
  }
  const shrink = Math.min(1, (cols * SPRITE_PX_PER_COL) / sw, (rows * SPRITE_PX_PER_ROW) / sh);
  const tw = Math.max(1, Math.round(sw * shrink));
  const th = Math.max(1, Math.round(sh * shrink));
  const px = tw === sw && th === sh ? crop.data : resamplePixels(crop, tw, th);
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
  return { source: { width: tw, height: th, data }, fit: fit === "contain" ? "contain" : "fill", encoding: indexed ? "indexed" : "rgba" };
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
}

/**
 * An image from a URL, canvas data or raw RGBA. Chromium and Firefox consoles show it as a crisp
 * pixel sprite; Safari, terminals and text exports get `▀` half-blocks (two pixels per cell).
 */
export function Image({ src, pixels, width, height, fit = "contain", alt = "", ...layout }: ImageProps): ReactNode {
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

  const halfBlocks = useCallback(
    (buf: CellBuffer, r: Readonly<PixelRect>) => {
      if (!img) return;
      const boxW = r.width;
      const boxH = r.height * 2;
      let tw = boxW;
      let th = boxH;
      let cropX = 0;
      let cropY = 0;
      if (fit !== "fill") {
        const scale = fit === "contain" ? Math.min(boxW / img.width, boxH / img.height) : Math.max(boxW / img.width, boxH / img.height);
        tw = Math.max(1, Math.round(img.width * scale));
        th = Math.max(1, Math.round(img.height * scale));
        if (fit === "cover") {
          cropX = Math.floor((tw - boxW) / 2);
          cropY = Math.floor((th - boxH) / 2);
        }
      }
      const key = `${tw}x${th}`;
      if (cache.current?.key !== key || cache.current.img !== img) cache.current = { key, img, data: resamplePixels(img, tw, th) };
      const px = cache.current.data;
      const offX = fit === "contain" ? Math.floor((boxW - tw) / 2) : -cropX;
      const offY = fit === "contain" ? Math.floor((boxH - th) / 2) : -cropY;
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
    },
    [img, fit],
  );

  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      if (!img || r.width <= 0 || r.height <= 0 || img.width <= 0 || img.height <= 0) return;
      const key = `${r.width}x${r.height}:${fit}`;
      if (spriteCache.current?.key !== key || spriteCache.current.img !== img) {
        spriteCache.current = { key, img, sprite: spriteFor(img, r.width, r.height, fit) };
      }
      const { source, fit: spriteFit, encoding } = spriteCache.current.sprite;
      drawPixels(buf, { x: r.x, y: r.y, width: r.width, height: r.height, source, fit: spriteFit, encoding, fallback: halfBlocks });
    },
    [img, fit, halfBlocks],
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
