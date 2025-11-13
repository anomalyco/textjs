import { LAYOUT } from "./layout";
import { renderFiglet, type FigletOptions } from "./render";

export interface FigletHeader {
  /** `"flf2a"` (FIGfont) or `"tlf2a"` (TOIlet font, rendered as plain text). */
  readonly signature: string;
  /** Sub-character drawn as a blank that horizontal fitting and smushing treat as visible. */
  readonly hardblank: string;
  readonly height: number;
  readonly baseline: number;
  readonly maxLength: number;
  /** Legacy `Old_Layout` (`-1` full width, `0` fitting, `1..63` smushing rules). */
  readonly oldLayout: number;
  readonly commentLines: number;
  /** `0` left-to-right, `1` right-to-left. */
  readonly printDirection: 0 | 1;
  /** `Full_Layout`, or the value derived from `oldLayout` when the header omits it (see {@link LAYOUT}). */
  readonly fullLayout: number;
  readonly codetagCount: number | undefined;
}

/** A loaded FIGfont. Bundled fonts parse lazily on first use. */
export interface FigletFont {
  readonly kind: "figlet";
  /** Display name, e.g. `"Slant"`. */
  readonly name: string;
  readonly header: FigletHeader;
  /** The font's comment lines (credits and license terms), verbatim. */
  readonly comment: string;
  /** Code points this font defines, in file order. */
  readonly codes: readonly number[];
  /** Rows of the FIGcharacter for `char` (a character or code point), or `undefined` if the font lacks it. */
  glyph(char: string | number): readonly string[] | undefined;
  /** Same as `renderFiglet(this, text, options)`. */
  render(text: string, options?: FigletOptions): string[];
}

/** Parsed FIGcharacters: each row split into sub-characters (code points). */
export interface FigletGlyphs {
  readonly header: FigletHeader;
  readonly comment: string;
  readonly chars: ReadonlyMap<number, readonly (readonly string[])[]>;
  readonly codes: readonly number[];
}

export class FigletParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FigletParseError";
  }
}

/** Characters FIGlet 2.2 reads after `~`, in order: Ä Ö Ü ä ö ü ß. */
const DEUTSCH = [196, 214, 220, 228, 246, 252, 223];

const SPACE_RE = /[ \t\n\v\f\r]/;

/** Port of `readfontchar`: strip trailing whitespace, then the run of endmarks. */
function readRow(line: string | undefined): string[] {
  const chars = Array.from(line ?? "");
  let k = chars.length - 1;
  while (k >= 0 && SPACE_RE.test(chars[k] as string)) k--;
  if (k >= 0) {
    const end = chars[k];
    while (k >= 0 && chars[k] === end) k--;
  }
  return chars.slice(0, k + 1);
}

/** `sscanf("%li")`: decimal, `0x` hex or `0` octal, optionally signed. */
function readCodeTag(line: string): number | undefined {
  const m = /^[ \t\n\v\f\r]*([+-]?)(0[xX][0-9a-fA-F]+|0[0-7]*|[1-9][0-9]*)/.exec(line);
  if (!m) return undefined;
  const digits = m[2] as string;
  const value = /^0[xX]/.test(digits) ? parseInt(digits.slice(2), 16) : digits.length > 1 && digits[0] === "0" ? parseInt(digits, 8) : parseInt(digits, 10);
  return m[1] === "-" ? -value : value;
}

function legacyLayout(oldLayout: number): number {
  if (oldLayout === 0) return LAYOUT.H_FITTING;
  if (oldLayout < 0) return 0;
  return (oldLayout & 31) | LAYOUT.H_SMUSHING;
}

/**
 * Parse FIGfont 2 (`.flf`) source text, following FIGlet 2.2.5's reader exactly: header,
 * comment lines, the 95 required ASCII characters, the 7 Deutsch characters and any
 * code-tagged characters (decimal, octal or hex; later definitions win).
 *
 * Decode files as Latin-1 (`new TextDecoder("latin1")`) unless they are UTF-8 TOIlet fonts.
 */
