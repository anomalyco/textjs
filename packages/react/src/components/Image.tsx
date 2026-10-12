import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { packRGBA, type CellBuffer, type ComputedRect, type LayoutProps } from "@textjs/core";
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
  if (typeof document === "undefined") return Promise.reject(new Error("@textjs/react: <Image src> needs a DOM; pass `pixels` instead."));
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
        reject(new Error("@textjs/react: 2D canvas unavailable."));
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
    img.onerror = () => reject(new Error(`@textjs/react: failed to load image "${src}".`));
    img.src = src;
  });
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

/** Half-block pixel art (`▀`: two pixels per cell) from a URL, canvas data or raw RGBA. */
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
  const cache = useRef<{ key: string; data: Uint8ClampedArray } | null>(null);

  let w = width;
  let h = height;
  if (img && w !== undefined && h === undefined) h = Math.max(1, Math.round((w * img.height) / img.width / 2));
  else if (img && h !== undefined && w === undefined) w = Math.max(1, Math.round((h * 2 * img.width) / img.height));
  else if (img && w === undefined && h === undefined) {
    w = img.width;
    h = Math.ceil(img.height / 2);
  }

  const paint = useCallback(
    (buf: CellBuffer, r: Readonly<ComputedRect>) => {
      if (!img || r.width <= 0 || r.height <= 0) return;
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
      if (cache.current?.key !== key) cache.current = { key, data: resamplePixels(img, tw, th) };
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
