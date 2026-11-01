/**
 * Narration markup:
 *
 *   Press Enter {enter} and the count goes up. [useInput|use input] receives every key.
 *
 * - `{name}` marks a cue: the moment the next word starts. Scenes schedule their motion on cues.
 * - `[display|spoken]` shows `display` in subtitles and sends `spoken` to the voice (pronunciation fixes).
 * - Whitespace collapses; paragraphs are fine.
 */
import type { Alignment } from "./tts";

export interface Narration {
  /** What the voice reads. */
  spoken: string;
  /** What subtitles show. */
  display: string;
  /** For each display character, the spoken range [start, end) it stands for. */
  map: Array<[number, number]>;
  /** Cue name → index into `spoken` of the next spoken character. */
  cues: Record<string, number>;
}

/**
 * How the voice says recurring terms. Applied to plain text only (an explicit `[display|spoken]` wins); longest
 * first. Chapters add their own with `pronounce`.
 */
export const PRONOUNCE: Record<string, string> = {
  "Text.js": "TextJS",
  "console.log": "console dot log",
  "%c": "percent C",
  "⌘⌥J": "Command Option J",
  "Ctrl+Shift+J": "Control Shift J",
  "@textjs/next": "at textjs slash next",
  "@textjs/react": "at textjs slash react",
  "create-text-app": "create text app",
  "localhost:3000": "localhost three thousand",
  "page.tsx": "page dot T S X",
  "layout.tsx": "layout dot T S X",
  useInput: "use Input",
  useState: "use State",
  useKeymap: "use Keymap",
};

function withPronunciation(text: string, dict: Record<string, string>): string {
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  if (!keys.length) return text;
  const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const re = new RegExp(`(\\[[^\\]]*\\]|\\{[^}]*\\})|(${keys.map(esc).join("|")})`, "g");
  return text.replace(re, (m, keep: string | undefined, term: string | undefined) => (keep ? keep : `[${term}|${dict[term!]}]`));
}

export function parseNarration(src: string, dict: Record<string, string> = PRONOUNCE): Narration {
  let spoken = "";
  let display = "";
  const map: Array<[number, number]> = [];
  const cues: Record<string, number> = {};
  const text = withPronunciation(src.replace(/\s+/g, " ").trim(), dict);
  const push = (d: string, s: string): void => {
    const start = spoken.length;
    spoken += s;
    if (d === s) for (let i = 0; i < d.length; i++) map.push([start + i, start + i + 1]);
    else for (let i = 0; i < d.length; i++) map.push([start, start + s.length]);
    display += d;
  };
  const re = /\{([\w.-]+)\}\s?|\[([^\]|]+)\|([^\]]+)\]/g;
  let at = 0;
  for (const m of text.matchAll(re)) {
    push(text.slice(at, m.index), text.slice(at, m.index));
    if (m[1]) {
      if (m[1] in cues) throw new Error(`Duplicate cue {${m[1]}}`);
      // A cue is followed by a space in the source; keep exactly one between the words around it.
      if (m[0].endsWith(" ") && spoken.length && !spoken.endsWith(" ")) push(" ", " ");
      cues[m[1]] = spoken.length;
    } else push(m[2]!, m[3]!);
    at = m.index! + m[0].length;
  }
  push(text.slice(at), text.slice(at));
  // Trailing/duplicate spaces left by cues.
  return { spoken, display, map, cues };
}

/** Time (seconds into the clip) at which spoken character `index` begins; skips spaces. */
export function timeAt(alignment: Alignment, spoken: string, index: number, total: number): number {
  let i = index;
  while (i < spoken.length && /\s/.test(spoken[i]!)) i++;
  if (i >= spoken.length) return total;
  return alignment.starts[i] ?? total;
}

export interface Word {
  text: string;
  start: number;
  end: number;
}

/** Display words with their spoken times. */
export function words(n: Narration, alignment: Alignment): Word[] {
  const out: Word[] = [];
  for (const m of n.display.matchAll(/\S+/g)) {
    const first = n.map[m.index!]!;
    const last = n.map[m.index! + m[0].length - 1]!;
    let s = first[0];
    while (s < last[1] - 1 && !/[\p{L}\p{N}]/u.test(n.spoken[s]!)) s++;
    out.push({ text: m[0], start: alignment.starts[s] ?? 0, end: alignment.ends[last[1] - 1] ?? 0 });
  }
  return out;
}
