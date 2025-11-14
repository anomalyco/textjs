import { LAYOUT } from "./layout";
import { glyphsOf, type FigletFont } from "./parse";

/**
 * Horizontal layout, named after FIGlet's flags:
 * - `"default"`: the font's own layout (`-s`)
 * - `"full"`: full width, characters never touch (`-W`)
 * - `"fitted"`: kerning, characters move together until they touch (`-k`)
 * - `"smushed"`: smushing with the font's rules, even if it defaults to fitting (`-S`)
 * - `"universal"`: universal smushing, later characters overlap earlier ones (`-o`)
 * - a number: a FIGlet `-m` smush mode (`-1` full, `0` fitted, `1..63` rule bits)
 */
export type FigletLayout = "default" | "full" | "fitted" | "smushed" | "universal" | number;

/**
 * Vertical layout between lines of FIGcharacters. FIGlet 2.2.5 never applies one, so the
 * default is `"full"`; pass `"default"` for the font's own vertical layout.
 */
export type FigletVerticalLayout = "default" | "full" | "fitted" | "smushed" | "universal";

export type FigletAlign = "left" | "center" | "right";

export interface FigletOptions {
  /** Horizontal layout. Default: `"default"` (the font's). */
  layout?: FigletLayout;
  /** Vertical layout for multi-line text. Default: `"full"`, like FIGlet. */
  verticalLayout?: FigletVerticalLayout;
  /**
   * Maximum output columns. Text wraps at word breaks (then mid-word) like FIGlet with
   * `-w width+1`. Default: unlimited.
   */
  width?: number;
  /**
   * Line alignment within `width`, or within the widest row when `width` is unlimited.
   * Default: `"left"`, or `"right"` for right-to-left fonts.
   */
  align?: FigletAlign;
  /** Print direction. Default: the font's. */
  direction?: "default" | "ltr" | "rtl";
  /** Join single newlines into spaces (FIGlet `-p`); blank lines still break. */
  paragraph?: boolean;
}

const SM_SMUSH = LAYOUT.H_SMUSHING;
const SM_KERN = LAYOUT.H_FITTING;
const SM_EQUAL = LAYOUT.H_EQUAL;
const SM_LOWLINE = LAYOUT.H_LOWLINE;
const SM_HIERARCHY = LAYOUT.H_HIERARCHY;
const SM_PAIR = LAYOUT.H_PAIR;
const SM_BIGX = LAYOUT.H_BIGX;
const SM_HARDBLANK = LAYOUT.H_HARDBLANK;

const V_RULES = LAYOUT.V_EQUAL | LAYOUT.V_LOWLINE | LAYOUT.V_HIERARCHY | LAYOUT.V_LINE | LAYOUT.V_SUPER;

/** The empty string stands in for C's NUL, matching `strchr`, which finds the terminator. */
const NUL = "";

function has(set: string, ch: string): boolean {
  return ch === NUL || set.includes(ch);
}

function at(row: readonly string[], i: number): string {
  return i >= 0 && i < row.length ? (row[i] as string) : NUL;
}

/** C `str[i] = v` on a NUL-terminated string: NUL truncates, writes past the end are lost. */
function put(row: string[], i: number, v: string): void {
  if (i < 0 || i >= row.length) return;
  if (v === NUL) row.length = i;
  else row[i] = v;
}

function horizontalMode(layout: FigletLayout, fontLayout: number): number {
  if (typeof layout === "number") {
    if (layout < -1) return fontLayout;
    if (layout === 0) return SM_KERN;
    if (layout === -1) return 0;
    return (layout & 63) | SM_SMUSH;
  }
  switch (layout) {
    case "full":
      return 0;
    case "fitted":
      return SM_KERN;
    case "smushed":
      return SM_SMUSH | fontLayout;
    case "universal":
      return SM_SMUSH;
    default:
      return fontLayout;
  }
}

/**
 * Render `text` with a FIGfont. Returns one string per output row, exactly as the
 * `figlet` program prints them (hardblanks become spaces, trailing blanks are kept).
 *
 * ```ts
 * renderFiglet(slant, "Text.js", { layout: "fitted", width: 60, align: "center" })
 * ```
 */
