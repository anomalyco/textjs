// Median-cut a K-color palette from a WAD's base PLAYPAL (every color weighted equally, so hues the
// attract demos rarely show, like nukage green, survive) and print it as packed RGBA.
// Usage: bun bench/doom/palette.ts <iwad> <K>
const f = new Uint8Array(await Bun.file(process.argv[2]!).arrayBuffer());
const K = Number(process.argv[3] ?? 64);
const dv = new DataView(f.buffer);
const hist = new Map<number, number>();
for (let i = 0, n = dv.getInt32(4, true), off = dv.getInt32(8, true); i < n; i++) {
  const o = off + i * 16;
  if (new TextDecoder().decode(f.subarray(o + 8, o + 16)).replace(/\0.*$/, "") !== "PLAYPAL") continue;
  const pos = dv.getInt32(o, true);
  for (let c = 0; c < 256; c++) hist.set((f[pos + c * 3]! << 16) | (f[pos + c * 3 + 1]! << 8) | f[pos + c * 3 + 2]!, 1);
}
type C = { r: number; g: number; b: number; n: number };
let boxes: C[][] = [[...hist].map(([c, n]) => ({ r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255, n }))];
while (boxes.length < K) {
  let bi = -1, best = -1, axis: "r" | "g" | "b" = "r";
  boxes.forEach((bx, i) => {
    if (bx.length < 2) return;
    for (const a of ["r", "g", "b"] as const) {
      const vs = bx.map((c) => c[a]); const range = Math.max(...vs) - Math.min(...vs);
      const w = range * Math.sqrt(bx.reduce((s, c) => s + c.n, 0));
      if (w > best) { best = w; bi = i; axis = a; }
    }
  });
  if (bi < 0) break;
  const bx = boxes[bi]!.sort((x, y) => x[axis] - y[axis]);
  const total = bx.reduce((s, c) => s + c.n, 0);
  let acc = 0, cut = 1;
  for (let i = 0; i < bx.length; i++) { acc += bx[i]!.n; if (acc >= total / 2) { cut = Math.max(1, Math.min(bx.length - 1, i + 1)); break; } }
  boxes.splice(bi, 1, bx.slice(0, cut), bx.slice(cut));
}
const pal = boxes.map((bx) => {
  const n = bx.reduce((s, c) => s + c.n, 0);
  const m = (a: "r" | "g" | "b") => Math.round(bx.reduce((s, c) => s + c[a] * c.n, 0) / n);
  return (((m("r") << 24) | (m("g") << 16) | (m("b") << 8) | 255) >>> 0);
});
console.log(`export const DOOM_PALETTE_${K}: readonly number[] = [${pal.map((p) => "0x" + p.toString(16).padStart(8, "0")).join(", ")}];`);
