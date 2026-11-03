import { writeFileSync } from "node:fs";
import { decodeDmx, gainFor, panFor, DOOM_CHANNELS, type DmxSound } from "../../../apps/web/src/demos/doom/sound";
import type { SoundEvent } from "./sound-log";
import type { Lump } from "./wad";

export const RATE = 48_000;

interface Voice {
  sound: DmxSound;
  /** Output sample where the sound started. */
  at: number;
  gainL: number;
  gainR: number;
}

/** StereoPannerNode's equal-power law for a mono input. */
function panGains(vol: number, sep: number): [number, number] {
  const g = gainFor(vol);
  const x = (panFor(sep) + 1) / 2;
  return [g * Math.cos((x * Math.PI) / 2), g * Math.sin((x * Math.PI) / 2)];
}

/**
 * Mixes the engine's sound calls the way sound.ts plays them: each `start` plays the DMX lump (decoded by
 * sound.ts's own `decodeDmx`) at its native rate on its channel, replacing what was there; `update` sets the
 * channel's gain and pan; `stop` cuts it. Times are milliseconds from the start of the output.
 */
export function synthesize(events: SoundEvent[], lumps: Lump[], durationMs: number): Float32Array {
  const frames = Math.ceil((durationMs / 1000) * RATE);
  const out = new Float32Array(frames * 2);
  const voices: (Voice | null)[] = new Array(DOOM_CHANNELS).fill(null);
  const cache = new Map<number, DmxSound | null>();
  const sorted = [...events].sort((a, b) => a.t - b.t);

  // Render one voice from `from` to `to` (output samples) with its current gains. Web Audio resamples
  // AudioBuffers linearly when their rate differs from the context's.
  const render = (v: Voice, from: number, to: number): boolean => {
    const step = v.sound.rate / RATE;
    const s = v.sound.samples;
    for (let i = Math.max(from, 0); i < Math.min(to, frames); i++) {
      const pos = (i - v.at) * step;
      if (pos < 0) continue;
      const k = Math.floor(pos);
      if (k >= s.length) return false;
      const a = s[k] as number;
      const b = k + 1 < s.length ? (s[k + 1] as number) : 0;
      const y = a + (b - a) * (pos - k);
      out[i * 2] = (out[i * 2] as number) + y * v.gainL;
      out[i * 2 + 1] = (out[i * 2 + 1] as number) + y * v.gainR;
    }
    return (to - v.at) * step < s.length;
  };

  let cursor = 0;
  const advance = (to: number): void => {
    for (let ch = 0; ch < voices.length; ch++) {
      const v = voices[ch];
      if (v && !render(v, cursor, to)) voices[ch] = null;
    }
    cursor = to;
  };

  for (const e of sorted) {
    const at = Math.round((e.t / 1000) * RATE);
    if (at > cursor) advance(at);
    if (e.channel < 0 || e.channel >= DOOM_CHANNELS) continue;
    if (e.kind === "start") {
      let sound = cache.get(e.lump);
      if (sound === undefined) {
        const lump = lumps[e.lump];
        sound = lump ? decodeDmx(lump.data) : null;
        cache.set(e.lump, sound);
      }
      voices[e.channel] = null;
      if (!sound) continue;
      const [gainL, gainR] = panGains(e.vol, e.sep);
      voices[e.channel] = { sound, at, gainL, gainR };
    } else if (e.kind === "update") {
      const v = voices[e.channel];
      if (v) [v.gainL, v.gainR] = panGains(e.vol, e.sep);
    } else voices[e.channel] = null;
  }
  advance(frames);
  return out;
}

/** 32-bit float stereo WAV. */
export function writeWav(path: string, interleaved: Float32Array, rate = RATE): void {
  const data = Buffer.from(interleaved.buffer, interleaved.byteOffset, interleaved.byteLength);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(3, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 8, 28);
  h.writeUInt16LE(8, 32);
  h.writeUInt16LE(32, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
}
