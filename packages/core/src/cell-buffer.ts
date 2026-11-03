/**
 * `CellGrid` plus the drawing API: the scissor stack, cell and rect writes, dimming, grapheme
 * runs and boxes.
 */

import { blendOver, type PackedColor } from "./color";
import { ATTR_WIDE_CONT, CellGrid, CHAR_CONTINUATION, CHAR_SPACE } from "./cell-grid";
import { codePointWidth, graphemeWidth, stringWidth, truncateText, type Grapheme } from "./text-measure";

export * from "./cell-grid";

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

/** Flat TypedArray framebuffer of terminal-style cells, with the drawing API. */
export class CellBuffer extends CellGrid {
  // ---------------------------------------------------------------------------
  // Scissor
  // ---------------------------------------------------------------------------

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

  /** Copy all cells from another buffer of the same size. */
  copyFrom(other: CellGrid): void {
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