export function renderFiglet(font: FigletFont, text: string, options: FigletOptions = {}): string[] {
  const { header, chars } = glyphsOf(font);
  const height = header.height;
  const hardblank = header.hardblank;
  const smushmode = horizontalMode(options.layout ?? "default", header.fullLayout);
  const right2left = options.direction === "rtl" ? 1 : options.direction === "ltr" ? 0 : header.printDirection;
  const finite = options.width !== undefined && Number.isFinite(options.width) && options.width >= 1;
  const outputwidth = finite ? Math.floor(options.width as number) + 1 : Infinity;
  const outlinelenlimit = outputwidth - 1;
  const inchrlinelenlimit = outputwidth * 4 + 100;
  const justification = options.align === "center" ? 1 : options.align === "right" ? 2 : options.align === "left" ? 0 : 2 * right2left;

  const missing: readonly (readonly string[])[] = Array.from({ length: height }, () => []);
  let currchar: readonly (readonly string[])[] = missing;
  let currcharwidth = 0;
  let previouscharwidth = 0;
  let outputline: string[][] = [];
  let outlinelen = 0;
  let inchrline: number[] = [];
  const blocks: string[][] = [];
  let block: string[] = [];

  const clearline = (): void => {
    outputline = Array.from({ length: height }, () => []);
    outlinelen = 0;
    inchrline = [];
  };

  const getletter = (c: number): void => {
    currchar = chars.get(c) ?? chars.get(0) ?? missing;
    previouscharwidth = currcharwidth;
    currcharwidth = (currchar[0] ?? []).length;
  };

  const smushem = (lch: string, rch: string): string => {
    if (lch === " ") return rch;
    if (rch === " ") return lch;
    if (previouscharwidth < 2 || currcharwidth < 2) return NUL;
    if ((smushmode & SM_SMUSH) === 0) return NUL;
    if ((smushmode & 63) === 0) {
      if (lch === hardblank) return rch;
      if (rch === hardblank) return lch;
      if (right2left === 1) return lch;
      return rch;
    }
    if (smushmode & SM_HARDBLANK) {
      if (lch === hardblank && rch === hardblank) return lch;
    }
    if (lch === hardblank || rch === hardblank) return NUL;
    if (smushmode & SM_EQUAL) {
      if (lch === rch) return lch;
    }
    if (smushmode & SM_LOWLINE) {
      if (lch === "_" && has("|/\\[]{}()<>", rch)) return rch;
      if (rch === "_" && has("|/\\[]{}()<>", lch)) return lch;
    }
    if (smushmode & SM_HIERARCHY) {
      if (lch === "|" && has("/\\[]{}()<>", rch)) return rch;
      if (rch === "|" && has("/\\[]{}()<>", lch)) return lch;
      if (has("/\\", lch) && has("[]{}()<>", rch)) return rch;
      if (has("/\\", rch) && has("[]{}()<>", lch)) return lch;
      if (has("[]", lch) && has("{}()<>", rch)) return rch;
      if (has("[]", rch) && has("{}()<>", lch)) return lch;
      if (has("{}", lch) && has("()<>", rch)) return rch;
      if (has("{}", rch) && has("()<>", lch)) return lch;
      if (has("()", lch) && has("<>", rch)) return rch;
      if (has("()", rch) && has("<>", lch)) return lch;
    }
    if (smushmode & SM_PAIR) {
      if (lch === "[" && rch === "]") return "|";
      if (rch === "[" && lch === "]") return "|";
      if (lch === "{" && rch === "}") return "|";
      if (rch === "{" && lch === "}") return "|";
      if (lch === "(" && rch === ")") return "|";
      if (rch === "(" && lch === ")") return "|";
    }
    if (smushmode & SM_BIGX) {
      if (lch === "/" && rch === "\\") return "|";
      if (rch === "/" && lch === "\\") return "Y";
      if (lch === ">" && rch === "<") return "X";
    }
    return NUL;
  };

  const smushamt = (): number => {
    if ((smushmode & (SM_SMUSH | SM_KERN)) === 0) return 0;
    let maxsmush = currcharwidth;
    for (let row = 0; row < height; row++) {
      const line = outputline[row] as string[];
      const glyph = currchar[row] ?? [];
      let ch1: string;
      let ch2: string;
      let amt: number;
      if (right2left) {
        if (maxsmush > line.length) maxsmush = line.length;
        let charbd = glyph.length;
        for (; (ch1 = at(glyph, charbd)), charbd > 0 && (ch1 === NUL || ch1 === " "); charbd--);
        let linebd = 0;
        for (; (ch2 = at(line, linebd)), ch2 === " "; linebd++);
        amt = linebd + currcharwidth - 1 - charbd;
      } else {
        let linebd = line.length;
        for (; (ch1 = at(line, linebd)), linebd > 0 && (ch1 === NUL || ch1 === " "); linebd--);
        let charbd = 0;
        for (; (ch2 = at(glyph, charbd)), ch2 === " "; charbd++);
        amt = charbd + outlinelen - 1 - linebd;
      }
      if (ch1 === NUL || ch1 === " ") amt++;
      else if (ch2 !== NUL && smushem(ch1, ch2) !== NUL) amt++;
      if (amt < maxsmush) maxsmush = amt;
    }
    return maxsmush;
  };

  const addchar = (c: number): boolean => {
    getletter(c);
    const smushamount = smushamt();
    if (outlinelen + currcharwidth - smushamount > outlinelenlimit || inchrline.length + 1 > inchrlinelenlimit) return false;
    for (let row = 0; row < height; row++) {
      const glyph = currchar[row] ?? [];
      const line = outputline[row] as string[];
      if (right2left) {
        const temp = glyph.slice();
        for (let k = 0; k < smushamount; k++) {
          const i = currcharwidth - smushamount + k;
          put(temp, i, smushem(at(temp, i), at(line, k)));
        }
        outputline[row] = temp.concat(line.slice(smushamount));
      } else {
        for (let k = 0; k < smushamount; k++) {
          const column = Math.max(0, outlinelen - smushamount + k);
          put(line, column, smushem(at(line, column), at(glyph, k)));
        }
        for (let k = smushamount; k < glyph.length; k++) line.push(glyph[k] as string);
      }
    }
    outlinelen = (outputline[0] as string[]).length;
    inchrline.push(c);
    return true;
  };

  const putstring = (row: readonly string[]): void => {
    let len = row.length;
    let pad = 0;
    if (finite && outputwidth > 1) {
      if (len > outputwidth - 1) len = outputwidth - 1;
      if (justification > 0) {
        for (let i = 1; (3 - justification) * i + len + justification - 2 < outputwidth; i++) pad++;
      }
    }
    let s = " ".repeat(pad);
    for (let i = 0; i < len; i++) {
      const ch = row[i] as string;
      s += ch === hardblank ? " " : ch;
    }
    block.push(s);
  };

  const flush = (): void => {
    blocks.push(block);
    block = [];
  };

  const printline = (): void => {
    for (let i = 0; i < height; i++) putstring(outputline[i] as string[]);
    flush();
    clearline();
  };

  const splitline = (): void => {
    let gotspace = false;
    let lastspace = inchrline.length - 1;
    let i = inchrline.length - 1;
    for (; i >= 0; i--) {
      if (!gotspace && inchrline[i] === 32) {
        gotspace = true;
        lastspace = i;
      }
      if (gotspace && inchrline[i] !== 32) break;
    }
    const part1 = inchrline.slice(0, i + 1);
    const part2 = inchrline.slice(lastspace + 1);
    clearline();
    for (const c of part1) addchar(c);
    printline();
    for (const c of part2) addchar(c);
  };

  clearline();
  const input = Array.from(text.replace(/\r\n/g, "\n"), (ch) => ch.codePointAt(0) as number);
  const isAsciiSpace = (c: number): boolean => c === 32 || (c >= 9 && c <= 13);
  let wordbreakmode = 0;
  let lastWasEol = false;

  for (let idx = 0; idx < input.length; ) {
    let c = input[idx++] as number;
    if (c === 10 && options.paragraph && !lastWasEol) {
      const c2 = input[idx];
      c = c2 !== undefined && isAsciiSpace(c2) ? 10 : 32;
    }
    lastWasEol = isAsciiSpace(c) && c !== 9 && c !== 32;
    if (isAsciiSpace(c)) c = c === 9 || c === 32 ? 32 : 10;
    if ((c > 0 && c < 32 && c !== 10) || c === 127) continue;

    let charNotAdded: boolean;
    do {
      charNotAdded = false;
      if (wordbreakmode === -1) {
        if (c === 32) break;
        if (c === 10) {
          wordbreakmode = 0;
          break;
        }
        wordbreakmode = 0;
      }
      if (c === 10) {
        printline();
        wordbreakmode = 0;
      } else if (addchar(c)) {
        if (c !== 32) wordbreakmode = wordbreakmode >= 2 ? 3 : 1;
        else wordbreakmode = wordbreakmode > 0 ? 2 : 0;
      } else if (outlinelen === 0) {
        for (let i = 0; i < height; i++) {
          const glyph = currchar[i] ?? [];
          putstring(right2left && finite ? glyph.slice(Math.max(0, glyph.length - outlinelenlimit)) : glyph);
        }
        flush();
        wordbreakmode = -1;
      } else if (c === 32) {
        if (wordbreakmode === 2) splitline();
        else printline();
        wordbreakmode = -1;
      } else {
        if (wordbreakmode >= 2) splitline();
        else printline();
        wordbreakmode = wordbreakmode === 3 ? 1 : 0;
        charNotAdded = true;
      }
    } while (charNotAdded);
  }
  if (outlinelen !== 0) printline();

  const rows = stackBlocks(blocks, options.verticalLayout ?? "full", header.fullLayout);
  if (finite || justification === 0) return rows;
  return alignRows(rows, justification);
}

