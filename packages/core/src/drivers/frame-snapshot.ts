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

/** Extract a serializable styled snapshot of a buffer for DOM mirrors and docs playgrounds. */
export function extractStyledFrame(buffer: CellBuffer, style: Partial<StyleResolveOptions> = {}): StyledFrame {
  const opts: StyleResolveOptions = { ...DEFAULT_STYLE_RESOLVE, ...style };
  const scratch: EffectiveStyle = { fg: 0, bg: 0, flags: 0 };
  const W = buffer.width;
  const rows: StyledSpan[][] = [];
  for (let y = 0; y < buffer.height; y++) {
    const spans: StyledSpan[] = [];
    let cur: StyledSpan | null = null;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
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
      cur.text += buffer.cellText(i);
      cur.width++;
    }
    rows.push(spans);
  }
  return { width: W, height: buffer.height, rows };
}
