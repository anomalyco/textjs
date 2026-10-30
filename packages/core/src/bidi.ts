/**
 * Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0) plus the display
 * transforms a cell grid needs: mirroring (L4) and Arabic contextual shaping.
 *
 * Text.js lays text out in logical order, wraps it, then reorders each wrapped
 * line into visual order (L1–L2). Cells therefore already hold glyphs in
 * left-to-right display order; drivers must keep the browser or terminal from
 * running bidi over them a second time (see `LTR_OVERRIDE`).
 *
 * Conformance is tested against BidiTest.txt and BidiCharacterTest.txt.
 */

import { ARABIC_FORMS, BIDI_BRACKETS, BIDI_CLASS_RANGES, BIDI_MIRRORS, JOINING_TYPE_RANGES } from "./bidi-data";
import { segmentGraphemes, type Grapheme } from "./text-measure";

export { BIDI_UNICODE_VERSION } from "./bidi-data";

// Bidi_Class values (order matches scripts/gen-bidi-data.ts).
export const BIDI_L = 0;
export const BIDI_R = 1;
export const BIDI_AL = 2;
export const BIDI_EN = 3;
export const BIDI_ES = 4;
export const BIDI_ET = 5;
export const BIDI_AN = 6;
export const BIDI_CS = 7;
export const BIDI_NSM = 8;
export const BIDI_BN = 9;
export const BIDI_B = 10;
export const BIDI_S = 11;
export const BIDI_WS = 12;
export const BIDI_ON = 13;
export const BIDI_LRE = 14;
export const BIDI_LRO = 15;
export const BIDI_RLE = 16;
export const BIDI_RLO = 17;
export const BIDI_PDF = 18;
export const BIDI_LRI = 19;
export const BIDI_RLI = 20;
export const BIDI_FSI = 21;
export const BIDI_PDI = 22;

export const BIDI_CLASS_NAMES: readonly string[] = Object.freeze([
  "L", "R", "AL", "EN", "ES", "ET", "AN", "CS", "NSM", "BN", "B", "S", "WS", "ON",
  "LRE", "LRO", "RLE", "RLO", "PDF", "LRI", "RLI", "FSI", "PDI",
]);

/** LEFT-TO-RIGHT OVERRIDE and POP DIRECTIONAL FORMATTING: pin already-visual text to LTR order. */
export const LTR_OVERRIDE = "\u202D";
export const POP_DIRECTIONAL_FORMATTING = "\u202C";

export type TextDirection = "auto" | "ltr" | "rtl";

/** Paragraph direction request: `0` LTR, `1` RTL, `-1` auto (P2–P3, LTR when no strong character). */
export type ParagraphDirection = 0 | 1 | -1;

// -----------------------------------------------------------------------------
// Character data
// -----------------------------------------------------------------------------

interface RangeTable {
  bmp: Uint8Array;
  starts: Uint32Array;
  values: Uint8Array;
}

function decodeRanges(encoded: string): RangeTable {
  const starts: number[] = [];
  const values: number[] = [];
  let cp = 0;
  let num = 0;
  for (let i = 0; i < encoded.length; i++) {
    const c = encoded.charCodeAt(i);
    if (c >= 65 && c <= 90) {
      cp += num;
      starts.push(cp);
      values.push(c - 65);
      num = 0;
    } else num = num * 36 + (c <= 57 ? c - 48 : c - 87);
  }
  const bmp = new Uint8Array(0x10000);
  for (let r = 0; r < starts.length; r++) {
    const s = starts[r] as number;
    if (s >= 0x10000) break;
    const e = Math.min(0x10000, r + 1 < starts.length ? (starts[r + 1] as number) : 0x110000);
    bmp.fill(values[r] as number, s, e);
  }
  return { bmp, starts: Uint32Array.from(starts), values: Uint8Array.from(values) };
}

function lookup(t: RangeTable, cp: number): number {
  if (cp < 0x10000) return t.bmp[cp] as number;
  const s = t.starts;
  let lo = 0;
  let hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((s[mid] as number) <= cp) lo = mid;
    else hi = mid - 1;
  }
  return t.values[lo] as number;
}

function decodeList(encoded: string): number[] {
  return encoded.length === 0 ? [] : encoded.split(",").map((s) => Number.parseInt(s, 36));
}

let classTable: RangeTable | null = null;
let joiningTable: RangeTable | null = null;
let mirrorMap: Map<number, number> | null = null;
let bracketMap: Map<number, { pair: number; open: boolean; canon: number }> | null = null;
let formMap: Map<number, Uint32Array> | null = null;

/** Bidi_Class of a code point (`BIDI_*` constant). */
export function bidiClass(cp: number): number {
  if (cp < 0x41) return cp >= 0 ? (LATIN_LOW[cp] as number) : BIDI_L;
  if (!(cp <= 0x10ffff)) return BIDI_L;
  if (classTable === null) classTable = decodeRanges(BIDI_CLASS_RANGES);
  return lookup(classTable, cp);
}

