/**
 * Grapheme-aware text measurement, wrapping and truncation.
 *
 * Columns follow terminal conventions: East Asian wide characters and emoji take
 * two cells, while box drawing, block elements, geometric shapes (including the
 * `▼` mark), arrows and Braille are always exactly one cell.
 */

export type CellWidth = 0 | 1 | 2;

export type WrapMode = "wrap" | "nowrap" | "truncate-end" | "truncate-middle" | "truncate-start";

export interface Grapheme {
  grapheme: string;
  width: CellWidth;
  codePoint: number;
  isMulti: boolean;
}

/** A laid-out line referencing a grapheme array: `[start, cutStart)`, optional `…`, then `[cutEnd, end)`. */
export interface TextLine {
  start: number;
  end: number;
  cutStart: number;
  cutEnd: number;
  ellipsis: boolean;
  width: number;
}

export const ELLIPSIS = "\u2026";
export const TAB_WIDTH = 2;

/** Bounded LRU cache built on `Map` insertion order. */
export class LruCache<K, V> {
  private readonly map = new Map<K, V>();
  constructor(readonly max: number) {}

  get size(): number {
    return this.map.size;
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.max) {
      const oldest = this.map.keys().next();
      if (!oldest.done) this.map.delete(oldest.value);
    }
    this.map.set(key, value);
  }

  clear(): void {
    this.map.clear();
  }
}

let segmenter: Intl.Segmenter | null = null;
function getSegmenter(): Intl.Segmenter {
  if (segmenter === null) segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return segmenter;
}

/** True when every char is printable ASCII (`0x20..0x7E`), so width === length. */
export function isPrintableAscii(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x20 || c > 0x7e) return false;
  }
  return true;
}

function isAsciiOnly(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0x7f) return false;
  }
  return true;
}

/** Ranges that must render as exactly one cell (borders, spinners, arrows, the `▼` mark). */
export function isStrictNarrow(cp: number): boolean {
  return (
    (cp >= 0x2190 && cp <= 0x21ff) || // arrows
    (cp >= 0x2500 && cp <= 0x25ff) || // box drawing, block elements, geometric shapes
    (cp >= 0x2800 && cp <= 0x28ff) // braille
  );
}

function isWide(cp: number): boolean {
  if (cp < 0x1100) return false;
  if (cp <= 0x115f) return true;
  if (cp < 0x231a) return false;
  if (cp < 0x2e80) {
    return (
      cp === 0x231a ||
      cp === 0x231b ||
      cp === 0x2329 ||
      cp === 0x232a ||
      (cp >= 0x23e9 && cp <= 0x23ec) ||
      cp === 0x23f0 ||
      cp === 0x23f3 ||
      cp === 0x2614 ||
      cp === 0x2615 ||
      (cp >= 0x2648 && cp <= 0x2653) ||
      cp === 0x267f ||
      cp === 0x2693 ||
      cp === 0x26a1 ||
      cp === 0x26aa ||
      cp === 0x26ab ||
      cp === 0x26bd ||
      cp === 0x26be ||
      cp === 0x26c4 ||
      cp === 0x26c5 ||
      cp === 0x26ce ||
      cp === 0x26d4 ||
      cp === 0x26ea ||
      cp === 0x26f2 ||
      cp === 0x26f3 ||
      cp === 0x26f5 ||
      cp === 0x26fa ||
      cp === 0x26fd ||
      cp === 0x2705 ||
      cp === 0x270a ||
      cp === 0x270b ||
      cp === 0x2728 ||
      cp === 0x274c ||
      cp === 0x274e ||
      (cp >= 0x2753 && cp <= 0x2755) ||
      cp === 0x2757 ||
      (cp >= 0x2795 && cp <= 0x2797) ||
      cp === 0x27b0 ||
      cp === 0x27bf ||
      cp === 0x2b1b ||
      cp === 0x2b1c ||
      cp === 0x2b50 ||
      cp === 0x2b55
    );
  }
  return (
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3040 && cp <= 0xa4cf) ||
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff01 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x16fe0 && cp <= 0x16fe4) ||
    (cp >= 0x17000 && cp <= 0x18aff) ||
    (cp >= 0x1b000 && cp <= 0x1b2ff) ||
    cp === 0x1f004 ||
    cp === 0x1f0cf ||
    cp === 0x1f18e ||
    (cp >= 0x1f191 && cp <= 0x1f19a) ||
    (cp >= 0x1f200 && cp <= 0x1f2ff) ||
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

