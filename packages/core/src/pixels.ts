import {
  ATTR_ALLOW_LINK,
  ATTR_INVERSE,
  ATTR_STRIKETHROUGH,
  ATTR_UNDERLINE,
  ATTR_WIDE_CONT,
  CHAR_SPACE,
  CellBuffer,
  type CellGrid,
} from "./cell-buffer";
import { blendOver, colorToCss, type PackedColor } from "./color";
import { encodeIndexedPng, encodeRgbaPng, encodeSpriteSvgDataUrl, hasTransparentPixels, type EncodedPng, type SpriteKeyframe } from "./drivers/png";
import { DEFAULT_TYPOGRAPHY, SEAL_CSS, sealsBefore } from "./drivers/style";
import type { BufferSprite, SpriteCodec, SpriteDriverContext } from "./sprite-types";

/** A live framebuffer: row-major packed `0xRRGGBBAA` colors, the format every Text.js color uses. */
export interface PixelSource {
  width: number;
  height: number;
  data: Uint32Array;
}

export type PixelFit = "contain" | "fill";
export type PixelSample = "nearest" | "average";
export type PixelRenderMode = "auto" | "halfblock";
export type PixelEncoding = "indexed" | "rgba";

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const UPPER_HALF_BLOCK = 0x2580; // "▀"
const LOWER_HALF_BLOCK = 0x2584; // "▄"
const CACHE_SIZE = 16384;
const CACHE_MASK = CACHE_SIZE - 1;

const quantizers = /* @__PURE__ */ new WeakMap<readonly PackedColor[], (c: PackedColor) => PackedColor>();

/** Nearest-color lookup (red-mean weighted RGB), memoized in a zero-GC typed direct-mapped table. */
export function quantizer(palette: readonly PackedColor[]): (c: PackedColor) => PackedColor {
  let q = quantizers.get(palette);
  if (q) return q;
  const n = palette.length;
  if (n === 0) {
    q = (c) => c;
    quantizers.set(palette, q);
    return q;
  }
  const pal = new Uint32Array(n);
  const pr = new Int32Array(n);
  const pg = new Int32Array(n);
  const pb = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const p = (palette[i] as number) >>> 0;
    pal[i] = p;
    pr[i] = p >>> 24;
    pg[i] = (p >>> 16) & 255;
    pb[i] = (p >>> 8) & 255;
  }
  const keys = new Uint32Array(CACHE_SIZE);
  const vals = new Uint32Array(CACHE_SIZE);
  const valid = new Uint8Array(CACHE_SIZE);

  q = (c) => {
    const cu = c >>> 0;
    if ((cu & 255) === 0) return cu;
    const slot = (Math.imul(cu, 0x9e3779b1) >>> 18) & CACHE_MASK;
    if (valid[slot] === 1 && keys[slot] === cu) return vals[slot] as number;
    const r = cu >>> 24;
    const g = (cu >>> 16) & 255;
    const b = (cu >>> 8) & 255;
    let best = Infinity;
    let hit = cu;
    for (let i = 0; i < n; i++) {
      const dr = r - (pr[i] as number);
      const dg = g - (pg[i] as number);
      const db = b - (pb[i] as number);
      const rm = (r + (pr[i] as number)) * 0.5;
      const d = (2 + rm * (1 / 256)) * dr * dr + 4 * dg * dg + (2 + (255 - rm) * (1 / 256)) * db * db;
      if (d < best) {
        best = d;
        hit = pal[i] as number;
      }
    }
    valid[slot] = 1;
    keys[slot] = cu;
    vals[slot] = hit;
    return hit;
  };
  quantizers.set(palette, q);
  return q;
}

/**
 * Paint `src` into `rect` as `▀` / `▄` half-blocks (top pixel in the foreground, bottom in the background),
 * nearest-neighbour or box-average sampled so cell-grid fallbacks render every framebuffer faithfully.
 */
