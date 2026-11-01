/**
 * Narration drives time: each scene lasts as long as its narration (plus lead-in and tail), and every cue in the
 * narration becomes a scene-time a scene can schedule motion on.
 */
import { captions as toCaptions, settle, type Caption } from "./captions";
import { parseNarration, PRONOUNCE, timeAt, words } from "./narration";
import type { ChapterScript } from "./script";
import { speak, type Provider } from "./tts";
import type { SceneData } from "../stage/types";

export const TRANSITION = 1.5;
const STEP_X = 2160;
const STEP_Y = 1320;

export interface Clip {
  file: string;
  at: number;
  duration: number;
}

export interface Built {
  scenes: SceneData[];
  captions: Caption[];
  clips: Clip[];
  duration: number;
  /** Characters sent to the TTS provider this run (0 when everything was cached). */
  billed: number;
}

export async function buildTimeline(script: ChapterScript, provider: Provider, log: (s: string) => void): Promise<Built> {
  const dict = { ...PRONOUNCE, ...(script.pronounce ?? {}) };
  const scenes: SceneData[] = [];
  const clips: Clip[] = [];
  let caps: Caption[] = [];
  let at = 0;
  let x = 0;
  let y = 0;
  let billed = 0;
  const ids = new Set<string>();
  for (const [i, s] of script.scenes.entries()) {
    if (ids.has(s.id)) throw new Error(`Duplicate scene id ${s.id}`);
    ids.add(s.id);
    if (i > 0) {
      if (s.move === "down") y += STEP_Y;
      else x += STEP_X;
    }
    const lead = s.lead ?? 0.6;
    const tail = s.tail ?? 0.9;
    const cues: Record<string, number> = { start: 0, voice: lead };
    let duration = s.min ?? 0;
    if (s.narration) {
      // `{+1.5}` inserts a pause; each stretch between pauses is synthesized (and cached) on its own.
      const parts = s.narration.split(/\{\+(\d+(?:\.\d+)?)\}/);
      let t = lead;
      let synthesized = false;
      for (let k = 0; k < parts.length; k += 2) {
        const text = parts[k]!.trim();
        if (text) {
          const n = parseNarration(text, dict);
          const speech = await speak(provider, n.spoken);
          if (!speech.cached) {
            billed += n.spoken.length;
            synthesized = true;
          }
          for (const [name, idx] of Object.entries(n.cues)) {
            if (name in cues) throw new Error(`Duplicate cue {${name}} in ${s.id}`);
            cues[name] = t + timeAt(speech.alignment, n.spoken, idx, speech.duration);
          }
          clips.push({ file: speech.file, at: at + t, duration: speech.duration });
          caps = caps.concat(toCaptions(words(n, speech.alignment), at + t));
          t += speech.duration;
        }
        if (parts[k + 1]) {
          // A cue right after a pause lands when the next stretch starts.
          t += Number(parts[k + 1]);
        }
      }
      log(`  ${s.id.padEnd(16)} ${(t - lead).toFixed(1).padStart(5)}s voice${synthesized ? "  (synthesized)" : ""}`);
      duration = Math.max(duration, t + tail);
      cues.voiceEnd = t;
    } else {
      duration = Math.max(duration, 3);
      log(`  ${s.id.padEnd(16)}     — no narration`);
    }
    cues.end = duration;
    scenes.push({ id: s.id, kind: s.kind, start: at, duration, x, y, voice: lead, cues, props: s.props ?? {} });
    at += duration;
  }
  return { scenes, captions: settle(caps), clips, duration: at, billed };
}