/** Align rows within the widest row, using FIGlet's justification arithmetic. */
function alignRows(rows: string[], justification: number): string[] {
  const widths = rows.map((r) => Array.from(r).length);
  const max = Math.max(0, ...widths);
  return rows.map((r, i) => {
    const gap = max - (widths[i] as number);
    const pad = justification === 2 ? gap : Math.floor((gap + 1) / 2);
    return " ".repeat(pad) + r;
  });
}

function stackBlocks(blocks: string[][], layout: FigletVerticalLayout, fontLayout: number): string[] {
  let mode: "full" | "fitted" | "smushed";
  let rules = fontLayout & V_RULES;
  if (layout === "default") mode = fontLayout & LAYOUT.V_SMUSHING ? "smushed" : fontLayout & LAYOUT.V_FITTING ? "fitted" : "full";
  else if (layout === "universal") {
    mode = "smushed";
    rules = 0;
  } else mode = layout;
  if (mode === "full" || blocks.length < 2) return blocks.flat();
  let out = (blocks[0] as string[]).map((r) => Array.from(r));
  for (let b = 1; b < blocks.length; b++) out = stackPair(out, (blocks[b] as string[]).map((r) => Array.from(r)), mode, rules);
  return out.map((r) => r.join(""));
}

const SUPER = 1;
const SMUSH = 2;
const INVALID = 3;

