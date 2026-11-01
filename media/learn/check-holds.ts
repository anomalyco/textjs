#!/usr/bin/env bun
/**
 * Checks that title text holds perfectly still once revealed: `bun media/learn/check-holds.ts <slug>`.
 * Reads `out/work/<slug>/holds.json` (written by render.ts: each title scene from the end of its reveal to the start
 * of the camera move away) and, frame by frame, measures how far the text has shifted from the first held frame, to a
 * tenth of a pixel, from row/column brightness profiles. Any shift over 0.4 px fails. (Adapted from the
 * product-demo-video skill's check-cards.ts.)
 */
import { join } from "node:path";
import { FFMPEG, OUT } from "./lib/env";

const slug = process.argv[2];
if (!slug) throw new Error("usage: bun media/learn/check-holds.ts <slug>");
const file = join(OUT, "learn", slug, `${slug}-1080p.mp4`);
const holds: { title: string; from: number; to: number }[] = await Bun.file(join(OUT, "work", slug, "holds.json")).json();
const band = { x: 0, y: 120, width: 1920, height: 840 };
const size = band.width * band.height;
const limit = 0.4;

const profile = (frame: Uint8Array) => {
  const rows = new Float64Array(band.height);
  const columns = new Float64Array(band.width);
  for (let y = 0; y < band.height; y++)
    for (let x = 0; x < band.width; x++) {
      const value = frame[y * band.width + x]! - 60;
      if (value <= 0) continue;
      rows[y]! += value;
      columns[x]! += value;
    }
  return { rows, columns };
};

const offset = (reference: Float64Array, current: Float64Array) => {
  const score = (shift: number) => reference.reduce((sum, value, index) => sum + value * (current[index + shift] ?? 0), 0);
  const scores = Array.from({ length: 21 }, (_, index) => score(index - 10));
  const best = scores.indexOf(Math.max(...scores));
  const before = scores[best - 1] ?? 0;
  const after = scores[best + 1] ?? 0;
  const curve = before - 2 * scores[best]! + after;
  return best - 10 + (curve === 0 ? 0 : (before - after) / (2 * curve));
};

let moved = 0;
for (const hold of holds) {
  if (hold.to - hold.from < 0.3) continue;
  const ff = Bun.spawn(
    [FFMPEG, "-loglevel", "error", "-ss", hold.from.toFixed(3), "-t", (hold.to - hold.from).toFixed(3), "-i", file, "-vf", `fps=15,crop=${band.width}:${band.height}:${band.x}:${band.y},format=gray`, "-f", "rawvideo", "-"],
    { stdout: "pipe" },
  );
  const frame = new Uint8Array(size);
  const shifts: { time: number; x: number; y: number }[] = [];
  let reference: ReturnType<typeof profile> | undefined;
  let filled = 0;
  for await (const chunk of ff.stdout as unknown as AsyncIterable<Uint8Array>) {
    let start = 0;
    while (start < chunk.length) {
      const take = Math.min(size - filled, chunk.length - start);
      frame.set(chunk.subarray(start, start + take), filled);
      filled += take;
      start += take;
      if (filled < size) continue;
      filled = 0;
      const current = profile(frame);
      reference ??= current;
      shifts.push({ time: hold.from + shifts.length / 15, x: offset(reference.columns, current.columns), y: offset(reference.rows, current.rows) });
    }
  }
  await ff.exited;
  const worst = shifts.reduce((most, s) => Math.max(most, Math.abs(s.x), Math.abs(s.y)), 0);
  const span = `${hold.from.toFixed(1)}–${hold.to.toFixed(1)}s, ${shifts.length} frames`;
  if (worst <= limit) {
    console.log(`steady  ${hold.title.padEnd(14)} ${span}: at most ${worst.toFixed(2)} px`);
    continue;
  }
  moved++;
  console.log(`MOVES   ${hold.title.padEnd(14)} ${span}: up to ${worst.toFixed(2)} px`);
}
process.exitCode = moved === 0 ? 0 : 1;
