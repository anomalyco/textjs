/**
 * Grapheme-aware text editing primitives shared by `<Input>` and `<Textarea>`.
 * Cursor positions are UTF-16 offsets that always sit on grapheme boundaries.
 */

import { segmentGraphemes } from "@textjs/core";

export interface EditState {
  value: string;
  cursor: number;
}

function boundaries(text: string): number[] {
  const out = [0];
  let i = 0;
  for (const g of segmentGraphemes(text)) {
    i += g.grapheme.length;
    out.push(i);
  }
  return out;
}

export function prevBoundary(text: string, i: number): number {
  if (i <= 0) return 0;
  const b = boundaries(text.slice(0, i));
  return b.length >= 2 ? (b[b.length - 2] as number) : 0;
}

export function nextBoundary(text: string, i: number): number {
  if (i >= text.length) return text.length;
  const first = segmentGraphemes(text.slice(i, i + 16))[0];
  return Math.min(text.length, i + (first ? first.grapheme.length : 1));
}

const WORD = /[\p{L}\p{N}_]/u;

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && WORD.test(ch);
}

export function prevWord(text: string, i: number): number {
  let k = i;
  while (k > 0 && !isWordChar(text[k - 1])) k--;
  while (k > 0 && isWordChar(text[k - 1])) k--;
  return k;
}

export function nextWord(text: string, i: number): number {
  let k = i;
  const n = text.length;
  while (k < n && !isWordChar(text[k])) k++;
  while (k < n && isWordChar(text[k])) k++;
  return k;
}

export function lineStart(text: string, i: number): number {
  const k = text.lastIndexOf("\n", i - 1);
  return k < 0 ? 0 : k + 1;
}

export function lineEnd(text: string, i: number): number {
  const k = text.indexOf("\n", i);
  return k < 0 ? text.length : k;
}

export function insert(s: EditState, text: string): EditState {
  return { value: s.value.slice(0, s.cursor) + text + s.value.slice(s.cursor), cursor: s.cursor + text.length };
}

export function deleteRange(s: EditState, from: number, to: number): EditState {
  const a = Math.max(0, Math.min(from, to));
  const b = Math.min(s.value.length, Math.max(from, to));
  if (a === b) return s;
  return { value: s.value.slice(0, a) + s.value.slice(b), cursor: a };
}

/** Column (in code units from line start) and line index of a cursor. */
export function cursorLineCol(text: string, i: number): { line: number; col: number } {
  let line = 0;
  let start = 0;
  for (let k = 0; k < i; k++) {
    if (text.charCodeAt(k) === 10) {
      line++;
      start = k + 1;
    }
  }
  return { line, col: i - start };
}

/** Move the cursor one logical line up/down, keeping the column where possible. */
export function verticalMove(text: string, i: number, dir: -1 | 1, goalCol?: number): number {
  const start = lineStart(text, i);
  const col = goalCol ?? i - start;
  if (dir < 0) {
    if (start === 0) return 0;
    const prevStart = lineStart(text, start - 1);
    const prevLen = start - 1 - prevStart;
    return snap(text, prevStart + Math.min(col, prevLen));
  }
  const end = lineEnd(text, i);
  if (end >= text.length) return text.length;
  const nextStart = end + 1;
  const nextLen = lineEnd(text, nextStart) - nextStart;
  return snap(text, nextStart + Math.min(col, nextLen));
}

/** Snap an offset back onto a grapheme boundary. */
function snap(text: string, i: number): number {
  const s = lineStart(text, i);
  const b = boundaries(text.slice(s, lineEnd(text, i)));
  let best = s;
  for (const off of b) if (s + off <= i) best = s + off;
  return best;
}

export interface KeyLike {
  key: string;
  input: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

/**
 * Apply a readline-style editing key. Returns the new state, or `null` when
 * the key is not an editing key. `multiline` enables Up/Down line movement.
 */
export function applyEditKey(s: EditState, e: KeyLike, multiline: boolean): EditState | null {
  const { value, cursor } = s;
  const k = e.key;
  if (e.ctrl && !e.meta && !e.alt) {
    switch (k) {
      case "a":
        return { value, cursor: multiline ? lineStart(value, cursor) : 0 };
      case "e":
        return { value, cursor: multiline ? lineEnd(value, cursor) : value.length };
      case "b":
        return { value, cursor: prevBoundary(value, cursor) };
      case "f":
        return { value, cursor: nextBoundary(value, cursor) };
      case "u":
        return deleteRange(s, multiline ? lineStart(value, cursor) : 0, cursor);
      case "k":
        return deleteRange(s, cursor, multiline ? lineEnd(value, cursor) : value.length);
      case "w":
      case "backspace":
        return deleteRange(s, prevWord(value, cursor), cursor);
      case "d":
        return deleteRange(s, cursor, nextBoundary(value, cursor));
      case "h":
        return deleteRange(s, prevBoundary(value, cursor), cursor);
      case "left":
        return { value, cursor: prevWord(value, cursor) };
      case "right":
        return { value, cursor: nextWord(value, cursor) };
      default:
        return null;
    }
  }
  switch (k) {
    case "left":
      if (e.meta) return { value, cursor: multiline ? lineStart(value, cursor) : 0 };
      if (e.alt) return { value, cursor: prevWord(value, cursor) };
      return { value, cursor: prevBoundary(value, cursor) };
    case "right":
      if (e.meta) return { value, cursor: multiline ? lineEnd(value, cursor) : value.length };
      if (e.alt) return { value, cursor: nextWord(value, cursor) };
      return { value, cursor: nextBoundary(value, cursor) };
    case "home":
      return { value, cursor: multiline && !e.ctrl ? lineStart(value, cursor) : 0 };
    case "end":
      return { value, cursor: multiline && !e.ctrl ? lineEnd(value, cursor) : value.length };
    case "up":
      if (!multiline) return null;
      if (e.meta) return { value, cursor: 0 };
      return { value, cursor: verticalMove(value, cursor, -1) };
    case "down":
      if (!multiline) return null;
      if (e.meta) return { value, cursor: value.length };
      return { value, cursor: verticalMove(value, cursor, 1) };
    case "backspace":
      if (e.meta) return deleteRange(s, multiline ? lineStart(value, cursor) : 0, cursor);
      if (e.alt) return deleteRange(s, prevWord(value, cursor), cursor);
      return deleteRange(s, prevBoundary(value, cursor), cursor);
    case "delete":
      if (e.alt) return deleteRange(s, cursor, nextWord(value, cursor));
      return deleteRange(s, cursor, nextBoundary(value, cursor));
    default:
      break;
  }
  if (e.input.length > 0 && !e.ctrl && !e.meta) return insert(s, e.input);
  return null;
}