function verticalSmush(a: string, b: string, rules: number): { ch: string; kind: number } | undefined {
  if (rules === 0) return { ch: b, kind: SMUSH };
  if (rules & LAYOUT.V_SUPER && a === "|" && b === "|") return { ch: "|", kind: SUPER };
  if (rules & LAYOUT.V_EQUAL && a === b) return { ch: a, kind: SMUSH };
  if (rules & LAYOUT.V_LOWLINE) {
    if (a === "_" && "|/\\[]{}()<>".includes(b)) return { ch: b, kind: SMUSH };
    if (b === "_" && "|/\\[]{}()<>".includes(a)) return { ch: a, kind: SMUSH };
  }
  if (rules & LAYOUT.V_HIERARCHY) {
    const classes = ["|", "/\\", "[]", "{}", "()", "<>"];
    const ca = classes.findIndex((c) => c.includes(a));
    const cb = classes.findIndex((c) => c.includes(b));
    if (ca >= 0 && cb >= 0 && ca !== cb) return { ch: ca > cb ? a : b, kind: SMUSH };
  }
  if (rules & LAYOUT.V_LINE && ((a === "-" && b === "_") || (a === "_" && b === "-"))) return { ch: "=", kind: SMUSH };
  return undefined;
}

/** Status of overlapping two rows: 0 clear, SUPER, SMUSH or INVALID. */
function overlapRow(top: readonly string[], bottom: readonly string[], fitting: boolean, rules: number): number {
  let status = 0;
  const n = Math.max(top.length, bottom.length);
  for (let i = 0; i < n; i++) {
    const a = top[i] ?? " ";
    const b = bottom[i] ?? " ";
    if (a === " " || b === " ") continue;
    if (fitting) return INVALID;
    const r = verticalSmush(a, b, rules);
    if (!r) return INVALID;
    status = Math.max(status, r.kind);
  }
  return status;
}

function stackPair(top: string[][], bottom: string[][], mode: "fitted" | "smushed", rules: number): string[][] {
  const fitting = mode === "fitted";
  let overlap = 0;
  const max = Math.min(top.length, bottom.length);
  for (let n = 1; n <= max; n++) {
    let status = 0;
    for (let i = 0; i < n && status !== INVALID; i++) {
      status = Math.max(status, overlapRow(top[top.length - n + i] as string[], bottom[i] as string[], fitting, rules));
    }
    if (status === INVALID) break;
    overlap = n;
    if (status === SMUSH) break;
  }
  const out = top.slice(0, top.length - overlap);
  for (let i = 0; i < overlap; i++) {
    const a = top[top.length - overlap + i] as string[];
    const b = bottom[i] as string[];
    const row: string[] = [];
    for (let c = 0; c < Math.max(a.length, b.length); c++) {
      const x = a[c] ?? " ";
      const y = b[c] ?? " ";
      row.push(x === " " ? y : y === " " ? x : (verticalSmush(x, y, rules)?.ch ?? y));
    }
    out.push(row);
  }
  return out.concat(bottom.slice(overlap));
}
