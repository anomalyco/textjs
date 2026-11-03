/**
 * Flat TypedArray framebuffer of terminal-style cells.
 */

import { blendOver, type PackedColor } from "./color";
import type { RowSnapshot } from "./internal";
import type { BufferSprite } from "./sprite-types";
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
  /**
   * Draws the (already truncated) title text. Defaults to `drawText`; the
   * scene passes `drawLogicalText` so right-to-left titles display in order.
   */
  drawTitleText?: TitleTextDrawer;
}

/** Draws one line of title text at `(x, y)`, at most `maxWidth` cells; returns the columns used. */
export type TitleTextDrawer = (buffer: CellBuffer, x: number, y: number, text: string, fg: PackedColor, bg: PackedColor, attrs: number, maxWidth: number) => number;

/** Default foreground assumed for default-colored text when it must be blended (e.g. modal dimming). */
export const ASSUMED_DEFAULT_FG: PackedColor = 0xd4d4d8ff;

export class CellBuffer {
  width: number;
  height: number;
  /** @internal Raw backing array; prefer `readCells()` or `getCell()`. */
  _chars: Uint32Array;
  /** @internal Raw backing array; prefer `readCells()` or `getCell()`. */
  _fg: Uint32Array;
  /** @internal Raw backing array; prefer `readCells()` or `getCell()`. */
  _bg: Uint32Array;
  /** @internal Raw backing array; prefer `readCells()` or `getCell()`. */
  _attrs: Uint16Array;
  /** Multi-codepoint grapheme clusters referenced by `chars[i] & ~GRAPHEME_POOL_FLAG`. */
  graphemePool: string[] = [];
  /** @internal Pixel sprites anchored to cell rectangles in this frame. */
  _sprites: BufferSprite[] = [];
  private guardingSpriteMaterialize = false;
  private poolLookup = new Map<string, number>();
  /** @internal */ _clipX0 = 0;
  /** @internal */ _clipY0 = 0;
  /** @internal */ _clipX1 = 0;
  /** @internal */ _clipY1 = 0;
  /** @internal */ _sClipX0 = 0;
  /** @internal */ _sClipY0 = 0;
  /** @internal */ _sClipX1 = 0;
  /** @internal */ _sClipY1 = 0;
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
    this._chars = new Uint32Array(size).fill(CHAR_SPACE);
    this._fg = new Uint32Array(size);
    this._bg = new Uint32Array(size);
    this._attrs = new Uint16Array(size);
    this.rowHashes = new Uint32Array(this.height);
    this.rowHashValid = new Uint8Array(this.height);
    this.resetScissor();
  }

  /** @internal Materialized character plane; prefer `readCells()`. */
  get chars(): Uint32Array {
    this._ensureSpritesMaterialized();
    return this._chars;
  }
  set chars(v: Uint32Array) {
    this._chars = v;
  }

  /** @internal Materialized foreground plane; prefer `readCells()`. */
  get fg(): Uint32Array {
    this._ensureSpritesMaterialized();
    return this._fg;
  }
  set fg(v: Uint32Array) {
    this._fg = v;
  }

  /** @internal Materialized background plane; prefer `readCells()`. */
  get bg(): Uint32Array {
    this._ensureSpritesMaterialized();
    return this._bg;
  }
  set bg(v: Uint32Array) {
    this._bg = v;
  }

  /** @internal Materialized attribute plane; prefer `readCells()`. */
  get attrs(): Uint16Array {
    this._ensureSpritesMaterialized();
    return this._attrs;
  }
  set attrs(v: Uint16Array) {
    this._attrs = v;
  }

  /**
   * Return materialized cell planes for reading. Any active pixel sprites are
   * rasterized into `▀` half-blocks without bumping `_writeVersion` or dirtying row hashes.
   */
  readCells(): {
    readonly chars: Uint32Array;
    readonly fg: Uint32Array;
    readonly bg: Uint32Array;
    readonly attrs: Uint16Array;
    readonly graphemePool: readonly string[];
  } {
    this._ensureSpritesMaterialized();
    return {
      chars: this._chars,
      fg: this._fg,
      bg: this._bg,
      attrs: this._attrs,
      graphemePool: this.graphemePool,
    };
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
    this._chars = new Uint32Array(size).fill(CHAR_SPACE);
    this._fg = new Uint32Array(size);
    this._bg = new Uint32Array(size);
    this._attrs = new Uint16Array(size);
    this.rowHashes = new Uint32Array(h);
    this.rowHashValid = new Uint8Array(h);
    this._writeVersion = (this._writeVersion + 1) | 0;
    this.graphemePool.length = 0;
    this.poolLookup.clear();
    this._sprites.length = 0;
    this.scissorStack.length = 0;
    this.resetScissor();
  }

  /** Reset every cell to a space with the given colors and drop the grapheme pool. */
  clear(bg: PackedColor = 0, fg: PackedColor = 0): void {
    this._chars.fill(CHAR_SPACE);
    this._fg.fill(fg >>> 0);
    this._bg.fill(bg >>> 0);
    this._attrs.fill(0);
    this.rowHashValid.fill(0);
    this._writeVersion = (this._writeVersion + 1) | 0;
    if (this.graphemePool.length > 0) {
      this.graphemePool.length = 0;
      this.poolLookup.clear();
    }
    if (this._sprites.length > 0) {
      for (const sp of this._sprites) sp.codec.release(sp.pixels);
      this._sprites.length = 0;
    }
  }

  /** @internal Populate half-block fallback cells for every active sprite without removing sprites or bumping `_writeVersion`. */
  _ensureSpritesMaterialized(): void {
    if (this._sprites.length > 0) this._materializeSpritesInRect(0, 0, this.width, this.height, false, false);
  }

  /** @internal */
  _materializeSpritesInRect(x0: number, y0: number, x1: number, y1: number, remove: boolean, skipPaintIfCovered: boolean): void {
    if (this._sprites.length === 0 || this.guardingSpriteMaterialize) return;
    if (!remove) {
      let needsPaint = false;
      for (let i = 0; i < this._sprites.length; i++) {
        const sp = this._sprites[i] as BufferSprite;
        if (!sp.materialized && x0 < sp.x + sp.width && x1 > sp.x && y0 < sp.y + sp.height && y1 > sp.y) {
          needsPaint = true;
          break;
        }
      }
      if (!needsPaint) return;
    }
    this.guardingSpriteMaterialize = true;
    const savedWriteVersion = this._writeVersion;
    const savedRowValid = remove ? null : this.rowHashValid.slice();
    const savedStack = this.scissorStack.slice();
    const sx0 = this._clipX0;
    const sy0 = this._clipY0;
    const sx1 = this._clipX1;
    const sy1 = this._clipY1;
    const ssx0 = this._sClipX0;
    const ssy0 = this._sClipY0;
    const ssx1 = this._sClipX1;
    const ssy1 = this._sClipY1;
    try {
      for (let i = this._sprites.length - 1; i >= 0; i--) {
        const sp = this._sprites[i] as BufferSprite;
        if (x0 >= sp.x + sp.width || x1 <= sp.x || y0 >= sp.y + sp.height || y1 <= sp.y) continue;
        const fullyCovered = skipPaintIfCovered && x0 <= sp.x && y0 <= sp.y && x1 >= sp.x + sp.width && y1 >= sp.y + sp.height;
        if (!sp.materialized && !fullyCovered) {
          if (sp.cellsDirty) {
            const W = this.width;
            for (let yy = sp.y; yy < sp.y + sp.height; yy++) {
              const r0 = yy * W + sp.x;
              const r1 = r0 + sp.width;
              this._chars.fill(CHAR_SPACE, r0, r1);
              this._fg.fill(0, r0, r1);
              this._bg.fill(sp.underBg, r0, r1);
              this._attrs.fill(0, r0, r1);
            }
          }
          this._clipX0 = sp.x;
          this._clipY0 = sp.y;
          this._clipX1 = sp.x + sp.width;
          this._clipY1 = sp.y + sp.height;
          this.scissorStack.length = 0;
          sp.codec.materialize(this, sp);
          sp.materialized = true;
          sp.cellsDirty = true;
        }
        if (remove) {
          this._sprites.splice(i, 1);
          sp.codec.release(sp.pixels);
          this.rowHashValid.fill(0, sp.y, sp.y + sp.height);
        }
      }
    } finally {
      this._clipX0 = sx0;
      this._clipY0 = sy0;
      this._clipX1 = sx1;
      this._clipY1 = sy1;
      this._sClipX0 = ssx0;
      this._sClipY0 = ssy0;
      this._sClipX1 = ssx1;
      this._sClipY1 = ssy1;
      this.scissorStack.length = 0;
      for (let i = 0; i < savedStack.length; i++) this.scissorStack.push(savedStack[i] as number);
      if (!remove) {
        this._writeVersion = savedWriteVersion;
        if (savedRowValid !== null) this.rowHashValid.set(savedRowValid);
      }
      this.guardingSpriteMaterialize = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Scissor
  // ---------------------------------------------------------------------------

  resetScissor(): void {
    this._clipX0 = 0;
    this._clipY0 = 0;
    this._clipX1 = this.width;
    this._clipY1 = this.height;
    this._sClipX0 = 0;
    this._sClipY0 = 0;
    this._sClipX1 = this.width;
    this._sClipY1 = this.height;
    this.scissorStack.length = 0;
  }

  /** Push a clip rect intersected with the current one. */
  pushScissor(x: number, y: number, width: number, height: number): void {
    this.scissorStack.push(
      this._clipX0,
      this._clipY0,
      this._clipX1,
      this._clipY1,
      this._sClipX0,
      this._sClipY0,
      this._sClipX1,
      this._sClipY1,
    );
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const fx1 = Math.floor(x + width);
    const fy1 = Math.floor(y + height);
    const x0 = Math.max(this._clipX0, fx);
    const y0 = Math.max(this._clipY0, fy);
    this._clipX0 = x0;
    this._clipY0 = y0;
    this._clipX1 = Math.max(x0, Math.min(this._clipX1, fx1));
    this._clipY1 = Math.max(y0, Math.min(this._clipY1, fy1));
    const sx0 = Math.max(this._sClipX0, fx);
    const sy0 = Math.max(this._sClipY0, fy);
    this._sClipX0 = sx0;
    this._sClipY0 = sy0;
    this._sClipX1 = Math.max(sx0, Math.min(this._sClipX1, fx1));
    this._sClipY1 = Math.max(sy0, Math.min(this._sClipY1, fy1));
  }

  /** @internal Push a damage-band row scissor without restricting unclipped sprites to the band. */
  _pushBandScissor(y: number, height: number): void {
    this.scissorStack.push(
      this._clipX0,
      this._clipY0,
      this._clipX1,
      this._clipY1,
      this._sClipX0,
      this._sClipY0,
      this._sClipX1,
      this._sClipY1,
    );
    const y0 = Math.max(this._clipY0, Math.floor(y));
    this._clipY0 = y0;
    this._clipY1 = Math.max(y0, Math.min(this._clipY1, Math.floor(y + height)));
  }

  popScissor(): void {
    const s = this.scissorStack;
    if (s.length < 8) {
      this.resetScissor();
      return;
    }
    this._sClipY1 = s.pop() as number;
    this._sClipX1 = s.pop() as number;
    this._sClipY0 = s.pop() as number;
    this._sClipX0 = s.pop() as number;
    this._clipY1 = s.pop() as number;
    this._clipX1 = s.pop() as number;
    this._clipY0 = s.pop() as number;
    this._clipX0 = s.pop() as number;
  }

  getScissor(): Rect {
    return { x: this._clipX0, y: this._clipY0, width: this._clipX1 - this._clipX0, height: this._clipY1 - this._clipY0 };
  }

  get scissorDepth(): number {
    return this.scissorStack.length / 8;
  }

  /** Whether a rect intersects the current scissor. */
  intersectsScissor(x: number, y: number, width: number, height: number): boolean {
    return x < this._clipX1 && y < this._clipY1 && x + width > this._clipX0 && y + height > this._clipY0 && width > 0 && height > 0;
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
    this._ensureSpritesMaterialized();
    const c = this._chars[index] ?? CHAR_SPACE;
    if (c >= GRAPHEME_POOL_FLAG) return this.graphemePool[c & 0x7fffffff] ?? " ";
    if (c === CHAR_CONTINUATION && ((this._attrs[index] ?? 0) & ATTR_WIDE_CONT) !== 0) return "";
    return c < 0x10000 ? String.fromCharCode(c) : String.fromCodePoint(c);
  }

  getCell(x: number, y: number): { char: string; fg: PackedColor; bg: PackedColor; attrs: number } | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    const i = y * this.width + x;
    return { char: this.cellText(i), fg: this._fg[i] ?? 0, bg: this._bg[i] ?? 0, attrs: this._attrs[i] ?? 0 };
  }

  /**
   * Write a grapheme (string or code point) clipped to the scissor. Returns the
   * number of columns the grapheme occupies, or `0` when fully clipped.
   */
  setCell(x: number, y: number, graphemeOrCodePoint: string | number, fg: PackedColor, bg: PackedColor, attrs = 0): number {
    if (y < this._clipY0 || y >= this._clipY1 || x < this._clipX0 || x >= this._clipX1) return 0;
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
    if (w === 2 && x + 1 >= this._clipX1) {
      code = CHAR_SPACE;
      w = 1;
    }
    if (this._sprites.length > 0 && !this.guardingSpriteMaterialize) {
      this._materializeSpritesInRect(x, y, x + w, y + 1, true, false);
    }
    const W = this.width;
    const i = y * W + x;
    const A = this._attrs;
    const C = this._chars;
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
    const B = this._bg;
    const outBg = ba === 255 ? bg : ba === 0 ? (B[i] as number) : blendOver(bg, B[i] as number);
    const outFg = fa === 255 || fa === 0 ? fg : blendOver(fg, outBg);
    C[i] = code;
    this._fg[i] = outFg;
    B[i] = outBg;
    A[i] = a;
    this.rowHashValid[y] = 0;
    this._writeVersion = (this._writeVersion + 1) | 0;
    if (w === 2) {
      const j = i + 1;
      C[j] = CHAR_CONTINUATION;
      this._fg[j] = outFg;
      B[j] = ba === 255 ? bg : ba === 0 ? (B[j] as number) : blendOver(bg, B[j] as number);
      A[j] = a | ATTR_WIDE_CONT;
    }
    return w;
  }

  /** Repair wide graphemes split by a write spanning columns `[x0, x1)` on row `y`. */
  private repairEdges(y: number, x0: number, x1: number): void {
    const W = this.width;
    const row = y * W;
    if (x0 > 0 && ((this._attrs[row + x0] as number) & ATTR_WIDE_CONT) !== 0) this._chars[row + x0 - 1] = CHAR_SPACE;
    if (x1 < W && ((this._attrs[row + x1] as number) & ATTR_WIDE_CONT) !== 0) {
      this._chars[row + x1] = CHAR_SPACE;
      this._attrs[row + x1] = (this._attrs[row + x1] as number) & ~ATTR_WIDE_CONT;
    }
  }

  /** Fill a rect with a character and colors (clipped). Translucent colors blend over existing cells. */
  fillRect(x: number, y: number, w: number, h: number, bg: PackedColor, charCode = CHAR_SPACE, fg: PackedColor = 0, attrs = 0): void {
    const x0 = Math.max(this._clipX0, Math.floor(x));
    const y0 = Math.max(this._clipY0, Math.floor(y));
    const x1 = Math.min(this._clipX1, Math.floor(x + w));
    const y1 = Math.min(this._clipY1, Math.floor(y + h));
    if (x0 >= x1 || y0 >= y1) return;
    const ba = bg & 255;
    if (this._sprites.length > 0 && !this.guardingSpriteMaterialize) {
      this._materializeSpritesInRect(x0, y0, x1, y1, true, ba === 255);
    }
    this.rowHashValid.fill(0, y0, y1);
    this._writeVersion = (this._writeVersion + 1) | 0;
    const W = this.width;
    const fa = fg & 255;
    const a = attrs & ~ATTR_WIDE_CONT;
    const fast = (ba === 255 || ba === 0) && (fa === 255 || fa === 0);
    for (let yy = y0; yy < y1; yy++) {
      this.repairEdges(yy, x0, x1);
      const i0 = yy * W + x0;
      const i1 = yy * W + x1;
      this._chars.fill(charCode, i0, i1);
      this._attrs.fill(a, i0, i1);
      if (fast) {
        this._fg.fill(fg, i0, i1);
        if (ba === 255) this._bg.fill(bg, i0, i1);
      } else {
        for (let i = i0; i < i1; i++) {
          const outBg = ba === 255 ? bg : ba === 0 ? (this._bg[i] as number) : blendOver(bg, this._bg[i] as number);
          this._bg[i] = outBg;
          this._fg[i] = fa === 255 || fa === 0 ? fg : blendOver(fg, outBg);
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
    const x0 = Math.max(this._clipX0, Math.floor(x));
    const y0 = Math.max(this._clipY0, Math.floor(y));
    const x1 = Math.min(this._clipX1, Math.floor(x + w));
    const y1 = Math.min(this._clipY1, Math.floor(y + h));
    if (x0 >= x1 || y0 >= y1) return;
    if (this._sprites.length > 0 && !this.guardingSpriteMaterialize) {
      this._materializeSpritesInRect(x0, y0, x1, y1, true, false);
    }
    this.rowHashValid.fill(0, y0, y1);
    this._writeVersion = (this._writeVersion + 1) | 0;
    const W = this.width;
    let lastBgIn = -1;
    let lastBgOut = 0;
    let lastFgIn = -1;
    let lastFgOut = 0;
    for (let yy = y0; yy < y1; yy++) {
      for (let i = yy * W + x0, end = yy * W + x1; i < end; i++) {
        const b = this._bg[i] as number;
        if (b !== lastBgIn) {
          lastBgIn = b;
          lastBgOut = blendOver(overlayRgba, b);
        }
        this._bg[i] = lastBgOut;
        let f = this._fg[i] as number;
        if ((f & 255) === 0) f = assumedFg;
        if (f !== lastFgIn) {
          lastFgIn = f;
          lastFgOut = blendOver(overlayRgba, f);
        }
        this._fg[i] = lastFgOut;
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
    if (y < this._clipY0 || y >= this._clipY1) {
      let adv = 0;
      for (let k = from; k < to; k++) adv += (gs[k] as Grapheme).width;
      return adv;
    }
    const clipX0 = this._clipX0;
    const clipX1 = this._clipX1;
    const W = this.width;
    const rowOffset = y * W;
    const C = this._chars;
    const F = this._fg;
    const B = this._bg;
    const A = this._attrs;
    const a = attrs & ~ATTR_WIDE_CONT;
    const ba = bg & 255;
    const fa = fg & 255;
    const fastColors = (ba === 0 || ba === 255) && (fa === 255 || fa === 0);
    if (this._sprites.length > 0 && !this.guardingSpriteMaterialize) {
      this._materializeSpritesInRect(Math.max(x, clipX0), y, clipX1, y + 1, true, false);
    }

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
      if (y < this._clipY0 || y >= this._clipY1) return n;
      const start = Math.max(x, this._clipX0);
      const end = Math.min(x + n, this._clipX1);
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
      if (y >= this._clipY0 && y < this._clipY1 && cx >= this._clipX0 && cx < this._clipX1) {
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
    const clipX0 = this._clipX0;
    const clipX1 = this._clipX1;
    const clipY0 = this._clipY0;
    const clipY1 = this._clipY1;
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
      this.drawBorderTitle(x, y, w, options.title, options.titleAlign ?? "left", options.titleColor ?? fg, bg, options.titleAttrs ?? attrs, options.drawTitleText);
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
        options.drawTitleText,
      );
    }
  }

  private drawBorderTitle(
    x: number,
    y: number,
    w: number,
    title: string,
    align: TitleAlign,
    fg: PackedColor,
    bg: PackedColor,
    attrs: number,
    draw: TitleTextDrawer | undefined,
  ): void {
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
    if (draw === undefined) this.drawText(start + 1, y, text, fg, bg, attrs, avail);
    else draw(this, start + 1, y, text, fg, bg, attrs, avail);
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
    const C = this._chars;
    const F = this._fg;
    const B = this._bg;
    const A = this._attrs;
    const pool = this.graphemePool;
    const hasPool = pool.length > 0;
    const sprites = this._sprites;
    const hasSprites = sprites.length > 0;
    for (let y = 0; y < H; y++) {
      if (valid[y] !== 0) continue;
      let h = 0x811c9dc5 ^ W;
      const rowOff = y * W;
      for (let x = 0; x < W; x++) {
        if (hasSprites) {
          let jumped = false;
          for (let si = 0; si < sprites.length; si++) {
            const sp = sprites[si] as BufferSprite;
            if (y >= sp.y && y < sp.y + sp.height && x >= sp.x && x < sp.x + sp.width) {
              x = sp.x + sp.width - 1;
              jumped = true;
              break;
            }
          }
          if (jumped) continue;
        }
        const i = rowOff + x;
        const c = C[i] as number;
        if (hasPool && c >= GRAPHEME_POOL_FLAG) {
          const s = pool[c & 0x7fffffff] ?? "";
          for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 0x01000193);
          h = Math.imul(h ^ 0x9e37, 0x01000193);
        } else h = Math.imul(h ^ c, 0x01000193);
        h = Math.imul(h ^ (F[i] as number), 0x01000193);
        h = Math.imul(h ^ (B[i] as number), 0x01000193);
        h = Math.imul(h ^ (A[i] as number), 0x01000193);
      }
      if (hasSprites) {
        for (let si = 0; si < sprites.length; si++) {
          const sp = sprites[si] as BufferSprite;
          if (y >= sp.y && y < sp.y + sp.height) {
            h = Math.imul(h ^ sp.hash ^ ((y - sp.y + 1) * 0x9e37), 0x01000193);
          }
        }
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
    if (this._sprites.length > 0 && !this.guardingSpriteMaterialize) {
      this._materializeSpritesInRect(0, y, this.width, y + 1, false, false);
    }
    let s = "";
    const W = this.width;
    for (let i = y * W, end = i + W; i < end; i++) {
      const c = this._chars[i] as number;
      if (c === CHAR_CONTINUATION && ((this._attrs[i] as number) & ATTR_WIDE_CONT) !== 0) continue;
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

  /**
   * @internal Draw `text` centered on row `y` over a full-width `bg` bar, for one encode. Returns
   * what {@link _restoreRow} needs to put the row back without counting as a write, so incremental
   * painting and mirrors never see the bar.
   */
  _overlayRow(y: number, text: string, fg: PackedColor, bg: PackedColor): RowSnapshot {
    const W = this.width;
    const i0 = y * W;
    const sprites = this._sprites.some((sp) => y >= sp.y && y < sp.y + sp.height)
      ? this._sprites.map((sp) => ({ ...sp, pixels: sp.pixels.slice() }))
      : null;
    const snap: RowSnapshot = {
      chars: sprites ? this._chars.slice() : this._chars.slice(i0, i0 + W),
      fg: sprites ? this._fg.slice() : this._fg.slice(i0, i0 + W),
      bg: sprites ? this._bg.slice() : this._bg.slice(i0, i0 + W),
      attrs: sprites ? this._attrs.slice() : this._attrs.slice(i0, i0 + W),
      pool: this.graphemePool.length,
      version: this._writeVersion,
      sprites,
    };
    if (sprites) this._materializeSpritesInRect(0, y, W, y + 1, true, false);
    this.resetScissor();
    this._chars.fill(CHAR_SPACE, i0, i0 + W);
    this._fg.fill(fg >>> 0, i0, i0 + W);
    this._bg.fill(bg >>> 0, i0, i0 + W);
    this._attrs.fill(0, i0, i0 + W);
    this.rowHashValid[y] = 0;
    this.drawText(Math.max(0, Math.floor((W - stringWidth(text)) / 2)), y, text, fg, bg, 0, W);
    return snap;
  }

  /** @internal Undo {@link _overlayRow}. */
  _restoreRow(y: number, snap: RowSnapshot): void {
    const off = snap.sprites ? 0 : y * this.width;
    this._chars.set(snap.chars, off);
    this._fg.set(snap.fg, off);
    this._bg.set(snap.bg, off);
    this._attrs.set(snap.attrs, off);
    if (snap.sprites) {
      for (const sp of this._sprites) sp.codec.release(sp.pixels);
      this._sprites = snap.sprites;
      this.rowHashValid.fill(0);
    } else this.rowHashValid[y] = 0;
    for (let i = this.graphemePool.length - 1; i >= snap.pool; i--) this.poolLookup.delete(this.graphemePool[i] as string);
    this.graphemePool.length = snap.pool;
    this._writeVersion = snap.version;
  }

  /** Copy all cells from another buffer of the same size. */
  copyFrom(other: CellBuffer): void {
    this.resize(other.width, other.height);
    this._chars.set(other._chars);
    this._fg.set(other._fg);
    this._bg.set(other._bg);
    this._attrs.set(other._attrs);
    this.graphemePool = other.graphemePool.slice();
    this.poolLookup = new Map(this.graphemePool.map((g, i) => [g, i]));
    for (const sp of this._sprites) sp.codec.release(sp.pixels);
    this._sprites = other._sprites.map((sp) => ({ ...sp, pixels: sp.pixels.slice() }));
    this.rowHashValid.fill(0);
    this._writeVersion = (this._writeVersion + 1) | 0;
  }
}