const ZERO_WIDTH_RE = /^[\p{Mn}\p{Me}\p{Cf}]$/u;
const cpWidthCache = new Map<number, CellWidth>();

/** Column width of a single code point. */
export function codePointWidth(cp: number): CellWidth {
  if (cp < 0x7f) return cp < 0x20 ? 0 : 1;
  if (cp < 0xa0) return 0;
  if (cp < 0x300) return cp === 0xad ? 0 : 1;
  const cached = cpWidthCache.get(cp);
  if (cached !== undefined) return cached;
  let w: CellWidth;
  if (isStrictNarrow(cp)) w = 1;
  else if (
    (cp >= 0x200b && cp <= 0x200f) ||
    (cp >= 0x2028 && cp <= 0x202e) ||
    (cp >= 0x2060 && cp <= 0x2064) ||
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    (cp >= 0xfe20 && cp <= 0xfe2f) ||
    (cp >= 0x1160 && cp <= 0x11ff) ||
    (cp >= 0xe0000 && cp <= 0xe0fff) ||
    cp === 0xfeff
  ) {
    w = 0;
  } else if (isWide(cp)) w = 2;
  else if (ZERO_WIDTH_RE.test(String.fromCodePoint(cp))) w = 0;
  else w = 1;
  cpWidthCache.set(cp, w);
  return w;
}

const multiWidthCache = new LruCache<string, CellWidth>(4096);

/** Column width of a full grapheme cluster. */
export function graphemeWidth(grapheme: string): CellWidth {
  const len = grapheme.length;
  if (len === 0) return 0;
  const cp = grapheme.codePointAt(0) ?? 0;
  const cpLen = cp > 0xffff ? 2 : 1;
  if (len === cpLen) return codePointWidth(cp);
  if (isStrictNarrow(cp)) return 1;
  const cached = multiWidthCache.get(grapheme);
  if (cached !== undefined) return cached;
  let width: CellWidth = codePointWidth(cp);
  if (width !== 2) {
    for (let i = cpLen; i < len; ) {
      const c = grapheme.codePointAt(i) ?? 0;
      i += c > 0xffff ? 2 : 1;
      if (
        c === 0x200d ||
        c === 0xfe0f ||
        c === 0x20e3 ||
        (c >= 0x1f3fb && c <= 0x1f3ff) ||
        (c >= 0x1f1e6 && c <= 0x1f1ff && cp >= 0x1f1e6 && cp <= 0x1f1ff)
      ) {
        width = 2;
        break;
      }
      if (width === 0) width = codePointWidth(c);
    }
  }
  multiWidthCache.set(grapheme, width);
  return width;
}

const SPACE_GRAPHEME: Grapheme = Object.freeze({ grapheme: " ", width: 1, codePoint: 0x20, isMulti: false });
const NEWLINE_GRAPHEME: Grapheme = Object.freeze({ grapheme: "\n", width: 0, codePoint: 0x0a, isMulti: false });
const asciiGraphemes: Grapheme[] = [];
for (let c = 0; c < 0x80; c++) {
  asciiGraphemes.push(
    Object.freeze({
      grapheme: String.fromCharCode(c),
      width: c >= 0x20 && c < 0x7f ? 1 : 0,
      codePoint: c,
      isMulti: false,
    }) as Grapheme,
  );
}

function pushGrapheme(out: Grapheme[], g: string): void {
  if (g.length === 1) {
    const c = g.charCodeAt(0);
    if (c < 0x80) {
      if (c === 0x09) {
        for (let t = 0; t < TAB_WIDTH; t++) out.push(SPACE_GRAPHEME);
      } else if (c === 0x0a) out.push(NEWLINE_GRAPHEME);
      else if (c !== 0x0d) out.push(asciiGraphemes[c] ?? SPACE_GRAPHEME);
      return;
    }
  }
  if (g === "\r\n") {
    out.push(NEWLINE_GRAPHEME);
    return;
  }
  const cp = g.codePointAt(0) ?? 0;
  const isMulti = g.length > (cp > 0xffff ? 2 : 1);
  out.push({ grapheme: g, width: graphemeWidth(g), codePoint: cp, isMulti });
}

/**
 * Split text into grapheme clusters with their column widths.
 * Tabs expand to two spaces, `\r\n` normalizes to `\n` and lone `\r` is dropped.
 * Returned grapheme objects may be shared and must be treated as read-only.
 */
