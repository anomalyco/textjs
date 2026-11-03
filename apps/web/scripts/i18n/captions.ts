/**
 * Captions: Learn chapter videos' WebVTT, translated sentence by sentence. Cues are grouped into sentences (a group
 * ends with the cue that ends a sentence), because word order doesn't survive cue-by-cue translation. Each group's
 * id is a hash of its English text, like a document block, so a re-rendered video keeps every unchanged sentence.
 *
 * Translations live in `locales/<code>/captions/<slug>.json` (`{ id: text }`). `assembleCaptions` keeps the English
 * timings and spreads each translated sentence over its cues in proportion to their English length, breaking at
 * punctuation where it can. A sentence without a translation stays English.
 */

import { blockId } from "./document";

export interface Cue {
  start: string;
  end: string;
  text: string;
}

export interface CaptionGroup {
  id: string;
  text: string;
  cues: Cue[];
}

export function parseVtt(vtt: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of vtt.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const lines = block.split("\n");
    const at = lines.findIndex((l) => l.includes("-->"));
    if (at < 0) continue;
    const [start = "", end = ""] = (lines[at] as string).split("-->").map((s) => s.trim());
    cues.push({ start, end: end.split(/\s+/)[0] as string, text: lines.slice(at + 1).join("\n").trim() });
  }
  return cues;
}

export function captionGroups(cues: readonly Cue[]): CaptionGroup[] {
  const groups: CaptionGroup[] = [];
  let current: Cue[] = [];
  const flush = (): void => {
    if (!current.length) return;
    const text = current.map((c) => c.text.replace(/\s+/g, " ")).join(" ");
    groups.push({ id: blockId(text), text, cues: current });
    current = [];
  };
  for (const cue of cues) {
    current.push(cue);
    if (/[.!?…]["”’)]?$/.test(cue.text.trim())) flush();
  }
  flush();
  return groups;
}

const WIDE = /[\u3000-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/;
const BREAK_AFTER = /[、。，．！？,.;:!?)」』）]$/;

function segments(text: string, locale: string): string[] {
  return [...new Intl.Segmenter(locale, { granularity: "word" }).segment(text)].map((s) => s.segment);
}

/** Splits `text` into `weights.length` parts sized like the weights, at word boundaries and preferably after punctuation. */
export function spread(text: string, weights: readonly number[], locale: string): string[] {
  if (weights.length <= 1) return [text.trim()];
  const segs = segments(text, locale);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const parts: string[] = [];
  let i = 0;
  let used = 0;
  for (let w = 0; w < weights.length - 1; w++) {
    const target = (text.length * (used + (weights[w] as number))) / total;
    used += weights[w] as number;
    let pos = parts.join("").length;
    let part = "";
    let best: { j: number; part: string; score: number } | null = null;
    for (let j = i; j < segs.length - (weights.length - 1 - w); j++) {
      part += segs[j];
      pos += (segs[j] as string).length;
      const off = Math.abs(pos - target) / Math.max(1, text.length / weights.length);
      const score = off - (BREAK_AFTER.test(part.trimEnd()) ? 0.35 : 0);
      if (!best || score < best.score) best = { j, part, score };
      if (pos > target * 1.5 + 4) break;
    }
    if (!best) break;
    parts.push(best.part);
    i = best.j + 1;
  }
  parts.push(segs.slice(i).join(""));
  while (parts.length < weights.length) parts.push("");
  return parts.map((p) => p.trim());
}

/** Breaks a cue's text into at most two lines of `max` columns (full-width characters count as two). */
export function wrapCue(text: string, locale: string): string {
  const cols = (s: string): number => [...s].reduce((n, ch) => n + (WIDE.test(ch) ? 2 : 1), 0);
  const max = WIDE.test(text) ? 40 : 42;
  if (cols(text) <= max) return text;
  const segs = segments(text, locale);
  const half = cols(text) / 2;
  let best = { at: 1, off: Infinity };
  let n = 0;
  for (let j = 0; j < segs.length - 1; j++) {
    n += cols(segs[j] as string);
    const off = Math.abs(n - half) - (BREAK_AFTER.test((segs[j] as string).trimEnd()) ? 2 : 0);
    if (off < best.off) best = { at: j + 1, off };
  }
  return `${segs.slice(0, best.at).join("").trim()}\n${segs.slice(best.at).join("").trim()}`;
}

export interface AssembledCaptions {
  vtt: string;
  total: number;
  translated: number;
}

export function assembleCaptions(english: string, translations: Readonly<Record<string, string>>, locale: string): AssembledCaptions {
  const out: string[] = ["WEBVTT", ""];
  let n = 0;
  let translated = 0;
  const groups = captionGroups(parseVtt(english));
  for (const g of groups) {
    const text = translations[g.id];
    if (text) translated++;
    const parts = text ? spread(text, g.cues.map((c) => c.text.replace(/\s+/g, " ").length), locale) : g.cues.map((c) => c.text);
    g.cues.forEach((cue, k) => {
      const body = text ? wrapCue(parts[k] ?? "", locale) : cue.text;
      if (!body) return;
      out.push(String(++n), `${cue.start} --> ${cue.end}`, body, "");
    });
  }
  return { vtt: out.join("\n"), total: groups.length, translated };
}
