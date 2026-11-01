#!/usr/bin/env bun
/**
 * Renders one /learn chapter as a narrated video.
 *
 *   bun media/learn/render.ts getting-started
 *
 * See README.md for options and the pipeline.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { captureLive } from "./lib/capture";
import { vtt } from "./lib/captions";
import { OUT, REPO, ROOT } from "./lib/env";
import type { ChapterScript } from "./lib/script";
import { stopServers } from "./lib/servers";
import { buildTimeline, TRANSITION } from "./lib/timeline";
import { defaultProviderName, provider as makeProvider } from "./lib/tts";
import { jobDir, produce, type Job } from "./produce";
import { cueResolver } from "./stage/common";
import type { Timeline } from "./stage/types";

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    provider: { type: "string" },
    fps: { type: "string", default: "60" },
    workers: { type: "string" },
    subtitles: { type: "boolean", default: false },
    music: { type: "boolean", default: false },
    recapture: { type: "boolean", default: false },
    scene: { type: "string" },
    still: { type: "string", multiple: true },
    "timeline-only": { type: "boolean", default: false },
    "no-720p": { type: "boolean", default: false },
    "no-review": { type: "boolean", default: false },
    "no-film": { type: "boolean", default: false },
    vm: { type: "boolean", default: false },
    "vm-name": { type: "string" },
    "keep-vm": { type: "boolean", default: false },
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
const job = jobDir(slug);
const captureDir = join(job, "capture");
mkdirSync(publish, { recursive: true });
mkdirSync(work, { recursive: true });
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

// The job bundle: everything produce.ts needs, nothing secret (narration is already audio).
mkdirSync(join(job, "clips"), { recursive: true });
mkdirSync(join(job, "fonts"), { recursive: true });
for (const f of readdirSync(join(REPO, "apps/web/public/fonts"))) copyFileSync(join(REPO, "apps/web/public/fonts", f), join(job, "fonts", f));
const clips = built.clips.map((c) => {
  copyFileSync(c.file, join(job, "clips", basename(c.file)));
  return { ...c, file: relative(ROOT, join(job, "clips", basename(c.file))) };
});
const used = new Set(clips.map((c) => basename(c.file)));
for (const f of readdirSync(join(job, "clips"))) if (!used.has(f)) rmSync(join(job, "clips", f));
writeFileSync(join(job, `${slug}.vtt`), vtt(built.captions));
const bundle: Job = { slug, title: chapter.title, timeline, clips, narration: { provider: providerName, ...tts.describe() } };
writeFileSync(join(job, "job.json"), JSON.stringify(bundle));

const produceArgs = [
  ...(opt.scene ? ["--scene", opt.scene] : []),
  ...(opt.still ?? []).flatMap((s) => ["--still", s]),
  ...(opt.workers ? ["--workers", opt.workers] : []),
  ...(opt.music ? ["--music"] : []),
  ...(opt["no-720p"] ? ["--no-720p"] : []),
  ...(opt["no-review"] ? ["--no-review"] : []),
];

if (!opt.vm) {
  await produce(slug, { scene: opt.scene, still: opt.still, workers: opt.workers ? Number(opt.workers) : 6, music: opt.music, no720p: opt["no-720p"], noReview: opt["no-review"], log });
  process.exit(0);
}

// On an exe.dev VM (exe-video skill): sync media/learn plus this job, produce there, pull the results, pause the VM.
const VM = [process.execPath, join(homedir(), ".config/opencode/skills/exe-video/scripts/video-vm.ts")];
const vmName = opt["vm-name"] ? ["--name", opt["vm-name"]] : [];
const vm = (args: string[]): void => {
  const p = Bun.spawnSync([...VM, ...args], { stdout: "inherit", stderr: "inherit" });
  if (p.exitCode !== 0) throw new Error(`video-vm ${args[0]} failed (${p.exitCode})`);
};
const rel = relative(ROOT, job);
const checks = opt.scene || opt.still?.length ? "" : ` && bun check-holds.ts ${slug}`;
log(`▼ producing on a VM${vmName.length ? ` (${vmName[1]})` : ""}`);
try {
  vm(["run", ROOT, ...vmName, "--include", rel, "--", `bun produce.ts ${slug} ${produceArgs.map((a) => JSON.stringify(a)).join(" ")}${checks}`]);
  if (opt.still?.length || opt.scene) vm(["pull", ROOT, ...vmName, `out/work/${slug}/`, join(work, "vm") + "/"]);
  else {
    vm(["pull", ROOT, ...vmName, `out/learn/${slug}/`, publish + "/"]);
    mkdirSync(join(OUT, "review"), { recursive: true });
    vm(["pull", ROOT, ...vmName, `out/review/${slug}/`, join(OUT, "review", slug) + "/"]);
    log(`  → ${publish}`);
  }
} finally {
  if (!opt["keep-vm"]) vm(["stop", ...vmName]);
}
process.exit(0);
