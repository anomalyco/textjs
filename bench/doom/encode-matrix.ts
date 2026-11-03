// Bytes and encode time per Doom sprite frame for PNG/DEFLATE options, on the same palettized scanlines.
// Usage: bun bench/doom/encode-matrix.ts <frames.bin> [first=200] [count=600]
import { deflateSync } from "node:zlib";
import {
  deflateZlib,
  encodeIndexedPng,
} from "../../packages/core/src/drivers/png";

const f = new Uint8Array(
  await Bun.file(process.argv[2] ?? "bench/doom/out/frames.bin").arrayBuffer(),
);
const first = Number(process.argv[3] ?? 200);
const count = Number(process.argv[4] ?? 600);
const dv = new DataView(f.buffer);
const W = dv.getUint16(0, true);
const H = dv.getUint16(2, true);
const N = dv.getUint32(4, true);
const frames = Array.from(
  { length: Math.min(count, N - first) },
  (_, i) => new Uint32Array(f.buffer, 8 + (first + i) * W * H * 4, W * H),
);

// Frame → palette indices (first-seen order, like encodeIndexedPng) with filter type `ft` per row.
function scanlines(px: Uint32Array, ft: 0 | 1 | 2 | 4): Uint8Array {
  const map = new Map<number, number>();
  const idx = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const c = px[i]! >>> 0;
    let v = map.get(c);
    if (v === undefined) map.set(c, (v = map.size));
    idx[i] = v;
  }
  const scan = new Uint8Array(H * (W + 1));
  let p = 0;
  for (let y = 0; y < H; y++) {
    scan[p++] = ft;
    for (let x = 0; x < W; x++) {
      const cur = idx[y * W + x]!;
      const a = x > 0 ? idx[y * W + x - 1]! : 0;
      const b = y > 0 ? idx[(y - 1) * W + x]! : 0;
      const c = x > 0 && y > 0 ? idx[(y - 1) * W + x - 1]! : 0;
      let pred = 0;
      if (ft === 1) pred = a;
      else if (ft === 2) pred = b;
      else if (ft === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      scan[p++] = (cur - pred) & 255;
    }
  }
  return scan;
}

const out = new Uint8Array(1 << 18);
const rows: string[] = [];
const run = (
  name: string,
  fn: (fr: Uint32Array, i: number) => number,
): void => {
  // Warm up, then time.
  for (let i = 0; i < 20; i++) fn(frames[i % frames.length]!, i);
  let bytes = 0;
  const ms: number[] = [];
  for (let i = 0; i < frames.length; i++) {
    const t0 = performance.now();
    bytes += fn(frames[i]!, i);
    ms.push(performance.now() - t0);
  }
  ms.sort((a, b) => a - b);
  const mean = bytes / frames.length;
  rows.push(
    `${name.padEnd(44)} ${String(Math.round(mean)).padStart(7)} B  ${String(Math.round((mean * 4) / 3)).padStart(7)} b64  ${ms[Math.floor(ms.length / 2)]!.toFixed(2).padStart(6)} / ${ms[Math.floor(ms.length * 0.95)]!.toFixed(2).padStart(6)} ms`,
  );
};

// Current shipping encoder, full keyframes and deltas against the previous frame.
run(
  "encodeIndexedPng full (shipping)",
  (fr) => encodeIndexedPng(fr, W, H)!.byteLength,
);
run(
  "encodeIndexedPng delta vs prev (shipping)",
  (fr, i) =>
    encodeIndexedPng(fr, W, H, { prev: frames[Math.max(0, i - 1)] })
      ?.byteLength ?? 0,
);
const PNG_OVERHEAD = 8 + 25 + 12 + 12 + 12; // signature, IHDR, PLTE, IDAT and IEND framing; PLTE data comes on top
for (const ft of [0, 1, 2, 4] as const) {
  const pre = frames.map((fr) => scanlines(fr, ft));
  run(`IDAT only, filter ${ft}, deflateZlib (shipping)`, (_, i) =>
    deflateZlib(pre[i]!, pre[i]!.length, out, 0),
  );
  for (const level of [1, 6, 9])
    run(
      `IDAT only, filter ${ft}, zlib level ${level}`,
      (_, i) => deflateSync(pre[i]!, { level }).length,
    );
}
console.log(
  `${frames.length} frames (${first}..${first + frames.length}), PNG overhead ≈ ${PNG_OVERHEAD} B + PLTE (≤768 B)`,
);
console.log(
  `${"option".padEnd(44)} ${"bytes".padStart(9)}  ${"base64".padStart(11)}  p50 / p95 encode`,
);
for (const r of rows) console.log(r);
