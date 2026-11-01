/**
 * Rasterizes the ▼ extension icons (white mark on a black rounded square) into
 * PNGs with no image dependencies: 4×4 supersampling, zlib, CRC-32.
 */

import { deflateSync } from "node:zlib";

const SS = 4;

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i] as number;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function insideRoundRect(x: number, y: number, r: number): boolean {
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function insideTriangle(x: number, y: number): boolean {
  // ▼: top edge y = 0.33 from x 0.23..0.77, apex (0.5, 0.73).
  const top = 0.33;
  const apex = 0.73;
  if (y < top || y > apex) return false;
  const half = 0.27 * (1 - (y - top) / (apex - top));
  return Math.abs(x - 0.5) <= half;
}

/** `padding` adds transparent pixels around the mark (the Web Store asks for 96px art in a 128px icon). */
export function renderIcon(size: number, padding = 0): Uint8Array {
  const px = new Uint8Array(size * size * 4);
  const inner = size - 2 * padding;
  const radius = inner <= 16 ? 0.18 : 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgCov = 0;
      let fgCov = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x - padding + (sx + 0.5) / SS) / inner;
          const w = (y - padding + (sy + 0.5) / SS) / inner;
          if (u < 0 || u > 1 || w < 0 || w > 1 || !insideRoundRect(u, w, radius)) continue;
          bgCov++;
          if (insideTriangle(u, w)) fgCov++;
        }
      }
      const n = SS * SS;
      const a = bgCov / n;
      const f = bgCov > 0 ? fgCov / bgCov : 0;
      const c = Math.round(10 + (237 - 10) * f);
      const i = (y * size + x) * 4;
      px[i] = c;
      px[i + 1] = c;
      px[i + 2] = c;
      px[i + 3] = Math.round(a * 255);
    }
  }
  return encodePng(size, size, px);
}

export const ICON_SIZES = [16, 32, 48, 128] as const;
