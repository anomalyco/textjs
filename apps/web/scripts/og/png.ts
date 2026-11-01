/**
 * Re-encodes Chromium's screenshot PNGs as 8-bit grayscale when every pixel is gray, as most
 * text cards are: about half the size, lossless. Color screenshots are kept as they are (a
 * re-encode saves under 10% of those and costs more time than it's worth).
 */

import { deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = (CRC[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  out.set(data, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decodes an 8-bit RGB or RGBA, non-interlaced PNG to packed pixels; `null` at the first pixel that isn't opaque gray. */
function decodeGray(png: Buffer): { width: number; height: number; channels: number; pixels: Buffer } | null {
  if (!png.subarray(0, 8).equals(SIGNATURE)) throw new Error("png: not a PNG");
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  for (let off = 8; off < png.length; ) {
    const len = png.readUInt32BE(off);
    const type = png.toString("ascii", off + 4, off + 8);
    const data = png.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const [depth, color, , , interlace] = [data[8], data[9], data[10], data[11], data[12]];
      if (depth !== 8 || (color !== 2 && color !== 6) || interlace !== 0) throw new Error("png: only 8-bit RGB(A), non-interlaced");
      channels = color === 6 ? 4 : 3;
    } else if (type === "IDAT") idat.push(data);
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? (pixels[row + x - channels] as number) : 0;
      const b = y ? (pixels[row - stride + x] as number) : 0;
      const c = x >= channels && y ? (pixels[row - stride + x - channels] as number) : 0;
      const v = raw[src + x] as number;
      pixels[row + x] = (filter === 1 ? v + a : filter === 2 ? v + b : filter === 3 ? v + ((a + b) >> 1) : filter === 4 ? v + paeth(a, b, c) : v) & 0xff;
    }
    for (let i = row; i < row + stride; i += channels) {
      if (pixels[i] !== pixels[i + 1] || pixels[i] !== pixels[i + 2] || (channels === 4 && pixels[i + 3] !== 255)) return null;
    }
  }
  return { width, height, channels, pixels };
}

/** Lossless re-encode of an opaque screenshot (returned unchanged unless it's all gray). */
export function optimizePng(png: Buffer): Buffer {
  const decoded = decodeGray(png);
  if (!decoded) return png;
  const { width, height, channels, pixels } = decoded;
  // One channel, each row filtered against the row above ("Up"): close to the best adaptive choice for screenshots.
  const raw = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 2;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const above = y ? (pixels[i - width * channels] as number) : 0;
      raw[y * (width + 1) + 1 + x] = ((pixels[i] as number) - above) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const encoded = Buffer.concat([SIGNATURE, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9, memLevel: 9 })), chunk("IEND", new Uint8Array(0))]);
  return encoded.length < png.length ? encoded : png;
}
