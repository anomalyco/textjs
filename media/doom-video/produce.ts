// Composites, mixes and encodes one cut from its job bundle (out/job/<cut>/, written by prepare.ts). Runs on an
// exe.dev VM (see README.md); needs ffmpeg, Chromium (playwright-core) and the Geist font.
//
//   bun produce.ts <a|b|c>   → out/final/doom-<cut>-<ratio>.mp4, its poster, and out/review/<cut>/
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { END_CARD, FADE, TITLE, URL_TEXT, type Composition } from "./lib/geometry";
import type { Layout } from "./lib/layouts";

const cut = process.argv[2] as "a" | "b" | "c";
const ROOT = import.meta.dir;
const jobDir = join(ROOT, "out/job", cut);
const job = JSON.parse(readFileSync(join(jobDir, "job.json"), "utf8")) as { layout: Layout; comp: Composition; duration: number; clip: { from: number } };
const { layout, comp } = job;
const RATIO = { a: "16x9", b: "1x1", c: "9x16" }[cut];
const work = join(ROOT, "out/work", cut);
const final = join(ROOT, "out/final");
const review = join(ROOT, "out/review", cut);
for (const d of [work, review]) rmSync(d, { recursive: true, force: true });
for (const d of [work, final, review]) mkdirSync(d, { recursive: true });

const FPS = 60;
const D = job.duration;
const TOTAL = D + END_CARD;
const s = comp.scale;
/** A CSS-px rectangle of the window (origin: the window's top-left) on the canvas, snapped to even output pixels. */
const rect = (x: number, y: number, w: number, h: number) => {
  const even = (v: number) => Math.round(v / 2) * 2;
  const x0 = even(comp.x + x * s);
  const y0 = even(comp.y + y * s);
  return { x: x0, y: y0, w: even(comp.x + (x + w) * s) - x0, h: even(comp.y + (y + h) * s) - y0 };
};
const windowW = layout.dock === "side" && layout.filmPage ? layout.page.w + 1 + layout.dt.w : comp.dtCrop.w;
const contentTop = comp.bar;
const pageRect = layout.filmPage ? rect(0, contentTop, layout.page.w, layout.page.h) : null;
const dtRect =
  !layout.filmPage ? rect(0, 0, comp.dtCrop.w, comp.dtCrop.h) : layout.dock === "side" ? rect(layout.page.w + 1, contentTop, comp.dtCrop.w, comp.dtCrop.h) : rect(0, contentTop + layout.page.h, comp.dtCrop.w, comp.dtCrop.h);
const windowH = layout.filmPage ? (layout.dock === "side" ? contentTop + layout.page.h : contentTop + layout.page.h + comp.dtCrop.h) : comp.dtCrop.h;
const win = rect(0, 0, windowW, windowH);

function sh(cmd: string[]): string {
  const p = Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" });
  if (p.exitCode !== 0) throw new Error(`${cmd[0]} failed: ${p.stderr.toString().slice(-3000)}`);
  return p.stdout.toString() + p.stderr.toString();
}

// 1. Overlays: the window's frame (browser bar, rounded corners, border, splitter) with the title, and the end card.
const css = `
  * { margin: 0; box-sizing: border-box; }
  html, body { width: ${comp.canvas.w}px; height: ${comp.canvas.h}px; background: transparent; overflow: hidden; font-family: Geist, sans-serif; -webkit-font-smoothing: antialiased; }
  .abs { position: absolute; }
`;
const R = Math.round(10 * s);
const bar = comp.bar
  ? `<div class="abs" style="left:${win.x}px;top:${win.y}px;width:${win.w}px;height:${Math.round(comp.bar * s)}px;background:#1f1f1f;border-bottom:${Math.max(1, Math.round(s))}px solid #2f2f2f;border-radius:${R}px ${R}px 0 0">
      ${[0, 1, 2].map((i) => `<div class="abs" style="left:${Math.round((14 + i * 19) * s)}px;top:${Math.round(12 * s)}px;width:${Math.round(12 * s)}px;height:${Math.round(12 * s)}px;border-radius:50%;background:#3a3a3a"></div>`).join("")}
      <div class="abs" style="left:50%;top:${Math.round(6 * s)}px;transform:translateX(-50%);height:${Math.round(24 * s)}px;width:${Math.round(Math.min(360, windowW * 0.42) * s)}px;border-radius:${Math.round(7 * s)}px;background:#2b2b2b;color:#a1a1a1;font-size:${Math.round(13 * s)}px;display:flex;align-items:center;justify-content:center;letter-spacing:0.01em">${URL_TEXT}</div>
    </div>`
  : "";
