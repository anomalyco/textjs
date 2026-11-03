// Offline console.log payload of Doom sprite frames through the real drawPixels → CssConsoleDriver path,
// paced like ConsoleRenderer (35Hz frames, a log every 51ms with staged keyframes batched, 110ms after a clear).
// Usage: bun bench/doom/frame-size.ts <frames.bin> [palette=site|64|32] [seconds=30]
import {
  CellBuffer,
  CssConsoleDriver,
  type ConsoleTarget,
} from "../../packages/core/src/index";
import { drawPixels } from "../../packages/core/src/pixels";
import {
  DOOM_PALETTE_32,
  DOOM_PALETTE_64,
} from "../../apps/web/src/demos/doom/palette";

const f = new Uint8Array(
  await Bun.file(process.argv[2] ?? "bench/doom/out/frames.bin").arrayBuffer(),
);
const pal = process.argv[3] ?? "site";
const seconds = Number(process.argv[4] ?? 30);
const dv = new DataView(f.buffer);
const W = dv.getUint16(0, true);
const H = dv.getUint16(2, true);
const N = dv.getUint32(4, true);
const frames = Array.from(
  { length: N },
  (_, i) => new Uint32Array(f.buffer, 8 + i * W * H * 4, W * H),
);
const palette =
  pal === "64" ? DOOM_PALETTE_64 : pal === "32" ? DOOM_PALETTE_32 : undefined;

interface Log {
  chars: number;
  urlChars: number;
  images: number;
  pngChars: number[];
  encodeMs: number;
  cleared: boolean;
}
const logs: Log[] = [];
let clears = 0;
let pending: { chars: number; url: string } | null = null;
const target: ConsoleTarget = {
  clear() {
    clears++;
  },
  log(...args: unknown[]) {
    let chars = 0;
    let url = "";
    for (const a of args) {
      const s = a as string;
      chars += s.length;
      const m = /url\("([^"]*)"\)/.exec(s);
      if (m) url += m[1];
    }
    pending = { chars, url };
  },
};
const cols = 120;
const rows = 40;
const driver = new CssConsoleDriver({
  console: target,
  clear: "append",
  curtain: true,
  browser: "chromium",
});
const buf = new CellBuffer(cols, rows);
const paint = (i: number): void => {
  buf.clear(0x000000ff);
  drawPixels(buf, {
    x: 2,
    y: 0,
    width: cols - 4,
    height: rows - 2,
    source: { width: W, height: H, data: frames[i]! },
    pixelAspect: 5 / 6,
    palette,
  });
  const credit = "DOOM shareware © 1993–1995 id Software";
  for (let x = 0; x < credit.length; x++)
    buf.setCell(41 + x, rows - 1, credit[x]!, 0x71717aff, 0);
};

const T = 1000 / 35;
let lastEmit = -Infinity;
let lastCleared = false;
let flushAt: number | null = null;
const emit = (): void => {
  flushAt = null;
  pending = null;
  const t0 = performance.now();
  const res = driver.render(buf);
  const ms = performance.now() - t0;
  if (res.skipped || pending === null) return;
  const p = pending as { chars: number; url: string };
  const pngs = [...p.url.matchAll(/base64,([A-Za-z0-9+/=]+)/g)].map(
    (m) => m[1]!.length,
  );
  logs.push({
    chars: p.chars,
    urlChars: p.url.length,
    images: pngs.length,
    pngChars: pngs,
    encodeMs: ms,
    cleared: res.cleared === true,
  });
};
const total = Math.min(N, Math.round((seconds * 1000) / T));
const stageMs: number[] = [];
for (let k = 0; k < total; k++) {
  const t = k * T;
  if (flushAt !== null && flushAt <= t) {
    lastEmit = flushAt;
    emit();
    lastCleared = logs.at(-1)?.cleared ?? false;
  }
  paint(k);
  const interval = lastCleared ? 110 : 51;
  if (t - lastEmit < interval - 1) {
    const t0 = performance.now();
    const staged = driver._stageKeyframe(buf, t);
    stageMs.push(performance.now() - t0);
    if (staged || driver._hasStagedKeyframes) flushAt ??= lastEmit + interval;
  } else {
    lastEmit = t;
    emit();
    lastCleared = logs.at(-1)?.cleared ?? false;
  }
}

const sum = (a: number[]): number => a.reduce((s, x) => s + x, 0);
const pct = (a: number[], p: number): number =>
  a.slice().sort((x, y) => x - y)[Math.floor(a.length * p)] ?? 0;
const visual = sum(logs.map((l) => Math.max(1, l.images)));
const firstPng = logs.map((l) => l.pngChars[0] ?? 0);
const deltaPng = logs.flatMap((l) => l.pngChars.slice(1));
const simSeconds = (total * T) / 1000;
console.log(
  JSON.stringify(
    {
      palette: pal,
      simSeconds: +simSeconds.toFixed(1),
      logs: logs.length,
      visualFrames: visual,
      clears,
      clearsPer30s: +((clears - 1) * (30 / simSeconds)).toFixed(1),
      logsPerClear: +(logs.length / Math.max(1, clears)).toFixed(1),
      charsPerLog: Math.round(sum(logs.map((l) => l.chars)) / logs.length),
      urlCharsPerLog: Math.round(
        sum(logs.map((l) => l.urlChars)) / logs.length,
      ),
      charsPerVisualFrame: Math.round(sum(logs.map((l) => l.chars)) / visual),
      imagesPerLog: +(visual / logs.length).toFixed(2),
      fullPngB64Mean: Math.round(sum(firstPng) / firstPng.length),
      deltaPngB64Mean: Math.round(sum(deltaPng) / Math.max(1, deltaPng.length)),
      renderMsP50: +pct(
        logs.map((l) => l.encodeMs),
        0.5,
      ).toFixed(2),
      renderMsP95: +pct(
        logs.map((l) => l.encodeMs),
        0.95,
      ).toFixed(2),
      renderMsTotal: +sum(logs.map((l) => l.encodeMs)).toFixed(0),
      stageMsTotal: +sum(stageMs).toFixed(0),
    },
    null,
    1,
  ),
);
