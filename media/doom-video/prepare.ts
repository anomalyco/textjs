// Turns a capture into a job bundle for produce.ts (run on the VM): drops the empty-console repaints between
// Text.js's periodic console.clear() and the next frame, measures how far the console picture trails the engine, cuts
// the edit (EDIT in lib/layouts.ts) and synthesizes its sound track from the logged engine calls.
//
//   bun media/doom-video/prepare.ts <a|b|c>   → out/job/<cut>/
import { linkSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCapture, regionMeans } from "./lib/analyze";
import { COMPOSITIONS } from "./lib/geometry";
import { EDIT, LAYOUTS } from "./lib/layouts";
import { OUT } from "./lib/site";
import type { SoundEvent } from "./lib/sound-log";
import { synthesize, writeWav } from "./lib/synth";
import { readWad } from "./lib/wad";

const cut = process.argv[2] as "a" | "b" | "c";
const layout = LAYOUTS[cut];
const comp = COMPOSITIONS[cut];
if (!layout) throw new Error("usage: prepare.ts <a|b|c>");
const cap = loadCapture(join(OUT, "capture", cut));
const job = join(OUT, "job", cut);
rmSync(job, { recursive: true, force: true });
mkdirSync(job, { recursive: true });
const rel = (epochMs: number): number => (epochMs - cap.t0) / 1000;
const px = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x * layout.dpr, y: r.y * layout.dpr, w: r.w * layout.dpr, h: r.h * layout.dpr });
const lum = ([r, g, b]: [number, number, number]): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// 1. Empty-console repaints: the black box's edge shows DevTools' grey instead.
const edge = regionMeans(join(cap.dir, "dt"), cap.dt.map((f) => f.file), px(comp.boxEdge));
const flashes = new Set<number>();
edge.forEach((m, i) => {
  if (lum(m) > 25) flashes.add(i);
});
console.error(`${cut}: ${flashes.size} empty-console repaints dropped at ${[...flashes].map((i) => rel(cap.dt[i]!.t).toFixed(2)).join(", ")}s`);

// 2. Picture lag: correlate the engine's frame brightness with the console picture's.
const pic = regionMeans(join(cap.dir, "dt"), cap.dt.map((f) => f.file), px(comp.picture));
const draws = cap.events.filter((e) => e[1] === "draw").map((e) => ({ t: rel(e[0] as number), l: lum([e[2], e[3], e[4]] as [number, number, number]) }));
const shown = cap.dt.map((f, i) => ({ t: rel(f.t), l: lum(pic[i]!) })).filter((_, i) => !flashes.has(i));
const sampleAt = (series: Array<{ t: number; l: number }>, t: number): number => {
  let lo = 0;
  let hi = series.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (series[mid]!.t <= t) lo = mid;
    else hi = mid - 1;
  }
  return series[lo]!.l;
};
const corr = (lagMs: number): number => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let t = 5.5; t < shown.at(-1)!.t - 0.5; t += 0.005) {
    xs.push(sampleAt(draws, t));
    ys.push(sampleAt(shown, t + lagMs / 1000));
  }
  const mx = xs.reduce((a, b) => a + b) / xs.length;
  const my = ys.reduce((a, b) => a + b) / ys.length;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
    syy += (ys[i]! - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
};
let lag = 0;
let best = -Infinity;
for (let l = 0; l <= 250; l += 5) {
  const c = corr(l);
  if (c > best) [best, lag] = [c, l];
}
console.error(`${cut}: console picture trails the engine by ${lag} ms (r = ${best.toFixed(3)})`);

