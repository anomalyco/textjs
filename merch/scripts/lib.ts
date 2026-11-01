/** Shared geometry for the merch artwork: outlined Geist type, the ▼ mark and the ⌘ ⌥ glyphs. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import opentype from "opentype.js";

const FONTS = join(import.meta.dir, "..", "node_modules", "geist", "dist", "fonts");

function load(file: string): opentype.Font {
  const buf = readFileSync(join(FONTS, file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

export const fonts = {
  mono: load("geist-mono/GeistMono-Regular.ttf"),
  monoMedium: load("geist-mono/GeistMono-Medium.ttf"),
  monoSemiBold: load("geist-mono/GeistMono-SemiBold.ttf"),
  monoBold: load("geist-mono/GeistMono-Bold.ttf"),
  sans: load("geist-sans/Geist-Regular.ttf"),
  sansMedium: load("geist-sans/Geist-Medium.ttf"),
  sansSemiBold: load("geist-sans/Geist-SemiBold.ttf"),
  sansBold: load("geist-sans/Geist-Bold.ttf"),
};

/** Geist Mono advance width in em. */
export const MONO_ADVANCE = 0.6;
/** Geist cap height in em (measured from the `H` glyph). */
export const CAP_HEIGHT = capHeight(fonts.sans);
export const MONO_CAP_HEIGHT = capHeight(fonts.mono);

function capHeight(font: opentype.Font): number {
  const box = font.charToGlyph("H").getBoundingBox();
  return box.y2 / font.unitsPerEm;
}

const fmt = (n: number): string => String(Math.round(n * 1000) / 1000);

/**
 * Path data with explicit separators. opentype.js's own `toPathData` packs numbers together and drops the
 * space before a bare 0 ("Q32.954 0" becomes "Q32.9540"), which breaks any glyph that touches y = 0.
 */
function pathData(p: opentype.Path): string {
  let d = "";
  for (const c of p.commands) {
    if (c.type === "M" || c.type === "L") d += `${c.type}${fmt(c.x)} ${fmt(c.y)}`;
    else if (c.type === "Q") d += `Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}`;
    else if (c.type === "C") d += `C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}`;
    else if (c.type === "Z") d += "Z";
  }
  return d;
}

/** Outlined text as SVG path data. `x`/`y` are the left edge and baseline; `size` is the em size. */
export function text(font: opentype.Font, str: string, x: number, y: number, size: number, letterSpacing = 0): string {
  let d = "";
  let cx = x;
  for (const ch of str) {
    const glyph = font.charToGlyph(ch);
    if (ch !== " ") d += pathData(glyph.getPath(cx, y, size));
    cx += ((glyph.advanceWidth ?? 0) / font.unitsPerEm) * size + letterSpacing;
  }
  return d;
}

/** Advance width of `str` at `size`. */
export function measure(font: opentype.Font, str: string, size: number, letterSpacing = 0): number {
  let w = 0;
  for (const ch of str) w += ((font.charToGlyph(ch).advanceWidth ?? 0) / font.unitsPerEm) * size + letterSpacing;
  return w - letterSpacing;
}

/**
 * The ▼ mark, exactly as the site draws it (`M2 4h20L12 21.5z` in a 24 box): 20 wide, 17.5 tall.
 * `x`/`y` are its top-left corner and `w` its width.
 */
export const MARK_RATIO = 17.5 / 20;
export function mark(x: number, y: number, w: number): string {
  return `M${fmt(x)} ${fmt(y)}H${fmt(x + w)}L${fmt(x + w / 2)} ${fmt(y + w * MARK_RATIO)}Z`;
}

/**
 * ⌘ (U+2318, not in Geist) as a stroke centred on `cx`,`cy` with overall size `s`.
 * A square of side s/3 with a loop on each corner, drawn as one closed outline.
 */
export function command(cx: number, cy: number, s: number): string {
  const a = s / 6; // half the inner square
  const r = s / 6 - 0; // loop radius
  const o = a + r; // loop centre offset from the glyph centre
  const p = (x: number, y: number): string => `${fmt(cx + x)} ${fmt(cy + y)}`;
  // Start at the top edge of the inner square, left end; loops are 270° arcs around each corner.
  return [
    `M${p(-a, -a)}`,
    `L${p(-a, -o)}`,
    `A${fmt(r)} ${fmt(r)} 0 1 0 ${p(-o, -a)}`,
    `L${p(o, -a)}`,
    `A${fmt(r)} ${fmt(r)} 0 1 0 ${p(a, -o)}`,
    `L${p(a, o)}`,
    `A${fmt(r)} ${fmt(r)} 0 1 0 ${p(o, a)}`,
    `L${p(-o, a)}`,
    `A${fmt(r)} ${fmt(r)} 0 1 0 ${p(-a, o)}`,
    "Z",
  ].join("");
}

/** ⌥ (U+2325, not in Geist) as a stroke centred on `cx`,`cy`, `s` wide. */
export function option(cx: number, cy: number, s: number): string {
  const h = s * 0.62;
  const l = cx - s / 2;
  const t = cy - h / 2;
  const p = (x: number, y: number): string => `${fmt(l + x)} ${fmt(t + y)}`;
  return `M${p(0, 0)}L${p(s * 0.32, 0)}L${p(s * 0.68, h)}L${p(s, h)}M${p(s * 0.6, 0)}L${p(s, 0)}`;
}

/** A physical-size SVG document in millimetres. */
export function svgDoc(widthMm: number, heightMm: number, body: string, title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(widthMm)}mm" height="${fmt(heightMm)}mm" viewBox="0 0 ${fmt(widthMm)} ${fmt(heightMm)}">
  <title>${title}</title>
${body}
</svg>
`;
}

export const IN = 25.4;
export { fmt };
