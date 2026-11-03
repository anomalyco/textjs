// Bytes per batched log call (k keyframes) for: shipping full + deltas, vs keyframes packed side by side in one PNG.
// Usage: bun bench/doom/batch-matrix.ts <frames.bin> [k=2] [first=200] [count=600]
import {
  deflateZlib,
  encodeIndexedPng,
} from "../../packages/core/src/drivers/png";

const f = new Uint8Array(
  await Bun.file(process.argv[2] ?? "bench/doom/out/frames.bin").arrayBuffer(),
);
const k = Number(process.argv[3] ?? 2);
const first = Number(process.argv[4] ?? 200);
const count = Number(process.argv[5] ?? 600);
const dv = new DataView(f.buffer);
const W = dv.getUint16(0, true);
const H = dv.getUint16(2, true);
const N = dv.getUint32(4, true);
const frames = Array.from(
  { length: Math.min(count, N - first) },
  (_, i) => new Uint32Array(f.buffer, 8 + (first + i) * W * H * 4, W * H),
);
const out = new Uint8Array(1 << 20);

function sbs(batch: Uint32Array[], trans: boolean): number {
  const map = new Map<number, number>();
  const BW = W * batch.length;
  const scan = new Uint8Array(H * (BW + 1));
  let p = 0;
  for (let y = 0; y < H; y++) {
    scan[p++] = 0;
    for (let j = 0; j < batch.length; j++) {
      const cur = batch[j]!;
      const prev = j > 0 ? batch[j - 1]! : null;
      let x = 0;
      while (x < W) {
        const i = y * W + x;
        if (trans && prev && cur[i] === prev[i]) {
          let run = 1;
          while (x + run < W && cur[i + run] === prev[i + run]) run++;
          if (run >= 4) {
            scan.fill(255, p, p + run);
            p += run;
            x += run;
            continue;
          }
        }
        const c = cur[i]! >>> 0;
        let v = map.get(c);
        if (v === undefined) map.set(c, (v = map.size));
        scan[p++] = v;
        x++;
      }
    }
  }
  if (map.size > (trans ? 255 : 256)) return NaN;
  return deflateZlib(scan, p, out, 0) + 57 + map.size * 3 + (trans ? 268 : 0);
}

const rows: [string, (b: Uint32Array[]) => number][] = [
  [
    "shipping: full + deltas",
    (b) => {
      let s = 0;
      for (let j = 0; j < b.length; j++)
        s +=
          encodeIndexedPng(b[j]!, W, H, j > 0 ? { prev: b[j - 1] } : {})
            ?.byteLength ?? 0;
      return s;
    },
  ],
  ["side by side, one PNG", (b) => sbs(b, false)],
  ["side by side, unchanged runs transparent", (b) => sbs(b, true)],
];
console.log(`k=${k}, ${Math.floor(frames.length / k)} batches`);
for (const [name, fn] of rows) {
  let bytes = 0;
  let n = 0;
  const ms: number[] = [];
  for (let i = 0; i + k <= frames.length; i += k) {
    const b = frames.slice(i, i + k);
    const t0 = performance.now();
    const v = fn(b);
    ms.push(performance.now() - t0);
    if (!Number.isNaN(v)) {
      bytes += v;
      n++;
    }
  }
  ms.sort((a, c) => a - c);
  console.log(
    `${name.padEnd(42)} ${String(Math.round(bytes / n)).padStart(7)} B/log  ${String(Math.round((bytes / n) * (4 / 3))).padStart(7)} b64  ${ms[ms.length >> 1]!.toFixed(2)} / ${ms[Math.floor(ms.length * 0.95)]!.toFixed(2)} ms  (${n} ok)`,
  );
}
