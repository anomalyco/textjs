/** Review material for a render: contact sheet, a full-size frame per scene beat, and transition strips. */
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { FFMPEG, run } from "./env";
import type { SceneData } from "../stage/types";

const frame = (video: string, t: number, out: string, scale?: string): void => {
  run([FFMPEG, "-y", "-loglevel", "error", "-ss", t.toFixed(3), "-i", video, "-frames:v", "1", ...(scale ? ["-vf", scale] : []), "-q:v", "2", out]);
};

export function review(video: string, scenes: SceneData[], dir: string, transition: number): string[] {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "scenes"), { recursive: true });
  mkdirSync(join(dir, "transitions"), { recursive: true });
  const made: string[] = [];
  const sheet = join(dir, "contact-sheet.jpg");
  run([FFMPEG, "-y", "-loglevel", "error", "-i", video, "-vf", "fps=1/4,scale=384:-1,tile=6x12:padding=4:color=0x222222", "-frames:v", "1", "-q:v", "3", sheet]);
  made.push(sheet);
  for (const [i, s] of scenes.entries()) {
    // Settled frames: after the entrance, at each cue (+0.8 s), and near the end.
    const ts = new Set<number>([s.start + Math.min(2.2, s.duration / 2)]);
    for (const [name, c] of Object.entries(s.cues)) if (!["start", "voice", "end", "voiceEnd"].includes(name)) ts.add(s.start + Math.min(s.duration - 0.8, c + 0.9));
    ts.add(s.start + s.duration - transition / 2 - 0.1);
    [...ts].sort((a, b) => a - b).forEach((t, k) => frame(video, t, join(dir, "scenes", `${String(i).padStart(2, "0")}-${s.id}-${k}.jpg`)));
    if (i > 0) {
      const strip = join(dir, "transitions", `${String(i).padStart(2, "0")}-${scenes[i - 1]!.id}-to-${s.id}.jpg`);
      run([FFMPEG, "-y", "-loglevel", "error", "-ss", Math.max(0, s.start - transition / 2 - 0.3).toFixed(3), "-t", (transition + 0.6).toFixed(3), "-i", video, "-vf", "fps=8,scale=480:-1,tile=6x3:padding=4:color=0x222222", "-frames:v", "1", "-q:v", "3", strip]);
    }
  }
  const end = join(dir, "end.jpg");
  run([FFMPEG, "-y", "-loglevel", "error", "-sseof", "-2", "-i", video, "-frames:v", "1", "-q:v", "2", end]);
  made.push(end);
  return made;
}

export { frame };
