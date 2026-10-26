/**
 * Flat TypedArray framebuffer of terminal-style cells.
 */

import { blendOver, type PackedColor } from "./color";
import {
  codePointWidth,
  graphemeWidth,
  isPrintableAscii,
  isSimpleNarrowString,
  segmentGraphemes,
  stringWidth,
  truncateText,
  type Grapheme,
} from "./text-measure";

export const ATTR_NONE = 0;
export const ATTR_BOLD = 1 << 0;
export const ATTR_DIM = 1 << 1;
export const ATTR_ITALIC = 1 << 2;
export const ATTR_UNDERLINE = 1 << 3;
export const ATTR_STRIKETHROUGH = 1 << 4;
export const ATTR_INVERSE = 1 << 5;
export const ATTR_ALLOW_LINK = 1 << 6;
/** Marks cell `x + 1` as the continuation of a 2-column grapheme at `x`. */
export const ATTR_WIDE_CONT = 1 << 7;

/** Attribute bits that affect rendered style (excludes structural flags). */
export const ATTR_STYLE_MASK =
  ATTR_BOLD | ATTR_DIM | ATTR_ITALIC | ATTR_UNDERLINE | ATTR_STRIKETHROUGH | ATTR_INVERSE | ATTR_ALLOW_LINK;

/** High bit on a `chars` entry flags a multi-codepoint grapheme stored in `graphemePool`. */
export const GRAPHEME_POOL_FLAG = 0x80000000;
export const CHAR_SPACE = 0x20;
/** Stored in `chars` for wide-continuation cells. */
export const CHAR_CONTINUATION = 0;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BorderStyle = "single" | "rounded" | "double" | "heavy" | "dashed" | "ascii" | "none";

export interface BorderChars {
  topLeft: string;
  top: string;
  topRight: string;
  right: string;
  bottomRight: string;
  bottom: string;
  bottomLeft: string;
  left: string;
}

function chars8(tl: string, t: string, tr: string, r: string, br: string, b: string, bl: string, l: string): BorderChars {
  return Object.freeze({ topLeft: tl, top: t, topRight: tr, right: r, bottomRight: br, bottom: b, bottomLeft: bl, left: l });
}

export const BORDER_CHARS: Readonly<Record<Exclude<BorderStyle, "none">, BorderChars>> = Object.freeze({
  single: chars8("┌", "─", "┐", "│", "┘", "─", "└", "│"),
  rounded: chars8("╭", "─", "╮", "│", "╯", "─", "╰", "│"),
  double: chars8("╔", "═", "╗", "║", "╝", "═", "╚", "║"),
  heavy: chars8("┏", "━", "┓", "┃", "┛", "━", "┗", "┃"),
  dashed: chars8("┌", "╌", "┐", "╎", "┘", "╌", "└", "╎"),
  ascii: chars8("+", "-", "+", "|", "+", "-", "+", "|"),
});

interface BorderCodes {
  tl: number;
  t: number;
  tr: number;
  r: number;
  br: number;
  b: number;
  bl: number;
  l: number;
}

const BORDER_CODES: Readonly<Record<Exclude<BorderStyle, "none">, BorderCodes>> = Object.freeze(
  Object.fromEntries(
    Object.entries(BORDER_CHARS).map(([k, v]) => [
      k,
      Object.freeze({
        tl: v.topLeft.charCodeAt(0),
        t: v.top.charCodeAt(0),
        tr: v.topRight.charCodeAt(0),
        r: v.right.charCodeAt(0),
        br: v.bottomRight.charCodeAt(0),
        b: v.bottom.charCodeAt(0),
        bl: v.bottomLeft.charCodeAt(0),
        l: v.left.charCodeAt(0),
      }),
    ]),
  ) as Record<Exclude<BorderStyle, "none">, BorderCodes>,
);

function hasAsciiControls(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

export type TitleAlign = "left" | "center" | "right";

export interface DrawBoxOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  style?: BorderStyle;
  /** Border color. */
  fg?: PackedColor;
  /** Background for border cells (and the interior when `fill` is true). */
  bg?: PackedColor;
  attrs?: number;
  fill?: boolean;
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  title?: string;
  titleColor?: PackedColor;
  titleAlign?: TitleAlign;
  titleAttrs?: number;
  bottomTitle?: string;
  bottomTitleColor?: PackedColor;
  bottomTitleAlign?: TitleAlign;
  bottomTitleAttrs?: number;
}

