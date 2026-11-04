import { blendOver, type PackedColor } from "../color";
import {
  ATTR_BOLD,
  ATTR_DIM,
  ATTR_INVERSE,
  ATTR_ITALIC,
  ATTR_STRIKETHROUGH,
  ATTR_UNDERLINE,
  ATTR_WIDE_CONT,
  GRAPHEME_POOL_FLAG,
  type CellGrid,
} from "../cell-grid";
import { LTR_OVERRIDE, POP_DIRECTIONAL_FORMATTING } from "../bidi";
import { hasRtl, isRtlCodePoint } from "../rtl";

export interface AnsiRenderOptions {
  /** Separator between rows (default `"\n"`). */
  lineSeparator?: string;
  /** Background that translucent colors are flattened against (default zinc-950). */
  assumedBg?: PackedColor;
  /** Prefix with cursor-home (`ESC[H`) so frames overwrite each other in a terminal. */
  cursorHome?: boolean;
  /** Strip trailing default-styled spaces from each row. */
  trimEnd?: boolean;
  /**
   * Keep terminals from reordering right-to-left text a second time (default
   * `"pin"`). Cells are already in visual order, so a frame containing RTL
   * characters switches terminals that implement the ECMA-48 / terminal-wg
   * BiDi proposal (VTE, …) to explicit mode (`CSI 8 l`), and each such row is
   * wrapped in LRO…PDF for terminals that run the Unicode bidi algorithm
   * over the line (Konsole, mlterm, macOS Terminal). `"none"` emits cells as-is.
   */
  bidi?: "pin" | "none";
  /**
   * Prefix frames that contain RTL text with `CSI 8 l` (default `true`).
   * Long-lived writers turn this off and switch the mode once instead: on
   * entry, then back with `ANSI_BIDI_IMPLICIT` on exit.
   */
  bidiMode?: boolean;
}

/** BDSM reset: the application presents text in display order (explicit mode). */
export const ANSI_BIDI_EXPLICIT = "\u001b[8l";
/** BDSM set: the terminal's default implicit bidi mode, restored on exit. */
export const ANSI_BIDI_IMPLICIT = "\u001b[8h";

const ESC = "\u001b[";

function flatten(c: PackedColor, assumedBg: PackedColor): PackedColor {
  const a = c & 255;
  return a === 255 || a === 0 ? c : blendOver(c, assumedBg);
}

function sgr(fg: PackedColor, bg: PackedColor, attrs: number, assumedBg: PackedColor): string {
  let s = `${ESC}0`;
  if (attrs & ATTR_BOLD) s += ";1";
  if (attrs & ATTR_DIM) s += ";2";
  if (attrs & ATTR_ITALIC) s += ";3";
  if (attrs & ATTR_UNDERLINE) s += ";4";
  if (attrs & ATTR_INVERSE) s += ";7";
  if (attrs & ATTR_STRIKETHROUGH) s += ";9";
  if ((fg & 255) !== 0) {
    const f = flatten(fg, assumedBg);
    s += `;38;2;${(f >>> 24) & 255};${(f >>> 16) & 255};${(f >>> 8) & 255}`;
  }
  if ((bg & 255) !== 0) {
    const b = flatten(bg, assumedBg);
    s += `;48;2;${(b >>> 24) & 255};${(b >>> 16) & 255};${(b >>> 8) & 255}`;
  }
  return `${s}m`;
}

/** Render a buffer to a truecolor ANSI string. */
export function renderToAnsi(buffer: CellGrid, options: AnsiRenderOptions = {}): string {
  const cells = buffer.readCells();
  const sep = options.lineSeparator ?? "\n";
  const assumedBg = options.assumedBg ?? 0x09090bff;
  const W = buffer.width;
  const rows: string[] = [];
  const styleMask = ATTR_BOLD | ATTR_DIM | ATTR_ITALIC | ATTR_UNDERLINE | ATTR_INVERSE | ATTR_STRIKETHROUGH;
  const pin = (options.bidi ?? "pin") === "pin";
  let anyRtl = false;
  for (let y = 0; y < buffer.height; y++) {
    let line = "";
    let rtl = false;
    let pf = -1;
    let pb = -1;
    let pa = -1;
    let lastStyled = 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = cells.attrs[i] as number;
      if (a & ATTR_WIDE_CONT) continue;
      const f = cells.fg[i] as number;
      const b = cells.bg[i] as number;
      const sa = a & styleMask;
      if (f !== pf || b !== pb || sa !== pa) {
        line += sgr(f, b, sa, assumedBg);
        pf = f;
        pb = b;
        pa = sa;
      }
      const ch = buffer.cellText(i);
      if (pin && !rtl) {
        const c = cells.chars[i] as number;
        // A pooled cluster can carry RTL after a low first code point (a mark or a Prepend character).
        if (c >= GRAPHEME_POOL_FLAG ? hasRtl(ch) : c >= 0x0590 && isRtlCodePoint(c)) rtl = true;
      }
      line += ch;
      if (ch !== " " || (b & 255) !== 0 || sa !== 0) lastStyled = line.length;
    }
    if (options.trimEnd) line = line.slice(0, lastStyled);
    if (rtl) {
      anyRtl = true;
      line = LTR_OVERRIDE + line + POP_DIRECTIONAL_FORMATTING;
    }
    rows.push(`${line}${ESC}0m`);
  }
  return (options.cursorHome ? `${ESC}H` : "") + (anyRtl && (options.bidiMode ?? true) ? ANSI_BIDI_EXPLICIT : "") + rows.join(sep);
}

/** Stateful ANSI driver that writes only when the frame changed. */
export class AnsiDriver {
  private last = "";
  constructor(
    private readonly write: (chunk: string) => void,
    private readonly options: AnsiRenderOptions = { cursorHome: true },
  ) {}

  render(buffer: CellGrid, force = false): boolean {
    const out = renderToAnsi(buffer, this.options);
    if (!force && out === this.last) return false;
    this.last = out;
    this.write(out);
    return true;
  }
}
