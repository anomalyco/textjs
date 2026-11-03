/**
 * The cell storage under `CellBuffer`: planes, reads, row hashes, raw writes and plain text.
 * Drivers and the frame player only need this; the drawing API (scissor stack, `fillRect`,
 * `drawBox`, ...) lives on `CellBuffer`, so a bundle that only replays cells skips it.
 */

import { blendOver, type PackedColor } from "./color";
import type { CellBuffer } from "./cell-buffer";
import type { RowSnapshot } from "./internal";
import type { BufferSprite } from "./sprite-types";
import { isPrintableAscii, isSimpleNarrowString, segmentGraphemes, stringWidth } from "./text-measure";

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

function hasAsciiControls(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

/**
 * Flat TypedArray grid of terminal-style cells without the drawing API. Drivers read it and the
 * frame player writes decoded cells into it; draw with {@link CellBuffer}, which extends it.
 */
export class CellGrid {
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
  protected guardingSpriteMaterialize = false;
  protected poolLookup = new Map<string, number>();
  /** @internal */ _clipX0 = 0;
  /** @internal */ _clipY0 = 0;
  /** @internal */ _clipX1 = 0;
  /** @internal */ _clipY1 = 0;
  /** @internal */ _sClipX0 = 0;
  /** @internal */ _sClipY0 = 0;
  /** @internal */ _sClipX1 = 0;
  /** @internal */ _sClipY1 = 0;
  protected scissorStack: number[] = [];
  protected rowHashes: Uint32Array;
  protected rowHashValid: Uint8Array;
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
          // Only `drawPixels` adds sprites, and it takes a `CellBuffer`.
          sp.codec.materialize(this as unknown as CellBuffer, sp);
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

  /** Clip writes to the whole grid again. */
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

  /**
   * Draw a single line of text (stops at `\n`). Returns the column advance. Lives on the grid
   * because drivers draw the focus hint banner with it (see {@link _overlayRow}).
   */
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
}