// The first 0x41 code points are hot (spaces, digits, punctuation): answer them without the table.
const LATIN_LOW = new Uint8Array(0x41);
{
  LATIN_LOW.fill(BIDI_BN, 0, 0x20);
  LATIN_LOW[0x09] = BIDI_S;
  LATIN_LOW[0x0b] = BIDI_S;
  LATIN_LOW[0x1f] = BIDI_S;
  LATIN_LOW[0x0a] = BIDI_B;
  LATIN_LOW[0x0d] = BIDI_B;
  LATIN_LOW[0x1c] = BIDI_B;
  LATIN_LOW[0x1d] = BIDI_B;
  LATIN_LOW[0x1e] = BIDI_B;
  LATIN_LOW[0x0c] = BIDI_WS;
  LATIN_LOW[0x20] = BIDI_WS;
  LATIN_LOW.fill(BIDI_ON, 0x21, 0x41);
  LATIN_LOW.fill(BIDI_ET, 0x23, 0x26);
  LATIN_LOW[0x2b] = BIDI_ES;
  LATIN_LOW[0x2d] = BIDI_ES;
  LATIN_LOW[0x2c] = BIDI_CS;
  LATIN_LOW[0x2e] = BIDI_CS;
  LATIN_LOW[0x2f] = BIDI_CS;
  LATIN_LOW[0x3a] = BIDI_CS;
  LATIN_LOW.fill(BIDI_EN, 0x30, 0x3a);
}

/** Bidi_Mirroring_Glyph of a code point, or `0` when it has none. */
export function mirrorGlyph(cp: number): number {
  if (mirrorMap === null) {
    const list = decodeList(BIDI_MIRRORS);
    mirrorMap = new Map();
    for (let i = 0; i < list.length; i += 2) mirrorMap.set(list[i] as number, list[i + 1] as number);
  }
  return mirrorMap.get(cp) ?? 0;
}

function brackets(): Map<number, { pair: number; open: boolean; canon: number }> {
  if (bracketMap === null) {
    const list = decodeList(BIDI_BRACKETS);
    bracketMap = new Map();
    for (let i = 0; i < list.length; i += 4) {
      bracketMap.set(list[i] as number, { pair: list[i + 1] as number, open: list[i + 2] === 1, canon: list[i + 3] as number });
    }
  }
  return bracketMap;
}

/** True for code points whose presence can make the browser or a terminal reorder text (R, AL, AN). */
export function isRtlCodePoint(cp: number): boolean {
  if (cp < 0x0590) return false;
  if (cp > 0x08ff && cp < 0xfb1d) return cp === 0x200f;
  if (cp > 0xfefe && cp < 0x10800) return false;
  if (cp > 0x10fff && cp < 0x1e800) return false;
  if (cp > 0x1efff) return false;
  const c = bidiClass(cp);
  return c === BIDI_R || c === BIDI_AL || c === BIDI_AN;
}

/** Code points that can change display order of otherwise-LTR text (R, AL, AN and explicit RTL/override controls). */
function isBidiTrigger(cp: number): boolean {
  if (cp < 0x0590) return false;
  if (cp >= 0x202a && cp <= 0x202e) return true;
  if (cp >= 0x2066 && cp <= 0x2069) return true;
  return isRtlCodePoint(cp);
}

/**
 * Code points that can raise text to a right-to-left (odd) level: R, AL, AN
 * and RLE, RLO, RLI. Without one, every resolved level is even, so LTR
 * embeddings, overrides and isolates (LRE, LRO, LRI, FSI, PDF, PDI) alone
 * never reorder, mirror or shape anything.
 */
function isReorderTrigger(cp: number): boolean {
  if (cp < 0x0590) return false;
  if (cp === 0x202b || cp === 0x202e || cp === 0x2067) return true;
  return isRtlCodePoint(cp);
}

/** True when displaying `text` requires reordering (it contains R, AL or AN, or an RLE/RLO/RLI control). */
export function textNeedsBidi(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x0590) continue;
    if (isReorderTrigger(c >= 0xd800 && c <= 0xdbff ? (text.codePointAt(i) as number) : c)) return true;
  }
  return false;
}

/** True when `text` contains any R, AL or AN character (the strings that need bidi neutralization when emitted). */
export function hasRtl(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x0590) continue;
    const cp = c >= 0xd800 && c <= 0xdbff ? (text.codePointAt(i) as number) : c;
    if (isRtlCodePoint(cp)) return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// The algorithm (one paragraph)
// -----------------------------------------------------------------------------

const MAX_DEPTH = 125;
const MAX_BRACKET_STACK = 63;

function isRemovedByX9(t: number): boolean {
  return t === BIDI_BN || (t >= BIDI_LRE && t <= BIDI_PDF);
}

function isIsolateInitiator(t: number): boolean {
  return t === BIDI_LRI || t === BIDI_RLI || t === BIDI_FSI;
}

/** P2–P3: first strong direction in `[start, end)`, skipping isolates; `-1` when none. */
function firstStrong(types: ArrayLike<number>, start: number, end: number, stopAtPdi: boolean): number {
  let depth = 0;
  for (let i = start; i < end; i++) {
    const t = types[i] as number;
    if (depth === 0) {
      if (t === BIDI_L) return 0;
      if (t === BIDI_R || t === BIDI_AL) return 1;
    }
    if (isIsolateInitiator(t)) depth++;
    else if (t === BIDI_PDI) {
      if (depth > 0) depth--;
      else if (stopAtPdi) return -1;
    } else if (t === BIDI_B) return -1;
  }
  return -1;
}

export interface BidiParagraphResult {
  /** Resolved embedding level per input index (X9-removed characters take the level of the preceding character). */
  levels: Uint8Array;
  paragraphLevel: number;
}

/**
 * Resolve embedding levels (P2–I2) for a single paragraph.
 *
 * @param types original Bidi_Class per index (code point)
 * @param codePoints code points, used for paired brackets (N0); `null` disables bracket pairing
 */
