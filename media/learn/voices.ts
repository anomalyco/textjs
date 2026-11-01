#!/usr/bin/env bun
/**
 * Narrator auditions.
 *
 *   bun media/learn/voices.ts            # same paragraph in each shortlisted voice → out/voice-samples/<name>.mp3
 *   bun media/learn/voices.ts --list     # the account's premade voices (cloned voices are never listed or used)
 *
 * Samples go through the same cache as renders, so re-running costs nothing.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { FFMPEG, OUT, run, setting } from "./lib/env";
import { parseNarration } from "./lib/narration";
import { DEFAULT_MODEL, DEFAULT_VOICE, elevenlabs, ELEVENLABS_VOICES, speak } from "./lib/tts";

const SAMPLE =
  "Over ten chapters, you'll build Acme Deploys: a deploy dashboard that renders entirely inside the DevTools console. " +
  "A Text.js app is a React app. Your components lay out with Flexbox, into a grid of character cells, " +
  "and each frame that changes becomes a single console.log call. The page itself stays blank.";

if (process.argv.includes("--list")) {
  const key = setting("ELEVENLABS_API_KEY");
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  const res = await fetch("https://api.elevenlabs.io/v2/voices?page_size=100&category=premade", { headers: { "xi-api-key": key } });
  const json = (await res.json()) as { voices: Array<{ voice_id: string; name: string; category: string; labels?: Record<string, string> }> };
  for (const v of json.voices.filter((v) => v.category === "premade")) console.log(`${v.voice_id}  ${v.name}  ${JSON.stringify(v.labels ?? {})}`);
  process.exit(0);
}

const model = process.argv.find((a) => a.startsWith("--model="))?.slice(8) ?? setting("ELEVENLABS_MODEL_ID") ?? DEFAULT_MODEL;
const dir = join(OUT, "voice-samples");
mkdirSync(dir, { recursive: true });
const spoken = parseNarration(SAMPLE).spoken;
for (const [name, id] of Object.entries(ELEVENLABS_VOICES)) {
  const speech = await speak(elevenlabs({ voice: id, model }), spoken);
  const out = join(dir, `${name}${model === DEFAULT_MODEL ? "" : `-${model}`}.mp3`);
  run([FFMPEG, "-y", "-loglevel", "error", "-i", speech.file, "-af", "loudnorm=I=-16:TP=-1.5", "-c:a", "libmp3lame", "-b:a", "192k", out]);
  const words = spoken.split(/\s+/).length;
  console.log(`${name.padEnd(8)} ${speech.duration.toFixed(1)}s · ${Math.round((words / speech.duration) * 60)} wpm${speech.cached ? " (cached)" : ""}${id === DEFAULT_VOICE.id ? "  ← default" : ""} → ${out}`);
}
