// Dump Doom's attract-mode frames as packed 0xRRGGBBAA 320×200 to a .bin file (header: u16 width, u16 height, u32 count).
// Runs the engine on a virtual 35Hz clock, so the frames are the same on every run.
// Usage: bun bench/doom/record-frames.ts <out.bin> [seconds=40] [skipSeconds=0]
import { createDoom } from "../../apps/web/src/demos/doom/host";

const out = process.argv[2] ?? "bench/doom/out/frames.bin";
const seconds = Number(process.argv[3] ?? 40);
const skip = Number(process.argv[4] ?? 0);
const wasm = await Bun.file(
  new URL(
    "../../apps/web/src/demos/doom/engine/out/doom.wasm",
    import.meta.url,
  ),
).arrayBuffer();
const wad = new Uint8Array(
  await Bun.file(
    new URL("../../apps/web/public/doom/DOOM1.WAD", import.meta.url),
  ).arrayBuffer(),
);
let t = 0;
const doom = await createDoom({ wasm, wads: [wad], now: () => t });
const frames: Uint32Array[] = [];
const ticMs = 1000 / 35;
for (let k = 0; k < (skip + seconds) * 35; k++) {
  t = k * ticMs;
  if (doom.tick() && k >= skip * 35) frames.push(doom.source.data.slice());
}
const W = 320;
const H = 200;
const buf = new Uint8Array(8 + frames.length * W * H * 4);
const dv = new DataView(buf.buffer);
dv.setUint16(0, W, true);
dv.setUint16(2, H, true);
dv.setUint32(4, frames.length, true);
frames.forEach((f, i) => buf.set(new Uint8Array(f.buffer), 8 + i * W * H * 4));
await Bun.write(out, buf);
console.log(`${frames.length} frames → ${out}`);