export function paintHalfBlocks(
  buf: CellBuffer,
  rect: Readonly<PixelRect>,
  src: PixelSource,
  fit: PixelFit = "contain",
  pixelAspect = 1,
  palette?: readonly PackedColor[],
  sample: PixelSample = "nearest",
): void {
  if (rect.width <= 0 || rect.height <= 0 || src.width <= 0 || src.height <= 0) return;
  const boxW = rect.width;
  const boxH = rect.height * 2;
  let tw = boxW;
  let th = boxH;
  if (fit === "contain") {
    const aspect = (src.width * pixelAspect) / src.height;
    if (boxW / boxH > aspect) tw = Math.max(1, Math.round(boxH * aspect));
    else th = Math.max(1, Math.round(boxW / aspect));
  }
  const offX = (boxW - tw) >> 1;
  const offY = (boxH - th) >> 1;
  const d = src.data;
  const sw = src.width;
  const sh = src.height;
  const snap = palette ? quantizer(palette) : null;
  const xs = new Int32Array(boxW);
  for (let x = 0; x < boxW; x++) {
    xs[x] = x < offX || x >= offX + tw ? -1 : Math.min(sw - 1, Math.floor((x - offX + 0.5) * (sw / tw)));
  }
  const row = (y: number): number =>
    y < offY || y >= offY + th ? -1 : Math.min(sh - 1, Math.floor((y - offY + 0.5) * (sh / th))) * sw;
  const kx = sample === "average" ? Math.max(1, Math.floor(sw / tw)) : 1;
  const ky = sample === "average" ? Math.max(1, Math.floor(sh / th)) : 1;
  const halfKx = kx >> 1;
  const halfKy = ky >> 1;

  const at = (rowStart: number, sx: number): PackedColor => {
    if (kx === 1 && ky === 1) {
      const c = d[rowStart + sx] as number;
      return (c & 255) < 16 ? 0 : c;
    }
    const y0 = Math.max(0, Math.floor(rowStart / sw) - halfKy);
    const x0 = Math.max(0, sx - halfKx);
    const y1 = Math.min(sh, y0 + ky);
    const x1 = Math.min(sw, x0 + kx);
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let n = 0;
    for (let y = y0; y < y1; y++) {
      const ro = y * sw;
      for (let x = x0; x < x1; x++) {
        const c = d[ro + x] as number;
        const pa = (c & 255) / 255;
        r += (c >>> 24) * pa;
        g += ((c >>> 16) & 255) * pa;
        b += ((c >>> 8) & 255) * pa;
        a += pa;
        n++;
      }
    }
    const outA = n > 0 ? Math.round((a / n) * 255) : 0;
    if (outA < 16 || a <= 0) return 0;
    return (((Math.round(r / a) & 255) << 24) | ((Math.round(g / a) & 255) << 16) | ((Math.round(b / a) & 255) << 8) | outA) >>> 0;
  };

  for (let cy = 0; cy < rect.height; cy++) {
    const top = row(cy * 2);
    const bottom = row(cy * 2 + 1);
    const dstY = rect.y + cy;
    for (let cx = 0; cx < boxW; cx++) {
      const sx = xs[cx] as number;
      let t: PackedColor = sx < 0 || top < 0 ? 0 : at(top, sx);
      let b: PackedColor = sx < 0 || bottom < 0 ? 0 : at(bottom, sx);
      if (snap) {
        if (t !== 0) t = snap(t);
        if (b !== 0) b = snap(b);
      }
      if (t === 0 && b === 0) continue;
      if (t === 0) buf.setCell(rect.x + cx, dstY, LOWER_HALF_BLOCK, b, 0);
      else if (b === 0) buf.setCell(rect.x + cx, dstY, UPPER_HALF_BLOCK, t, 0);
      else if (t === b) buf.setCell(rect.x + cx, dstY, CHAR_SPACE, t, t);
      else buf.setCell(rect.x + cx, dstY, UPPER_HALF_BLOCK, t, b);
    }
  }
}