export function resolveParagraphLevels(
  types: ArrayLike<number>,
  codePoints: ArrayLike<number> | null,
  direction: ParagraphDirection,
  start = 0,
  end = types.length,
  levels: Uint8Array = new Uint8Array(types.length),
): BidiParagraphResult {
  const n = end - start;
  let paraLevel = direction === -1 ? Math.max(0, firstStrong(types, start, end, false)) : direction;
  if (n <= 0) return { levels, paragraphLevel: paraLevel };

  // Working copy of classes (indices relative to `start`).
  const rt = new Uint8Array(n);
  for (let i = 0; i < n; i++) rt[i] = types[start + i] as number;

  // BD9: matching PDIs for isolate initiators.
  const matchingPdi = new Int32Array(n).fill(-1);
  const matchedPdi = new Uint8Array(n);
  {
    const open: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = rt[i] as number;
      if (isIsolateInitiator(t)) open.push(i);
      else if (t === BIDI_PDI && open.length > 0) {
        const o = open.pop() as number;
        matchingPdi[o] = i;
        matchedPdi[i] = 1;
      }
    }
  }

  // X1–X8.
  const lv = new Uint8Array(n);
  const stLevel = new Uint8Array(MAX_DEPTH + 2);
  const stOverride = new Int8Array(MAX_DEPTH + 2); // -1 none, 0 L, 1 R
  const stIsolate = new Uint8Array(MAX_DEPTH + 2);
  let sp = 0;
  stLevel[0] = paraLevel;
  stOverride[0] = -1;
  stIsolate[0] = 0;
  let overflowIsolate = 0;
  let overflowEmbedding = 0;
  let validIsolate = 0;
  for (let i = 0; i < n; i++) {
    let t = rt[i] as number;
    switch (t) {
      case BIDI_RLE:
      case BIDI_LRE:
      case BIDI_RLO:
      case BIDI_LRO: {
        const cur = stLevel[sp] as number;
        const rtl = t === BIDI_RLE || t === BIDI_RLO;
        const next = rtl ? (cur + 1) | 1 : (cur + 2) & ~1;
        lv[i] = cur;
        if (next <= MAX_DEPTH && overflowIsolate === 0 && overflowEmbedding === 0) {
          sp++;
          stLevel[sp] = next;
          stOverride[sp] = t === BIDI_RLO ? 1 : t === BIDI_LRO ? 0 : -1;
          stIsolate[sp] = 0;
        } else if (overflowIsolate === 0) overflowEmbedding++;
        break;
      }
      case BIDI_RLI:
      case BIDI_LRI:
      case BIDI_FSI: {
        const cur = stLevel[sp] as number;
        lv[i] = cur;
        const ov = stOverride[sp] as number;
        if (ov >= 0) rt[i] = ov === 0 ? BIDI_L : BIDI_R;
        if (t === BIDI_FSI) {
          const stop = matchingPdi[i] === -1 ? n : (matchingPdi[i] as number);
          t = firstStrong(rt, i + 1, stop, true) === 1 ? BIDI_RLI : BIDI_LRI;
        }
        const next = t === BIDI_RLI ? (cur + 1) | 1 : (cur + 2) & ~1;
        if (next <= MAX_DEPTH && overflowIsolate === 0 && overflowEmbedding === 0) {
          validIsolate++;
          sp++;
          stLevel[sp] = next;
          stOverride[sp] = -1;
          stIsolate[sp] = 1;
        } else overflowIsolate++;
        break;
      }
      case BIDI_PDI: {
        if (overflowIsolate > 0) overflowIsolate--;
        else if (validIsolate > 0) {
          overflowEmbedding = 0;
          while (stIsolate[sp] === 0) sp--;
          sp--;
          validIsolate--;
        }
        lv[i] = stLevel[sp] as number;
        const ov = stOverride[sp] as number;
        if (ov >= 0) rt[i] = ov === 0 ? BIDI_L : BIDI_R;
        break;
      }
      case BIDI_PDF: {
        lv[i] = stLevel[sp] as number;
        if (overflowIsolate > 0) {
          // ignored
        } else if (overflowEmbedding > 0) overflowEmbedding--;
        else if (stIsolate[sp] === 0 && sp > 0) sp--;
        break;
      }
      case BIDI_B:
        lv[i] = paraLevel;
        break;
      case BIDI_BN:
        lv[i] = stLevel[sp] as number;
        break;
      default: {
        lv[i] = stLevel[sp] as number;
        const ov = stOverride[sp] as number;
        if (ov >= 0) rt[i] = ov === 0 ? BIDI_L : BIDI_R;
      }
    }
  }

  // X9: indices that survive.
  const kept = new Int32Array(n);
  let k = 0;
  for (let i = 0; i < n; i++) if (!isRemovedByX9(types[start + i] as number)) kept[k++] = i;

  // X10 / BD13: level runs chained into isolating run sequences.
  const runStart: number[] = [];
  const runEnd: number[] = [];
  for (let j = 0; j < k; ) {
    const level = lv[kept[j] as number];
    let e = j + 1;
    while (e < k && lv[kept[e] as number] === level) e++;
    runStart.push(j);
    runEnd.push(e);
    j = e;
  }
  const runOfKept = new Int32Array(k);
  for (let r = 0; r < runStart.length; r++) runOfKept.fill(r, runStart[r] as number, runEnd[r] as number);
  const keptPos = new Int32Array(n).fill(-1);
  for (let j = 0; j < k; j++) keptPos[kept[j] as number] = j;

  // X10 sos/eos compare explicit embedding levels, so keep them apart from the resolved ones.
  const xl = lv.slice();
  const seq: number[] = [];
  for (let r = 0; r < runStart.length; r++) {
    const first = kept[runStart[r] as number] as number;
    // Runs starting with a matched PDI are continuations of an earlier sequence.
    if ((types[start + first] as number) === BIDI_PDI && matchedPdi[first] === 1) continue;
    seq.length = 0;
    let cur = r;
    for (;;) {
      for (let j = runStart[cur] as number; j < (runEnd[cur] as number); j++) seq.push(kept[j] as number);
      const last = seq[seq.length - 1] as number;
      const lt = types[start + last] as number;
      if (!isIsolateInitiator(lt) || matchingPdi[last] === -1) break;
      const pdiPos = keptPos[matchingPdi[last] as number] as number;
      if (pdiPos < 0) break;
      cur = runOfKept[pdiPos] as number;
    }
    resolveSequence(seq, rt, lv, xl, types, start, codePoints, paraLevel, kept, keptPos, k);
  }

  // Write out; removed characters take the level of the preceding character.
  let prev = paraLevel;
  for (let i = 0; i < n; i++) {
    if (isRemovedByX9(types[start + i] as number)) levels[start + i] = prev;
    else {
      prev = lv[i] as number;
      levels[start + i] = prev;
    }
  }
  return { levels, paragraphLevel: paraLevel };
}

