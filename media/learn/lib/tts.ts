/**
 * Narration synthesis with character-level timings, cached by content hash.
 *
 * - `elevenlabs`: POST /v1/text-to-speech/{voice}/with-timestamps (PCM 44.1 kHz + per-character alignment).
 * - `say`: macOS `say`, one sentence at a time (exact sentence timings, characters spread evenly inside a
 *   sentence). Free and offline, for drafts and pacing checks.
 *
 * Both return the same shape, so swapping providers changes nothing else. Every result is cached under
 * `.cache/tts/<provider>/<hash>` where the hash covers (text, voice, model, settings, format version): editing
 * one scene re-synthesizes only that scene.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE, duration, FFMPEG, run, setting } from "./env";

export interface Alignment {
  /** One entry per character of the synthesized text. */
  starts: number[];
  ends: number[];
}

export interface Speech {
  /** 48 kHz mono WAV. */
  file: string;
  duration: number;
  alignment: Alignment;
}

export interface Provider {
  id: string;
  /** Everything besides the text that changes the audio (part of the cache key, and printed). */
  describe(): Record<string, unknown>;
  synthesize(text: string, dir: string, base: string): Promise<Speech>;
}

/** The pilot's narrator. Premade voices only: never a voice cloned from a real person. */
export const DEFAULT_VOICE = { id: "cjVigY5qzO86Huf0OWal", name: "Eric" };
export const DEFAULT_MODEL = "eleven_v4";

export const ELEVENLABS_VOICES: Record<string, string> = {
  sarah: "EXAVITQu4vr4xnSDxMaL",
  eric: "cjVigY5qzO86Huf0OWal",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  brian: "nPczCjzI2devNBz1zQrb",
  river: "SAz9YHcvj6GT2YYXdXww",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
};

const FORMAT = 2;

function toWav(input: string[], out: string): void {
  run([FFMPEG, "-y", "-loglevel", "error", ...input, "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", out]);
}

