/**
 * Deterministic frame rendering: the stage is served locally, several headless pages each seek through a slice of
 * the timeline and screenshot every frame, and each slice is encoded as it renders. Slices concatenate losslessly.
 */
import { chromium, type Page } from "playwright-core";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { FFMPEG, headlessShellPath, REPO, ROOT, run } from "./env";
import type { Timeline } from "../stage/types";

export interface StageServer {
  origin: string;
  stop(): void;
}

/** Bundles the stage and serves it with the timeline, fonts and captured footage. */
export async function serveStage(timeline: Timeline, captureDir: string): Promise<StageServer> {
  const build = await Bun.build({ entrypoints: [join(ROOT, "stage/main.ts")], target: "browser", format: "esm", minify: false });
  if (!build.success) throw new Error(build.logs.map((l) => String(l)).join("\n"));
  const js = await build.outputs[0]!.text();
  const css = readFileSync(join(ROOT, "stage/style.css"), "utf8");
  const json = JSON.stringify(timeline);
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css"></head><body><script type="module" src="/main.js"></script></body></html>`;
  const fonts = join(REPO, "apps/web/public/fonts");
  const srv = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      const type = (t: string) => ({ headers: { "content-type": t, "cache-control": "max-age=3600" } });
      if (path === "/") return new Response(html, type("text/html; charset=utf-8"));
      if (path === "/main.js") return new Response(js, type("application/javascript"));
      if (path === "/style.css") return new Response(css, type("text/css"));
      if (path === "/timeline.json") return new Response(json, type("application/json"));
      if (path.startsWith("/fonts/")) return new Response(Bun.file(join(fonts, normalize(path.slice(7)))));
      if (path.startsWith("/capture/")) {
        const file = join(captureDir, normalize(path.slice(9)));
        if (existsSync(file)) return new Response(Bun.file(file));
      }
      return new Response("not found", { status: 404 });
    },
  });
  return { origin: `http://127.0.0.1:${srv.port}`, stop: () => srv.stop(true) };
}

async function openStage(page: Page, origin: string): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(origin);
  await page.waitForFunction(() => document.documentElement.dataset.ready === "1" || document.documentElement.dataset.error, undefined, { timeout: 60_000 });
  const err = await page.evaluate(() => document.documentElement.dataset.error);
  if (err || errors.length) throw new Error(`Stage failed: ${err ?? errors.join("\n")}`);
}

/** One frame as a PNG (for stills and review). */
export async function still(origin: string, t: number, file: string): Promise<void> {
  const browser = await chromium.launch({ executablePath: headlessShellPath(), args: ["--force-color-profile=srgb", "--font-render-hinting=none"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await openStage(page, origin);
    await page.evaluate((t) => window.stage.seek(t), t);
    await page.screenshot({ path: file });
  } finally {
    await browser.close();
  }
}

export const VIDEO_ARGS = ["-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-tune", "animation", "-x264-params", "keyint=60:min-keyint=30"];

/** Renders frames [from, to) seconds to `out` (H.264, no audio). */
export async function renderVideo(opts: { origin: string; fps: number; from: number; to: number; out: string; workers: number; work: string; log: (s: string) => void }): Promise<void> {
  const total = Math.round((opts.to - opts.from) * opts.fps);
  const workers = Math.max(1, Math.min(opts.workers, Math.ceil(total / 60)));
  const per = Math.ceil(total / workers);
  mkdirSync(opts.work, { recursive: true });
  const browser = await chromium.launch({ executablePath: headlessShellPath(), args: ["--force-color-profile=srgb", "--font-render-hinting=none", "--disable-gpu-vsync"] });
  const started = Date.now();
  let done = 0;
  let lastLog = 0;
  const segs: string[] = [];
  try {
    await Promise.all(
      Array.from({ length: workers }, async (_, w) => {
        const a = w * per;
        const b = Math.min(total, a + per);
        if (a >= b) return;
        const seg = join(opts.work, `seg-${String(w).padStart(2, "0")}.mp4`);
        segs[w] = seg;
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        await openStage(page, opts.origin);
        const cdp = await page.context().newCDPSession(page);
        const ff = Bun.spawn([FFMPEG, "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(opts.fps), "-c:v", "png", "-i", "-", ...VIDEO_ARGS, "-r", String(opts.fps), seg], { stdin: "pipe", stderr: "inherit" });
        for (let i = a; i < b; i++) {
          const t = opts.from + i / opts.fps;
          await page.evaluate((t) => window.stage.seek(t), t);
          const shot = (await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true })) as { data: string };
          ff.stdin.write(Buffer.from(shot.data, "base64"));
          done++;
          if (Date.now() - lastLog > 10_000) {
            lastLog = Date.now();
            const rate = done / ((Date.now() - started) / 1000);
            opts.log(`  frames ${done}/${total} · ${rate.toFixed(1)} fps · ~${Math.round((total - done) / rate)}s left`);
          }
        }
        await ff.stdin.end();
        const code = await ff.exited;
        if (code !== 0) throw new Error(`ffmpeg segment ${w} failed`);
        await page.close();
      }),
    );
  } finally {
    await browser.close();
  }
  const list = join(opts.work, "segments.txt");
  writeFileSync(list, segs.filter(Boolean).map((s) => `file '${s}'`).join("\n") + "\n");
  run([FFMPEG, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", opts.out]);
  opts.log(`  rendered ${total} frames in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
