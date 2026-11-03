// Plays the attract loop (title, DEMO1, credits, DEMO2, help, DEMO3) offline on a simulated clock, to pick the
// clip's segment: writes out/preview/attract.mp4 (320×200 at 35 fps, with the synthesized sound) and
// out/preview/sounds.json. `bun preview.ts [seconds]`
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createDoom } from "../../apps/web/src/demos/doom/host";
import { OUT } from "./lib/site";
import { LoggingSink } from "./lib/sound-log";
import { synthesize, writeWav } from "./lib/synth";
import { readWad, REPO, WAD_PATH } from "./lib/wad";

const seconds = Number(process.argv[2] ?? 335);
const dir = join(OUT, "preview");
mkdirSync(dir, { recursive: true });

let clock = 0;
const sink = new LoggingSink(() => clock);
const wasm = readFileSync(join(REPO, "apps/web/src/demos/doom/engine/out/doom.wasm"));
const doom = await createDoom({ wasm: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer, wads: [new Uint8Array(readFileSync(WAD_PATH))], now: () => clock, sound: sink });

const ff = Bun.spawn(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", "320x200", "-r", "35", "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", join(dir, "video.mp4")], { stdin: "pipe" });
const rgba = new Uint8Array(320 * 200 * 4);
const tics = Math.round(seconds * 35);
for (let n = 1; n <= tics; n++) {
  clock = (n * 1000) / 35 + 0.5;
  doom.tick();
  const d = doom.source.data as Uint32Array;
  for (let i = 0; i < d.length; i++) {
    const c = d[i] as number;
    rgba[i * 4] = c >>> 24;
    rgba[i * 4 + 1] = (c >>> 16) & 0xff;
    rgba[i * 4 + 2] = (c >>> 8) & 0xff;
    rgba[i * 4 + 3] = 255;
  }
  ff.stdin.write(rgba);
}
ff.stdin.end();
await ff.exited;

writeFileSync(join(dir, "sounds.json"), JSON.stringify(sink.events));
writeWav(join(dir, "sound.wav"), synthesize(sink.events, readWad(), seconds * 1000));
const mux = Bun.spawnSync(["ffmpeg", "-y", "-loglevel", "error", "-i", join(dir, "video.mp4"), "-i", join(dir, "sound.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", join(dir, "attract.mp4")]);
if (mux.exitCode !== 0) throw new Error(mux.stderr.toString());
console.log(`${tics} tics, ${sink.events.length} sound events → ${join(dir, "attract.mp4")}`);