export function elevenlabs(opts: { voice?: string; model?: string } = {}): Provider {
  const voiceSetting = opts.voice ?? setting("ELEVENLABS_VOICE_ID") ?? DEFAULT_VOICE.id;
  const voice = ELEVENLABS_VOICES[voiceSetting.toLowerCase()] ?? voiceSetting;
  const model = opts.model ?? setting("ELEVENLABS_MODEL_ID") ?? DEFAULT_MODEL;
  const voiceSettings = { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1 };
  return {
    id: "elevenlabs",
    describe: () => ({ voice, model, voiceSettings }),
    async synthesize(text, dir, base) {
      const key = setting("ELEVENLABS_API_KEY");
      if (!key) throw new Error("ELEVENLABS_API_KEY is not set (env or ~/.config/textjs/elevenlabs.env); use --provider say for a draft");
      for (let attempt = 1; ; attempt++) {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=pcm_44100`, {
          method: "POST",
          headers: { "xi-api-key": key, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ text, model_id: model, voice_settings: voiceSettings }),
        });
        if (!res.ok) {
          const body = (await res.text()).slice(0, 400);
          if ((res.status === 429 || res.status >= 500) && attempt < 4) {
            await Bun.sleep(2000 * attempt);
            continue;
          }
          throw new Error(`ElevenLabs ${res.status}: ${body}`);
        }
        const json = (await res.json()) as {
          audio_base64: string;
          alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } | null;
        };
        if (!json.alignment || json.alignment.characters.join("") !== text) {
          // Alignment that doesn't cover the text exactly can't place cues; fail loudly rather than drift.
          throw new Error(`ElevenLabs alignment does not match the text for ${base}`);
        }
        const raw = join(dir, `${base}.pcm`);
        writeFileSync(raw, Buffer.from(json.audio_base64, "base64"));
        const file = join(dir, `${base}.wav`);
        toWav(["-f", "s16le", "-ar", "44100", "-ac", "1", "-i", raw], file);
        rmSync(raw);
        return {
          file,
          duration: duration(file),
          alignment: { starts: json.alignment.character_start_times_seconds, ends: json.alignment.character_end_times_seconds },
        };
      }
    },
  };
}

/** Sentence boundaries: [start, end) character ranges, each including its trailing spaces. */
export function sentenceRanges(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const re = /[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g;
  for (const m of text.matchAll(re)) if (m[0].length) out.push([m.index!, m.index! + m[0].length]);
  return out;
}

export function say(opts: { voice?: string; rate?: number } = {}): Provider {
  const voice = opts.voice ?? process.env.SAY_VOICE ?? "Samantha";
  const rate = opts.rate ?? Number(process.env.SAY_RATE ?? 172);
  const gap = 0.32;
  return {
    id: "say",
    describe: () => ({ voice, rate, gap }),
    async synthesize(text, dir, base) {
      const parts: string[] = [];
      const starts = new Array<number>(text.length).fill(0);
      const ends = new Array<number>(text.length).fill(0);
      let at = 0;
      const ranges = sentenceRanges(text);
      for (const [i, [s, e]] of ranges.entries()) {
        const sentence = text.slice(s, e).trim();
        const aiff = join(dir, `${base}.${i}.aiff`);
        run(["say", "-v", voice, "-r", String(rate), "-o", aiff, sentence]);
        const wav = join(dir, `${base}.${i}.wav`);
        toWav(["-i", aiff], wav);
        rmSync(aiff);
        const d = duration(wav);
        // Spread the sentence's characters over its audio, leaving a little lead-in and tail.
        const span = Math.max(0.1, d - 0.12);
        for (let c = s; c < e; c++) {
          const f = (c - s) / Math.max(1, e - s);
          starts[c] = at + 0.05 + f * span;
          ends[c] = at + 0.05 + ((c - s + 1) / Math.max(1, e - s)) * span;
        }
        parts.push(wav);
        at += d + (i < ranges.length - 1 ? gap : 0);
      }
      const file = join(dir, `${base}.wav`);
      const inputs = parts.flatMap((p) => ["-i", p]);
      const filter =
        parts.map((_, i) => (i < parts.length - 1 ? `[${i}:a]apad=pad_dur=${gap}[p${i}];` : "")).join("") +
        parts.map((_, i) => (i < parts.length - 1 ? `[p${i}]` : `[${i}:a]`)).join("") +
        `concat=n=${parts.length}:v=0:a=1[out]`;
      run([FFMPEG, "-y", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "[out]", "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", file]);
      for (const p of parts) rmSync(p);
      return { file, duration: duration(file), alignment: { starts, ends } };
    },
  };
}

export function provider(name: string): Provider {
  if (name === "elevenlabs") return elevenlabs();
  if (name === "say") return say();
  throw new Error(`Unknown TTS provider "${name}" (elevenlabs | say)`);
}

/** The default provider: ElevenLabs when a key is configured, otherwise macOS `say`. */
export function defaultProviderName(): string {
  return setting("ELEVENLABS_API_KEY") ? "elevenlabs" : "say";
}

/** Synthesizes `text`, or returns the cached result for the same text, provider and settings. */
export async function speak(p: Provider, text: string): Promise<Speech & { cached: boolean; hash: string }> {
  const hash = createHash("sha256")
    .update(JSON.stringify({ format: FORMAT, provider: p.id, settings: p.describe(), text }))
    .digest("hex")
    .slice(0, 20);
  const dir = join(CACHE, "tts", p.id);
  mkdirSync(dir, { recursive: true });
  const meta = join(dir, `${hash}.json`);
  if (existsSync(meta) && existsSync(join(dir, `${hash}.wav`))) {
    return { ...(JSON.parse(readFileSync(meta, "utf8")) as Speech), file: join(dir, `${hash}.wav`), cached: true, hash };
  }
  const speech = await p.synthesize(text, dir, hash);
  writeFileSync(meta, JSON.stringify({ text, settings: p.describe(), duration: speech.duration, alignment: speech.alignment }));
  return { ...speech, cached: false, hash };
}
