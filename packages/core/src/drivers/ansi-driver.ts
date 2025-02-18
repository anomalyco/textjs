import { blendOver, type PackedColor } from "../color";
import {
  ATTR_BOLD,
  ATTR_DIM,
  ATTR_INVERSE,
  ATTR_ITALIC,
  ATTR_STRIKETHROUGH,
  ATTR_UNDERLINE,
  ATTR_WIDE_CONT,
  type CellBuffer,
} from "../cell-buffer";

export interface AnsiRenderOptions {
  /** Separator between rows (default `"\n"`). */
  lineSeparator?: string;
  /** Background that translucent colors are flattened against (default zinc-950). */
  assumedBg?: PackedColor;
  /** Prefix with cursor-home (`ESC[H`) so frames overwrite each other in a terminal. */
  cursorHome?: boolean;
  /** Strip trailing default-styled spaces from each row. */
  trimEnd?: boolean;
}

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
export function renderToAnsi(buffer: CellBuffer, options: AnsiRenderOptions = {}): string {
  const sep = options.lineSeparator ?? "\n";
  const assumedBg = options.assumedBg ?? 0x09090bff;
  const W = buffer.width;
  const rows: string[] = [];
  const styleMask = ATTR_BOLD | ATTR_DIM | ATTR_ITALIC | ATTR_UNDERLINE | ATTR_INVERSE | ATTR_STRIKETHROUGH;
  for (let y = 0; y < buffer.height; y++) {
    let line = "";
    let pf = -1;
    let pb = -1;
    let pa = -1;
    let lastStyled = 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = buffer.attrs[i] as number;
      if (a & ATTR_WIDE_CONT) continue;
      const f = buffer.fg[i] as number;
      const b = buffer.bg[i] as number;
      const sa = a & styleMask;
      if (f !== pf || b !== pb || sa !== pa) {
        line += sgr(f, b, sa, assumedBg);
        pf = f;
        pb = b;
        pa = sa;
      }
      const ch = buffer.cellText(i);
      line += ch;
      if (ch !== " " || (b & 255) !== 0 || sa !== 0) lastStyled = line.length;
    }
    if (options.trimEnd) line = line.slice(0, lastStyled);
    rows.push(`${line}${ESC}0m`);
  }
  return (options.cursorHome ? `${ESC}H` : "") + rows.join(sep);
}

/** Stateful ANSI driver that writes only when the frame changed. */
export class AnsiDriver {
  private last = "";
  constructor(
    private readonly write: (chunk: string) => void,
    private readonly options: AnsiRenderOptions = { cursorHome: true },
  ) {}

  render(buffer: CellBuffer, force = false): boolean {
    const out = renderToAnsi(buffer, this.options);
    if (!force && out === this.last) return false;
    this.last = out;
    this.write(out);
    return true;
  }
}
