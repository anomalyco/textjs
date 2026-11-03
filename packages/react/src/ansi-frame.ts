import { ANSI_BIDI_EXPLICIT, ANSI_BIDI_IMPLICIT, parseColor, renderToAnsi, type CellBuffer } from "@textjs/core";
import { resolveTheme, type TextTheme, type ThemeName } from "./theme";

/**
 * One frame as a self-contained truecolor ANSI document for a terminal that
 * prints it once (`curl`, `cat`): full-width rows that each end in a reset,
 * translucent colors flattened against the theme background, the terminal's
 * bidi mode restored if the frame changed it, and a final newline so the
 * prompt starts on its own line. No cursor movement or clearing.
 */
export function frameToAnsi(buffer: CellBuffer, options: { theme?: TextTheme | ThemeName } = {}): string {
  const out = renderToAnsi(buffer, { lineSeparator: "\n", assumedBg: parseColor(resolveTheme(options.theme).bg), bidi: "pin" });
  return out.startsWith(ANSI_BIDI_EXPLICIT) ? `${out}${ANSI_BIDI_IMPLICIT}\n` : `${out}\n`;
}