/** Default foreground assumed for default-colored text when it must be blended (e.g. modal dimming). */
export const ASSUMED_DEFAULT_FG: PackedColor = 0xd4d4d8ff;

export class CellBuffer {
  width: number;
  height: number;
  chars: Uint32Array;
  fg: Uint32Array;
  bg: Uint32Array;
  attrs: Uint16Array;
  /** Multi-codepoint grapheme clusters referenced by `chars[i] & ~GRAPHEME_POOL_FLAG`. */
  graphemePool: string[] = [];
  private poolLookup = new Map<string, number>();
  private clipX0 = 0;
  private clipY0 = 0;
  private clipX1 = 0;
  private clipY1 = 0;
  private scissorStack: number[] = [];
  private rowHashes: Uint32Array;
  private rowHashValid: Uint8Array;
  /** @internal */ _writeVersion = 0;
  /** @internal */ _paintedSceneId = 0;
  /** @internal */ _paintedWriteVersion = -1;
  /** @internal */ _paintedClearBg = 0;
  /** @internal */ _paintedWireframe = false;
  /** @internal */ _paintedHighlightedId = 0;
  /** @internal */ _paintedFocusedId = 0;
  /** @internal */ _paintedHadBackdrop = false;

  constructor(width: number, height: number) {
    this.width = Math.max(0, Math.floor(width));
    this.height = Math.max(0, Math.floor(height));
    const size = this.width * this.height;
    this.chars = new Uint32Array(size).fill(CHAR_SPACE);
    this.fg = new Uint32Array(size);
    this.bg = new Uint32Array(size);
    this.attrs = new Uint16Array(size);
    this.rowHashes = new Uint32Array(this.height);
    this.rowHashValid = new Uint8Array(this.height);
    this.resetScissor();
  }

  get size(): number {
    return this.width * this.height;
  }

  resize(width: number, height: number): void {
    const w = Math.max(0, Math.floor(width));
    const h = Math.max(0, Math.floor(height));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    const size = w * h;
    this.chars = new Uint32Array(size).fill(CHAR_SPACE);
    this.fg = new Uint32Array(size);
    this.bg = new Uint32Array(size);
    this.attrs = new Uint16Array(size);
    this.rowHashes = new Uint32Array(h);
    this.rowHashValid = new Uint8Array(h);
    this._writeVersion = (this._writeVersion + 1) | 0;
    this.graphemePool.length = 0;
    this.poolLookup.clear();
    this.scissorStack.length = 0;
    this.resetScissor();
  }

  /** Reset every cell to a space with the given colors and drop the grapheme pool. */
  clear(bg: PackedColor = 0, fg: PackedColor = 0): void {
    this.chars.fill(CHAR_SPACE);
    this.fg.fill(fg >>> 0);
    this.bg.fill(bg >>> 0);
    this.attrs.fill(0);
    this.rowHashValid.fill(0);
    this._writeVersion = (this._writeVersion + 1) | 0;
    if (this.graphemePool.length > 0) {
      this.graphemePool.length = 0;
      this.poolLookup.clear();
    }
  }

  // ---------------------------------------------------------------------------
  // Scissor
  // ---------------------------------------------------------------------------

  resetScissor(): void {
    this.clipX0 = 0;
    this.clipY0 = 0;
    this.clipX1 = this.width;
    this.clipY1 = this.height;
    this.scissorStack.length = 0;
  }

  /** Push a clip rect intersected with the current one. */
  pushScissor(x: number, y: number, width: number, height: number): void {
    this.scissorStack.push(this.clipX0, this.clipY0, this.clipX1, this.clipY1);
    const x0 = Math.max(this.clipX0, Math.floor(x));
    const y0 = Math.max(this.clipY0, Math.floor(y));
    const x1 = Math.min(this.clipX1, Math.floor(x + width));
    const y1 = Math.min(this.clipY1, Math.floor(y + height));
    this.clipX0 = x0;
    this.clipY0 = y0;
    this.clipX1 = Math.max(x0, x1);
    this.clipY1 = Math.max(y0, y1);
  }

  popScissor(): void {
    const s = this.scissorStack;
    if (s.length < 4) {
      this.resetScissor();
      return;
    }
    this.clipY1 = s.pop() as number;
    this.clipX1 = s.pop() as number;
    this.clipY0 = s.pop() as number;
    this.clipX0 = s.pop() as number;
  }