const splitter =
  pageRect && layout.dock === "side"
    ? `<div class="abs" style="left:${pageRect.x + pageRect.w}px;top:${pageRect.y}px;width:${dtRect.x - pageRect.x - pageRect.w}px;height:${pageRect.h}px;background:#3c3c3c"></div>`
    : pageRect
      ? `<div class="abs" style="left:${dtRect.x}px;top:${dtRect.y}px;width:${dtRect.w}px;height:${Math.max(1, Math.round(s))}px;background:#3c3c3c"></div>`
      : "";
const frameHtml = `<style>${css}</style>
  <div class="abs" style="left:${win.x}px;top:${win.y}px;width:${win.w}px;height:${win.h}px;border-radius:${R}px;box-shadow:0 0 0 4000px #000"></div>
  ${bar}${splitter}
  <div class="abs" style="left:${win.x}px;top:${win.y}px;width:${win.w}px;height:${win.h}px;border-radius:${R}px;border:${Math.max(1, Math.round(s))}px solid rgba(255,255,255,0.14)"></div>
  <div class="abs" style="left:0;width:100%;top:${comp.title.y}px;transform:translateY(-50%);text-align:center;color:#ededed;font-size:${comp.title.size}px;font-weight:600;letter-spacing:-0.025em">${TITLE}</div>`;
const endHtml = `<style>${css} html, body { background: #000; }</style>
  <div class="abs" style="left:0;width:100%;top:50%;transform:translateY(-50%);text-align:center;color:#ededed;font-size:${comp.url.size}px;font-weight:600;letter-spacing:-0.03em">${URL_TEXT}</div>`;

const browser = await chromium.launch();
const pg = await browser.newPage({ viewport: { width: comp.canvas.w, height: comp.canvas.h } });
for (const [name, html, transparent] of [
  ["frame.png", frameHtml, true],
  ["end.png", endHtml, false],
] as const) {
  await pg.setContent(html);
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: join(work, name), omitBackground: transparent });
}
const geist = await pg.evaluate(() => document.fonts.check("600 40px Geist"));
await browser.close();
console.error(`overlays rendered (Geist available: ${geist})`);

