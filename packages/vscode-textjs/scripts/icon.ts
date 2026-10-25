/**
 * Rasterize the ▼ brand mark (same geometry as the `text dev` favicon) into
 * `media/icon.png` without native dependencies: 4×4 supersampled coverage,
 * written as an RGBA PNG.
 *
 *   bun scripts/icon.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const ROOT = resolve(import.meta.dir, "..");
const SIZE = 256;
const SS = 4;
const S = SIZE / 32;

// Favicon geometry in a 32-unit box: rounded square rx=7, triangle (7,10) (25,10) (16,25).
const RADIUS = 7 * S;
const TRI: Array<[number, number]> = [
  [7 * S, 10 * S],
  [25 * S, 10 * S],
  [16 * S, 25 * S],
];
const BG = [10, 10, 10];
const FG = [237, 237, 237];

function inRoundedRect(x: number, y: number): boolean {
  const r = RADIUS;
  const cx = x < r ? r : x > SIZE - r ? SIZE - r : x;
  const cy = y < r ? r : y > SIZE - r ? SIZE - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function inTriangle(x: number, y: number): boolean {
  const [a, b, c] = TRI as [[number, number], [number, number], [number, number]];
  const sign = (p: [number, number], q: [number, number]): number => (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1]);
  const d1 = sign(a, b);
  const d2 = sign(b, c);
  const d3 = sign(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    let bg = 0;
    let fg = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS;
        const py = y + (sy + 0.5) / SS;
        if (!inRoundedRect(px, py)) continue;
        if (inTriangle(px, py)) fg++;
        else bg++;
      }
    }
    const n = SS * SS;
    const a = (bg + fg) / n;
    const o = y * (SIZE * 4 + 1) + 1 + x * 4;
    const t = bg + fg === 0 ? 0 : fg / (bg + fg);
    for (let i = 0; i < 3; i++) raw[o + i] = Math.round((BG[i] as number) * (1 - t) + (FG[i] as number) * t);
    raw[o + 3] = Math.round(a * 255);
  }
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = (CRC[(c ^ b) & 255] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync(join(ROOT, "media"), { recursive: true });
writeFileSync(join(ROOT, "media/icon.png"), png);
console.log(`▼ media/icon.png ${SIZE}×${SIZE} (${(png.length / 1024).toFixed(1)} kB)`);
