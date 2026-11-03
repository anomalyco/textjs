import {
  ATTR_ALLOW_LINK,
  ATTR_INVERSE,
  ATTR_STRIKETHROUGH,
  ATTR_UNDERLINE,
  ATTR_WIDE_CONT,
  CHAR_SPACE,
  CellBuffer,
} from "./cell-buffer";
import { blendOver, colorToCss, type PackedColor } from "./color";
import { encodeIndexedPng, encodeSpriteSvgDataUrl, hasTransparentPixels, type SpriteKeyframe } from "./drivers/png";
import { DEFAULT_TYPOGRAPHY } from "./drivers/style";
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
  /** `"auto"` (default: crisp sprite in Chromium/Firefox consoles, half-blocks elsewhere) or `"halfblock"`. */
  renderMode?: PixelRenderMode;
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

function resolveCleanBandBg(ctx: SpriteDriverContext, buffer: CellBuffer, sp: BufferSprite): number | null {
  for (const other of buffer._sprites) {
    if (other !== sp && other.y < sp.y + sp.height && other.y + other.height > sp.y) return null;
  }
  const W = buffer.width;
  const C = buffer._chars;
  const F = buffer._fg;
  const B = buffer._bg;
  const A = buffer._attrs;
  const opts = ctx.styleOptions;
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

function spriteTypoCss(ctx: SpriteDriverContext, lineHeightPx: number): string {
  const t = ctx.typography;
  if (ctx.inline) {
    let css = `display:inline-block;font-family:${t.fontFamily};font-size:${t.fontSize}px;line-height:${lineHeightPx}px;text-wrap-mode:nowrap;`;
    if (t.fontFamily !== ctx.defaultInlineFamily) css += "font-variant-ligatures:none;";
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

  const cached = svgCache.get(slotKey);
  if (cached !== undefined && cached.hash === sp.hash && cached.drawW === dw && cached.drawH === dh) {
    return { url: cached.url, visualFrames: 1 };
  }
  const png = encodeIndexedPng(sp.pixels, sp.sourceWidth, sp.sourceHeight, { palette: sp.palette });
  const url = png ? encodeSpriteSvgDataUrl([{ png, delayMs: 0 }], sp.sourceWidth, sp.sourceHeight, dw, dh) : "";
  if (svgCache.size >= 16) svgCache.clear();
  svgCache.set(slotKey, { hash: sp.hash, drawW: dw, drawH: dh, url });
  return { url, visualFrames: 1 };
}

let codecInstance: SpriteCodec | null = null;

function getSpriteCodec(): SpriteCodec {
  if (codecInstance !== null) return codecInstance;
  codecInstance = {
    materialize(buf: CellBuffer, sp: BufferSprite): void {
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
      const png = encodeIndexedPng(sp.pixels, sp.sourceWidth, sp.sourceHeight, { palette: sp.palette });
      return png ? `data:image/png;base64,${png.base64}` : "";
    },
    stageKeyframe(staged, pool, buffer, atMs): boolean {
      let added = false;
      for (const sp of buffer._sprites) {
        if (hasTransparentPixels(sp.pixels, sp.sourceWidth * sp.sourceHeight)) continue;
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
      const rowPitch = ctx.rowHeight;
      const cellW = ctx.getCellAdvance();
      const padY = ctx.inline ? 0 : ctx.typography.rowPaddingY;

      for (const sp of buffer._sprites) {
        let spriteDirty = full || hasStaged || force;
        if (!spriteDirty) {
          for (let y = sp.y; y < sp.y + sp.height; y++) {
            if (hashes[y] !== prevHashes[y]) {
              spriteDirty = true;
              break;
            }
          }
        }
        const bandBg = resolveCleanBandBg(ctx, buffer, sp);
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
          for (let y = sp.y + 1; y < sp.y + sp.height; y++) nextSpanned[y] = 1;
          if (!spriteDirty && prevSpanned[sp.y] === 0) {
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
          const centeredX = Math.abs(sp.x + sp.width * 0.5 - W * 0.5) < 0.01;
          const posXStr = centeredX ? "center" : `${(boxX + (boxW - drawW) * 0.5).toFixed(1)}px`;
          let css = spriteTypoCss(ctx, boxH + 2 * padY);
          if ((bandBg & 255) !== 0) css += `background-color:${colorToCss(bandBg)};`;
          if (url) {
            css += `background-image:url("${url}");background-repeat:no-repeat;background-size:${Math.round(drawW)}px ${Math.round(drawH)}px;background-position:${posXStr} ${posY.toFixed(1)}px;`;
          }
          rowCache[sp.y] = [
            {
              styleId: ctx.nextUniqueStyleId(),
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
          if (!spriteDirty) {
            let unspanned = true;
            for (let y = sp.y; y < sp.y + sp.height; y++) {
              if (prevSpanned[y] !== 0) {
                unspanned = false;
                break;
              }
            }
            if (unspanned) {
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

          for (let y = sp.y; y < sp.y + sp.height; y++) {
            const out = [];
            if (sp.x > 0) {
              const leftBuf = new CellBuffer(sp.x, 1);
              const srcOff = y * W;
              leftBuf._chars.set(buffer._chars.subarray(srcOff, srcOff + sp.x));
              leftBuf._fg.set(buffer._fg.subarray(srcOff, srcOff + sp.x));
              leftBuf._bg.set(buffer._bg.subarray(srcOff, srcOff + sp.x));
              leftBuf._attrs.set(buffer._attrs.subarray(srcOff, srcOff + sp.x));
              leftBuf.graphemePool = buffer.graphemePool;
              out.push(...ctx.compileRow(leftBuf, 0));
            }
            let css = rowTypo;
            if ((sliceBg & 255) !== 0) css += `background-color:${colorToCss(sliceBg)};`;
            if (url) {
              css += `background-image:url("${url}");background-repeat:no-repeat;background-size:${dw}px ${dh}px;background-position:${relX.toFixed(1)}px ${(baseRelY - (y - sp.y) * rowPitch).toFixed(1)}px;`;
            }
            out.push({
              styleId: ctx.nextUniqueStyleId(),
              styleKey: 0n,
              css,
              text: " ".repeat(sp.width),
              bg: sliceBg,
              blank: false,
              link: false,
              deco: true,
              cells: sp.width,
            });
            const rx0 = sp.x + sp.width;
            if (rx0 < W) {
              const rw = W - rx0;
              const rightBuf = new CellBuffer(rw, 1);
              const srcOff = y * W + rx0;
              rightBuf._chars.set(buffer._chars.subarray(srcOff, srcOff + rw));
              rightBuf._fg.set(buffer._fg.subarray(srcOff, srcOff + rw));
              rightBuf._bg.set(buffer._bg.subarray(srcOff, srcOff + rw));
              rightBuf._attrs.set(buffer._attrs.subarray(srcOff, srcOff + rw));
              rightBuf.graphemePool = buffer.graphemePool;
              out.push(...ctx.compileRow(rightBuf, 0));
            }
            rowCache[y] = out;
            if (full || hashes[y] !== prevHashes[y] || prevSpanned[y] !== 0) dirty++;
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

/**
 * Blit a pixel framebuffer into `buf` at `(x, y, width, height)`.
 * Consoles that support data-URI background sprites (Chromium, Firefox) render
 * the full-resolution pixels in a single span; Safari, ANSI terminals, plain-text
 * exports and overlapped overlays automatically materialize `▀` half-blocks.
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
  if (mode === "halfblock" || !buf._putSprite(x, y, w, h, src.width, src.height, src.data, fit, pixelAspect, options.palette, sample, getSpriteCodec())) {
    paintHalfBlocks(buf, { x, y, width: w, height: h }, src, fit, pixelAspect, options.palette, sample);
  }
}
