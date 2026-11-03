// Turns a capture into a job bundle for produce.ts (run on the VM): picks the clip's frames, drops the empty-console
// repaints between Text.js's periodic console.clear() and the next frame, measures how far the console picture trails
// the engine, and synthesizes the sound track from the logged engine calls.
//
//   bun media/doom-video/prepare.ts <a|b|c>   → out/job/<cut>/
import { linkSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCapture, regionMeans } from "./lib/analyze";
import { COMPOSITIONS } from "./lib/geometry";
import { CLIP, LAYOUTS } from "./lib/layouts";
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
  for (let t = 5.5; t < CLIP.to; t += 0.005) {
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

// 3. Frames for the clip, as concat lists with durations (seconds from the clip start).
const duration = CLIP.to - CLIP.from;
function pickFrames(name: "dt" | "page", frames: Array<{ t: number; file: string }>, skip: Set<number>) {
  mkdirSync(join(job, name), { recursive: true });
  const kept = frames.map((f, i) => ({ ...f, i, s: rel(f.t) - CLIP.from })).filter((f) => !skip.has(f.i));
  let first = 0;
  for (let k = 0; k < kept.length; k++) if (kept[k]!.s <= 0) first = k;
  const used = kept.slice(first).filter((f) => f.s < duration);
  const list = used.map((f, k) => {
    const start = k === 0 ? 0 : f.s;
    const end = k + 1 < used.length ? used[k + 1]!.s : duration;
    linkSync(join(cap.dir, name, f.file), join(job, name, f.file));
    return { file: f.file, dur: Math.max(0.001, end - start) };
  });
  writeFileSync(join(job, name, "list.txt"), list.map((f) => `file '${f.file}'\nduration ${f.dur.toFixed(6)}`).join("\n") + `\nfile '${list.at(-1)!.file}'\n`);
  return list.length;
}
const dtFrames = pickFrames("dt", cap.dt, flashes);
const pageFrames = layout.filmPage && cap.page ? pickFrames("page", cap.page, new Set()) : 0;

// 4. Sound: the engine's calls, on the clip's clock, shifted by the picture's lag.
const events: SoundEvent[] = [];
for (const e of cap.events) {
  const t = (rel(e[0] as number) - CLIP.from) * 1000 + lag;
  if (e[1] === "start") events.push({ t, kind: "start", lump: e[2] as number, channel: e[3] as number, vol: e[4] as number, sep: e[5] as number });
  else if (e[1] === "update") events.push({ t, kind: "update", channel: e[2] as number, vol: e[3] as number, sep: e[4] as number });
  else if (e[1] === "stop") events.push({ t, kind: "stop", channel: e[2] as number });
}
const lumps = readWad();
writeWav(join(job, "sound.wav"), synthesize(events, lumps, duration * 1000 + 1500));

// Check the page's sound calls against an offline run of the same tics (same sequence = the page's audio played normally).
const offline = JSON.parse(readFileSync(join(OUT, "preview", "sounds.json"), "utf8")) as SoundEvent[];
const sig = (e: SoundEvent): string => (e.kind === "start" ? `start ${e.lump} ${e.channel}` : `${e.kind} ${e.channel}`);
const pageSeq = events.filter((e) => e.t <= duration * 1000 - 500).map(sig);
const offSeq = offline.filter((e) => e.t / 1000 >= CLIP.from - 1).map(sig);
let match = 0;
while (match < pageSeq.length && pageSeq[match] === offSeq[match]) match++;
const starts = events.filter((e) => e.kind === "start" && e.t >= 0 && e.t < duration * 1000);
console.error(`${cut}: ${starts.length} sounds in the clip; page and offline sound calls agree for ${match}/${pageSeq.length}`);

writeFileSync(join(job, "job.json"), JSON.stringify({ cut, layout, comp, clip: CLIP, duration, lag, flashes: flashes.size, dtFrames, pageFrames, sounds: starts.map((e) => ({ t: +(e.t / 1000).toFixed(3), name: lumps[(e as { lump: number }).lump]!.name })) }, null, 2));
console.log(JSON.stringify({ cut, duration, lag, dtFrames, pageFrames }));
