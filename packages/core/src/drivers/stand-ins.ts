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

const PAIRED = new Map<string, string>();
for (let i = 0; i < PAIRS.length; i += 2) PAIRED.set(PAIRS[i] as string, PAIRS[i + 1] as string);

/** Every glyph that can get a stand-in: the paired glyphs and braille (U+2800–28FF). */
const CANDIDATES = new RegExp(`[${[...PAIRED.keys()].join("")}\\u2800-\\u28ff]`, "g");

/** The block every candidate lies in (U+2581–28FF), so text outside it needs no lookup. */
export const CANDIDATE_RANGE = /[\u2581-\u28ff]/;

/** Braille by its 2×2 quadrants of dots: a quadrant is filled when either of its dots is. */
function brailleBlock(glyph: string): string {
  const bits = glyph.charCodeAt(0) - 0x2800;
  const ul = bits & 0x03 ? 1 : 0;
  const ur = bits & 0x18 ? 1 : 0;
  const ll = bits & 0x44 ? 1 : 0;
  const lr = bits & 0xa0 ? 1 : 0;
  const n = ul + ur + ll + lr;
  return n === 0 ? " " : n > 2 ? "█" : n === 1 ? (ul || ur ? "▀" : "▄") : ul && ur ? "▀" : ll && lr ? "▄" : ul && ll ? "▌" : ur && lr ? "▐" : "▒";
}

/** Redraws glyphs the console font can't fit in a cell with their stand-ins. */
export interface StandInResolver {
  /** `text` with every misfitting glyph replaced by its stand-in. */
  apply(text: string): string;
}

/**
 * Finds, glyph by glyph as they first appear, which ones the console font
 * draws wider or narrower than a cell (a fallback font: Consolas, the usual
 * Windows 10 console font, has no eighth blocks, quadrants, braille, ▶ or ✓)
 * and redraws them with their stand-ins. A stand-in is used only when it fits
 * itself. `load` runs on the first candidate glyph, so text without one never
 * measures anything; `null` (no canvas) leaves every glyph as it is.
 */
export function createStandInResolver(load: () => TextAdvanceMeasurer | null): StandInResolver {
  let measure: TextAdvanceMeasurer | null | undefined;
  let cell = 0;
  const verdict = new Map<string, boolean>();
  const fits = (glyph: string): boolean => {
    let ok = verdict.get(glyph);
    if (ok === undefined) {
      const w = (measure as TextAdvanceMeasurer)(glyph, false, false);
      verdict.set(glyph, (ok = Number.isFinite(w) && Math.abs(w - cell) <= cell * MISS));
    }
    return ok;
  };
  const resolved = new Map<string, string>();
  const resolve = (glyph: string): string => {
    let out = resolved.get(glyph);
    if (out !== undefined) return out;
    if (measure === undefined) {
      measure = load();
      if (measure !== null) cell = measure("M".repeat(32), false, false) / 32;
    }
    out = glyph;
    if (measure !== null && cell > 0) {
      const braille = glyph >= "\u2800";
      // Fonts cover the braille block all or none, so one glyph speaks for it.
      const fallback = braille ? (fits("⣿") ? glyph : brailleBlock(glyph)) : fits(glyph) ? glyph : (PAIRED.get(glyph) as string);
      if (fallback !== glyph && fits(fallback)) out = fallback;
    }
    resolved.set(glyph, out);
    return out;
  };
  return { apply: (text) => text.replace(CANDIDATES, resolve) };
}