// 3. The edit, from the log (so a fresh capture lands on the same beats). The sound starts on frame 1 with DEMO1's
// first sound, over a short hold on the title screen; the picture then cuts into the demo where that sound has got
// to, so everything after the cut is in sync. It ends just after the last kill before EDIT.lastKillBefore. Times are
// picture times (engine time + lag), in seconds of Doom's clock.
const lumps = readWad();
const lagS = lag / 1000;
const starts = cap.events.filter((e) => e[1] === "start").map((e) => ({ t: rel(e[0] as number), name: lumps[e[2] as number]!.name }));
const titleSig = cap.events.find((e) => e[1] === "draw") as number[];
const demoDraw = cap.events.find((e) => e[1] === "draw" && rel(e[0] as number) > 1 && Math.abs((e[2] as number) - titleSig[2]!) + Math.abs((e[3] as number) - titleSig[3]!) + Math.abs((e[4] as number) - titleSig[4]!) > 30);
if (!demoDraw) throw new Error("the demo never started");
const demoStart = rel(demoDraw[0] as number) + lagS;
const firstSound = starts.find((e) => e.t > rel(demoDraw[0] as number));
const kill = starts.filter((e) => /DTH/.test(e.name) && e.t < EDIT.lastKillBefore).at(-1);
if (!firstSound || !kill) throw new Error("couldn't find the first sound or the last kill");
const segments = [
  { from: demoStart - EDIT.titleHold - 0.05, to: demoStart - 0.05 },
  { from: firstSound.t + lagS + EDIT.titleHold, to: kill.t + lagS + EDIT.afterKill },
];
const duration = segments.reduce((n, g) => n + g.to - g.from, 0);
/** Output time of a picture time from the first sound on. */
const outTime = (picture: number): number => picture - (firstSound.t + lagS);
console.error(
  `${cut}: sound from ${firstSound.name} at ${firstSound.t.toFixed(2)} s over ${EDIT.titleHold} s of title, picture cuts in at ${segments[1]!.from.toFixed(2)} s, ends ${EDIT.afterKill} s after ${kill.name} at ${kill.t.toFixed(2)} s → ${duration.toFixed(2)} s of footage`,
);

// 4. Frames for each segment, as one concat list with durations.
function pickFrames(name: "dt" | "page", frames: Array<{ t: number; file: string }>, skip: Set<number>) {
  mkdirSync(join(job, name), { recursive: true });
  const kept = frames.map((f, i) => ({ ...f, i, s: rel(f.t) })).filter((f) => !skip.has(f.i));
  const list: Array<{ file: string; dur: number }> = [];
  for (const g of segments) {
    let first = 0;
    for (let k = 0; k < kept.length; k++) if (kept[k]!.s <= g.from) first = k;
    const used = kept.slice(first).filter((f) => f.s < g.to);
    used.forEach((f, k) => {
      const start = k === 0 ? g.from : f.s;
      const end = k + 1 < used.length ? used[k + 1]!.s : g.to;
      try {
        linkSync(join(cap.dir, name, f.file), join(job, name, f.file));
      } catch {}
      list.push({ file: f.file, dur: Math.max(0.001, end - start) });
    });
  }
  writeFileSync(join(job, name, "list.txt"), list.map((f) => `file '${f.file}'\nduration ${f.dur.toFixed(6)}`).join("\n") + `\nfile '${list.at(-1)!.file}'\n`);
  return list.length;
}
const dtFrames = pickFrames("dt", cap.dt, flashes);
const pageFrames = layout.filmPage && cap.page ? pickFrames("page", cap.page, new Set()) : 0;

// 5. Sound: the engine's calls from the first sound on, on the output clock, shifted by the picture's lag.
const events: SoundEvent[] = [];
for (const e of cap.events) {
  const picture = rel(e[0] as number) + lagS;
  if (picture < firstSound.t + lagS - 0.001) continue;
  const t = outTime(picture) * 1000;
  if (e[1] === "start") events.push({ t, kind: "start", lump: e[2] as number, channel: e[3] as number, vol: e[4] as number, sep: e[5] as number });
  else if (e[1] === "update") events.push({ t, kind: "update", channel: e[2] as number, vol: e[3] as number, sep: e[4] as number });
  else if (e[1] === "stop") events.push({ t, kind: "stop", channel: e[2] as number });
}
writeWav(join(job, "sound.wav"), synthesize(events, lumps, duration * 1000 + 1500));
const sounds = events.filter((e) => e.kind === "start" && e.t < duration * 1000).map((e) => ({ t: +(e.t / 1000).toFixed(3), name: lumps[(e as { lump: number }).lump]!.name }));
console.error(`${cut}: ${sounds.length} sounds; the first, ${sounds[0]?.name}, at ${sounds[0]?.t.toFixed(3)} s`);

writeFileSync(
  join(job, "job.json"),
  JSON.stringify({ cut, layout, comp, segments, duration, lag, poster: outTime(EDIT.posterAt), flashes: flashes.size, dtFrames, pageFrames, sounds }, null, 2),
);
console.log(JSON.stringify({ cut, duration: +duration.toFixed(3), lag, dtFrames, pageFrames }));