  getScissor(): Rect {
    return { x: this.clipX0, y: this.clipY0, width: this.clipX1 - this.clipX0, height: this.clipY1 - this.clipY0 };
  }

  get scissorDepth(): number {
    return this.scissorStack.length / 4;
  }

  /** Whether a rect intersects the current scissor. */
  intersectsScissor(x: number, y: number, width: number, height: number): boolean {
    return x < this.clipX1 && y < this.clipY1 && x + width > this.clipX0 && y + height > this.clipY0 && width > 0 && height > 0;
  }

  // ---------------------------------------------------------------------------
  // Cells
  // ---------------------------------------------------------------------------

  /** Encode a grapheme into a `chars` entry, interning multi-codepoint clusters. */
  internGrapheme(grapheme: string): number {
    const cp = grapheme.codePointAt(0) ?? CHAR_SPACE;
    if (grapheme.length === (cp > 0xffff ? 2 : 1)) return cp;
    let idx = this.poolLookup.get(grapheme);
    if (idx === undefined) {
      idx = this.graphemePool.length;
      this.graphemePool.push(grapheme);
      this.poolLookup.set(grapheme, idx);
    }
    return (GRAPHEME_POOL_FLAG | idx) >>> 0;
  }

  /** Text of the cell at a flat index (empty string for wide continuations). */
  cellText(index: number): string {
    const c = this.chars[index] ?? CHAR_SPACE;
    if (c >= GRAPHEME_POOL_FLAG) return this.graphemePool[c & 0x7fffffff] ?? " ";
    if (c === CHAR_CONTINUATION && ((this.attrs[index] ?? 0) & ATTR_WIDE_CONT) !== 0) return "";
    return c < 0x10000 ? String.fromCharCode(c) : String.fromCodePoint(c);
  }