export function segmentGraphemes(text: string, out: Grapheme[] = []): Grapheme[] {
  if (isAsciiOnly(text)) {
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c >= 0x20 && c < 0x7f) out.push(asciiGraphemes[c] ?? SPACE_GRAPHEME);
      else if (c === 0x09) {
        for (let t = 0; t < TAB_WIDTH; t++) out.push(SPACE_GRAPHEME);
      } else if (c === 0x0a) out.push(NEWLINE_GRAPHEME);
      else if (c !== 0x0d) out.push(asciiGraphemes[c] ?? SPACE_GRAPHEME);
    }
    return out;
  }
  for (const seg of getSegmenter().segment(text)) pushGrapheme(out, seg.segment);
  return out;
}

const widthCache = new LruCache<string, number>(4096);

/**
 * Display width in cells. For multi-line input, the widest line is returned.
 * Pure printable ASCII short-circuits to `text.length`.
 */
export function stringWidth(text: string): number {
  if (isPrintableAscii(text)) return text.length;
  const cached = widthCache.get(text);
  if (cached !== undefined) return cached;
  const gs = segmentGraphemes(text);
  let max = 0;
  let line = 0;
  for (const g of gs) {
    if (g.codePoint === 0x0a) {
      if (line > max) max = line;
      line = 0;
    } else line += g.width;
  }
  if (line > max) max = line;
  widthCache.set(text, max);
  return max;
}

function isBreakSpace(g: Grapheme): boolean {
  return g.codePoint === 0x20 || g.codePoint === 0x3000;
}

function sumWidth(gs: readonly Grapheme[], from: number, to: number): number {
  let w = 0;
  for (let i = from; i < to; i++) w += (gs[i] as Grapheme).width;
  return w;
}

function plainLine(start: number, end: number, width: number): TextLine {
  return { start, end, cutStart: end, cutEnd: end, ellipsis: false, width };
}

function wrapHardLine(gs: readonly Grapheme[], s: number, e: number, max: number, out: TextLine[]): void {
  let start = s;
  let width = 0;
  let lastSpace = -1;
  let i = s;
  while (i < e) {
    const g = gs[i] as Grapheme;
    const w = g.width;
    if (width + w > max && width > 0) {
      if (isBreakSpace(g)) {
        let end = i;
        while (end > start && isBreakSpace(gs[end - 1] as Grapheme)) end--;
        out.push(plainLine(start, end, sumWidth(gs, start, end)));
        while (i < e && isBreakSpace(gs[i] as Grapheme)) i++;
        start = i;
        width = 0;
        lastSpace = -1;
        continue;
      }
      if (lastSpace > start) {
        let end = lastSpace;
        while (end > start && isBreakSpace(gs[end - 1] as Grapheme)) end--;
        out.push(plainLine(start, end, sumWidth(gs, start, end)));
        start = lastSpace + 1;
        width = sumWidth(gs, start, i);
        lastSpace = -1;
        continue;
      }
      out.push(plainLine(start, i, width));
      start = i;
      width = 0;
      lastSpace = -1;
      continue;
    }
    if (isBreakSpace(g)) lastSpace = i;
    width += w;
    i++;
  }
  let end = e;
  if (out.length > 0 && start > s) {
    while (end > start && isBreakSpace(gs[end - 1] as Grapheme)) end--;
  }
  out.push(plainLine(start, end, sumWidth(gs, start, end)));
}

function truncateHardLine(
  gs: readonly Grapheme[],
  s: number,
  e: number,
  max: number,
  mode: "truncate-end" | "truncate-middle" | "truncate-start",
  out: TextLine[],
): void {
  const total = sumWidth(gs, s, e);
  if (total <= max) {
    out.push(plainLine(s, e, total));
    return;
  }
  if (max <= 0) {
    out.push(plainLine(s, s, 0));
    return;
  }
  const budget = max - 1;
  if (mode === "truncate-end") {
    let k = s;
    let w = 0;
    while (k < e && w + (gs[k] as Grapheme).width <= budget) w += (gs[k++] as Grapheme).width;
    out.push({ start: s, end: e, cutStart: k, cutEnd: e, ellipsis: true, width: w + 1 });
    return;
  }
  if (mode === "truncate-start") {
    let k = e;
    let w = 0;
    while (k > s && w + (gs[k - 1] as Grapheme).width <= budget) w += (gs[--k] as Grapheme).width;
    out.push({ start: s, end: e, cutStart: s, cutEnd: k, ellipsis: true, width: w + 1 });
    return;
  }
  const leftBudget = Math.ceil(budget / 2);
  const rightBudget = budget - leftBudget;
  let a = s;
  let lw = 0;
  while (a < e && lw + (gs[a] as Grapheme).width <= leftBudget) lw += (gs[a++] as Grapheme).width;
  let b = e;
  let rw = 0;
  while (b > a && rw + (gs[b - 1] as Grapheme).width <= rightBudget + (leftBudget - lw)) {
    rw += (gs[--b] as Grapheme).width;
  }
  out.push({ start: s, end: e, cutStart: a, cutEnd: b, ellipsis: true, width: lw + rw + 1 });
}