function strongOf(t: number): number {
  if (t === BIDI_L) return BIDI_L;
  if (t === BIDI_R || t === BIDI_AL || t === BIDI_EN || t === BIDI_AN) return BIDI_R;
  return -1;
}

function isNI(t: number): boolean {
  return t === BIDI_B || t === BIDI_S || t === BIDI_WS || t === BIDI_ON || (t >= BIDI_LRI && t <= BIDI_PDI);
}

function resolveSequence(
  seq: readonly number[],
  rt: Uint8Array,
  lv: Uint8Array,
  xl: Uint8Array,
  types: ArrayLike<number>,
  base: number,
  codePoints: ArrayLike<number> | null,
  paraLevel: number,
  kept: Int32Array,
  keptPos: Int32Array,
  keptCount: number,
): void {
  const m = seq.length;
  const first = seq[0] as number;
  const last = seq[m - 1] as number;
  const level = xl[first] as number;
  const fp = keptPos[first] as number;
  const before = fp > 0 ? (xl[kept[fp - 1] as number] as number) : paraLevel;
  const lp = keptPos[last] as number;
  const lastType = types[base + last] as number;
  const after = isIsolateInitiator(lastType) || lp + 1 >= keptCount ? paraLevel : (xl[kept[lp + 1] as number] as number);
  const sos = (Math.max(before, level) & 1) === 1 ? BIDI_R : BIDI_L;
  const eos = (Math.max(after, level) & 1) === 1 ? BIDI_R : BIDI_L;

  // W1: NSM.
  let prevType = sos;
  for (let j = 0; j < m; j++) {
    const i = seq[j] as number;
    let t = rt[i] as number;
    if (t === BIDI_NSM) {
      t = isIsolateInitiator(prevType) || prevType === BIDI_PDI ? BIDI_ON : prevType;
      rt[i] = t;
    }
    prevType = t;
  }
  // W2 + W3.
  let lastStrong = sos;
  for (let j = 0; j < m; j++) {
    const i = seq[j] as number;
    const t = rt[i] as number;
    if (t === BIDI_L || t === BIDI_R || t === BIDI_AL) lastStrong = t;
    else if (t === BIDI_EN && lastStrong === BIDI_AL) rt[i] = BIDI_AN;
  }
  for (let j = 0; j < m; j++) {
    const i = seq[j] as number;
    if (rt[i] === BIDI_AL) rt[i] = BIDI_R;
  }
  // W4.
  for (let j = 1; j < m - 1; j++) {
    const i = seq[j] as number;
    const t = rt[i] as number;
    if (t !== BIDI_ES && t !== BIDI_CS) continue;
    const a = rt[seq[j - 1] as number] as number;
    const b = rt[seq[j + 1] as number] as number;
    if (a === BIDI_EN && b === BIDI_EN) rt[i] = BIDI_EN;
    else if (t === BIDI_CS && a === BIDI_AN && b === BIDI_AN) rt[i] = BIDI_AN;
  }
  // W5: ET sequences adjacent to EN.
  for (let j = 0; j < m; j++) {
    if (rt[seq[j] as number] !== BIDI_ET) continue;
    let e = j;
    while (e < m && rt[seq[e] as number] === BIDI_ET) e++;
    const adjacent = (j > 0 && rt[seq[j - 1] as number] === BIDI_EN) || (e < m && rt[seq[e] as number] === BIDI_EN);
    if (adjacent) for (let q = j; q < e; q++) rt[seq[q] as number] = BIDI_EN;
    j = e - 1;
  }
  // W6.
  for (let j = 0; j < m; j++) {
    const i = seq[j] as number;
    const t = rt[i] as number;
    if (t === BIDI_ES || t === BIDI_ET || t === BIDI_CS) rt[i] = BIDI_ON;
  }
  // W7.
  lastStrong = sos;
  for (let j = 0; j < m; j++) {
    const i = seq[j] as number;
    const t = rt[i] as number;
    if (t === BIDI_L || t === BIDI_R) lastStrong = t;
    else if (t === BIDI_EN && lastStrong === BIDI_L) rt[i] = BIDI_L;
  }

  // N0: paired brackets (BD16).
  if (codePoints !== null) resolveBrackets(seq, rt, types, base, codePoints, level, sos);

  // N1 + N2.
  const embedding = (level & 1) === 1 ? BIDI_R : BIDI_L;
  for (let j = 0; j < m; j++) {
    if (!isNI(rt[seq[j] as number] as number)) continue;
    let e = j;
    while (e < m && isNI(rt[seq[e] as number] as number)) e++;
    const leftDir = j === 0 ? sos : strongOf(rt[seq[j - 1] as number] as number);
    const rightDir = e === m ? eos : strongOf(rt[seq[e] as number] as number);
    const dir = leftDir === rightDir && leftDir !== -1 ? leftDir : embedding;
    for (let q = j; q < e; q++) rt[seq[q] as number] = dir;
    j = e - 1;
  }

  // I1 + I2.
  for (let j = 0; j < m; j++) {
    const i = seq[j] as number;
    const t = rt[i] as number;
    if ((level & 1) === 0) {
      if (t === BIDI_R) lv[i] = level + 1;
      else if (t === BIDI_AN || t === BIDI_EN) lv[i] = level + 2;
    } else if (t === BIDI_L || t === BIDI_EN || t === BIDI_AN) lv[i] = level + 1;
  }
}

