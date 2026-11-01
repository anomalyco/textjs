import type { Word } from "./narration";

export interface Caption {
  start: number;
  end: number;
  text: string;
}

const MAX = 84;
const BREAK_AFTER = /[,;:—–]$/;
const BREAK_BEFORE = /^(and|but|so|then|which|because|or|while|until|so that)$/i;

function split(ws: Word[]): Word[][] {
  const len = (a: Word[]): number => a.reduce((n, w) => n + w.text.length + 1, -1);
  if (len(ws) <= MAX) return [ws];
  // Best break: closest to the middle, preferring punctuation, then a conjunction.
  let best = -1;
  let bestScore = Infinity;
  const total = len(ws);
  for (let i = 1; i < ws.length; i++) {
    const left = len(ws.slice(0, i));
    let score = Math.abs(left - total / 2);
    if (BREAK_AFTER.test(ws[i - 1]!.text)) score -= 28;
    else if (BREAK_BEFORE.test(ws[i]!.text)) score -= 14;
    if (i < 2 || ws.length - i < 2) score += 40;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return [...split(ws.slice(0, best)), ...split(ws.slice(best))];
}

/** Subtitle chunks (≤ 84 characters, whole sentences where they fit), timed to the words. */
export function captions(ws: Word[], offset = 0): Caption[] {
  const sentences: Word[][] = [];
  let cur: Word[] = [];
  for (const w of ws) {
    cur.push(w);
    if (/[.!?]["')\]]?$/.test(w.text)) {
      sentences.push(cur);
      cur = [];
    }
  }
  if (cur.length) sentences.push(cur);
  return sentences.flatMap(split).map((c) => ({ start: offset + c[0]!.start, end: offset + c.at(-1)!.end, text: c.map((w) => w.text).join(" ") }));
}

/** Holds each caption until the next one (or 0.8 s past its last word), and at least 1.2 s. */
export function settle(list: Caption[]): Caption[] {
  return list.map((c, i) => {
    const next = list[i + 1];
    let end = Math.max(c.end + 0.8, c.start + 1.2);
    if (next) end = Math.min(end, next.start - 0.05);
    return { ...c, end: Math.max(end, c.end) };
  });
}

const stamp = (t: number): string => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor(ms / 60_000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};

/** Two balanced lines when a caption is longer than 42 characters. */
function lines(text: string): string {
  if (text.length <= 42) return text;
  const ws = text.split(" ");
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < ws.length; i++) {
    const d = Math.abs(ws.slice(0, i).join(" ").length - ws.slice(i).join(" ").length);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  return `${ws.slice(0, best).join(" ")}\n${ws.slice(best).join(" ")}`;
}

export function vtt(list: Caption[]): string {
  return `WEBVTT\n\n${list.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${lines(c.text)}\n`).join("\n")}`;
}
