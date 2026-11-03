// Offline Turbolog cost of Doom frames as ▀ half-blocks: encode time, %c spans, console.log payload.
// Usage: bun bench/doom/encode.ts <frames.bin>   (frames.bin from bench/doom/dump-frames.ts)
import { CellBuffer, CssConsoleDriver, type ConsoleTarget } from "../../packages/core/src/index";
import { paintHalfBlocks, type PixelSource } from "../../packages/core/src/pixels";
import { DOOM_PALETTE_32, DOOM_PALETTE_64 } from "../../apps/web/src/demos/doom/palette";

/** Doom's 640×400 XRGB output → 320×200 packed RGBA, optionally posterized to `levels` steps per channel. */
function toSource(px: Uint32Array, W: number, H: number, levels: number): PixelSource {
  const w = W >> 1, h = H >> 1, out = new Uint32Array(w * h);
  const q = (c: number) => (levels ? Math.round((Math.round((c / 255) * (levels - 1)) * 255) / (levels - 1)) : c);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = px[y * 2 * W + x * 2]!;
    out[y * w + x] = ((q((p >> 16) & 255) << 24) | (q((p >> 8) & 255) << 16) | (q(p & 255) << 8) | 255) >>> 0;
  }
  return { width: w, height: h, data: out };
}

const f = new Uint8Array(await Bun.file(process.argv[2]!).arrayBuffer());
const dv = new DataView(f.buffer);
const W = dv.getUint16(0, true), H = dv.getUint16(2, true), N = dv.getUint32(4, true);
const frames = Array.from({ length: N }, (_, i) => new Uint32Array(f.buffer, 8 + i * W * H * 4, W * H));
const GRIDS: Array<[number, number]> = [[80, 25], [100, 32], [120, 40], [160, 50]];
const VARIANTS: Array<[string, number, readonly number[] | undefined, "nearest" | "average"]> = [
  ["pal", 0, undefined, "nearest"],
  ["post64", 4, undefined, "nearest"],
  ["mc64", 0, DOOM_PALETTE_64, "nearest"],
  ["avg+mc64", 0, DOOM_PALETTE_64, "average"],
  ["avg+mc32", 0, DOOM_PALETTE_32, "average"],
];
const pct = (a: number[], p: number) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * p)] ?? 0;
console.log("grid     colors  encode p50/p95 ms  spans p50/p95   payload p50/p95 KB  styles  dirtyRows");
for (const [vname, levels, palette, sample] of VARIANTS) {
  for (const [cols, rows] of GRIDS) {
    let bytes = 0;
    const target: ConsoleTarget = { clear() {}, log(...args: unknown[]) { for (const a of args) bytes += (a as string).length; } };
    const driver = new CssConsoleDriver({ console: target, clear: "append", curtain: true });
    const buf = new CellBuffer(cols, rows);
    const enc: number[] = [], spans: number[] = [], pay: number[] = [], dirty: number[] = [];
    for (let i = 30; i < N; i++) {
      const src = toSource(frames[i]!, W, H, levels);
      buf.clear(0);
      paintHalfBlocks(buf, { x: 0, y: 0, width: cols, height: rows }, src, "fill", 1, palette, sample);
      bytes = 0;
      const t0 = performance.now();
      const r = driver.render(buf);
      enc.push(performance.now() - t0);
      spans.push(r.spanCount); pay.push(bytes / 1024); dirty.push(r.dirtyRows);
    }
    console.log(
      `${`${cols}x${rows}`.padEnd(8)} ${vname.padEnd(9)} ${pct(enc, 0.5).toFixed(2).padStart(6)} / ${pct(enc, 0.95).toFixed(2).padEnd(8)} ${String(pct(spans, 0.5)).padStart(5)} / ${String(pct(spans, 0.95)).padEnd(7)} ${pct(pay, 0.5).toFixed(0).padStart(6)} / ${pct(pay, 0.95).toFixed(0).padEnd(9)} ${String(driver.internedStyles).padEnd(7)} ${pct(dirty, 0.5)}/${rows}`,
    );
  }
}