export interface DrawPixelsOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  source: PixelSource;
  /** `"contain"` (default) letterboxes inside the cell rect, `"fill"` stretches. */
  fit?: PixelFit;
  /** Width ÷ height of one source pixel as displayed (default `1`). */
  pixelAspect?: number;
  /** Optional palette to snap colors to. */
  palette?: readonly PackedColor[];
  /** Sampling filter for cell-grid fallback (`"nearest"` | `"average"`, default `"nearest"`). */
  sample?: PixelSample;
  /** `"auto"` (default: sprite in Chromium, and Firefox per its console's style rules (not benchmarked); half-blocks elsewhere) or `"halfblock"`. */
  renderMode?: PixelRenderMode;
  /**
   * Sprite PNG format: `"indexed"` (default) is a 256-color palette, the fastest for live frames;
   * `"rgba"` is lossless with smooth alpha, for still images. RGBA sprites never batch into keyframes.
   */
  encoding?: PixelEncoding;
  /**
   * Paints the cells wherever the sprite can't be shown (Safari, ANSI, plain text, clipped or
   * overlapped sprites), in place of `▀` half-blocks of `source`. Called with the sprite's cell rect.
   */
  fallback?: (buf: CellBuffer, rect: Readonly<PixelRect>) => void;
}

function sharesRowWithSibling(sprites: readonly BufferSprite[], sp: BufferSprite): boolean {
  for (let i = 0; i < sprites.length; i++) {
    const other = sprites[i]!;
    if (other !== sp && other.y < sp.y + sp.height && other.y + other.height > sp.y) return true;
  }
  return false;
}

interface StagedFrame {
  hash: number;
  pixels: Uint32Array;
  atMs: number;
}

function slotKeyOf(sp: BufferSprite): string {
  return `${sp.x},${sp.y},${sp.width},${sp.height},${sp.sourceWidth},${sp.sourceHeight}`;
}

function acquirePool(pool: Uint32Array[], length: number): Uint32Array {
  for (let i = pool.length - 1; i >= 0; i--) {
    const b = pool[i] as Uint32Array;
    if (b.length === length) {
      pool.splice(i, 1);
      return b;
    }
  }
  return new Uint32Array(length);
}

function releasePool(pool: Uint32Array[], buf: Uint32Array): void {
  if (pool.length < 8) pool.push(buf);
}

type InverseColors = SpriteDriverContext["styleOptions"];

/**
 * The background a sprite's whole row band shares, so its rows can be one
 * span each, or `null` for rows sliced around text. `undefined` when consoles
 * draw it as half-block cells: it shares rows with another sprite, or it's a
 * photo beside text, whose sliced rows would each resend its whole data URL.
 */
function spriteBand(opts: InverseColors, buffer: CellGrid, sp: BufferSprite): number | null | undefined {
  if (sharesRowWithSibling(buffer._sprites, sp)) return undefined;
  const bandBg = resolveCleanBandBg(opts, buffer, sp);
  return bandBg === null && sp.encoding === "rgba" ? undefined : bandBg;
}

function resolveCleanBandBg(opts: InverseColors, buffer: CellGrid, sp: BufferSprite): number | null {
  const W = buffer.width;
  const C = buffer._chars;
  const F = buffer._fg;
  const B = buffer._bg;
  const A = buffer._attrs;
  let bandBg = -1;
  for (let y = sp.y, yEnd = sp.y + sp.height; y < yEnd; y++) {
    const rowOff = y * W;
    for (let x = 0; x < W; x++) {
      if (x === sp.x) {
        x += sp.width - 1;
        continue;
      }
      const i = rowOff + x;
      const a = A[i] as number;
      if (a & ATTR_WIDE_CONT) continue;
      if ((C[i] as number) > CHAR_SPACE || (a & (ATTR_UNDERLINE | ATTR_STRIKETHROUGH | ATTR_ALLOW_LINK)) !== 0) {
        return null;
      }
      let effBg = (B[i] as number) >>> 0;
      if (a & ATTR_INVERSE) {
        const f = F[i] as number;
        effBg = (f & 255) === 0 ? opts.inverseBg : f;
        if ((effBg & 255) !== 255) effBg = blendOver(effBg, opts.inverseFg);
        effBg >>>= 0;
      }
      if (bandBg === -1) bandBg = effBg;
      else if (effBg !== bandBg) return null;
    }
  }
  return bandBg === -1 ? 0 : bandBg;
}

