import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { packRGBA, txError, type CellBuffer, type ComputedRect, type LayoutProps } from "@textjs/core";
import { drawPixels, type PixelSource } from "@textjs/core/experimental";
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

function packPixelData(src: PixelData): PixelSource {
  const sw = Math.max(0, Math.floor(src.width));
  const sh = Math.max(0, Math.floor(src.height));
  const len = sw * sh;
  const out = new Uint32Array(len);
  const d = src.data;
  for (let i = 0; i < len; i++) {
    const o = i * 4;
    const a = (d[o + 3] as number) | 0;
    out[i] = a < 16 ? 0 : packRGBA(d[o] as number, d[o + 1] as number, d[o + 2] as number, a);
  }
  return { width: sw, height: sh, data: out };
}

function cropPixelSource(src: PixelSource, boxAspect: number): PixelSource {
  const srcAspect = src.width / src.height;
  let cw = src.width;
  let ch = src.height;
  if (srcAspect > boxAspect) cw = Math.max(1, Math.round(src.height * boxAspect));
  else if (srcAspect < boxAspect) ch = Math.max(1, Math.round(src.width / boxAspect));
  if (cw === src.width && ch === src.height) return src;
  const ox = (src.width - cw) >> 1;
  const oy = (src.height - ch) >> 1;
  const out = new Uint32Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    const rowOff = (oy + y) * src.width + ox;
    out.set(src.data.subarray(rowOff, rowOff + cw), y * cw);
  }
  return { width: cw, height: ch, data: out };
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

/** Crisp pixel sprite (Chromium, Firefox) with automatic `▀` half-block fallback (Safari, ANSI, plain text). */
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
  const packedCache = useRef<{ img: PixelData; dataRef: ArrayLike<number>; packed: PixelSource } | null>(null);
  const coverCache = useRef<{ base: PixelSource; key: string; cropped: PixelSource } | null>(null);

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
      if (!img || r.contentWidth <= 0 || r.contentHeight <= 0 || img.width <= 0 || img.height <= 0) return;
      if (packedCache.current?.img !== img || packedCache.current.dataRef !== img.data) {
        packedCache.current = { img, dataRef: img.data, packed: packPixelData(img) };
      }
      let source = packedCache.current.packed;
      if (fit === "cover") {
        const key = `${r.contentWidth}x${r.contentHeight}`;
        if (coverCache.current?.base !== source || coverCache.current.key !== key) {
          coverCache.current = { base: source, key, cropped: cropPixelSource(source, r.contentWidth / (r.contentHeight * 2)) };
        }
        source = coverCache.current.cropped;
      }
      drawPixels(buf, {
        x: r.contentX,
        y: r.contentY,
        width: r.contentWidth,
        height: r.contentHeight,
        source,
        fit: fit === "contain" ? "contain" : "fill",
        sample: "average",
      });
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