// 2. Audio: loudness-normalised to −16 LUFS (−1.5 dBTP), faded with the picture, silent under the end card.
const measured = sh(["ffmpeg", "-hide_banner", "-i", join(jobDir, "sound.wav"), "-t", String(D), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]);
const m = JSON.parse(measured.slice(measured.lastIndexOf("{"), measured.lastIndexOf("}") + 1)) as Record<string, string>;
const loudnorm = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
sh(["ffmpeg", "-y", "-hide_banner", "-i", join(jobDir, "sound.wav"), "-af", `atrim=0:${D},${loudnorm},aresample=48000,afade=t=out:st=${D - FADE}:d=${FADE},apad=whole_dur=${TOTAL}`, "-c:a", "pcm_s16le", join(work, "audio.wav")]);
const check = sh(["ffmpeg", "-hide_banner", "-i", join(work, "audio.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"]);
const lufs = /I:\s+(-?[\d.]+) LUFS/.exec(check.slice(check.lastIndexOf("Summary")))?.[1];
const peak = /Peak:\s+(-?[\d.]+) dBFS/.exec(check.slice(check.lastIndexOf("Summary")))?.[1];
console.error(`audio: ${lufs} LUFS integrated, true peak ${peak} dBFS`);

// 3. Picture: the captured streams on a 60 fps timeline, scaled into the window, framed, then the end card.
const crop = `crop=${comp.dtCrop.w * layout.dpr}:${comp.dtCrop.h * layout.dpr}:0:0`;
const inputs = ["-f", "concat", "-safe", "0", "-i", join(jobDir, "dt/list.txt")];
let graph = `[0:v]settb=AVTB,fps=${FPS},${crop},scale=${dtRect.w}:${dtRect.h}:flags=lanczos,setsar=1[dt];`;
graph += `color=c=black:s=${comp.canvas.w}x${comp.canvas.h}:r=${FPS}:d=${D}[bg];`;
let last = "bg";
let n = 1;
if (pageRect) {
  inputs.push("-f", "concat", "-safe", "0", "-i", join(jobDir, "page/list.txt"));
  graph += `[${n}:v]settb=AVTB,fps=${FPS},scale=${pageRect.w}:${pageRect.h}:flags=lanczos,setsar=1[pg];[bg][pg]overlay=${pageRect.x}:${pageRect.y}:eof_action=repeat[l1];`;
  last = "l1";
  n++;
}
inputs.push("-loop", "1", "-framerate", String(FPS), "-i", join(work, "frame.png"));
inputs.push("-loop", "1", "-framerate", String(FPS), "-t", String(END_CARD), "-i", join(work, "end.png"));
inputs.push("-i", join(work, "audio.wav"));
const frameIdx = n;
const endIdx = n + 1;
const audioIdx = n + 2;
graph += `[${last}][dt]overlay=${dtRect.x}:${dtRect.y}:eof_action=repeat[l2];`;
graph += `[l2][${frameIdx}:v]overlay=0:0:shortest=1,trim=duration=${D},fade=t=out:st=${D - FADE}:d=${FADE},format=yuv420p[main];`;
graph += `[${endIdx}:v]format=yuv420p,fade=t=in:st=0:d=0.5,trim=duration=${END_CARD}[end];`;
graph += `[main][end]concat=n=2:v=1:a=0,format=yuv420p[v]`;
const out = join(final, `doom-${cut}-${RATIO}.mp4`);
const t0 = performance.now();
sh([
  "ffmpeg", "-y", "-hide_banner", ...inputs, "-filter_complex", graph, "-map", "[v]", "-map", `${audioIdx}:a`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-maxrate", "12M", "-bufsize", "24M", "-pix_fmt", "yuv420p", "-r", String(FPS), "-profile:v", "high",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(TOTAL), "-movflags", "+faststart", out,
]);
console.error(`encoded in ${((performance.now() - t0) / 1000).toFixed(0)} s`);

// 4. Poster (the shotgun pickup fight, 11.6 s into Doom's clock) and review frames.
const posterAt = 11.62 - job.clip.from;
sh(["ffmpeg", "-y", "-hide_banner", "-ss", posterAt.toFixed(3), "-i", out, "-frames:v", "1", "-q:v", "2", join(final, `doom-${cut}-${RATIO}-poster.jpg`)]);
sh(["ffmpeg", "-y", "-hide_banner", "-i", out, "-vf", `fps=1,scale=${Math.round(comp.canvas.w / 4)}:-2,tile=6x5`, "-frames:v", "1", join(review, "sheet.jpg")]);
for (const t of [0, 1, 2, 8.3, 15, D - 0.1, D + 1.5]) sh(["ffmpeg", "-y", "-hide_banner", "-ss", t.toFixed(2), "-i", out, "-frames:v", "1", "-q:v", "2", join(review, `t${t.toFixed(1)}.jpg`)]);
const probe = sh(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,width,height,r_frame_rate", "-of", "compact", out]);
console.log(probe.trim());