/** Cells `x0..x1` of row `y` as a one-row buffer. */
function rowSlice(buffer: CellGrid, y: number, x0: number, x1: number): CellBuffer {
  const out = new CellBuffer(x1 - x0, 1);
  const a = y * buffer.width + x0;
  const b = a + x1 - x0;
  out._chars.set(buffer._chars.subarray(a, b));
  out._fg.set(buffer._fg.subarray(a, b));
  out._bg.set(buffer._bg.subarray(a, b));
  out._attrs.set(buffer._attrs.subarray(a, b));
  out.graphemePool = buffer.graphemePool;
  return out;
}

function spriteTypoCss(ctx: SpriteDriverContext, lineHeightPx: number): string {
  const t = ctx.typography;
  if (ctx._profile.inline) {
    let css = `display:inline-block;font-family:${t.fontFamily};font-size:${t.fontSize}px;line-height:${lineHeightPx}px;text-wrap-mode:nowrap;`;
    if (t.fontFamily !== ctx._profile.typography.fontFamily) css += "font-variant-ligatures:none;";
    if (t.extraCss) css += t.extraCss.endsWith(";") ? t.extraCss : `${t.extraCss};`;
    return css;
  }
  let css = `font-family:${t.fontFamily};font-size:${t.fontSize}px;line-height:${lineHeightPx}px;`;
  if (t.fontFamily !== DEFAULT_TYPOGRAPHY.fontFamily) css += "font-variant-ligatures:none;";
  if (t.rowMarginY !== 0) css += `margin-top:${t.rowMarginY}px;margin-bottom:${t.rowMarginY}px;`;
  if (t.extraCss) css += t.extraCss.endsWith(";") ? t.extraCss : `${t.extraCss};`;
  return css;
}

function buildSpriteSvgUrl(
  sp: BufferSprite,
  drawW: number,
  drawH: number,
  renderAt: number,
  stagedMap: Map<string, StagedFrame[]>,
  stagePool: Uint32Array[],
  svgCache: Map<string, { hash: number; drawW: number; drawH: number; url: string }>,
): { url: string; visualFrames: number } {
  const slotKey = slotKeyOf(sp);
  const staged = stagedMap.get(slotKey);
  const dw = Math.max(1, Math.round(drawW));
  const dh = Math.max(1, Math.round(drawH));
  const pxCount = sp.sourceWidth * sp.sourceHeight;

  if (staged !== undefined && staged.length > 0) {
    stagedMap.delete(slotKey);
    try {
      if (sp.encoding === "rgba") return encodeSingleSpriteUrl(sp, slotKey, dw, dh, svgCache);
      // Stacked SVG <image> keyframes require opaque frames so earlier frames cannot bleed through transparent pixels.
      let anyTransparent = hasTransparentPixels(sp.pixels, pxCount);
      if (!anyTransparent) {
        for (const f of staged) {
          if (hasTransparentPixels(f.pixels, pxCount)) {
            anyTransparent = true;
            break;
          }
        }
      }
      if (!anyTransparent) {
        const rawFrames: StagedFrame[] = [];
        for (const f of staged) {
          if (rawFrames.length === 0 || rawFrames[rawFrames.length - 1]!.hash !== f.hash) {
            rawFrames.push(f);
          }
        }
        if (rawFrames[rawFrames.length - 1]!.hash !== sp.hash) {
          rawFrames.push({ hash: sp.hash, pixels: sp.pixels, atMs: renderAt });
        }
        if (rawFrames.length > 1) {
          const keyframes: SpriteKeyframe[] = [];
          const baseAt = rawFrames[0]!.atMs;
          let prevPixels: Uint32Array | undefined;
          for (let i = 0; i < rawFrames.length; i++) {
            const rf = rawFrames[i]!;
            const png = encodeIndexedPng(rf.pixels, sp.sourceWidth, sp.sourceHeight, { palette: sp.palette, prev: prevPixels });
            if (png !== null) {
              const delayMs = i === 0 ? 0 : Math.max(12, Math.min(48, Math.round(rf.atMs - baseAt)));
              keyframes.push({ png, delayMs });
              prevPixels = rf.pixels;
            }
          }
          if (keyframes.length > 0) {
            return {
              url: encodeSpriteSvgDataUrl(keyframes, sp.sourceWidth, sp.sourceHeight, dw, dh),
              visualFrames: keyframes.length,
            };
          }
        }
      }
    } finally {
      // Single release point: every staged pixel buffer is returned to the pool at most once.
      for (const f of staged) releasePool(stagePool, f.pixels);
    }
  }

  return encodeSingleSpriteUrl(sp, slotKey, dw, dh, svgCache);
}

