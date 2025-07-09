/**
 * Generates `public/og.png` (1200×630): a dependency-free PNG encoder
 * (`zlib.deflateSync` + CRC-32) drawing the Text.js mark and a pixel title.
 *
 *   bun scripts/generate-og.ts
 */

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1200;
const H = 630;
const px = new Uint8Array(W * H * 3);

type RGB = readonly [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const BG = hex("#0a0a0a");
const GRID = hex("#161616");
const WHITE = hex("#ededed");
const MUTED = hex("#a1a1a1");
const SUBTLE = hex("#666666");
const BORDER = hex("#2e2e2e");
const BADGE = hex("#111111");
const GREEN = hex("#45a557");

/** Alpha-blend `c` over the pixel at (x, y). */
function blend(x: number, y: number, c: RGB, a = 1): void {
  if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
  const i = (y * W + x) * 3;
  for (let k = 0; k < 3; k++) px[i + k] = Math.round((px[i + k] as number) * (1 - a) + (c[k] as number) * a);
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) blend(xx, yy, c);
}

/** Anti-aliased fill of any shape given an inside test, 4×4 supersampled. */
function fillShape(x0: number, y0: number, x1: number, y1: number, inside: (x: number, y: number) => boolean, c: RGB): void {
  const S = 4;
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      let hits = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) if (inside(x + (sx + 0.5) / S, y + (sy + 0.5) / S)) hits++;
      blend(x, y, c, hits / (S * S));
    }
  }
}

function roundedRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
  fillShape(x, y, x + w, y + h, (px_, py) => {
    const cx = Math.min(Math.max(px_, x + r), x + w - r);
    const cy = Math.min(Math.max(py, y + r), y + h - r);
    return (px_ - cx) ** 2 + (py - cy) ** 2 <= r * r && px_ >= x && px_ <= x + w && py >= y && py <= y + h;
  }, c);
}

// 5×7 bitmap font (rows top → bottom, 5 bits each; an 8th row is a descender).
const FONT: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001",
  C: "01110 10001 10000 10000 10000 10001 01110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  F: "11111 10000 10000 11110 10000 10000 10000",
  J: "00111 00010 00010 00010 00010 10010 01100",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  W: "10001 10001 10001 10101 10101 10101 01010",
  X: "10001 10001 01010 00100 01010 10001 10001",
  a: "00000 00000 01110 00001 01111 10001 01111",
  b: "10000 10000 10110 11001 10001 10001 11110",
  c: "00000 00000 01110 10000 10000 10001 01110",
  e: "00000 00000 01110 10001 11111 10000 01110",
  f: "00110 01001 01000 11100 01000 01000 01000",
  g: "00000 00000 01111 10001 10001 01111 00001 01110",
  h: "10000 10000 10110 11001 10001 10001 10001",
  j: "00010 00000 00110 00010 00010 00010 10010 01100",
  k: "10000 10000 10010 10100 11000 10100 10010",
  l: "01100 00100 00100 00100 00100 00100 01110",
  m: "00000 00000 11010 10101 10101 10001 10001",
  n: "00000 00000 10110 11001 10001 10001 10001",
  o: "00000 00000 01110 10001 10001 10001 01110",
  r: "00000 00000 10110 11001 10000 10000 10000",
  s: "00000 00000 01110 10000 01110 00001 11110",
  t: "01000 01000 11100 01000 01000 01001 00110",
  w: "00000 00000 10001 10001 10101 10101 01010",
  x: "00000 00000 10001 01010 00100 01010 10001",
  ".": "00000 00000 00000 00000 00000 01100 01100",
  " ": "00000 00000 00000 00000 00000 00000 00000",
};

const textWidth = (s: string, scale: number): number => s.length * 6 * scale - scale;

function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  for (const [i, ch] of [...s].entries()) {
    const glyph = FONT[ch];
    if (!glyph) throw new Error(`og: no glyph for ${JSON.stringify(ch)}`);
    glyph.split(" ").forEach((row, gy) => {
      for (let gx = 0; gx < 5; gx++) if (row[gx] === "1") rect(x + i * 6 * scale + gx * scale, y + gy * scale, scale, scale, c);
    });
  }
}

const centered = (s: string, y: number, scale: number, c: RGB): void => drawText(s, Math.round((W - textWidth(s, scale)) / 2), y, scale, c);

// Background, 60px grid and a soft top glow.
for (let i = 0; i < W * H; i++) px.set(BG, i * 3);
for (let x = 0; x < W; x += 60) rect(x, 0, 1, H, GRID);
for (let y = 30; y < H; y += 60) rect(0, y, W, 1, GRID);
for (let y = 0; y < 360; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - W / 2) / 1.6, y) / 420;
    if (d < 1) blend(x, y, [255, 255, 255], 0.07 * (1 - d) ** 2);
  }
}

// ▼ mark.
const tri = { l: 528, r: 672, top: 96, bottom: 221 };
fillShape(tri.l, tri.top, tri.r, tri.bottom, (x, y) => {
  if (y < tri.top || y > tri.bottom) return false;
  const half = ((tri.r - tri.l) / 2) * (1 - (y - tri.top) / (tri.bottom - tri.top));
  return Math.abs(x - (tri.l + tri.r) / 2) <= half;
}, [255, 255, 255]);

centered("TEXT.JS", 262, 14, [255, 255, 255]);
centered("The Console Framework for the Web", 408, 4, MUTED);

// `console.log` badge.
const label = "console.log";
const scale = 3;
const bw = textWidth(label, scale) + 30 + 40;
const bh = 21 + 26;
const bx = Math.round((W - bw) / 2);
const by = 486;
roundedRect(bx, by, bw, bh, bh / 2, BORDER);
roundedRect(bx + 1, by + 1, bw - 2, bh - 2, bh / 2 - 1, BADGE);
fillShape(bx + 20, by + bh / 2 - 6, bx + 32, by + bh / 2 + 6, (x, y) => (x - (bx + 26)) ** 2 + (y - (by + bh / 2)) ** 2 <= 36, GREEN);
drawText(label, bx + 46, by + 13, scale, WHITE);

centered("textjs.org", 576, 2, SUBTLE);

// PNG encoding.
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

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // truecolor RGB
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0; // filter: none
  raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
}
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array(0))]);

const out = new URL("../public/og.png", import.meta.url);
writeFileSync(out, png);
console.log(`og.png ${W}×${H} · ${(png.length / 1024).toFixed(1)} KB`);
