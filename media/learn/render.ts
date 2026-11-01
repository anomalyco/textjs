#!/usr/bin/env bun
/**
 * Renders one /learn chapter as a narrated video.
 *
 *   bun media/learn/render.ts getting-started
 *
 * See README.md for options and the pipeline.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { soundtrack } from "./lib/audio";
import { captureLive } from "./lib/capture";
import { vtt } from "./lib/captions";
import { duration as probeDuration, FFMPEG, OUT, ROOT, run } from "./lib/env";
import { renderVideo, serveStage, still } from "./lib/frames";
import { review } from "./lib/review";
import type { ChapterScript } from "./lib/script";
import { stopServers } from "./lib/servers";
import { buildTimeline, TRANSITION } from "./lib/timeline";
import { defaultProviderName, provider as makeProvider } from "./lib/tts";
import { cueResolver } from "./stage/common";
import type { Timeline } from "./stage/types";

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    provider: { type: "string" },
    fps: { type: "string", default: "60" },
    workers: { type: "string", default: "6" },
    subtitles: { type: "boolean", default: false },
    music: { type: "boolean", default: false },
    recapture: { type: "boolean", default: false },
    scene: { type: "string" },
    still: { type: "string", multiple: true },
    "timeline-only": { type: "boolean", default: false },
    "no-720p": { type: "boolean", default: false },
    "no-review": { type: "boolean", default: false },
    "no-film": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const slug = positionals[0];
if (opt.help || !slug) {
  console.log(readFileSync(join(ROOT, "README.md"), "utf8").split("## Options")[1]?.split("\n## ")[0] ?? "bun media/learn/render.ts <slug>");
  process.exit(slug ? 0 : 1);
}

const log = (s: string): void => console.log(s);
const scriptFile = ["tsx", "ts"].map((ext) => join(ROOT, "chapters", `${slug}.${ext}`)).find(existsSync);
if (!scriptFile) throw new Error(`No chapter script at media/learn/chapters/${slug}.tsx`);
const script = ((await import(scriptFile)) as { default: ChapterScript }).default;
const { getChapter, chapterIndex, CHAPTERS } = await import("./lib/course");
const chapter = getChapter(slug);
if (!chapter) throw new Error(`No chapter "${slug}" in apps/web/src/learn/course.ts`);

const fps = Number(opt.fps);
const providerName = opt.provider ?? defaultProviderName();
const tts = makeProvider(providerName);
const publish = join(OUT, "learn", slug);
const work = join(OUT, "work", slug);
const captureDir = join(work, "capture");
mkdirSync(publish, { recursive: true });
mkdirSync(captureDir, { recursive: true });

log(`▼ ${chapter.title} · narration (${providerName} ${JSON.stringify(tts.describe())})`);
const built = await buildTimeline(script, tts, log);
log(`  ${built.duration.toFixed(1)}s total · ${built.billed} characters synthesized this run`);

const timeline: Timeline = {
  slug,
  fps,
  duration: built.duration,
  transition: TRANSITION,
  chapter: { number: chapterIndex(slug) + 1, title: chapter.title, total: CHAPTERS.length },
  subtitles: opt.subtitles,
  captions: built.captions,
  scenes: built.scenes,
};
writeFileSync(join(publish, `${slug}.vtt`), vtt(built.captions));
writeFileSync(join(work, "timeline.json"), JSON.stringify(timeline, null, 2));
if (opt["timeline-only"]) process.exit(0);

// Film live scenes (cached by what they film and when).
try {
  for (const [i, spec] of script.scenes.entries()) {
    if (!spec.live || opt["no-film"]) continue;
    const data = timeline.scenes[i]!;
    const cue = cueResolver(data);
    const hash = createHash("sha256").update(JSON.stringify({ live: spec.live, duration: data.duration, cues: data.cues, v: 4 })).digest("hex").slice(0, 16);
    const dir = join(captureDir, spec.id);
    const meta = join(dir, "capture.json");
    if (!opt.recapture && existsSync(meta)) {
      const cached = JSON.parse(readFileSync(meta, "utf8"));
      if (cached.hash === hash) {
        data.capture = cached.capture;
        log(`  film ${spec.id}: cached`);
        continue;
      }
    }
    log(`  film ${spec.id}: ${data.duration.toFixed(1)}s live…`);
    data.capture = await captureLive(spec.live, { dir, url: `/capture/${spec.id}`, duration: data.duration, cue: (r) => cue(r), log });
    log(`    ${data.capture.dt.frames.length} DevTools frames, ${data.capture.site.frames.length} page frames, boxes: ${Object.keys(data.capture.boxes).join(", ") || "none"}`);
    writeFileSync(meta, JSON.stringify({ hash, capture: data.capture }));
  }
} finally {
  await stopServers();
}
writeFileSync(join(work, "timeline.json"), JSON.stringify(timeline, null, 2));

const stage = await serveStage(timeline, captureDir);
try {
  if (opt.still?.length) {
    for (const s of opt.still) {
      // `12.5`, `scene:try`, `scene:try+3`
      const m = /^scene:([\w-]+)(?:\+([\d.]+))?$/.exec(s);
      const sc = m ? timeline.scenes.find((x) => x.id === m[1]) : undefined;
      const t = sc ? sc.start + Number(m![2] ?? Math.min(2.5, sc.duration / 2)) : Number(s);
      const file = join(work, `still-${s.replace(/[^\w.+-]/g, "_")}.png`);
      await still(stage.origin, t, file);
      log(`  still ${t.toFixed(2)}s → ${file}`);
    }
    process.exit(0);
  }

  let from = 0;
  let to = timeline.duration;
  if (opt.scene) {
    const sc = timeline.scenes.find((x) => x.id === opt.scene);
    if (!sc) throw new Error(`No scene ${opt.scene}`);
    from = Math.max(0, sc.start - TRANSITION);
    to = Math.min(timeline.duration, sc.start + sc.duration + TRANSITION);
  }
  log(`▼ frames ${from.toFixed(1)}–${to.toFixed(1)}s at ${fps} fps`);
  const silent = join(work, "video.mp4");
  await renderVideo({ origin: stage.origin, fps, from, to, out: silent, workers: Number(opt.workers), work: join(work, "segments"), log });

  log("▼ audio");
  const audio = soundtrack(built.clips, timeline.duration, work, { music: opt.music });
  log(`  ${audio.lufs} LUFS integrated, ${audio.peak} dBFS true peak`);

  const name = opt.scene ? `${slug}-${opt.scene}-preview` : `${slug}-1080p`;
  const out = join(opt.scene ? work : publish, `${name}.mp4`);
  run([
    FFMPEG, "-y", "-loglevel", "error", "-i", silent, "-ss", from.toFixed(3), "-t", (to - from).toFixed(3), "-i", audio.file,
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-metadata", `title=Learn Text.js · ${String(timeline.chapter.number).padStart(2, "0")} ${chapter.title}`,
    "-movflags", "+faststart", "-shortest", out,
  ]);
  log(`  → ${out} (${probeDuration(out).toFixed(1)}s, ${(statSync(out).size / 1e6).toFixed(1)} MB)`);
  if (opt.scene) process.exit(0);

  const cover = timeline.scenes[0]!;
  const poster = join(publish, `${slug}-poster.jpg`);
  run([FFMPEG, "-y", "-loglevel", "error", "-ss", (cover.start + cover.duration - TRANSITION / 2 - 0.4).toFixed(3), "-i", out, "-frames:v", "1", "-q:v", "2", poster]);
  if (!opt["no-720p"]) {
    const v720 = join(publish, `${slug}-720p.mp4`);
    run([FFMPEG, "-y", "-loglevel", "error", "-i", out, "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", v720]);
    log(`  → ${v720} (${(statSync(v720).size / 1e6).toFixed(1)} MB)`);
  }
  writeFileSync(
    join(publish, "manifest.json"),
    JSON.stringify(
      {
        slug,
        chapter: timeline.chapter,
        duration: Number(timeline.duration.toFixed(2)),
        files: { "1080p": `${slug}-1080p.mp4`, "720p": opt["no-720p"] ? null : `${slug}-720p.mp4`, poster: `${slug}-poster.jpg`, captions: `${slug}.vtt` },
        narration: { provider: providerName, ...tts.describe() },
        loudness: { lufs: audio.lufs, truePeak: audio.peak },
        scenes: timeline.scenes.map((s) => ({ id: s.id, kind: s.kind, start: Number(s.start.toFixed(2)), duration: Number(s.duration.toFixed(2)) })),
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(work, "holds.json"),
    JSON.stringify(
      timeline.scenes.filter((s) => s.kind === "title").map((s) => ({ title: s.id, from: s.start + 2.4, to: s.start + s.duration - TRANSITION / 2 - 0.15 })),
      null,
      2,
    ),
  );
  if (!opt["no-review"]) {
    const dir = join(OUT, "review", slug);
    rmSync(dir, { recursive: true, force: true });
    review(out, timeline.scenes, dir, TRANSITION);
    log(`  review → ${dir}`);
  }
} finally {
  stage.stop();
}
process.exit(0);