/**
 * Lay out a grapheme array into visual lines. Explicit `\n` always breaks.
 * `"wrap"` word-wraps (hard-breaking words longer than the line), `"nowrap"`
 * keeps lines intact and `"truncate-*"` cuts overflowing lines with `…`.
 */
export function layoutGraphemeLines(gs: readonly Grapheme[], maxWidth: number, mode: WrapMode): TextLine[] {
  const out: TextLine[] = [];
  const max = maxWidth === Infinity ? Infinity : Math.max(0, Math.floor(maxWidth));
  let s = 0;
  const n = gs.length;
  for (let i = 0; i <= n; i++) {
    if (i < n && (gs[i] as Grapheme).codePoint !== 0x0a) continue;
    if (mode === "nowrap" || max === Infinity) out.push(plainLine(s, i, sumWidth(gs, s, i)));
    else if (mode === "wrap") {
      if (max <= 0) out.push(plainLine(s, s, 0));
      else wrapHardLine(gs, s, i, max, out);
    } else truncateHardLine(gs, s, i, max, mode, out);
    s = i + 1;
  }
  return out;
}

function sliceGraphemes(gs: readonly Grapheme[], from: number, to: number): string {
  let s = "";
  for (let i = from; i < to; i++) s += (gs[i] as Grapheme).grapheme;
  return s;
}

/** Render a laid-out line back into a string. */
export function lineToString(gs: readonly Grapheme[], line: TextLine): string {
  let s = sliceGraphemes(gs, line.start, line.cutStart);
  if (line.ellipsis) s += ELLIPSIS;
  if (line.cutEnd < line.end) s += sliceGraphemes(gs, line.cutEnd, line.end);
  return s;
}

const wrapCache = new LruCache<string, readonly string[]>(4096);

/** Wrap or truncate text into lines no wider than `maxWidth` cells. Results are cached and frozen. */
export function wrapText(text: string, maxWidth: number, mode: WrapMode = "wrap"): readonly string[] {
  const key = `${mode}\u0000${maxWidth}\u0000${text}`;
  const cached = wrapCache.get(key);
  if (cached !== undefined) return cached;
  let result: readonly string[];
  if (isPrintableAscii(text) && (mode === "nowrap" || text.length <= maxWidth)) {
    result = Object.freeze([text]);
  } else {
    const gs = segmentGraphemes(text);
    result = Object.freeze(layoutGraphemeLines(gs, maxWidth, mode).map((l) => lineToString(gs, l)));
  }
  wrapCache.set(key, result);
  return result;
}

/** Truncate a single line of text to `maxWidth` cells with `…`. */
export function truncateText(
  text: string,
  maxWidth: number,
  position: "end" | "middle" | "start" = "end",
): string {
  return wrapText(text.replace(/\r?\n/g, " "), maxWidth, `truncate-${position}`)[0] ?? "";
}

/**
 * Return the substring occupying columns `[startCol, endCol)`. Wide graphemes
 * cut in half by either edge are replaced with a space so columns stay aligned.
 */
export function sliceColumns(text: string, startCol: number, endCol = Infinity): string {
  if (isPrintableAscii(text)) return text.slice(Math.max(0, startCol), endCol);
  const gs = segmentGraphemes(text);
  let col = 0;
  let out = "";
  for (const g of gs) {
    if (g.codePoint === 0x0a) break;
    const next = col + g.width;
    if (next > startCol && col < endCol) {
      if (col < startCol || next > endCol) out += " ".repeat(Math.min(next, endCol) - Math.max(col, startCol));
      else out += g.grapheme;
    }
    col = next;
    if (col >= endCol) break;
  }
  return out;
}

/** Measure multi-line text: widest line and number of lines. */
export function measureText(text: string): { width: number; height: number } {
  if (text.length === 0) return { width: 0, height: 1 };
  let height = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 0x0a) height++;
  return { width: stringWidth(text), height };
}

/** Drop all measurement caches (mainly for tests and memory pressure). */
export function clearTextMeasureCaches(): void {
  widthCache.clear();
  wrapCache.clear();
  multiWidthCache.clear();
}