function encodeSpritePng(sp: BufferSprite): EncodedPng | null {
  return sp.encoding === "rgba"
    ? encodeRgbaPng(sp.pixels, sp.sourceWidth, sp.sourceHeight)
    : encodeIndexedPng(sp.pixels, sp.sourceWidth, sp.sourceHeight, { palette: sp.palette });
}

function encodeSingleSpriteUrl(
  sp: BufferSprite,
  slotKey: string,
  dw: number,
  dh: number,
  svgCache: Map<string, { hash: number; drawW: number; drawH: number; url: string }>,
): { url: string; visualFrames: number } {
  const cached = svgCache.get(slotKey);
  if (cached !== undefined && cached.hash === sp.hash && cached.drawW === dw && cached.drawH === dh) {
    return { url: cached.url, visualFrames: 1 };
  }
  const png = encodeSpritePng(sp);
  const url = png ? encodeSpriteSvgDataUrl([{ png, delayMs: 0 }], sp.sourceWidth, sp.sourceHeight, dw, dh) : "";
  if (svgCache.size >= 16) svgCache.clear();
  svgCache.set(slotKey, { hash: sp.hash, drawW: dw, drawH: dh, url });
  return { url, visualFrames: 1 };
}

const spritePixelPool: Uint32Array[] = [];

let codecInstance: SpriteCodec | null = null;

