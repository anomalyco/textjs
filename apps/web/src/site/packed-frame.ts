import type { StyledFrame, StyledSpan } from "@textjs/core";

/**
 * A styled frame stored as JSON for a page to mirror without booting a console. Rows are packed as
 * [text, fg palette index, bg palette index, flags?, width?], with flags bold 1, italic 2, underline 4
 * and strikethrough 8, -1 for no color, and width only when it differs from the text's length.
 */
export type PackedSpan = [string, number, number, number?, number?];

export interface PackedFrame {
  palette: string[];
  width: number;
  height: number;
  rows: PackedSpan[][];
}

/** What a page mirror draws: colors, the four flags and widths. Raw buffer colors are dropped. */
export function packStyledFrame(frame: StyledFrame): PackedFrame {
  const palette: string[] = [];
  const index = (css: string | null): number => {
    if (css === null) return -1;
    const i = palette.indexOf(css);
    return i >= 0 ? i : palette.push(css) - 1;
  };
  const rows = frame.rows.map((row) =>
    row.map((s): PackedSpan => {
      const flags = (s.bold ? 1 : 0) | (s.italic ? 2 : 0) | (s.underline ? 4 : 0) | (s.strikethrough ? 8 : 0);
      const span: PackedSpan = [s.text, index(s.fgCss), index(s.bgCss)];
      if (s.width !== s.text.length) span.push(flags, s.width);
      else if (flags !== 0) span.push(flags);
      return span;
    }),
  );
  return { palette, width: frame.width, height: frame.height, rows };
}

export function unpackStyledFrame(packed: PackedFrame): StyledFrame {
  const color = (i: number): string | null => (i < 0 ? null : (packed.palette[i] ?? null));
  return {
    width: packed.width,
    height: packed.height,
    rows: packed.rows.map((row) =>
      row.map(
        ([text, fg, bg, flags = 0, width = text.length]): StyledSpan => ({
          text,
          width,
          fg: 0,
          bg: 0,
          attrs: 0,
          fgCss: color(fg),
          bgCss: color(bg),
          bold: (flags & 1) !== 0,
          dim: false,
          italic: (flags & 2) !== 0,
          underline: (flags & 4) !== 0,
          strikethrough: (flags & 8) !== 0,
          inverse: false,
          allowLink: false,
        }),
      ),
    ),
  };
}
