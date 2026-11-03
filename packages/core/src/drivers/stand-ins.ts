import type { TextAdvanceMeasurer } from "./css-console-driver";

/**
 * A glyph whose advance misses the cell by more than this fraction is redrawn
 * with its stand-in. macOS draws braille in a fallback 14% wider than Menlo's
 * cell, which only nudges a row by a pixel per glyph; Windows 10's fallbacks
 * for Consolas reach almost two cells.
 */
const MISS = 0.2;

/**
 * Glyph/stand-in pairs, each stand-in in WGL4 (every Windows console font has
 * it): lower eighths ▁▂▃▅▆▇ and left eighths ▉▊▋▍▎▏ to the nearest of _ ▄ ▌ █
 * or blank, quadrants to the nearest half block, then arrows, checks and crosses.
 */
const PAIRS = "▁_▂_▃▄▅▄▆█▇█▉█▊█▋▌▍▌▎▌▏ ▔▀▕▐▖▄▗▄▘▀▙█▚▒▛█▜█▝▀▞▒▟█▶►▸►◀◄◂◄▾▼▴▲▽▼△▲◆♦◇◊✓√✔√✕×✖×✗×✘×";

function standIns(braille: boolean): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < PAIRS.length; i += 2) map.set(PAIRS[i] as string, PAIRS[i + 1] as string);
  if (!braille) return map;
  // Braille (U+2800–28FF) by its 2×2 quadrants of dots: a quadrant is filled when either of its dots is.
  for (let bits = 0; bits < 256; bits++) {
    const ul = bits & 0x03 ? 1 : 0;
    const ur = bits & 0x18 ? 1 : 0;
    const ll = bits & 0x44 ? 1 : 0;
    const lr = bits & 0xa0 ? 1 : 0;
    const n = ul + ur + ll + lr;
    const block =
      n === 0 ? " " : n > 2 ? "█" : n === 1 ? (ul || ur ? "▀" : "▄") : ul && ur ? "▀" : ll && lr ? "▄" : ul && ll ? "▌" : ur && lr ? "▐" : "▒";
    map.set(String.fromCharCode(0x2800 + bits), block);
  }
  return map;
}

export interface GlyphStandIns {
  /** Glyphs replaced in this console font, as one character class. */
  pattern: RegExp;
  /** The stand-in for one matched glyph, bound once for `String.replace`. */
  replace: (glyph: string) => string;
}

/**
 * Measures, once, which glyphs the console font draws wider or narrower than
 * a cell (a fallback font: Consolas, the usual Windows 10 console font, has no
 * eighth blocks, quadrants, braille, ▶ or ✓) and returns their stand-ins, or
 * `null` when every glyph fits. A stand-in is used only when it fits itself.
 */
export function measureStandIns(measure: TextAdvanceMeasurer, cell: number): GlyphStandIns | null {
  const fits = (glyph: string): boolean => {
    const w = measure(glyph, false, false);
    return Number.isFinite(w) && Math.abs(w - cell) <= cell * MISS;
  };
  // Fonts cover the braille block all or none, so one glyph speaks for it.
  const brailleFits = fits("⣿");
  const verdict = new Map<string, boolean>();
  const fitsOnce = (glyph: string): boolean => {
    let ok = verdict.get(glyph);
    if (ok === undefined) verdict.set(glyph, (ok = fits(glyph)));
    return ok;
  };
  const used = new Map<string, string>();
  for (const [glyph, standIn] of standIns(!brailleFits)) {
    const braille = glyph >= "\u2800" && glyph <= "\u28ff";
    if ((!braille && fitsOnce(glyph)) || !fitsOnce(standIn)) continue;
    used.set(glyph, standIn);
  }
  if (used.size === 0) return null;
  const chars = [...used.keys()].join("");
  return { pattern: new RegExp(`[${chars}]`, "g"), replace: (g) => used.get(g) ?? g };
}

/** `text` with every misfitting glyph replaced by its stand-in. */
export function applyStandIns(text: string, s: GlyphStandIns): string {
  return text.replace(s.pattern, s.replace);
}