  getCell(x: number, y: number): { char: string; fg: PackedColor; bg: PackedColor; attrs: number } | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    const i = y * this.width + x;
    return { char: this.cellText(i), fg: this.fg[i] ?? 0, bg: this.bg[i] ?? 0, attrs: this.attrs[i] ?? 0 };
  }

  /**
   * Write a grapheme (string or code point) clipped to the scissor. Returns the
   * number of columns the grapheme occupies, or `0` when fully clipped.
   */
  setCell(x: number, y: number, graphemeOrCodePoint: string | number, fg: PackedColor, bg: PackedColor, attrs = 0): number {
    if (y < this.clipY0 || y >= this.clipY1 || x < this.clipX0 || x >= this.clipX1) return 0;
    let code: number;
    let w: number;
    if (typeof graphemeOrCodePoint === "number") {
      code = graphemeOrCodePoint;
      w = codePointWidth(code);
    } else {
      const g = graphemeOrCodePoint;
      const c0 = g.charCodeAt(0);
      if (g.length === 1 && c0 < 0x7f) {
        code = c0;
        w = c0 >= 0x20 ? 1 : 0;
      } else {
        w = graphemeWidth(g);
        code = this.internGrapheme(g);
      }
    }
    if (w === 0) return 0;
    return this.put(x, y, code, w, fg, bg, attrs);
  }

  /** Low-level write of a pre-encoded cell; assumes `(x, y)` is within the scissor. */
  put(x: number, y: number, code: number, w: number, fg: PackedColor, bg: PackedColor, attrs: number): number {
    if (w === 2 && x + 1 >= this.clipX1) {
      code = CHAR_SPACE;
      w = 1;
    }
    const W = this.width;
    const i = y * W + x;
    const A = this.attrs;
    const C = this.chars;
    if ((A[i] as number) & ATTR_WIDE_CONT) {
      if (x > 0) C[i - 1] = CHAR_SPACE;
    } else if (w === 1 && x + 1 < W && (A[i + 1] as number) & ATTR_WIDE_CONT) {
      C[i + 1] = CHAR_SPACE;
      A[i + 1] = (A[i + 1] as number) & ~ATTR_WIDE_CONT;
    }
    if (w === 2 && x + 2 < W && (A[i + 2] as number) & ATTR_WIDE_CONT) {
      C[i + 2] = CHAR_SPACE;
      A[i + 2] = (A[i + 2] as number) & ~ATTR_WIDE_CONT;
    }
    const a = attrs & ~ATTR_WIDE_CONT;
    const ba = bg & 255;
    const fa = fg & 255;
    const B = this.bg;
    const outBg = ba === 255 ? bg : ba === 0 ? (B[i] as number) : blendOver(bg, B[i] as number);
    const outFg = fa === 255 || fa === 0 ? fg : blendOver(fg, outBg);
    C[i] = code;
    this.fg[i] = outFg;
    B[i] = outBg;
    A[i] = a;
    this.rowHashValid[y] = 0;
    this._writeVersion = (this._writeVersion + 1) | 0;
    if (w === 2) {
      const j = i + 1;
      C[j] = CHAR_CONTINUATION;
      this.fg[j] = outFg;
      B[j] = ba === 255 ? bg : ba === 0 ? (B[j] as number) : blendOver(bg, B[j] as number);
      A[j] = a | ATTR_WIDE_CONT;
    }
    return w;
  }

  /** Repair wide graphemes split by a write spanning columns `[x0, x1)` on row `y`. */
  private repairEdges(y: number, x0: number, x1: number): void {
    const W = this.width;
    const row = y * W;
    if (x0 > 0 && ((this.attrs[row + x0] as number) & ATTR_WIDE_CONT) !== 0) this.chars[row + x0 - 1] = CHAR_SPACE;
    if (x1 < W && ((this.attrs[row + x1] as number) & ATTR_WIDE_CONT) !== 0) {
      this.chars[row + x1] = CHAR_SPACE;
      this.attrs[row + x1] = (this.attrs[row + x1] as number) & ~ATTR_WIDE_CONT;
    }
  }

  /** Fill a rect with a character and colors (clipped). Translucent colors blend over existing cells. */
  fillRect(x: number, y: number, w: number, h: number, bg: PackedColor, charCode = CHAR_SPACE, fg: PackedColor = 0, attrs = 0): void {
    const x0 = Math.max(this.clipX0, Math.floor(x));
    const y0 = Math.max(this.clipY0, Math.floor(y));
    const x1 = Math.min(this.clipX1, Math.floor(x + w));
    const y1 = Math.min(this.clipY1, Math.floor(y + h));
    if (x0 >= x1 || y0 >= y1) return;
    this.rowHashValid.fill(0, y0, y1);
    this._writeVersion = (this._writeVersion + 1) | 0;
    const W = this.width;
    const ba = bg & 255;
    const fa = fg & 255;
    const a = attrs & ~ATTR_WIDE_CONT;
    const fast = (ba === 255 || ba === 0) && (fa === 255 || fa === 0);
    for (let yy = y0; yy < y1; yy++) {
      this.repairEdges(yy, x0, x1);
      const i0 = yy * W + x0;
      const i1 = yy * W + x1;
      this.chars.fill(charCode, i0, i1);
      this.attrs.fill(a, i0, i1);
      if (fast) {
        this.fg.fill(fg, i0, i1);
        if (ba === 255) this.bg.fill(bg, i0, i1);
      } else {
        for (let i = i0; i < i1; i++) {
          const outBg = ba === 255 ? bg : ba === 0 ? (this.bg[i] as number) : blendOver(bg, this.bg[i] as number);
          this.bg[i] = outBg;
          this.fg[i] = fa === 255 || fa === 0 ? fg : blendOver(fg, outBg);
        }
      }
    }
  }

  /**
   * Composite `overlayRgba` over both the background and foreground of every
   * cell in the rect without erasing characters (modal backdrop dimming).
   */
  dimRect(x: number, y: number, w: number, h: number, overlayRgba: PackedColor, assumedFg: PackedColor = ASSUMED_DEFAULT_FG): void {
    if ((overlayRgba & 255) === 0) return;
    const x0 = Math.max(this.clipX0, Math.floor(x));
    const y0 = Math.max(this.clipY0, Math.floor(y));
    const x1 = Math.min(this.clipX1, Math.floor(x + w));
    const y1 = Math.min(this.clipY1, Math.floor(y + h));
    if (x0 >= x1 || y0 >= y1) return;
    this.rowHashValid.fill(0, y0, y1);
    this._writeVersion = (this._writeVersion + 1) | 0;
    const W = this.width;
    let lastBgIn = -1;
    let lastBgOut = 0;
    let lastFgIn = -1;
    let lastFgOut = 0;
    for (let yy = y0; yy < y1; yy++) {
      for (let i = yy * W + x0, end = yy * W + x1; i < end; i++) {
        const b = this.bg[i] as number;
        if (b !== lastBgIn) {
          lastBgIn = b;
          lastBgOut = blendOver(overlayRgba, b);
        }
        this.bg[i] = lastBgOut;
        let f = this.fg[i] as number;
        if ((f & 255) === 0) f = assumedFg;
        if (f !== lastFgIn) {
          lastFgIn = f;
          lastFgOut = blendOver(overlayRgba, f);
        }
        this.fg[i] = lastFgOut;
      }
    }
  }

  /** Alias of `dimRect`. */
  dimRegion(x: number, y: number, w: number, h: number, overlayRgba: PackedColor): void {
    this.dimRect(x, y, w, h, overlayRgba);
  }

  /** Draw pre-segmented graphemes `[from, to)` on one row. Returns the column advance. */
  drawGraphemes(
    x: number,
    y: number,
    gs: readonly Grapheme[],
    from: number,
    to: number,
    fg: PackedColor,
    bg: PackedColor,
    attrs = 0,
  ): number {
    if (y < this.clipY0 || y >= this.clipY1) {
      let adv = 0;
      for (let k = from; k < to; k++) adv += (gs[k] as Grapheme).width;
      return adv;
    }
    const clipX0 = this.clipX0;
    const clipX1 = this.clipX1;
    const W = this.width;
    const rowOffset = y * W;
    const C = this.chars;
    const F = this.fg;
    const B = this.bg;
    const A = this.attrs;
    const a = attrs & ~ATTR_WIDE_CONT;
    const ba = bg & 255;
    const fa = fg & 255;
    const fastColors = (ba === 0 || ba === 255) && (fa === 255 || fa === 0);

    let col = x;
    let wrote = false;
    for (let k = from; k < to; k++) {
      const g = gs[k] as Grapheme;
      const w = g.width;
      if (w === 0) continue;
      if (col >= clipX0 && col < clipX1) {
        wrote = true;
        let code = g.isMulti ? this.internGrapheme(g.grapheme) : g.codePoint;
        if (fastColors) {
          let putW: number = w;
          if (putW === 2 && col + 1 >= clipX1) {
            code = CHAR_SPACE;
            putW = 1;
          }
          const i = rowOffset + col;
          if ((A[i] as number) & ATTR_WIDE_CONT) {
            if (col > 0) C[i - 1] = CHAR_SPACE;
          } else if (putW === 1 && col + 1 < W && ((A[i + 1] as number) & ATTR_WIDE_CONT)) {
            C[i + 1] = CHAR_SPACE;
            A[i + 1] = (A[i + 1] as number) & ~ATTR_WIDE_CONT;
          }
          if (putW === 2 && col + 2 < W && ((A[i + 2] as number) & ATTR_WIDE_CONT)) {
            C[i + 2] = CHAR_SPACE;
            A[i + 2] = (A[i + 2] as number) & ~ATTR_WIDE_CONT;
          }
          C[i] = code;
          F[i] = fg;
          if (ba === 255) B[i] = bg;
          A[i] = a;
          if (putW === 2) {
            const j = i + 1;
            C[j] = CHAR_CONTINUATION;
            F[j] = fg;
            if (ba === 255) B[j] = bg;
            A[j] = a | ATTR_WIDE_CONT;
          }
        } else {
          this.put(col, y, code, w, fg, bg, attrs);
        }
      }
      col += w;
      if (col >= clipX1) {
        for (let r = k + 1; r < to; r++) col += (gs[r] as Grapheme).width;
        break;
      }
    }
    if (wrote) {
      this.rowHashValid[y] = 0;
      this._writeVersion = (this._writeVersion + 1) | 0;
    }
    return col - x;
  }

  /** Draw a single line of text (stops at `\n`). Returns the column advance. */
  drawText(x: number, y: number, text: string, fg: PackedColor, bg: PackedColor, attrs = 0, maxWidth = Infinity): number {
    if (maxWidth <= 0 || text.length === 0) return 0;
    if (isPrintableAscii(text) || (isSimpleNarrowString(text) && !hasAsciiControls(text))) {
      const n = Math.min(text.length, maxWidth);
      if (y < this.clipY0 || y >= this.clipY1) return n;
      const start = Math.max(x, this.clipX0);
      const end = Math.min(x + n, this.clipX1);
      for (let cx = start; cx < end; cx++) this.put(cx, y, text.charCodeAt(cx - x), 1, fg, bg, attrs);
      return n;
    }
    const gs = segmentGraphemes(text);
    let col = 0;
    for (const g of gs) {
      if (g.codePoint === 0x0a) break;
      if (g.width === 0) continue;
      if (col + g.width > maxWidth) break;
      const cx = x + col;
      if (y >= this.clipY0 && y < this.clipY1 && cx >= this.clipX0 && cx < this.clipX1) {
        this.put(cx, y, g.isMulti ? this.internGrapheme(g.grapheme) : g.codePoint, g.width, fg, bg, attrs);
      }
      col += g.width;
    }
    return col;
  }

  /** Draw a border box with optional titles. */
  drawBox(options: DrawBoxOptions): void {
    const style = options.style ?? "single";
    const { x, y } = options;
    const w = Math.floor(options.width);
    const h = Math.floor(options.height);
    if (w <= 0 || h <= 0) return;
    const fg = options.fg ?? 0;
    const bg = options.bg ?? 0;
    const attrs = options.attrs ?? 0;
    if (options.fill) this.fillRect(x, y, w, h, bg);
    if (style === "none") return;
    const bc = BORDER_CODES[style];
    const top = options.top ?? true;
    const right = options.right ?? true;
    const bottom = options.bottom ?? true;
    const left = options.left ?? true;
    const x2 = x + w - 1;
    const y2 = y + h - 1;
    const clipX0 = this.clipX0;
    const clipX1 = this.clipX1;
    const clipY0 = this.clipY0;
    const clipY1 = this.clipY1;
    if (top && y >= clipY0 && y < clipY1) {
      const cx0 = Math.max(x, clipX0);
      const cx1 = Math.min(x2 + 1, clipX1);
      for (let cx = cx0; cx < cx1; cx++) {
        const code = cx === x && left ? bc.tl : cx === x2 && right ? bc.tr : bc.t;
        this.put(cx, y, code, 1, fg, bg, attrs);
      }
    }
    if (bottom && (h > 1 || !top) && y2 >= clipY0 && y2 < clipY1) {
      const cx0 = Math.max(x, clipX0);
      const cx1 = Math.min(x2 + 1, clipX1);
      for (let cx = cx0; cx < cx1; cx++) {
        const code = cx === x && left ? bc.bl : cx === x2 && right ? bc.br : bc.b;
        this.put(cx, y2, code, 1, fg, bg, attrs);
      }
    }
    const vy0 = Math.max(top ? y + 1 : y, clipY0);
    const vy1 = Math.min((bottom ? y2 - 1 : y2) + 1, clipY1);
    const drawLeft = left && x >= clipX0 && x < clipX1;
    const drawRight = right && (w > 1 || !left) && x2 >= clipX0 && x2 < clipX1;
    if (drawLeft || drawRight) {
      for (let cy = vy0; cy < vy1; cy++) {
        if (drawLeft) this.put(x, cy, bc.l, 1, fg, bg, attrs);
        if (drawRight) this.put(x2, cy, bc.r, 1, fg, bg, attrs);
      }
    }
    if (top && options.title) {
      this.drawBorderTitle(x, y, w, options.title, options.titleAlign ?? "left", options.titleColor ?? fg, bg, options.titleAttrs ?? attrs);
    }
    if (bottom && options.bottomTitle && h > 1) {
      this.drawBorderTitle(
        x,
        y2,
        w,
        options.bottomTitle,
        options.bottomTitleAlign ?? "left",
        options.bottomTitleColor ?? fg,
        bg,
        options.bottomTitleAttrs ?? attrs,
      );
    }
  }

  private drawBorderTitle(x: number, y: number, w: number, title: string, align: TitleAlign, fg: PackedColor, bg: PackedColor, attrs: number): void {
    const avail = w - 4;
    if (avail <= 0) return;
    const text = truncateText(title, avail);
    const tw = stringWidth(text);
    const padded = tw + 2;
    let start: number;
    if (align === "center") start = x + Math.floor((w - padded) / 2);
    else if (align === "right") start = x + w - 2 - padded;
    else start = x + 2;
    this.setCell(start, y, CHAR_SPACE, fg, bg, attrs);
    this.drawText(start + 1, y, text, fg, bg, attrs, avail);
    this.setCell(start + 1 + tw, y, CHAR_SPACE, fg, bg, attrs);
  }

  // ---------------------------------------------------------------------------
  // Hashing & export
  // ---------------------------------------------------------------------------

  /**
   * Cached 32-bit FNV-1a row hashes. Re-hashes only rows written since the last
   * call; callers must treat the returned `Uint32Array` as read-only.
   */
  getRowHashes(): Uint32Array {
    const H = this.height;
    const W = this.width;
    const hashes = this.rowHashes;
    const valid = this.rowHashValid;
    const C = this.chars;
    const F = this.fg;
    const B = this.bg;
    const A = this.attrs;
    const pool = this.graphemePool;
    if (pool.length === 0) {
      for (let y = 0; y < H; y++) {
        if (valid[y] !== 0) continue;
        let h = 0x811c9dc5 ^ W;
        for (let i = y * W, end = i + W; i < end; i++) {
          h = Math.imul(h ^ (C[i] as number), 0x01000193);
          h = Math.imul(h ^ (F[i] as number), 0x01000193);
          h = Math.imul(h ^ (B[i] as number), 0x01000193);
          h = Math.imul(h ^ (A[i] as number), 0x01000193);
        }
        h ^= h >>> 16;
        h = Math.imul(h, 0x85ebca6b);
        h ^= h >>> 13;
        hashes[y] = h >>> 0;
        valid[y] = 1;
      }
      return hashes;
    }
    for (let y = 0; y < H; y++) {
      if (valid[y] !== 0) continue;
      let h = 0x811c9dc5 ^ W;
      for (let i = y * W, end = i + W; i < end; i++) {
        const c = C[i] as number;
        if (c >= GRAPHEME_POOL_FLAG) {
          const s = pool[c & 0x7fffffff] ?? "";
          for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 0x01000193);
          h = Math.imul(h ^ 0x9e37, 0x01000193);
        } else h = Math.imul(h ^ c, 0x01000193);
        h = Math.imul(h ^ (F[i] as number), 0x01000193);
        h = Math.imul(h ^ (B[i] as number), 0x01000193);
        h = Math.imul(h ^ (A[i] as number), 0x01000193);
      }
      h ^= h >>> 16;
      h = Math.imul(h, 0x85ebca6b);
      h ^= h >>> 13;
      hashes[y] = h >>> 0;
      valid[y] = 1;
    }
    return hashes;
  }

  /** Invalidate cached row hashes for rows `[y0, y1)` after writing the typed arrays directly. */
  markRowsDirty(y0: number, y1 = y0 + 1): void {
    const lo = Math.max(0, Math.floor(y0));
    const hi = Math.min(this.height, Math.floor(y1));
    if (lo >= hi) return;
    this.rowHashValid.fill(0, lo, hi);
    this._writeVersion = (this._writeVersion + 1) | 0;
  }

  /** 32-bit FNV-1a style hash per row across chars, colors and attributes. */
  computeRowHashes(out?: Uint32Array): Uint32Array {
    const hashes = this.getRowHashes();
    const H = this.height;
    if (out && out.length >= H) {
      out.set(hashes, 0);
      return out;
    }
    return hashes.slice();
  }

  rowText(y: number, trimEnd = false): string {
    let s = "";
    const W = this.width;
    for (let i = y * W, end = i + W; i < end; i++) {
      const c = this.chars[i] as number;
      if (c === CHAR_CONTINUATION && ((this.attrs[i] as number) & ATTR_WIDE_CONT) !== 0) continue;
      if (c >= GRAPHEME_POOL_FLAG) s += this.graphemePool[c & 0x7fffffff] ?? " ";
      else if (c < 0x10000) s += String.fromCharCode(c < 0x20 ? CHAR_SPACE : c);
      else s += String.fromCodePoint(c);
    }
    return trimEnd ? s.trimEnd() : s;
  }

  toPlainLines(trimEnd = false): string[] {
    const lines: string[] = [];
    for (let y = 0; y < this.height; y++) lines.push(this.rowText(y, trimEnd));
    return lines;
  }

  toPlainString(trimEnd = false): string {
    return this.toPlainLines(trimEnd).join("\n");
  }

  /** Copy all cells from another buffer of the same size. */
  copyFrom(other: CellBuffer): void {
    this.resize(other.width, other.height);
    this.chars.set(other.chars);
    this.fg.set(other.fg);
    this.bg.set(other.bg);
    this.attrs.set(other.attrs);
    this.graphemePool = other.graphemePool.slice();
    this.poolLookup = new Map(this.graphemePool.map((g, i) => [g, i]));
    this.rowHashValid.fill(0);
    this._writeVersion = (this._writeVersion + 1) | 0;
  }
}
