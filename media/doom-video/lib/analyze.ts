import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Capture {
  dir: string;
  /** Epoch ms of Doom's first tic. */
  t0: number;
  events: unknown[][];
  dt: Array<{ t: number; file: string }>;
  page: Array<{ t: number; file: string }> | null;
}

export function loadCapture(dir: string): Capture {
  const log = JSON.parse(readFileSync(join(dir, "log.json"), "utf8")) as { t0: number; events: unknown[][] };
  const frames = (name: string) => {
    try {
      return JSON.parse(readFileSync(join(dir, name, "frames.json"), "utf8")) as Array<{ t: number; file: string }>;
    } catch {
      return null;
    }
  };
  return { dir, t0: log.t0, events: log.events, dt: frames("dt") ?? [], page: frames("page") };
}

/** Mean RGB of a region of each frame image, via ffmpeg. */
export function regionMeans(dir: string, files: string[], crop: { x: number; y: number; w: number; h: number }): Array<[number, number, number]> {
  const list = files.map((f) => `file '${f}'\nduration 0.04`).join("\n");
  const listPath = join(dir, "means.txt");
  writeFileSync(listPath, list);
  const p = Bun.spawnSync(["ffmpeg", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listPath, "-vf", `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},scale=1:1:flags=area`, "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { stdout: "pipe", stderr: "pipe" });
  if (p.exitCode !== 0) throw new Error(p.stderr.toString());
  const b = p.stdout;
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i + 2 < b.length; i += 3) out.push([b[i] as number, b[i + 1] as number, b[i + 2] as number]);
  return out;
}
