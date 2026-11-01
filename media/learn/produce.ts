#!/usr/bin/env bun
/**
 * The heavy half of a render: frames, soundtrack, encodes, poster, review. It reads only a job bundle that
 * render.ts prepared on the Mac (`out/job/<slug>/`: timeline, filmed footage, narration clips, fonts), needs no
 * secrets, no repo build and no network, so it runs the same locally or on an exe.dev VM (`render.ts --vm`).
 *
 *   bun media/learn/produce.ts <slug> [--scene <id>] [--still <t|scene:id[+s]>]… [--workers 6] [--music]
 *                                     [--no-720p] [--no-review]
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { soundtrack } from "./lib/audio";
import { duration as probeDuration, FFMPEG, OUT, ROOT, run } from "./lib/env";
import { renderVideo, serveStage, still } from "./lib/frames";
import { review } from "./lib/review";
import type { Clip } from "./lib/timeline";
import type { Timeline } from "./stage/types";

/** What render.ts hands over (paths relative to media/learn). */
export interface Job {
  slug: string;
  title: string;
  timeline: Timeline;
  clips: Clip[];
  narration: Record<string, unknown>;
}

export function jobDir(slug: string): string {
  return join(OUT, "job", slug);
}

export interface ProduceOptions {
  scene?: string;
  still?: string[];
  workers?: number;
  music?: boolean;
  no720p?: boolean;
  noReview?: boolean;
  log?: (s: string) => void;
}

export async function produce(slug: string, opts: ProduceOptions = {}): Promise<void> {
  const log = opts.log ?? ((s: string) => console.log(s));
  const dir = jobDir(slug);
  const job = JSON.parse(readFileSync(join(dir, "job.json"), "utf8")) as Job;
  const timeline = job.timeline;
  const transition = timeline.transition;
  const publish = join(OUT, "learn", slug);
  const work = join(OUT, "work", slug);
  mkdirSync(publish, { recursive: true });
  mkdirSync(work, { recursive: true });
  const clips = job.clips.map((c) => ({ ...c, file: join(ROOT, c.file) }));

  const stage = await serveStage(timeline, join(dir, "capture"), join(dir, "fonts"));
  try {
    if (opts.still?.length) {
      for (const s of opts.still) {
        const m = /^scene:([\w-]+)(?:\+([\d.]+))?$/.exec(s);
        const sc = m ? timeline.scenes.find((x) => x.id === m[1]) : undefined;
        const t = sc ? sc.start + Number(m![2] ?? Math.min(2.5, sc.duration / 2)) : Number(s);
        const file = join(work, `still-${s.replace(/[^\w.+-]/g, "_")}.png`);
        await still(stage.origin, t, file);
        log(`  still ${t.toFixed(2)}s → ${file}`);
      }
      return;
    }

    let from = 0;
    let to = timeline.duration;
    if (opts.scene) {
      const sc = timeline.scenes.find((x) => x.id === opts.scene);
      if (!sc) throw new Error(`No scene ${opts.scene}`);
      from = Math.max(0, sc.start - transition);
      to = Math.min(timeline.duration, sc.start + sc.duration + transition);
    }
    const workers = opts.workers ?? Math.max(2, Math.min(8, cpus().length - 1));
    log(`▼ frames ${from.toFixed(1)}–${to.toFixed(1)}s at ${timeline.fps} fps · ${workers} workers`);
    const silent = join(work, "video.mp4");
    await renderVideo({ origin: stage.origin, fps: timeline.fps, from, to, out: silent, workers, work: join(work, "segments"), log });

    log("▼ audio");
    const audio = soundtrack(clips, timeline.duration, work, { music: opts.music });
    log(`  ${audio.lufs} LUFS integrated, ${audio.peak} dBFS true peak`);

    const name = opts.scene ? `${slug}-${opts.scene}-preview` : `${slug}-1080p`;
    const out = join(opts.scene ? work : publish, `${name}.mp4`);
    run([
      FFMPEG, "-y", "-loglevel", "error", "-i", silent, "-ss", from.toFixed(3), "-t", (to - from).toFixed(3), "-i", audio.file,
      "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
      "-metadata", `title=Learn Text.js · ${String(timeline.chapter.number).padStart(2, "0")} ${job.title}`,
      "-movflags", "+faststart", "-shortest", out,
    ]);
    log(`  → ${out} (${probeDuration(out).toFixed(1)}s, ${(statSync(out).size / 1e6).toFixed(1)} MB)`);
    if (opts.scene) return;

    const cover = timeline.scenes[0]!;
    const poster = join(publish, `${slug}-poster.jpg`);
    run([FFMPEG, "-y", "-loglevel", "error", "-ss", (cover.start + cover.duration - transition / 2 - 0.4).toFixed(3), "-i", out, "-frames:v", "1", "-q:v", "2", poster]);
    if (!opts.no720p) {
      const v720 = join(publish, `${slug}-720p.mp4`);
      run([FFMPEG, "-y", "-loglevel", "error", "-i", out, "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", v720]);
      log(`  → ${v720} (${(statSync(v720).size / 1e6).toFixed(1)} MB)`);
    }
    writeFileSync(join(publish, `${slug}.vtt`), readFileSync(join(dir, `${slug}.vtt`)));
    writeFileSync(
      join(publish, "manifest.json"),
      JSON.stringify(
        {
          slug,
          chapter: timeline.chapter,
          duration: Number(timeline.duration.toFixed(2)),
          files: { "1080p": `${slug}-1080p.mp4`, "720p": opts.no720p ? null : `${slug}-720p.mp4`, poster: `${slug}-poster.jpg`, captions: `${slug}.vtt` },
          narration: job.narration,
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
        timeline.scenes.filter((s) => s.kind === "title").map((s) => ({ title: s.id, from: s.start + 2.4, to: s.start + s.duration - transition / 2 - 0.15 })),
        null,
        2,
      ),
    );
    if (!opts.noReview) {
      const dirReview = join(OUT, "review", slug);
      rmSync(dirReview, { recursive: true, force: true });
      review(out, timeline.scenes, dirReview, transition);
      log(`  review → ${dirReview}`);
    }
  } finally {
    stage.stop();
  }
}

if (import.meta.main) {
  const { values: opt, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      scene: { type: "string" },
      still: { type: "string", multiple: true },
      workers: { type: "string" },
      music: { type: "boolean", default: false },
      "no-720p": { type: "boolean", default: false },
      "no-review": { type: "boolean", default: false },
    },
  });
  const slug = positionals[0];
  if (!slug || !existsSync(join(jobDir(slug), "job.json"))) throw new Error("usage: bun produce.ts <slug> (prepare the job with render.ts first)");
  await produce(slug, {
    scene: opt.scene,
    still: opt.still,
    workers: opt.workers ? Number(opt.workers) : undefined,
    music: opt.music,
    no720p: opt["no-720p"],
    noReview: opt["no-review"],
  });
  process.exit(0);
}