function getSpriteCodec(): SpriteCodec {
  if (codecInstance !== null) return codecInstance;
  codecInstance = {
    release(buf: Uint32Array): void {
      releasePool(spritePixelPool, buf);
    },
    materialize(buf: CellBuffer, sp: BufferSprite): void {
      if (sp.fallback) {
        sp.fallback(buf, { x: sp.x, y: sp.y, width: sp.width, height: sp.height });
        return;
      }
      paintHalfBlocks(
        buf,
        sp,
        { width: sp.sourceWidth, height: sp.sourceHeight, data: sp.pixels },
        sp.fit,
        sp.pixelAspect,
        sp.palette,
        sp.sample,
      );
    },
    encodePngDataUrl(sp: BufferSprite): string {
      const png = encodeSpritePng(sp);
      return png ? `data:image/png;base64,${png.base64}` : "";
    },
    drawsAsCells(buffer, sp, style): boolean {
      return spriteBand(style, buffer, sp) === undefined;
    },
    stageKeyframe(staged, pool, buffer, atMs): boolean {
      let added = false;
      const sprites = buffer._sprites;
      for (const sp of sprites) {
        if (sharesRowWithSibling(sprites, sp) || !sp.batchable) continue;
        const key = slotKeyOf(sp);
        let list = staged.get(key);
        if (list === undefined) {
          list = [];
          staged.set(key, list);
        }
        const last = list[list.length - 1];
        if (last !== undefined && last.hash === sp.hash) continue;
        if (list.length >= 2) {
          const dropped = list.shift()!;
          releasePool(pool, dropped.pixels);
        }
        const px = acquirePool(pool, sp.pixels.length);
        px.set(sp.pixels);
        list.push({ hash: sp.hash, pixels: px, atMs });
        added = true;
      }
      return added;
    },
    encodeSprites(ctx, buffer, hashes, prevHashes, prevSpanned, rowCache, staged, stagePool, svgCache, full, force, renderAt) {
      const W = buffer.width;
      const H = buffer.height;
      const nextSpanned = new Uint8Array(H);
      const handled = new Uint8Array(H);
      const hasStaged = staged.size > 0;
      let dirty = 0;
      let maxVisualFrames = 1;
      const rowPitch = ctx._profile.rowHeight;
      const cellW = ctx._getCellAdvance();
      const padY = ctx._profile.inline ? 0 : ctx.typography.rowPaddingY;

      for (const sp of buffer._sprites) {
        const bandBg = spriteBand(ctx.styleOptions, buffer, sp);
        if (bandBg === undefined) {
          buffer._materializeSpritesInRect(sp.x, sp.y, sp.x + sp.width, sp.y + sp.height, false, false);
          continue;
        }
        let spriteDirty = full || hasStaged || force;
        if (!spriteDirty) {
          for (let y = sp.y; y < sp.y + sp.height; y++) {
            if (hashes[y] !== prevHashes[y]) {
              spriteDirty = true;
              break;
            }
          }
        }
        const boxX = sp.x * cellW;
        const boxW = sp.width * cellW;
        const boxH = sp.height * rowPitch;
        let drawW = boxW;
        let drawH = boxH;
        if (sp.fit === "contain") {
          const aspect = (sp.sourceWidth * sp.pixelAspect) / sp.sourceHeight;
          if (boxW / boxH > aspect) drawW = Math.max(1, boxH * aspect);
          else drawH = Math.max(1, boxW / aspect);
        }

        if (bandBg !== null) {
          nextSpanned[sp.y] = 2;
          for (let y = sp.y + 1; y < sp.y + sp.height; y++) nextSpanned[y] = 1;
          if (!spriteDirty && prevSpanned[sp.y] === 2) {
            let spanMatch = true;
            for (let y = sp.y + 1; y < sp.y + sp.height; y++) {
              if (prevSpanned[y] !== 1) {
                spanMatch = false;
                break;
              }
            }
            if (spanMatch) {
              for (let y = sp.y; y < sp.y + sp.height; y++) handled[y] = 1;
              continue;
            }
          }

          const { url, visualFrames } = buildSpriteSvgUrl(sp, drawW, drawH, renderAt, staged, stagePool, svgCache);
          if (visualFrames > maxVisualFrames) maxVisualFrames = visualFrames;
          const posY = padY + (boxH - drawH) * 0.5;
          const seal = !ctx._profile.inline && sealsBefore(bandBg, undefined);
          const centeredX = Math.abs(sp.x + sp.width * 0.5 - W * 0.5) < 0.01;
          // The seal's 1px of padding widens the box that `center` is measured in.
          const posXStr = centeredX ? (seal ? "calc(50% - 0.5px)" : "center") : `${(boxX + (boxW - drawW) * 0.5).toFixed(1)}px`;
          let css = spriteTypoCss(ctx, boxH + 2 * padY);
          if ((bandBg & 255) !== 0) css += `background-color:${colorToCss(bandBg)};`;
          if (seal) css += SEAL_CSS;
          if (url) {
            css += `background-image:url("${url}");background-repeat:no-repeat;background-size:${Math.round(drawW)}px ${Math.round(drawH)}px;background-position:${posXStr} ${posY.toFixed(1)}px;`;
          }
          rowCache[sp.y] = [
            {
              styleId: ctx._nextFitId(),
              styleKey: 0n,
              css,
              text: " ".repeat(W),
              bg: bandBg,
              blank: false,
              link: false,
              deco: true,
              cells: W,
            },
          ];
          for (let y = sp.y; y < sp.y + sp.height; y++) {
            if (full || hashes[y] !== prevHashes[y] || prevSpanned[y] !== nextSpanned[y]) dirty++;
            prevHashes[y] = hashes[y] as number;
            handled[y] = 1;
          }
        } else {
          for (let y = sp.y; y < sp.y + sp.height; y++) nextSpanned[y] = 2;
          if (!spriteDirty) {
            let slicedMatch = true;
            for (let y = sp.y; y < sp.y + sp.height; y++) {
              if (prevSpanned[y] !== 2) {
                slicedMatch = false;
                break;
              }
            }
            if (slicedMatch) {
              for (let y = sp.y; y < sp.y + sp.height; y++) handled[y] = 1;
              continue;
            }
          }
          const { url, visualFrames } = buildSpriteSvgUrl(sp, drawW, drawH, renderAt, staged, stagePool, svgCache);
          if (visualFrames > maxVisualFrames) maxVisualFrames = visualFrames;
          const relX = (boxW - drawW) * 0.5;
          const baseRelY = padY + (boxH - drawH) * 0.5;
          const rowTypo = spriteTypoCss(ctx, rowPitch + 2 * padY);
          const sliceBg = sp.underBg;
          const dw = Math.round(drawW);
          const dh = Math.round(drawH);
          const sliceW = sp.fit === "fill" ? "100%" : `${dw}px`;

          const rx0 = sp.x + sp.width;
          for (let y = sp.y; y < sp.y + sp.height; y++) {
            // The text either side is compiled on its own, so tell it what it meets to seal like one row.
            const out = sp.x > 0 ? ctx.compileRow(rowSlice(buffer, y, 0, sp.x), 0, sliceBg) : [];
            const right = rx0 < W ? ctx.compileRow(rowSlice(buffer, y, rx0, W), 0) : [];
            let css = rowTypo;
            if ((sliceBg & 255) !== 0) css += `background-color:${colorToCss(sliceBg)};`;
            const seal = !ctx._profile.inline && sealsBefore(sliceBg, right[0]?.bg);
            if (seal) css += SEAL_CSS;
            if (url) {
              const size = seal && sliceW === "100%" ? "calc(100% - 1px)" : sliceW;
              css += `background-image:url("${url}");background-repeat:no-repeat;background-size:${size} ${dh}px;background-position:${relX.toFixed(1)}px ${(baseRelY - (y - sp.y) * rowPitch).toFixed(1)}px;`;
            }
            out.push({
              styleId: ctx._nextFitId(),
              styleKey: 0n,
              css,
              text: " ".repeat(sp.width),
              bg: sliceBg,
              blank: false,
              link: false,
              deco: true,
              cells: sp.width,
            });
            out.push(...right);
            rowCache[y] = out;
            if (full || hashes[y] !== prevHashes[y] || prevSpanned[y] !== 2) dirty++;
            prevHashes[y] = hashes[y] as number;
            handled[y] = 1;
          }
        }
      }

      // Discard any unconsumed staging entries left over from sprites that moved, resized, or unmounted.
      if (staged.size > 0) {
        for (const list of staged.values()) {
          for (const f of list) releasePool(stagePool, f.pixels);
        }
        staged.clear();
      }

      for (let y = 0; y < H; y++) {
        if (handled[y] === 1) continue;
        const h = hashes[y] as number;
        if (full || prevSpanned[y] !== 0 || h !== prevHashes[y]) {
          dirty++;
          prevHashes[y] = h;
          rowCache[y] = ctx.compileRow(buffer, y);
        }
      }
      return { nextSpanned, dirty, maxVisualFrames };
    },
  };
  return codecInstance;
}