export function parseFigletGlyphs(source: string): FigletGlyphs {
  const lines = source.split(/\r\n|\r|\n/);
  // FIGlet's line reader drops a final line that has no terminator (and there is nothing
  // after a trailing one), so the last split element never counts.
  lines.pop();
  const first = lines[0] ?? "";
  const signature = first.slice(0, 5);
  if (!/^[ft]lf2/.test(first)) throw new FigletParseError("Not a FIGlet 2 font file: missing flf2a signature.");
  const rest = Array.from(first.slice(4));
  const hardblank = rest[1];
  const nums: number[] = [];
  const re = /^[ \t\n\v\f\r]*([+-]?\d+)/;
  let tail = rest.slice(2).join("");
  for (;;) {
    const m = re.exec(tail);
    if (!m) break;
    nums.push(parseInt(m[1] as string, 10));
    tail = tail.slice(m[0].length);
  }
  if (hardblank === undefined || nums.length < 5) throw new FigletParseError("Not a FIGlet 2 font file: incomplete header.");
  const [rawHeight, baseline, maxLength, oldLayout, commentLines] = nums as [number, number, number, number, number];
  const height = Math.max(1, rawHeight);
  const printDirection = nums.length >= 6 && nums[5] === 1 ? 1 : 0;
  const fullLayout = nums.length >= 7 ? (nums[6] as number) : legacyLayout(oldLayout);
  const header: FigletHeader = {
    signature,
    hardblank,
    height,
    baseline,
    maxLength,
    oldLayout,
    commentLines,
    printDirection,
    fullLayout,
    codetagCount: nums[7],
  };

  let i = 1;
  const comment = lines.slice(i, i + Math.max(0, commentLines)).join("\n");
  i += Math.max(0, commentLines);

  const chars = new Map<number, string[][]>();
  const codes: number[] = [];
  const define = (code: number): void => {
    const rows: string[][] = [];
    for (let r = 0; r < height; r++) rows.push(readRow(lines[i++]));
    if (!chars.has(code)) codes.push(code);
    chars.set(code, rows);
  };
  for (let c = 32; c <= 126; c++) define(c);
  for (const c of DEUTSCH) define(c);
  while (i < lines.length) {
    const code = readCodeTag(lines[i] as string);
    if (code === undefined) break;
    i++;
    define(code);
  }
  return { header, comment, chars, codes };
}

class LoadedFont implements FigletFont {
  readonly kind = "figlet" as const;
  readonly name: string;
  private source: string | (() => string) | undefined;
  private parsed: FigletGlyphs | undefined;

  constructor(name: string, source: string | (() => string) | FigletGlyphs) {
    this.name = name;
    if (typeof source === "object") this.parsed = source;
    else this.source = source;
  }

  /** @internal */
  get data(): FigletGlyphs {
    if (!this.parsed) {
      const src = typeof this.source === "function" ? this.source() : (this.source as string);
      this.parsed = parseFigletGlyphs(src);
      this.source = undefined;
    }
    return this.parsed;
  }

  get header(): FigletHeader {
    return this.data.header;
  }

  get comment(): string {
    return this.data.comment;
  }

  get codes(): readonly number[] {
    return this.data.codes;
  }

  glyph(char: string | number): readonly string[] | undefined {
    const code = typeof char === "number" ? char : (char.codePointAt(0) ?? 0);
    return this.data.chars.get(code)?.map((row) => row.join(""));
  }

  render(text: string, options?: FigletOptions): string[] {
    return renderFiglet(this, text, options);
  }
}

/** Internal accessor shared with the renderer. */
export function glyphsOf(font: FigletFont): FigletGlyphs {
  if (font instanceof LoadedFont) return font.data;
  // A second copy of this package (duplicate install) still exposes `data`.
  if ("data" in font) return (font as { data: FigletGlyphs }).data;
  throw new FigletParseError(`"${font.name}" is not a font created by parseFont() or defineFont().`);
}

/** Parse `.flf` source into a font, e.g. `parseFont(await (await fetch("/doom.flf")).text(), "Doom")`. */
export function parseFont(source: string, name?: string): FigletFont {
  const data = parseFigletGlyphs(source);
  const fallback = /^\s*(\S+)/.exec(data.comment)?.[1] ?? "FIGfont";
  return new LoadedFont(name ?? fallback, data);
}

/**
 * Declare a font whose source is parsed on first use. Bundled font modules call this
 * at module scope, so it is side-effect free and `/* @__PURE__ *\/`-safe.
 */
export function defineFont(name: string, source: string | (() => string)): FigletFont {
  return new LoadedFont(name, source);
}
