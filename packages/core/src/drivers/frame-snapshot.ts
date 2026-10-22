import { colorToCss, type PackedColor } from "../color";
import {
  ATTR_ALLOW_LINK,
  ATTR_BOLD,
  ATTR_DIM,
  ATTR_INVERSE,
  ATTR_ITALIC,
  ATTR_STRIKETHROUGH,
  ATTR_STYLE_MASK,
  ATTR_UNDERLINE,
  ATTR_WIDE_CONT,
  type CellBuffer,
} from "../cell-buffer";
import { DEFAULT_STYLE_RESOLVE, resolveStyle, type EffectiveStyle, type StyleResolveOptions } from "./style";

export interface StyledSpan {
  text: string;
  /** Column count occupied by the span. */
  width: number;
  /** Raw packed colors and attribute bits as stored in the buffer. */
  fg: PackedColor;
  bg: PackedColor;
  attrs: number;
  /** Effective CSS colors (inverse and dim resolved), `null` for the theme default. */
  fgCss: string | null;
  bgCss: string | null;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  inverse: boolean;
  allowLink: boolean;
}

export interface StyledFrame {
  width: number;
  height: number;
  rows: StyledSpan[][];
}

const ASCII_STRINGS: readonly string[] = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i));

interface BufferSnapshotCache {
  width: number;
  height: number;
  styleKey: string;
  prevHashes: Uint32Array;
  rows: Array<StyledSpan[] | undefined>;
}

const snapshotCache = new WeakMap<CellBuffer, BufferSnapshotCache>();

/** Extract a serializable styled snapshot of a buffer for DOM mirrors and docs playgrounds. */
export function extractStyledFrame(buffer: CellBuffer, style: Partial<StyleResolveOptions> = {}): StyledFrame {
  const hasCustomStyle =
    style.inverseFg !== undefined ||
    style.inverseBg !== undefined ||
    style.dimFallbackFg !== undefined ||
    style.dimOpacity !== undefined;
  const opts: StyleResolveOptions = hasCustomStyle ? { ...DEFAULT_STYLE_RESOLVE, ...style } : DEFAULT_STYLE_RESOLVE;
  const styleKey = hasCustomStyle ? `${opts.inverseFg}:${opts.inverseBg}:${opts.dimFallbackFg}:${opts.dimOpacity}` : "";
  const W = buffer.width;
  const H = buffer.height;

  let cache = snapshotCache.get(buffer);
  if (cache === undefined || cache.width !== W || cache.height !== H || cache.styleKey !== styleKey) {
    cache = {
      width: W,
      height: H,
      styleKey,
      prevHashes: new Uint32Array(H),
      rows: new Array<StyledSpan[] | undefined>(H),
    };
    snapshotCache.set(buffer, cache);
  }

  const hashes = buffer.getRowHashes();
  const prevHashes = cache.prevHashes;
  const cachedRows = cache.rows;
  const rows = new Array<StyledSpan[]>(H);
  let scratch: EffectiveStyle | null = null;

  for (let y = 0; y < H; y++) {
    const h = hashes[y] as number;
    const existing = cachedRows[y];
    if (existing !== undefined && h === prevHashes[y]) {
      rows[y] = existing;
      continue;
    }
    prevHashes[y] = h;
    if (scratch === null) scratch = { fg: 0, bg: 0, flags: 0 };
    const spans: StyledSpan[] = [];
    let cur: StyledSpan | null = null;
    const rowStart = y * W;
    for (let x = 0; x < W; x++) {
      const i = rowStart + x;
      const raw = buffer.attrs[i] as number;
      const f = buffer.fg[i] as number;
      const b = buffer.bg[i] as number;
      if (raw & ATTR_WIDE_CONT) {
        if (cur) cur.width++;
        continue;
      }
      const a = raw & ATTR_STYLE_MASK;
      if (cur === null || cur.fg !== f || cur.bg !== b || cur.attrs !== a) {
        resolveStyle(f, b, a, opts, scratch);
        cur = {
          text: "",
          width: 0,
          fg: f,
          bg: b,
          attrs: a,
          fgCss: (scratch.fg & 255) === 0 ? null : colorToCss(scratch.fg),
          bgCss: (scratch.bg & 255) === 0 ? null : colorToCss(scratch.bg),
          bold: (a & ATTR_BOLD) !== 0,
          dim: (a & ATTR_DIM) !== 0,
          italic: (a & ATTR_ITALIC) !== 0,
          underline: (a & ATTR_UNDERLINE) !== 0,
          strikethrough: (a & ATTR_STRIKETHROUGH) !== 0,
          inverse: (a & ATTR_INVERSE) !== 0,
          allowLink: (a & ATTR_ALLOW_LINK) !== 0,
        };
        spans.push(cur);
      }
      const c = buffer.chars[i] as number;
      cur.text += c < 128 ? (ASCII_STRINGS[c] as string) : buffer.cellText(i);
      cur.width++;
    }
    cachedRows[y] = spans;
    rows[y] = spans;
  }
  return { width: W, height: H, rows };
}