/** Whether the freshly painted cells under `(x, y, w, h)` are blank and share one background. */
function blankUniformUnder(buf: CellBuffer, x: number, y: number, w: number, h: number): boolean {
  const x0 = Math.max(x, buf._clipX0);
  const x1 = Math.min(x + w, buf._clipX1);
  const y0 = Math.max(y, buf._clipY0);
  const y1 = Math.min(y + h, buf._clipY1);
  const W = buf.width;
  const bg = x0 < x1 && y0 < y1 ? buf._bg[y0 * W + x0] : 0;
  for (let yy = y0; yy < y1; yy++) {
    for (let i = yy * W + x0, end = yy * W + x1; i < end; i++) {
      if (buf._bg[i] !== bg || buf._chars[i] !== CHAR_SPACE) return false;
    }
  }
  return true;
}

function registerSprite(
  buf: CellBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  srcWidth: number,
  srcHeight: number,
  srcData: Uint32Array,
  fit: "contain" | "fill",
  pixelAspect: number,
  palette: readonly PackedColor[] | undefined,
  sample: "nearest" | "average",
  encoding: PixelEncoding,
  fallback: DrawPixelsOptions["fallback"],
): boolean {
  if (!buf.intersectsScissor(x, y, w, h)) return false;
  if (x < buf._sClipX0 || y < buf._sClipY0 || x + w > buf._sClipX1 || y + h > buf._sClipY1) return false;
  const cx = Math.max(x, buf._clipX0);
  const cy = Math.max(y, buf._clipY0);
  let underBg = (buf._bg[cy * buf.width + cx] as number) >>> 0;
  let inheritedDirty = x < buf._clipX0 || y < buf._clipY0 || x + w > buf._clipX1 || y + h > buf._clipY1;
  if (buf._sprites.length > 0) {
    for (const old of buf._sprites) {
      if (cx >= old.x && cx < old.x + old.width && cy >= old.y && cy < old.y + old.height && old.cellsDirty) {
        underBg = old.underBg;
        inheritedDirty = true;
        break;
      }
    }
    buf._materializeSpritesInRect(x, y, x + w, y + h, true, true);
  }
  const len = srcWidth * srcHeight;
  const pixels = acquirePool(spritePixelPool, len);
  let opaque = true;
  let solid = true;
  let hash = (0x811c9dc5 ^ x ^ (y << 8) ^ (w << 16) ^ (h << 24) ^ srcWidth ^ (srcHeight << 16)) >>> 0;
  hash = Math.imul(hash ^ (fit === "fill" ? 1 : 2), 0x01000193);
  hash = Math.imul(hash ^ (sample === "average" ? 1 : 2), 0x01000193);
  hash = Math.imul(hash ^ (encoding === "rgba" ? 1 : 2), 0x01000193);
  hash = Math.imul(hash ^ Math.round(pixelAspect * 4096), 0x01000193);
  hash = Math.imul(hash ^ underBg, 0x01000193);
  if (palette !== undefined) {
    hash = Math.imul(hash ^ (palette.length + 1), 0x01000193);
    for (let i = 0; i < palette.length; i++) {
      hash = Math.imul(hash ^ ((palette[i] as number) >>> 0), 0x01000193);
    }
  }
  for (let i = 0; i < len; i++) {
    const px = srcData[i] as number;
    pixels[i] = px;
    if ((px & 255) < 255) {
      solid = false;
      if ((px & 255) < 128) opaque = false;
    }
    hash = Math.imul(hash ^ px, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  // Where the sprite shows what's under it (transparent pixels, letterboxing) it can only show one
  // background color, so text or mixed backgrounds under it need the cells.
  if ((!solid || fit === "contain") && !blankUniformUnder(buf, x, y, w, h)) {
    releasePool(spritePixelPool, pixels);
    return false;
  }

  buf._sprites.push({
    x,
    y,
    width: w,
    height: h,
    sourceWidth: srcWidth,
    sourceHeight: srcHeight,
    pixels,
    fit,
    pixelAspect,
    palette,
    sample,
    hash,
    batchable: opaque && encoding === "indexed",
    encoding,
    fallback,
    underBg,
    materialized: false,
    cellsDirty: inheritedDirty,
    codec: getSpriteCodec(),
  });
  buf.markRowsDirty(y, y + h);
  return true;
}

/**
 * Blit a pixel framebuffer into `buf` at `(x, y, width, height)`.
 * Consoles that support data-URI background sprites (Chromium, and Firefox per its console's
 * style rules (not benchmarked)) render the full-resolution pixels in a single span; Safari, ANSI
 * terminals, plain-text exports and overlapped overlays automatically materialize `▀` half-blocks.
 */
export function drawPixels(buf: CellBuffer, options: DrawPixelsOptions): void {
  const x = Math.floor(options.x);
  const y = Math.floor(options.y);
  const w = Math.floor(options.width);
  const h = Math.floor(options.height);
  const src = options.source;
  if (w <= 0 || h <= 0 || src.width <= 0 || src.height <= 0) return;
  const fit = options.fit ?? "contain";
  const pixelAspect = options.pixelAspect ?? 1;
  const sample = options.sample ?? "nearest";
  const mode = options.renderMode ?? "auto";
  const encoding = options.encoding ?? "indexed";
  const fallback = options.fallback;
  if (
    mode === "halfblock" ||
    !registerSprite(buf, x, y, w, h, src.width, src.height, src.data, fit, pixelAspect, options.palette, sample, encoding, fallback)
  ) {
    if (fallback) fallback(buf, { x, y, width: w, height: h });
    else paintHalfBlocks(buf, { x, y, width: w, height: h }, src, fit, pixelAspect, options.palette, sample);
  }
}