function resolveBrackets(
  seq: readonly number[],
  rt: Uint8Array,
  types: ArrayLike<number>,
  base: number,
  codePoints: ArrayLike<number>,
  level: number,
  sos: number,
): void {
  const table = brackets();
  const m = seq.length;
  // BD16.
  const pairs: number[] = [];
  const stackPair: number[] = [];
  const stackPos: number[] = [];
  for (let j = 0; j < m; j++) {
    const i = seq[j] as number;
    if (rt[i] !== BIDI_ON) continue;
    const b = table.get(codePoints[base + i] as number);
    if (b === undefined) continue;
    if (b.open) {
      // BD16: on overflow, stop and pair nothing in this isolating run sequence.
      if (stackPair.length === MAX_BRACKET_STACK) return;
      const closer = table.get(b.pair);
      stackPair.push(closer !== undefined ? closer.canon : b.pair);
      stackPos.push(j);
    } else {
      for (let s = stackPair.length - 1; s >= 0; s--) {
        if (stackPair[s] === b.canon) {
          pairs.push(stackPos[s] as number, j);
          stackPair.length = s;
          stackPos.length = s;
          break;
        }
      }
    }
  }
  if (pairs.length === 0) return;
  // Sort pairs by opener position.
  const order: number[] = [];
  for (let p = 0; p < pairs.length; p += 2) order.push(p);
  order.sort((a, b) => (pairs[a] as number) - (pairs[b] as number));

  const embedding = (level & 1) === 1 ? BIDI_R : BIDI_L;
  const opposite = embedding === BIDI_L ? BIDI_R : BIDI_L;
  for (const p of order) {
    const o = pairs[p] as number;
    const c = pairs[p + 1] as number;
    let foundEmbedding = false;
    let foundOpposite = false;
    for (let j = o + 1; j < c; j++) {
      const d = strongOf(rt[seq[j] as number] as number);
      if (d === embedding) {
        foundEmbedding = true;
        break;
      }
      if (d === opposite) foundOpposite = true;
    }
    let dir = -1;
    if (foundEmbedding) dir = embedding;
    else if (foundOpposite) {
      let ctx = sos;
      for (let j = o - 1; j >= 0; j--) {
        const d = strongOf(rt[seq[j] as number] as number);
        if (d !== -1) {
          ctx = d;
          break;
        }
      }
      dir = ctx === opposite ? opposite : embedding;
    }
    if (dir === -1) continue;
    for (const pos of [o, c]) {
      rt[seq[pos] as number] = dir;
      for (let j = pos + 1; j < m; j++) {
        const i = seq[j] as number;
        if ((types[base + i] as number) !== BIDI_NSM) break;
        rt[i] = dir;
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Multi-paragraph text, lines and reordering
// -----------------------------------------------------------------------------

/** Resolve levels for text that may contain several paragraphs (P1: split after each B). */
export function resolveLevels(
  types: ArrayLike<number>,
  codePoints: ArrayLike<number> | null,
  direction: ParagraphDirection,
): { levels: Uint8Array; paragraphLevels: Uint8Array } {
  const n = types.length;
  const levels = new Uint8Array(n);
  const paragraphLevels = new Uint8Array(n);
  let s = 0;
  while (s < n) {
    let e = s;
    while (e < n && types[e] !== BIDI_B) e++;
    if (e < n) e++;
    const { paragraphLevel } = resolveParagraphLevels(types, codePoints, direction, s, e, levels);
    paragraphLevels.fill(paragraphLevel, s, e);
    s = e;
  }
  return { levels, paragraphLevels };
}

function isL1Whitespace(t: number): boolean {
  return t === BIDI_WS || (t >= BIDI_LRI && t <= BIDI_PDI) || isRemovedByX9(t);
}

/**
 * L1: reset segment/paragraph separators, whitespace before them and trailing
 * whitespace of the line `[start, end)` to the paragraph level, in place.
 * X9-removed characters (BN, embeddings, overrides) outside those sequences
 * then take the level of the preceding character (UAX #9 §5.2).
 */
export function applyLineRules(
  types: ArrayLike<number>,
  levels: Uint8Array,
  paragraphLevels: ArrayLike<number>,
  start: number,
  end: number,
): void {
  let trailing = true;
  let removed = false;
  for (let i = end - 1; i >= start; i--) {
    const t = types[i] as number;
    if (t === BIDI_S || t === BIDI_B) {
      levels[i] = paragraphLevels[i] as number;
      trailing = true;
    } else if (trailing && isL1Whitespace(t)) levels[i] = paragraphLevels[i] as number;
    else {
      trailing = false;
      if (isRemovedByX9(t)) {
        levels[i] = REMOVED_LEVEL;
        removed = true;
      }
    }
  }
  if (!removed) return;
  for (let i = start; i < end; i++) {
    if (levels[i] === REMOVED_LEVEL) levels[i] = i > start ? (levels[i - 1] as number) : (paragraphLevels[i] as number);
  }
}

/** Placeholder for X9-removed characters awaiting the post-L1 level of their predecessor (real levels are ≤ 126). */
const REMOVED_LEVEL = 255;

/**
 * L2: visual order of `[start, end)` given final levels. Returns logical
 * indices in left-to-right display order.
 */
export function reorderIndices(levels: ArrayLike<number>, start: number, end: number, out: number[] = []): number[] {
  out.length = 0;
  let maxLevel = 0;
  let minOdd = 255;
  for (let i = start; i < end; i++) {
    const l = levels[i] as number;
    out.push(i);
    if (l > maxLevel) maxLevel = l;
    if ((l & 1) === 1 && l < minOdd) minOdd = l;
  }
  if (minOdd === 255) return out;
  const n = out.length;
  for (let level = maxLevel; level >= minOdd; level--) {
    for (let j = 0; j < n; j++) {
      if ((levels[out[j] as number] as number) < level) continue;
      let e = j;
      while (e < n && (levels[out[e] as number] as number) >= level) e++;
      for (let a = j, b = e - 1; a < b; a++, b--) {
        const tmp = out[a] as number;
        out[a] = out[b] as number;
        out[b] = tmp;
      }
      j = e;
    }
  }
  return out;
}

/** Code point array of a string. */
function toCodePoints(text: string): number[] {
  const cps: number[] = [];
  for (const ch of text) cps.push(ch.codePointAt(0) as number);
  return cps;
}

function directionOf(dir: TextDirection | ParagraphDirection): ParagraphDirection {
  if (dir === "ltr") return 0;
  if (dir === "rtl") return 1;
  if (dir === "auto") return -1;
  return dir;
}

/** P2–P3 base direction of a string: `"rtl"` when its first strong character is R or AL. */
export function paragraphDirection(text: string): "ltr" | "rtl" {
  let depth = 0;
  for (const ch of text) {
    const t = bidiClass(ch.codePointAt(0) as number);
    if (depth === 0 && t === BIDI_L) return "ltr";
    if (depth === 0 && (t === BIDI_R || t === BIDI_AL)) return "rtl";
    if (isIsolateInitiator(t)) depth++;
    else if (t === BIDI_PDI && depth > 0) depth--;
    else if (t === BIDI_B) break;
  }
  return "ltr";
}

/**
 * Reorder a single line of text into visual (left-to-right display) order,
 * applying mirroring (L4). Explicit formatting characters are dropped.
 * Arabic shaping is applied with `shape: true`.
 */
export function reorderLine(text: string, dir: TextDirection = "auto", options: { shape?: boolean } = {}): string {
  const cps = toCodePoints(text);
  const n = cps.length;
  const types = new Uint8Array(n);
  let trigger = dir === "rtl";
  for (let i = 0; i < n; i++) {
    const cp = cps[i] as number;
    types[i] = bidiClass(cp);
    if (!trigger && isBidiTrigger(cp)) trigger = true;
  }
  if (!trigger) return text;
  const { levels, paragraphLevels } = resolveLevels(types, cps, directionOf(dir));
  let out = "";
  // Each paragraph is a line of its own; separators stay where they are.
  for (let s = 0; s <= n; ) {
    let e = s;
    while (e < n && types[e] !== BIDI_B) e++;
    applyLineRules(types, levels, paragraphLevels, s, e);
    const shaped = options.shape ? shapeCodePoints(cps.slice(s, e), levels.subarray(s, e)) : null;
    for (const i of reorderIndices(levels, s, e)) {
      const t = types[i] as number;
      if (isRemovedByX9(t) || (t >= BIDI_LRI && t <= BIDI_PDI)) continue;
      let cp = shaped === null ? (cps[i] as number) : (shaped[i - s] as number);
      if (((levels[i] as number) & 1) === 1) cp = mirrorGlyph(cp) || cp;
      out += String.fromCodePoint(cp);
    }
    if (e < n) out += String.fromCodePoint(cps[e] as number);
    s = e + 1;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Arabic contextual shaping (presentation forms)
// -----------------------------------------------------------------------------

const JT_U = 0;
const JT_T = 1;
const JT_C = 2;
const JT_D = 3;
const JT_R = 4;
const JT_L = 5;

/** Joining_Type (0 U, 1 T, 2 C, 3 D, 4 R, 5 L). */
export function joiningType(cp: number): number {
  if (cp < 0x0300) return cp === 0xad ? JT_T : JT_U;
  if (joiningTable === null) joiningTable = decodeRanges(JOINING_TYPE_RANGES);
  return lookup(joiningTable, cp);
}

/** Presentation form of an Arabic letter: `form` 0 isolated, 1 final, 2 initial, 3 medial; `0` when none. */
export function arabicPresentationForm(cp: number, form: 0 | 1 | 2 | 3): number {
  if (formMap === null) {
    const list = decodeList(ARABIC_FORMS);
    formMap = new Map();
    for (let i = 0; i < list.length; i += 5) formMap.set(list[i] as number, Uint32Array.of(list[i + 1] as number, list[i + 2] as number, list[i + 3] as number, list[i + 4] as number));
  }
  const f = formMap.get(cp);
  return f === undefined ? 0 : (f[form] as number);
}

function joinsForward(jt: number): boolean {
  return jt === JT_D || jt === JT_L || jt === JT_C;
}

function joinsBackward(jt: number): boolean {
  return jt === JT_D || jt === JT_R || jt === JT_C;
}

/** Pick a presentation form for `cp` given whether its logical neighbours join toward it. */
function contextualForm(cp: number, jt: number, prevJoins: boolean, nextJoins: boolean): number {
  const canPrev = prevJoins && joinsBackward(jt);
  const canNext = nextJoins && joinsForward(jt);
  const form = canPrev && canNext ? 3 : canPrev ? 1 : canNext ? 2 : 0;
  return arabicPresentationForm(cp, form) || (form === 3 ? arabicPresentationForm(cp, 1) : form === 2 ? arabicPresentationForm(cp, 0) : 0) || cp;
}

/** Replace Arabic letters in a logical-order code point array with contextual presentation forms. */
export function shapeArabicCodePoints(cps: readonly number[]): number[] {
  return shapeCodePoints(cps, null);
}

function isJoiningLetter(jt: number): boolean {
  return jt === JT_D || jt === JT_R || jt === JT_L;
}

/**
 * Contextual shaping over code points in logical order. Transparent marks are
 * skipped; ZWJ (join causing) and ZWNJ (non-joining) take part as code points,
 * wherever they sit inside grapheme clusters. With `levels`, letters join only
 * within their level run (UAX #9 §3.5), and in even-level (left-to-right
 * override) runs the joining direction is reversed, since the logically first
 * letter is displayed leftmost.
 */
function shapeCodePoints(cps: readonly number[], levels: ArrayLike<number> | null): number[] {
  const n = cps.length;
  const out = cps.slice();
  const jts = new Uint8Array(n);
  let any = false;
  for (let i = 0; i < n; i++) {
    const cp = cps[i] as number;
    if (cp < 0x0300) continue;
    const jt = joiningType(cp);
    jts[i] = jt;
    if (isJoiningLetter(jt)) any = true;
  }
  if (!any) return out;
  for (let i = 0; i < n; i++) {
    const jt = jts[i] as number;
    if (!isJoiningLetter(jt)) continue;
    const lv = levels === null ? 1 : (levels[i] as number);
    let p = i - 1;
    while (p >= 0 && jts[p] === JT_T && (levels === null || levels[p] === lv)) p--;
    let q = i + 1;
    while (q < n && jts[q] === JT_T && (levels === null || levels[q] === lv)) q++;
    let before = p >= 0 && (levels === null || levels[p] === lv) ? (jts[p] as number) : JT_U;
    let after = q < n && (levels === null || levels[q] === lv) ? (jts[q] as number) : JT_U;
    if ((lv & 1) === 0) {
      const t = before;
      before = after;
      after = t;
    }
    out[i] = contextualForm(cps[i] as number, jt, joinsForward(before), joinsBackward(after));
  }
  return out;
}

// -----------------------------------------------------------------------------
// Grapheme-level layout (used by the scene painter)
// -----------------------------------------------------------------------------

/** Per-grapheme bidi resolution of a text model (logical order). */
export interface GraphemeBidi {
  /** Final embedding level per grapheme before line rules (L1). */
  levels: Uint8Array;
  /** Paragraph embedding level per grapheme. */
  paragraphLevels: Uint8Array;
  /** Bidi_Class of each grapheme's last code point that X9 keeps. */
  types: Uint8Array;
}

/**
 * Whether a grapheme sequence needs the bidi path: `dir === "rtl"` or any
 * R/AL/AN character or RLE/RLO/RLI control (LTR-only controls and isolates
 * cannot reorder anything). Pure-LTR text returns `false` after one cheap
 * scan (every code point below U+0590 is rejected by a single comparison).
 */
export function graphemesNeedBidi(gs: readonly Grapheme[], dir: TextDirection = "auto"): boolean {
  if (dir === "rtl") return true;
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i] as Grapheme;
    if (g.codePoint < 0x0590 && !g.isMulti) continue;
    if (isReorderTrigger(g.codePoint)) return true;
    if (g.isMulti) {
      const s = g.grapheme;
      for (let j = 0; j < s.length; j++) {
        const c = s.charCodeAt(j);
        if (c >= 0x0590 && isReorderTrigger(s.codePointAt(j) as number)) return true;
      }
    }
  }
  return false;
}

/**
 * Resolve levels for a grapheme array. Newlines separate paragraphs; each
 * `auto` paragraph picks its own direction. A cluster takes the level and
 * class of its last code point that X9 keeps, so a space carrying a combining
 * mark is not trailing whitespace (L1), and a Prepend cluster (U+0600 + digit)
 * follows its base.
 */
export function resolveGraphemeBidi(gs: readonly Grapheme[], dir: TextDirection = "auto"): GraphemeBidi {
  const cps: number[] = [];
  const firstCp = new Int32Array(gs.length);
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i] as Grapheme;
    firstCp[i] = cps.length;
    if (!g.isMulti) cps.push(g.codePoint);
    else for (const ch of g.grapheme) cps.push(ch.codePointAt(0) as number);
  }
  const types = new Uint8Array(cps.length);
  for (let i = 0; i < cps.length; i++) types[i] = bidiClass(cps[i] as number);
  const r = resolveLevels(types, cps, directionOf(dir));
  const n = gs.length;
  const levels = new Uint8Array(n);
  const paragraphLevels = new Uint8Array(n);
  const gTypes = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const first = firstCp[i] as number;
    let c = first;
    if ((gs[i] as Grapheme).isMulti) {
      for (let k = (i + 1 < n ? (firstCp[i + 1] as number) : cps.length) - 1; k > first; k--) {
        if (!isRemovedByX9(types[k] as number)) {
          c = k;
          break;
        }
      }
    }
    levels[i] = r.levels[c] as number;
    paragraphLevels[i] = r.paragraphLevels[c] as number;
    gTypes[i] = types[c] as number;
  }
  return { levels, paragraphLevels, types: gTypes };
}

const graphemeCache = new Map<string, Grapheme>();

function substituted(g: Grapheme, cp: number): Grapheme {
  const rest = g.grapheme.slice(g.codePoint > 0xffff ? 2 : 1);
  const s = String.fromCodePoint(cp) + rest;
  let out = graphemeCache.get(s);
  if (out === undefined) {
    out = Object.freeze({ grapheme: s, width: g.width, codePoint: cp, isMulti: g.isMulti });
    if (graphemeCache.size >= 2048) graphemeCache.clear();
    graphemeCache.set(s, out);
  }
  return out;
}

/** Item in a line to reorder: a grapheme index, or `-1` for a synthetic grapheme (the truncation ellipsis). */
export interface VisualLine {
  /** Graphemes in visual order (mirrored and shaped). */
  graphemes: Grapheme[];
  /** Logical grapheme index per visual grapheme (`-1` for the synthetic item). */
  source: Int32Array;
  /** Paragraph embedding level of the line. */
  paragraphLevel: number;
}

/**
 * Reorder one laid-out line into visual order (L1, L2, L4) and apply Arabic
 * shaping within the line. `items` are logical grapheme indices; `-1` marks a
 * synthetic grapheme (`synthetic`), which takes the level of `syntheticRef`.
 */
export function visualizeLine(
  gs: readonly Grapheme[],
  bidi: GraphemeBidi,
  items: readonly number[],
  synthetic: Grapheme | null = null,
  syntheticRef = -1,
): VisualLine {
  const n = items.length;
  const levels = new Uint8Array(n);
  const types = new Uint8Array(n);
  const paras = new Uint8Array(n);
  const ref0 = items.find((i) => i >= 0) ?? syntheticRef;
  const paragraphLevel = ref0 >= 0 ? (bidi.paragraphLevels[ref0] as number) : 0;
  for (let j = 0; j < n; j++) {
    const i = items[j] as number;
    const src = i >= 0 ? i : syntheticRef;
    paras[j] = src >= 0 ? (bidi.paragraphLevels[src] as number) : paragraphLevel;
    levels[j] = src >= 0 ? (bidi.levels[src] as number) : paragraphLevel;
    types[j] = i >= 0 ? (bidi.types[i] as number) : BIDI_ON;
  }
  applyLineRules(types, levels, paras, 0, n);

  // Shaping in logical order within the line, per code point and level run.
  let shapedCp: Int32Array | null = null;
  for (let j = 0; j < n; j++) {
    const i = items[j] as number;
    if (i < 0) continue;
    const g = gs[i] as Grapheme;
    if (g.codePoint < 0x0600 || !isJoiningLetter(joiningType(g.codePoint))) continue;
    shapedCp = shapeLine(gs, items, levels);
    break;
  }

  const order = reorderIndices(levels, 0, n);
  const graphemes: Grapheme[] = new Array(n);
  const source = new Int32Array(n);
  for (let v = 0; v < n; v++) {
    const j = order[v] as number;
    const i = items[j] as number;
    source[v] = i;
    if (i < 0) {
      graphemes[v] = synthetic as Grapheme;
      continue;
    }
    let g = gs[i] as Grapheme;
    const sc = shapedCp === null ? -1 : (shapedCp[j] as number);
    if (sc >= 0) g = substituted(g, sc);
    else if (((levels[j] as number) & 1) === 1) {
      const m = mirrorGlyph(g.codePoint);
      if (m !== 0) g = substituted(g, m);
    }
    graphemes[v] = g;
  }
  return { graphemes, source, paragraphLevel };
}

/**
 * One line of logical text as graphemes in visual order (mirrored and
 * shaped), for drawing labels outside the scene's text layout. Stops at the
 * first newline and keeps the logical prefix that fits `maxWidth` cells,
 * then reorders it like a wrapped line.
 */
export function visualizeText(text: string, dir: TextDirection = "auto", maxWidth = Infinity): Grapheme[] {
  const gs = segmentGraphemes(text);
  let n = 0;
  while (n < gs.length && (gs[n] as Grapheme).codePoint !== 0x0a) n++;
  if (n < gs.length) gs.length = n;
  const items: number[] = [];
  let col = 0;
  for (let i = 0; i < n; i++) {
    const w = (gs[i] as Grapheme).width;
    if (col + w > maxWidth) break;
    col += w;
    items.push(i);
  }
  return visualizeLine(gs, resolveGraphemeBidi(gs, dir), items).graphemes;
}

/** Shaped base code point per line item (`-1` when unchanged). Every code point of a cluster takes the cluster's level. */
function shapeLine(gs: readonly Grapheme[], items: readonly number[], levels: Uint8Array): Int32Array {
  const n = items.length;
  const cps: number[] = [];
  const cpLevels: number[] = [];
  const baseAt = new Int32Array(n).fill(-1);
  for (let j = 0; j < n; j++) {
    const i = items[j] as number;
    const lv = levels[j] as number;
    if (i < 0) {
      cps.push(0x2026);
      cpLevels.push(lv);
      continue;
    }
    const g = gs[i] as Grapheme;
    baseAt[j] = cps.length;
    if (!g.isMulti) {
      cps.push(g.codePoint);
      cpLevels.push(lv);
    } else {
      for (const ch of g.grapheme) {
        cps.push(ch.codePointAt(0) as number);
        cpLevels.push(lv);
      }
    }
  }
  const shaped = shapeCodePoints(cps, cpLevels);
  const out = new Int32Array(n).fill(-1);
  for (let j = 0; j < n; j++) {
    const b = baseAt[j] as number;
    if (b >= 0 && shaped[b] !== cps[b]) out[j] = shaped[b] as number;
  }
  return out;
}
