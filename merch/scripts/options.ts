/**
 * Design-round option boards: 4 to 6 concepts per item, each a photo made the same way as the store's
 * (a generated blank with the real vector artwork composited on), plus a contact sheet per item and
 * merch/options/README.md with the specs.
 *
 *   set -a; . ~/.config/textjs/openai.env; set +a   # only needed when an edit isn't cached yet
 *   bun scripts/options.ts [item…]                  # logo-tee console-tee cap hoodie stickers
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { composite, type Layer, type Point, type Quad } from "./composite";
import { generate } from "./imagegen";
import { fmt, fonts, IN, mark, MARK_RATIO, measure, MONO_CAP_HEIGHT, CAP_HEIGHT, command, option, svgDoc, text } from "./lib";
import { optionBasePath } from "./options-blanks";
import { basePath } from "./photos";
import { close, png, webp } from "./render";

const ROOT = join(import.meta.dir, "..");
const OUT = join(ROOT, "options");
const W = 1024;
const H = 1280;

// ── Colors ──────────────────────────────────────────────────────────────────────────────────────
const WHITE = "#ededea"; // white ink / thread as it reads on black
const COOL_GRAY_6 = "#a7a8aa"; // PANTONE Cool Gray 6 C
const COOL_GRAY_11 = "#53565a"; // PANTONE Cool Gray 11 C
const BLACK = "#0b0b0b";

// ── Geometry ────────────────────────────────────────────────────────────────────────────────────
function rect(cx: number, cy: number, w: number, h: number, deg = 0): Quad {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const p = (x: number, y: number): Point => [cx + x * c - y * s, cy + x * s + y * c];
  return [p(-w / 2, -h / 2), p(w / 2, -h / 2), p(w / 2, h / 2), p(-w / 2, h / 2)];
}

/** Maps the unit-square sub-rectangle (u0, v0)–(u1, v1) of `q` through its perspective. */
function sub(q: Quad, u0: number, v0: number, u1: number, v1: number): Quad {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
  const map = (u: number, v: number): Point => {
    const w = g * u + h * v + 1;
    return [(a * u + b * v + x0) / w, (d * u + e * v + y0) / w];
  };
  return [map(u0, v0), map(u1, v0), map(u1, v1), map(u0, v1)];
}

/** Physical size of an svgDoc, in inches. */
function sizeIn(svg: string): [number, number] {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) as RegExpExecArray;
  return [Number(vb[1]) / IN, Number(vb[2]) / IN];
}

/** A garment blank: center line, neck seam and scale, measured with scripts/grid.ts. */
interface Garment {
  cx: number;
  seam: number;
  ppi: number;
}
const TEE_FRONT: Garment = { cx: 511, seam: 496, ppi: 25.7 };
const TEE_BACK: Garment = { cx: 511, seam: 397, ppi: 25.7 };
const PAIR_BACK: Garment = { cx: 640, seam: 349, ppi: 21.3 };
const PAIR_FRONT: Garment = { cx: 411, seam: 655, ppi: 21.2 };
const HOODIE_FLAT: Garment = { cx: 502, seam: 512, ppi: 22 };
const HOODIE_BACK: Garment = { cx: 505, seam: 465, ppi: 19 };

/** Artwork box on a garment: `top` inches below the neck seam, `dx` inches right of center (viewer's right). */
function on(g: Garment, svg: string, top: number, dx = 0, deg = 0): Quad {
  const [w, h] = sizeIn(svg);
  return rect(g.cx + dx * g.ppi, g.seam + (top + h / 2) * g.ppi, w * g.ppi, h * g.ppi, deg);
}

// ── Artwork (physical size in mm, all type outlined) ────────────────────────────────────────────
const path = (d: string, fill: string): string => `<path d="${d}" fill="${fill}"/>`;

/** The ▼, `wIn` wide. */
function markArt(wIn: number, fill = WHITE): string {
  const w = wIn * IN;
  return svgDoc(w, w * MARK_RATIO, path(mark(0, 0, w), fill), "▼");
}

/** Vertical extent of `str` at `size` (y of the highest and lowest outline point, baseline 0). */
function vext(font: (typeof fonts)[keyof typeof fonts], str: string, size: number): [number, number] {
  const b = font.getPath(str, 0, 0, size).getBoundingBox();
  return [b.y1, b.y2];
}

/** "▼ Text.js" in Geist SemiBold, `wIn` wide: the ▼ is 1.15 cap heights wide, centered on the cap height. */
function wordmarkArt(wIn: number, fill = WHITE): string {
  const capH = 10;
  const size = capH / CAP_HEIGHT;
  const ls = -0.02 * size;
  const mw = capH * 1.15;
  const gap = capH * 0.38;
  const tw = measure(fonts.sansSemiBold, "Text.js", size, ls);
  const [top, bottom] = vext(fonts.sansSemiBold, "Text.js", size);
  const k = (wIn * IN) / (mw + gap + tw);
  const markTop = -capH / 2 - (mw * MARK_RATIO) / 2;
  const y0 = Math.min(top, markTop);
  const body = `<g transform="scale(${fmt(k)}) translate(0 ${fmt(-y0)})">${path(mark(0, markTop, mw), fill)}${path(text(fonts.sansSemiBold, "Text.js", mw + gap, 0, size, ls), fill)}</g>`;
  return svgDoc(wIn * IN, (bottom - y0) * k, body, "▼ Text.js");
}

/** One line of type, `wIn` wide (advance width), cropped to its ink vertically. Runs can be colored. */
function lineArt(font: (typeof fonts)[keyof typeof fonts], runs: Array<[string, string]>, wIn: number, ls = 0): string {
  const size = 100;
  const all = runs.map((r) => r[0]).join("");
  const total = measure(font, all, size, ls * size);
  const [top, bottom] = vext(font, all, size);
  const k = (wIn * IN) / total;
  let x = 0;
  const parts = runs.map(([str, fill]) => {
    const d = text(font, str, x, 0, size, ls * size);
    x += measure(font, str, size, ls * size) + ls * size;
    return path(d, fill);
  });
  return svgDoc(wIn * IN, (bottom - top) * k, `<g transform="scale(${fmt(k)}) translate(0 ${fmt(-top)})">${parts.join("")}</g>`, all);
}

/** Rotates an svgDoc 90° clockwise (reads top to bottom). */
function rotated(svg: string): string {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) as RegExpExecArray;
  const w = Number(vb[1]);
  const h = Number(vb[2]);
  const inner = svg.replace(/^[\s\S]*?<\/title>/, "").replace(/<\/svg>\s*$/, "");
  return svgDoc(h, w, `<g transform="translate(${fmt(h)} 0) rotate(90)">${inner}</g>`, "rotated");
}

/**
 * `%cconsole%c.log`: the first run styled like a %c run with a white background (the letters knock
 * out to the shirt), the second plain white.
 */
function percentCArt(wIn: number): string {
  const font = fonts.monoMedium;
  const size = 100;
  const cw = measure(font, "c", size);
  const padX = cw * 0.35;
  const top = -size * 0.95;
  const bottom = size * 0.28;
  const first = text(font, "console", padX, 0, size);
  const firstW = measure(font, "console", size) + 2 * padX;
  const second = text(font, ".log", firstW, 0, size);
  const total = firstW + measure(font, ".log", size);
  const k = (wIn * IN) / total;
  const body = [
    `<defs><mask id="ko" maskUnits="userSpaceOnUse" x="0" y="${fmt(top)}" width="${fmt(total)}" height="${fmt(bottom - top)}"><rect x="0" y="${fmt(top)}" width="${fmt(firstW)}" height="${fmt(bottom - top)}" fill="#fff"/><path d="${first}" fill="#000"/></mask></defs>`,
    `<g transform="scale(${fmt(k)}) translate(0 ${fmt(-top)})"><rect x="0" y="${fmt(top)}" width="${fmt(firstW)}" height="${fmt(bottom - top)}" fill="${WHITE}" mask="url(#ko)"/>${path(second, WHITE)}</g>`,
  ].join("");
  return svgDoc(wIn * IN, (bottom - top) * k, body, "%cconsole%c.log");
}

/** "console" over ".log", Geist SemiBold, flush left, tight. `wIn` is the width of "console". */
function stackArt(wIn: number, fill = WHITE): string {
  const font = fonts.sansSemiBold;
  const size = 100;
  const ls = -0.045 * size;
  const w1 = measure(font, "console", size, ls);
  const capH = CAP_HEIGHT * size;
  const lead = size * 0.86;
  const [, b2] = vext(font, ".log", size);
  const top = -capH - size * 0.02;
  const k = (wIn * IN) / w1;
  const body = `<g transform="scale(${fmt(k)}) translate(${fmt(size * 0.02)} ${fmt(-top)})">${path(text(font, "console", 0, 0, size, ls), fill)}${path(text(font, ".log", 0, lead, size, ls), fill)}</g>`;
  return svgDoc(wIn * IN, (lead + b2 - top) * k, body, "console / .log");
}

/** The ▼ from the console's block-letter font: rows of 7, 5, 3 and 1 cells, each 1 × 1.25. */
function blockMarkArt(wIn: number, fill = WHITE): string {
  const cw = (wIn * IN) / 7;
  const ch = cw * 1.25;
  let d = "";
  for (let r = 0; r < 4; r++) d += `M${fmt(r * cw)} ${fmt(r * ch)}h${fmt((7 - 2 * r) * cw)}v${fmt(ch)}h${fmt(-(7 - 2 * r) * cw)}Z`;
  return svgDoc(wIn * IN, 4 * ch, path(d, fill), "block ▼");
}

// ── Stickers (artwork includes the white border, so the outline is the cut line) ────────────────
const BORDER = 0.12 * IN;

function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  return `M${fmt(x + r)} ${fmt(y)}H${fmt(x + w - r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + w)} ${fmt(y + r)}V${fmt(y + h - r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + w - r)} ${fmt(y + h)}H${fmt(x + r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x)} ${fmt(y + h - r)}V${fmt(y + r)}A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + r)} ${fmt(y)}Z`;
}

interface Sticker {
  /** Full sticker, border included. */
  svg: string;
  /** Only the black-on-white artwork (for compositing onto a blank white sticker in a photo). */
  art?: string;
}

/** A: die-cut ▼, black, with the white border following the triangle (round outer corners). */
function stickerMark(wIn: number): Sticker {
  const w = wIn * IN - 2 * BORDER * 1.9;
  const h = w * MARK_RATIO;
  const ox = (wIn * IN - w) / 2;
  const oy = BORDER * 1.9;
  const d = mark(ox, oy, w);
  const H2 = h + oy + BORDER * 3.9;
  return { svg: svgDoc(wIn * IN, H2, `<path d="${d}" fill="#fff" stroke="#fff" stroke-width="${fmt(BORDER * 2)}" stroke-linejoin="round"/>${path(d, BLACK)}`, "▼ sticker") };
}

/** B: the wordmark, black on a white rounded rectangle. */
function stickerWordmark(wIn: number, hIn: number): Sticker {
  const w = wIn * IN;
  const h = hIn * IN;
  const mark0 = wordmarkArt(wIn * 0.72, BLACK);
  const [mw, mh] = sizeIn(mark0).map((v) => v * IN) as [number, number];
  const inner = mark0.replace(/^[\s\S]*?<\/title>/, "").replace(/<\/svg>\s*$/, "");
  // Optical center: the cap height sits on the middle, the j's descender hangs below.
  const capBand = mh * 0.8;
  const tx = (w - mw) / 2;
  const ty = (h - capBand) / 2;
  const art = svgDoc(w, h, `<g transform="translate(${fmt(tx)} ${fmt(ty)})">${inner}</g>`, "wordmark art");
  const svg = svgDoc(w, h, `${path(roundRect(0, 0, w, h, h * 0.16), "#fff")}<g transform="translate(${fmt(tx)} ${fmt(ty)})">${inner}</g>`, "wordmark sticker");
  return { svg, art };
}

/** C: `console.log` in white Geist Mono on a black pill, white border. */
function stickerConsole(wIn: number): Sticker {
  const w = wIn * IN;
  const h = w * 0.27;
  const textW = w - 2 * BORDER - h * 0.9;
  const line = lineArt(fonts.monoMedium, [["console.log", "#fff"]], textW / IN);
  const [, lh] = sizeIn(line).map((v) => v * IN) as [number, number];
  const inner = line.replace(/^[\s\S]*?<\/title>/, "").replace(/<\/svg>\s*$/, "");
  // Center on the x-height band rather than the ink box (the l and g reach out of it).
  const ty = (h - lh) / 2 - lh * 0.02;
  const body = `${path(roundRect(0, 0, w, h, h / 2), "#fff")}${path(roundRect(BORDER, BORDER, w - 2 * BORDER, h - 2 * BORDER, h / 2 - BORDER), BLACK)}<g transform="translate(${fmt((w - textW) / 2)} ${fmt(ty)})">${inner}</g>`;
  return { svg: svgDoc(w, h, body, "console.log sticker") };
}

/** D: ⌘ ⌥ J as three keys on one sticker. */
function stickerKeys(wIn: number): Sticker {
  const w = wIn * IN;
  const key = (w - 2 * BORDER - 4 * 3.2) / 3;
  const h = key + 2 * BORDER + 2 * 3.2;
  let body = `${path(roundRect(0, 0, w, h, 6.5), "#fff")}${path(roundRect(BORDER, BORDER, w - 2 * BORDER, h - 2 * BORDER, 6.5 - BORDER * 0.6), BLACK)}`;
  const stroke = key * 0.045;
  for (let i = 0; i < 3; i++) {
    const x = BORDER + 3.2 + i * (key + 3.2);
    const y = BORDER + 3.2;
    body += `<path d="${roundRect(x + stroke / 2, y + stroke / 2, key - stroke, key - stroke, key * 0.16)}" fill="none" stroke="#fff" stroke-width="${fmt(stroke)}"/>`;
    const cx = x + key / 2;
    const cy = y + key / 2;
    if (i === 0) body += `<path d="${command(cx, cy, key * 0.42)}" fill="none" stroke="#fff" stroke-width="${fmt(key * 0.055)}" stroke-linejoin="round"/>`;
    if (i === 1) body += `<path d="${option(cx, cy, key * 0.44)}" fill="none" stroke="#fff" stroke-width="${fmt(key * 0.055)}" stroke-linecap="square"/>`;
    if (i === 2) {
      const capH = key * 0.38;
      const size = capH / MONO_CAP_HEIGHT;
      body += path(text(fonts.monoMedium, "J", cx - measure(fonts.monoMedium, "J", size) / 2, cy + capH / 2, size), "#fff");
    }
  }
  return { svg: svgDoc(w, h, body, "⌘⌥J sticker") };
}

/** E: `%c` in black Geist Mono on a white rounded square. */
function stickerPercentC(wIn: number): Sticker {
  const w = wIn * IN;
  const capH = w * 0.3;
  const size = capH / MONO_CAP_HEIGHT;
  const tw = measure(fonts.monoMedium, "%c", size);
  const glyphs = text(fonts.monoMedium, "%c", (w - tw) / 2, (w + capH) / 2, size);
  return { svg: svgDoc(w, w, `${path(roundRect(0, 0, w, w, w * 0.16), "#fff")}${path(glyphs, BLACK)}`, "%c sticker"), art: svgDoc(w, w, path(glyphs, BLACK), "%c art") };
}

/** F: the block-letter ▼, die-cut to its steps, black with the white border. */
function stickerBlock(wIn: number): Sticker {
  const inner = wIn * IN - 2 * BORDER * 1.4;
  const cw = inner / 7;
  const ch = cw * 1.25;
  const o = BORDER * 1.4;
  let d = "";
  for (let r = 0; r < 4; r++) d += `M${fmt(o + r * cw)} ${fmt(o + r * ch)}h${fmt((7 - 2 * r) * cw)}v${fmt(ch)}h${fmt(-(7 - 2 * r) * cw)}Z`;
  const h = 4 * ch + 2 * o;
  return { svg: svgDoc(wIn * IN, h, `<path d="${d}" fill="#fff" stroke="#fff" stroke-width="${fmt(BORDER * 2)}" stroke-linejoin="round"/>${path(d, BLACK)}`, "block ▼ sticker") };
}

// ── Compositing presets ─────────────────────────────────────────────────────────────────────────
/** White DTG / screen ink on black cotton. */
const ink = (svg: string, quad: Quad, extra: Partial<Layer> = {}): Layer => ({ svg, quad, mode: "print", opacity: 0.95, displace: 0.6, shade: 0.8, texture: 0.5, ...extra });
const stitches = (): string => basePath("stitch-texture");
/** Embroidery in `thread`, with the stitch photo's texture. */
const embroider = (svg: string, quad: Quad, thread: string, stitchPx: number, relief = 1.2, extra: Partial<Layer> = {}): Layer => ({ svg, quad, mode: "embroidery", stitches: stitches(), stitchPx, relief, thread, ...extra });
/** A vinyl sticker: slight gloss, a thin raised edge and a soft contact shadow. */
const vinyl = (svg: string, quad: Quad, extra: Partial<Layer> = {}): Layer => ({ svg, quad, mode: "print", opacity: 1, displace: 0, shade: 0.55, texture: 0.04, gloss: 0.06, edge: 0.6, shadow: { dx: 1.5, dy: 3, blur: 4, opacity: 0.45 }, ...extra });

// ── Edits: embroidery the image model draws, fitted back onto the exact ▼ ───────────────────────
function embroideryPrompt(fabric: string, thread: string, orientation: string): string {
  return `Photograph edit. Turn the flat ${thread} triangle into real ${thread} satin-stitch machine embroidery on this ${fabric}: dense glossy ${thread} thread stitched at a diagonal, a slightly raised edge with a thin satin border, and natural sheen that catches the same light as the rest of the photo. Keep the triangle's exact shape, size, position and straight edges. ${orientation} Keep everything else in the photo identical. No text, no letters.`;
}

async function refine(name: string, base: string, quad: Quad, fill: string, prompt: string, quality: "low" | "high" = "high"): Promise<string> {
  const flatSvg = svgDoc(20, 20 * MARK_RATIO, path(mark(0, 0, 20), fill), "▼");
  const flat = await composite({ base, layers: [{ svg: flatSvg, quad, mode: "flat" }] });
  const flatPath = join(ROOT, "photos", "refine", `options-${name}-flat.png`);
  mkdirSync(dirname(flatPath), { recursive: true });
  writeFileSync(flatPath, flat);
  return generate({ prompt, size: "1024x1536", quality, refs: [flatPath] }, `options ${name}`);
}

/** Affine fit of a drawn ▼ (top-left, top-right, apex measured on the edit) onto the exact mark box. */
function fit(src: [Point, Point, Point], dst: Quad, feather: number): Layer {
  const [tl, tr, br, bl] = dst;
  return { svg: "", quad: dst, mode: "fit", src, dst: [tl, tr, [(br[0] + bl[0]) / 2, (br[1] + bl[1]) / 2]], feather };
}

/** Measured on each edit with scripts/grid.ts: where the model drew the ▼, fitted back onto the exact quad. */
const FITS: Record<string, Layer[]> = {};

// ── Options ─────────────────────────────────────────────────────────────────────────────────────
interface Option {
  label: string;
  /** Short caption on the contact sheet. */
  caption: string;
  /** One line for the README. */
  description: string;
  method: string;
  colors: string;
  placement: string;
  /** Anything Fourthwall can't do, or needs confirming. */
  flag?: string;
  /** Renders the photo (1024 × 1280 PNG). */
  photo: () => Promise<Buffer>;
  /** Stickers: a studio render beside the photo. */
  render?: () => Promise<Buffer>;
}

interface Item {
  slug: string;
  title: string;
  blank: string;
  options: Option[];
}

const shot = async (base: string, cropY: number, layers: Layer[]): Promise<Buffer> => composite({ base, layers, crop: [0, cropY, W, H] });
const existing = (file: string) => async (): Promise<Buffer> => pngFromWebp(join(ROOT, "photos", "final", file));

async function pngFromWebp(file: string): Promise<Buffer> {
  return png(`<!doctype html><style>html,body{margin:0;background:#000}img{display:block;width:${W}px;height:${H}px}</style><img src="data:image/webp;base64,${readFileSync(file).toString("base64")}">`, W, H, 1);
}

const teeFront = (): string => basePath("tee-front");
const teeBack = (): string => basePath("tee-back");

const LOGO_TEE: Item = {
  slug: "logo-tee",
  title: "Logo tee",
  blank: "Black heavyweight tee. On demand: AS Colour 5082 (7.1 oz, garment dyed), printed DTG.",
  options: [
    {
      label: "A",
      caption: "▼, center chest, 3.5 in",
      description: "The ▼ alone, centered on the chest.",
      method: "DTG",
      colors: "White",
      placement: "3.5 × 3.06 in, center chest, top 3 in below the front neck seam",
      photo: async () => {
        const a = markArt(3.5);
        return shot(teeFront(), 130, [ink(a, on(TEE_FRONT, a, 3))]);
      },
    },
    {
      label: "B",
      caption: "▼, left chest, 2 in",
      description: "A smaller ▼ on the left chest.",
      method: "DTG",
      colors: "White",
      placement: "2 × 1.75 in, left chest, centered 3.75 in from center, top 1.75 in below the front neck seam",
      photo: async () => {
        const a = markArt(2);
        return shot(teeFront(), 130, [ink(a, on(TEE_FRONT, a, 1.75, 3.75))]);
      },
    },
    {
      label: "C",
      caption: "▼ Text.js wordmark, 8 in",
      description: "The full wordmark across the chest.",
      method: "DTG",
      colors: "White",
      placement: "8 in wide (1.33 in cap height), center chest, top 3 in below the front neck seam",
      photo: async () => {
        const a = wordmarkArt(8);
        return shot(teeFront(), 130, [ink(a, on(TEE_FRONT, a, 3))]);
      },
    },
    {
      label: "D",
      caption: "Small ▼ front, 10 in ▼ back",
      description: "A small ▼ on the left chest and a large one across the back.",
      method: "DTG, front and back",
      colors: "White",
      placement: "Front: 1.5 in, left chest. Back: 10 × 8.75 in, centered, top 3 in below the back neck seam",
      photo: async () => {
        const back = markArt(10);
        const front = markArt(1.5);
        return shot(basePath("tee-pair"), 120, [ink(back, on(PAIR_BACK, back, 3)), ink(front, on(PAIR_FRONT, front, 1.75, 3.75))]);
      },
    },
    {
      label: "E",
      caption: "Oversized ▼, 11 in",
      description: "One ▼ across most of the front.",
      method: "DTG",
      colors: "White",
      placement: "11 × 9.63 in, centered, top 3.5 in below the front neck seam",
      flag: "Confirm the front print area on the chosen blank is at least 11 in wide.",
      photo: async () => {
        const a = markArt(11);
        return shot(teeFront(), 130, [ink(a, on(TEE_FRONT, a, 3.5))]);
      },
    },
    {
      label: "F",
      caption: "Block-letter ▼, 4.5 in",
      description: "The ▼ as the console's block-letter font draws it, in rows of 7, 5, 3 and 1 cells.",
      method: "DTG",
      colors: "White",
      placement: "4.5 × 3.21 in, center chest, top 3 in below the front neck seam",
      photo: async () => {
        const a = blockMarkArt(4.5);
        return shot(teeFront(), 130, [ink(a, on(TEE_FRONT, a, 3))]);
      },
    },
  ],
};

const CONSOLE_TEE: Item = {
  slug: "console-tee",
  title: "console.log tee",
  blank: "Black heavyweight tee. On demand: AS Colour 5082 (7.1 oz, garment dyed), printed DTG.",
  options: [
    {
      label: "A",
      caption: "console.log, Geist Mono, 9 in",
      description: "console.log in Geist Mono Medium, across the chest.",
      method: "DTG",
      colors: "White",
      placement: "9 in wide (0.97 in cap height), center chest, top 3 in below the front neck seam",
      photo: async () => {
        const a = lineArt(fonts.monoMedium, [["console.log", WHITE]], 9);
        return shot(teeFront(), 130, [ink(a, on(TEE_FRONT, a, 3))]);
      },
    },
    {
      label: "B",
      caption: "› console.log() with the prompt",
      description: "The line as typed at the DevTools prompt, with the › in gray.",
      method: "DTG",
      colors: "White and PANTONE Cool Gray 6 C",
      placement: "10 in wide (0.79 in cap height), center chest, top 3 in below the front neck seam",
      flag: "DTG prints the gray from the file; it isn't mixed to the Pantone. Spot-matched gray needs screen printing, which on Fourthwall means a minimum order.",
      photo: async () => {
        const a = lineArt(fonts.monoMedium, [["› ", COOL_GRAY_6], ["console.log()", WHITE]], 10);
        return shot(teeFront(), 130, [ink(a, on(TEE_FRONT, a, 3))]);
      },
    },
    {
      label: "C",
      caption: "Vertical back print, 14 in",
      description: "console.log running down the spine, read top to bottom.",
      method: "DTG, back",
      colors: "White",
      placement: "14 in tall (1.5 in cap height), centered on the back, top 2 in below the back neck seam",
      flag: "Confirm the back print area on the chosen blank is at least 14 in tall.",
      photo: async () => {
        const a = rotated(lineArt(fonts.monoMedium, [["console.log", WHITE]], 14));
        return shot(teeBack(), 130, [ink(a, on(TEE_BACK, a, 2))]);
      },
    },
    {
      label: "D",
      caption: "%c run: console inverted, .log plain",
      description: "Set the way DevTools shows console.log(\"%cconsole%c.log\", \"background: #fff; color: #000\", \"\"), with the first run as black letters in a white block.",
      method: "DTG",
      colors: "White (the letters in the block are the shirt)",
      placement: "10 in wide, center chest, top 3 in below the front neck seam",
      photo: async () => {
        const a = percentCArt(10);
        return shot(teeFront(), 130, [ink(a, on(TEE_FRONT, a, 3))]);
      },
    },
    {
      label: "E",
      caption: "console / .log, Geist, flush left",
      description: "Two lines in Geist SemiBold, set tight and flush left, sitting left of center.",
      method: "DTG",
      colors: "White",
      placement: "10 in wide, two lines (2 in cap height), offset toward the wearer's right with the type's left edge 6 in from center, top 3 in below the front neck seam",
      photo: async () => {
        const a = stackArt(10);
        const [w] = sizeIn(a);
        return shot(teeFront(), 130, [ink(a, on(TEE_FRONT, a, 3, -6 + w / 2))]);
      },
    },
    {
      label: "F",
      caption: "Tonal console.log(), Cool Gray 11",
      description: "console.log() in a dark gray close to the shirt's black.",
      method: "DTG",
      colors: "PANTONE Cool Gray 11 C",
      placement: "10 in wide (0.91 in cap height), center chest, top 3 in below the front neck seam",
      flag: "DTG prints the gray from the file; it isn't mixed to the Pantone, and dark gray on black varies between print runs. Order a sample first.",
      photo: async () => {
        const a = lineArt(fonts.monoMedium, [["console.log()", COOL_GRAY_11]], 10);
        return shot(teeFront(), 130, [ink(a, on(TEE_FRONT, a, 3), { opacity: 0.97 })]);
      },
    },
  ],
};

// Cap: cap-front-2, three-quarter front. The crown is modelled as a cylinder (axis x 530, radius 310 px,
// seen from 5° above) so lettering wraps it; the front seam at the lettering's height is at x 445,
// arc position 444, and the cap reads about 103 px per inch across the front.
const CAP_CYL = { cx: 530, r: 310, elev: 0.08 };
const CAP_PPI = 103;
const CAP_MARK: Quad = [[385.9, 636.6], [545.1, 653.4], [525.5, 792.0], [366.3, 775.2]];
const capFront = (svg: string, cy = 738): Quad => {
  const [w, h] = sizeIn(svg);
  return rect(444, cy, w * CAP_PPI, h * CAP_PPI);
};
const THREAD_WHITE = "#efefea";
const CAP_LEAN = "Its top edge follows the brim seam and its point follows the cap's front center seam, so it leans slightly with the cap.";
// The stone cap is an edit of cap-front-2 and sits a little larger: ▼ 1.6 in at about 103 px/in, top edge 8° with the brim, axis leaning 12° with the seam.
const STONE_MARK: Quad = [[388.3, 638.5], [551.7, 661.5], [521.5, 802.3], [358.1, 779.3]];
const capBack = (): string => lineArt(fonts.monoBold, [["textjs.org", "#111111"]], 2.87);
const CAP_BACK_QUAD: Quad = [[208, 748], [452, 732], [452, 772], [208, 790]];

const CAP: Item = {
  slug: "cap",
  title: "Cap",
  blank: "Yupoong 6245CM dad hat, black cotton twill. Fourthwall: Yupoong Classic Dad Hat, embroidered on demand.",
  options: [
    {
      label: "A",
      caption: "Tonal ▼ (current)",
      description: "The current design, a black ▼ in black thread.",
      method: "Embroidery",
      colors: "Black thread",
      placement: "1.6 in wide, Front Large, centered on the front seam, apex 0.6 in above the brim",
      photo: existing("cap-1.webp"),
    },
    {
      label: "B",
      caption: "White ▼, 1.6 in",
      description: "The same ▼ in white thread.",
      method: "Embroidery",
      colors: "White thread",
      placement: "1.6 × 1.4 in, Front Large, centered on the front seam, apex 0.6 in above the brim",
      photo: async () => {
        const base = await refine("cap-B", basePath("cap-front-2"), CAP_MARK, "#e9e9e6", embroideryPrompt("black cotton chino twill cap", "white", CAP_LEAN));
        return shot(base, 140, FITS["cap-B"] ?? []);
      },
    },
    {
      label: "C",
      caption: "White ▼ Text.js, 3 in",
      description: "The wordmark across the front panels.",
      method: "Embroidery",
      colors: "White thread",
      placement: "3 in wide (0.5 in cap height, 0.36 in lowercase), Front Large, centered on the front seam, 0.8 in above the brim",
      photo: async () => {
        const a = wordmarkArt(3, THREAD_WHITE);
        return shot(basePath("cap-front-2"), 140, [embroider(a, capFront(a), THREAD_WHITE, 1.2, 0.9, { cylinder: CAP_CYL })]);
      },
    },
    {
      label: "D",
      caption: "White console.log, 3.4 in",
      description: "console.log in Geist Mono Bold across the front.",
      method: "Embroidery",
      colors: "White thread",
      placement: "3.4 in wide (0.37 in cap height, 0.27 in lowercase), Front Large, centered on the front seam, 0.8 in above the brim",
      flag: "Lowercase is 0.27 in, just over Fourthwall's 0.25 in embroidery minimum; it can't go smaller.",
      photo: async () => {
        const a = lineArt(fonts.monoBold, [["console.log", THREAD_WHITE]], 3.4);
        return shot(basePath("cap-front-2"), 140, [embroider(a, capFront(a, 745), THREAD_WHITE, 1.2, 0.9, { cylinder: CAP_CYL })]);
      },
    },
    {
      label: "E",
      caption: "White ▼ front, textjs.org back",
      description: "Option B with textjs.org above the strap in white (back shown).",
      method: "Embroidery, front and back",
      colors: "White thread",
      placement: "Front: 1.6 in ▼ as B. Back: textjs.org in Geist Mono Bold, 2.87 in wide (0.26 in lowercase), centered above the strap opening",
      photo: async () => shot(basePath("cap-back"), 170, [embroider(capBack().replace(/#111111/g, THREAD_WHITE), CAP_BACK_QUAD, THREAD_WHITE, 1.1, 0.9)]),
    },
    {
      label: "F",
      caption: "Stone cap, black ▼",
      description: "The ▼ in black thread on a stone cap.",
      method: "Embroidery",
      colors: "Black thread on Stone",
      placement: "1.6 × 1.4 in, Front Large, centered on the front seam, apex 0.6 in above the brim",
      flag: "Check Stone is in Fourthwall's colors for this hat before choosing it.",
      photo: async () => {
        const base = await refine("cap-F", optionBasePath("cap-stone"), STONE_MARK, "#1a1a1a", embroideryPrompt("stone colored cotton chino twill cap", "black", CAP_LEAN));
        return shot(base, 140, FITS["cap-F"] ?? []);
      },
    },
  ],
};

const hoodieFlat = (): string => basePath("hoodie-flat");
// Embroidered ▼ for B, as it was sent to the edit: 2 in wide (43 px), top 3.4 in below the neck.
const HOODIE_MARK: Quad = on({ cx: 502, seam: 510, ppi: 19 }, markArt(2.25), 4);
const HOODIE_BIG: Quad = on(HOODIE_FLAT, markArt(3.5), 3.5);

const HOODIE: Item = {
  slug: "hoodie",
  title: "Hoodie",
  blank: "Black fleece hoodie. On demand: AS Colour 5161 Relaxed Hoodie (9.4 oz), embroidered or printed.",
  options: [
    {
      label: "A",
      caption: "Tonal ▼ (current)",
      description: "The current design, a black ▼ in black thread at the chest.",
      method: "Embroidery",
      colors: "Black thread",
      placement: "1.75 in wide, center chest, top 4 in below the front neck seam",
      photo: existing("hoodie-2.webp"),
    },
    {
      label: "B",
      caption: "White ▼, 2 in",
      description: "The ▼ in white thread at the chest.",
      method: "Embroidery",
      colors: "White thread",
      placement: "2 × 1.75 in, center chest, top 3.5 in below the front neck seam",
      photo: async () => {
        const base = await refine("hoodie-B", hoodieFlat(), HOODIE_MARK, "#e9e9e6", embroideryPrompt("black heavyweight cotton fleece hoodie", "white", "It points straight down."));
        return shot(base, 120, FITS["hoodie-B"] ?? []);
      },
    },
    {
      label: "C",
      caption: "White ▼ Text.js, left chest",
      description: "A small wordmark on the left chest.",
      method: "Embroidery",
      colors: "White thread",
      placement: "3.5 in wide (0.58 in cap height), left chest, centered 4 in from center, top 2.5 in below the front neck seam",
      photo: async () => {
        const a = wordmarkArt(3.5, THREAD_WHITE);
        return shot(hoodieFlat(), 120, [embroider(a, on(HOODIE_FLAT, a, 2.5, 4), THREAD_WHITE, 0.6, 0.6)]);
      },
    },
    {
      label: "D",
      caption: "console.log, 9 in print",
      description: "console.log in Geist Mono across the chest, printed.",
      method: "DTG",
      colors: "White",
      placement: "9 in wide (0.97 in cap height), center chest, top 4 in below the front neck seam",
      flag: "Needs a printed hoodie. Check whether Fourthwall prints the AS Colour 5161; the Cotton Heritage Premium Hoodie comes printed or embroidered.",
      photo: async () => {
        const a = lineArt(fonts.monoMedium, [["console.log", WHITE]], 9);
        return shot(hoodieFlat(), 120, [ink(a, on(HOODIE_FLAT, a, 4), { texture: 0.7, displace: 0.8 })]);
      },
    },
    {
      label: "E",
      caption: "11 in ▼ back, small ▼ front",
      description: "A large ▼ across the back and a 1.5 in ▼ on the left chest, both printed (back shown).",
      method: "DTG, front and back",
      colors: "White",
      placement: "Back: 11 × 9.63 in, centered, top 3.5 in below the back neck seam. Front: 1.5 in, left chest",
      flag: "Needs a printed hoodie, as D. The AS Colour 5161 is listed once printed and once embroidered, so the front ▼ is printed as well; some other Fourthwall blanks allow mixed printed and embroidered regions.",
      photo: async () => {
        const a = markArt(11);
        return shot(optionBasePath("hoodie-back"), 140, [ink(a, on(HOODIE_BACK, a, 3.5), { texture: 0.7, displace: 0.8 })]);
      },
    },
    {
      label: "F",
      caption: "White ▼, 3.5 in",
      description: "A larger white ▼, near the top of Fourthwall's embroidery size.",
      method: "Embroidery",
      colors: "White thread",
      placement: "3.5 × 3.06 in, center chest, top 3.5 in below the front neck seam",
      flag: "Fourthwall's pricing sheet lists embroidery up to 4 × 4 in; a ▼ this size is a dense fill, so check the stitch count stays under 15,000.",
      photo: async () => {
        const base = await refine("hoodie-F", hoodieFlat(), HOODIE_BIG, "#e9e9e6", embroideryPrompt("black heavyweight cotton fleece hoodie", "white", "It points straight down."));
        return shot(base, 120, FITS["hoodie-F"] ?? []);
      },
    },
  ],
};

FITS["cap-B"] = [fit([[386, 638], [545, 653], [447, 776]], CAP_MARK, 6)];
FITS["cap-F"] = [fit([[390, 641], [548, 658], [440, 784]], STONE_MARK, 6)];
FITS["hoodie-F"] = [fit([[464, 590], [540, 590], [502, 661]], HOODIE_BIG, 4)];
FITS["hoodie-B"] = [fit([[481, 586], [523, 586], [502, 622]], HOODIE_MARK, 3)];

// ── Stickers ──
/** A rotated rectangle given in a surface's own millimetres, mapped through the surface quad's perspective. */
function onSurface(q: Quad, wMm: number, hMm: number, cx: number, cy: number, w: number, h: number, deg = 0): Quad {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const sn = Math.sin(r);
  const pt = (x: number, y: number): Point => {
    const u = (cx + x * c - y * sn) / wMm;
    const v = (cy + x * sn + y * c) / hMm;
    return sub(q, u, v, u, v)[0];
  };
  return [pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)];
}

const NOTEBOOK: Quad = [[362, 342], [847, 419], [750, 1117], [204, 1037]];
// sticker-laptop-close: about 7.5 in of the lid across the frame, its front right corner at the lower right.
const LAPTOP_PPI = 135;
const BOTTLE = { cx: 505, r: 185, ppi: 127 };
const HAND_STICKER: Quad = [[223, 615], [866, 615], [866, 838], [223, 838]];
const stickerMm = (svg: string): [number, number] => sizeIn(svg).map((v) => v * IN) as [number, number];

/** A clean studio render of one sticker: light gray seamless backdrop, soft shadow, a faint matte sheen. */
async function studio(svg: string, widthPx: number, deg: number): Promise<Buffer> {
  const [wMm, hMm] = stickerMm(svg);
  const h = (widthPx * hMm) / wMm;
  const sized = svg.replace(/<\?xml[^>]*>/, "").replace(/width="[^"]*mm" height="[^"]*mm"/, `width="${widthPx}" height="${fmt(h)}"`);
  const mask = `url("data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}")`;
  const html = `<!doctype html><style>
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:radial-gradient(120% 90% at 30% 15%,#ececea 0%,#dcdcd9 50%,#c9c9c6 100%)}
    .s{position:absolute;left:50%;top:48%;width:${widthPx}px;height:${fmt(h)}px;transform:translate(-50%,-50%) rotate(${deg}deg);filter:drop-shadow(0 1px 1px rgba(0,0,0,.35)) drop-shadow(0 14px 22px rgba(0,0,0,.22))}
    .s svg{display:block}
    .sheen{position:absolute;inset:0;-webkit-mask:${mask} center/100% 100% no-repeat;background:linear-gradient(125deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 45%,rgba(0,0,0,.10) 100%)}
    .grain{position:fixed;inset:0;opacity:.07;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
  </style><div class="s">${sized}<div class="sheen"></div></div><div class="grain"></div>`;
  return png(html, W, H, 1);
}

const STICKER_A = (): Sticker => stickerMark(3);
const STICKER_B = (): Sticker => stickerWordmark(3, 1.04);
const STICKER_C = (): Sticker => stickerConsole(3);
const STICKER_D = (): Sticker => stickerKeys(3);
const STICKER_E = (): Sticker => stickerPercentC(2);
const STICKER_F = (): Sticker => stickerBlock(3);

const STICKERS: Item = {
  slug: "stickers",
  title: "Stickers",
  blank: "Single die-cut stickers, matte vinyl. Studio render on the left, photo on the right. Fourthwall: Die-Cut Stickers, 2 to 6 in.",
  options: [
    {
      label: "A",
      caption: "Die-cut ▼, 3 in",
      description: "The ▼ in black, cut to shape with a white edge.",
      method: "Die-cut sticker",
      colors: "Black, white edge",
      placement: "3 in size (3 × 2.68 in), the 0.12 in white edge is part of the artwork",
      render: () => studio(STICKER_A().svg, 560, -6),
      photo: async () => {
        const s = STICKER_A();
        const [w, h] = stickerMm(s.svg);
        return shot(optionBasePath("sticker-laptop-close"), 200, [vinyl(s.svg, rect(560, 760, (w / IN) * LAPTOP_PPI, (h / IN) * LAPTOP_PPI, -8), { shadow: { dx: 2, dy: 4, blur: 5, opacity: 0.5 } })]);
      },
    },
    {
      label: "B",
      caption: "Wordmark, 3 in",
      description: "The ▼ Text.js wordmark in black on a white rounded rectangle.",
      method: "Die-cut sticker",
      colors: "Black on white",
      placement: "3 in size (3 × 1.04 in), 0.17 in corner radius",
      render: () => studio(STICKER_B().svg, 640, 4),
      photo: async () => {
        const s = STICKER_B();
        return shot(optionBasePath("sticker-hand"), 128, [{ svg: s.art as string, quad: HAND_STICKER, mode: "print", opacity: 0.96, displace: 0, shade: 0.5, texture: 0.15 }]);
      },
    },
    {
      label: "C",
      caption: "console.log pill, 3 in",
      description: "console.log in white Geist Mono on a black pill.",
      method: "Die-cut sticker",
      colors: "White on black, white edge",
      placement: "3 in size (3 × 0.81 in)",
      render: () => studio(STICKER_C().svg, 640, -3),
      photo: async () => {
        const s = STICKER_C();
        const [w, h] = stickerMm(s.svg);
        return shot(basePath("notebook"), 150, [vinyl(s.svg, onSurface(NOTEBOOK, 145, 210, 58, 120, w, h, -7), { shadow: { dx: 1, dy: 2, blur: 2.5, opacity: 0.5 } })]);
      },
    },
    {
      label: "D",
      caption: "⌘ ⌥ J keys, 3 in",
      description: "The DevTools Console shortcut on macOS as three keys.",
      method: "Die-cut sticker",
      colors: "White on black, white edge",
      placement: "3 in size (3 × 1.17 in)",
      render: () => studio(STICKER_D().svg, 640, 3),
      photo: async () => {
        const s = STICKER_D();
        const [w, h] = stickerMm(s.svg);
        return shot(optionBasePath("sticker-laptop-close"), 200, [vinyl(s.svg, rect(520, 820, (w / IN) * LAPTOP_PPI, (h / IN) * LAPTOP_PPI, 5), { shadow: { dx: 2, dy: 4, blur: 5, opacity: 0.5 } })]);
      },
    },
    {
      label: "E",
      caption: "%c, 2 in",
      description: "%c, the console's CSS format specifier, in black on a white rounded square.",
      method: "Die-cut sticker",
      colors: "Black on white",
      placement: "2 in size (2 × 2 in)",
      render: () => studio(STICKER_E().svg, 460, -5),
      photo: async () => {
        const s = STICKER_E();
        const px = 2 * BOTTLE.ppi;
        return shot(optionBasePath("sticker-bottle"), 128, [vinyl(s.svg, rect(BOTTLE.cx, 780, px, px), { cylinder: { cx: BOTTLE.cx, r: BOTTLE.r }, shadow: { dx: 0.5, dy: 1, blur: 1.5, opacity: 0.4 }, shade: 0.6 })]);
      },
    },
    {
      label: "F",
      caption: "Block-letter ▼, 3 in",
      description: "The ▼ from the console's block-letter font, cut to its steps.",
      method: "Die-cut sticker",
      colors: "Black, white edge",
      placement: "3 in size (3 × 2.24 in)",
      flag: "Fourthwall notes that small details may be cut as one shape; the inside corners of the steps may round off slightly.",
      render: () => studio(STICKER_F().svg, 560, 5),
      photo: async () => {
        const s = STICKER_F();
        const [w, h] = stickerMm(s.svg);
        return shot(basePath("notebook"), 150, [vinyl(s.svg, onSurface(NOTEBOOK, 145, 210, 62, 92, w, h, 6), { shadow: { dx: 1, dy: 2, blur: 2.5, opacity: 0.5 } })]);
      },
    },
  ],
};

export const ITEMS: Item[] = [LOGO_TEE, CONSOLE_TEE, CAP, HOODIE, STICKERS];

// ── Output ──────────────────────────────────────────────────────────────────────────────────────
async function writeItem(item: Item): Promise<void> {
  const dir = join(OUT, item.slug);
  mkdirSync(dir, { recursive: true });
  const files: Array<{ o: Option; photo: string; render?: string }> = [];
  for (const o of item.options) {
    const photo = await o.photo();
    const photoFile = join(dir, `${o.label}.webp`);
    writeFileSync(photoFile, [...(await webp(photo, [W], 0.9)).values()][0] as Buffer);
    // Lossless copy for checking glyphs at full size (ignored by git).
    mkdirSync(join(ROOT, "photos", "options"), { recursive: true });
    writeFileSync(join(ROOT, "photos", "options", `${item.slug}-${o.label}.png`), photo);
    let renderFile: string | undefined;
    if (o.render) {
      const r = await o.render();
      renderFile = join(dir, `${o.label}-render.webp`);
      writeFileSync(renderFile, [...(await webp(r, [W], 0.92)).values()][0] as Buffer);
    }
    files.push({ o, photo: photoFile, render: renderFile });
    console.log(`${item.slug} ${o.label}`);
  }
  await sheet(item, files);
}

async function sheet(item: Item, files: Array<{ o: Option; photo: string; render?: string }>): Promise<void> {
  const pairs = files.some((f) => f.render);
  const cols = 3;
  const cellW = pairs ? 760 : 760;
  const imgs = (f: (typeof files)[number]): string => {
    const img = (file: string): string => `<img src="data:image/webp;base64,${readFileSync(file).toString("base64")}">`;
    return pairs && f.render ? `<div class="pair">${img(f.render)}${img(f.photo)}</div>` : img(f.photo);
  };
  const rows = Math.ceil(files.length / cols);
  const width = cols * cellW + (cols + 1) * 40;
  const imgH = pairs ? (cellW / 2 - 4) * 1.25 : cellW * 1.25;
  const height = 150 + rows * (imgH + 96) + 4;
  const html = `<!doctype html><style>
    @font-face{font-family:Geist;src:url(data:font/woff2;base64,${readFileSync(join(ROOT, "node_modules/geist/dist/fonts/geist-sans/Geist-Medium.woff2")).toString("base64")})}
    @font-face{font-family:GeistSemi;src:url(data:font/woff2;base64,${readFileSync(join(ROOT, "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.woff2")).toString("base64")})}
    html,body{margin:0;background:#0a0a0a;color:#ededed;font-family:Geist}
    header{padding:44px 40px 0;display:flex;align-items:baseline;gap:24px}
    h1{font:600 44px GeistSemi;margin:0;letter-spacing:-0.02em}
    header p{margin:0;color:#8f8f8f;font-size:22px}
    main{display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:40px;padding:36px 40px}
    figure{margin:0;position:relative}
    figure img{display:block;width:100%;border-radius:6px}
    .pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .label{position:absolute;top:16px;left:16px;width:64px;height:64px;border-radius:50%;background:#0a0a0a;color:#ededed;box-shadow:0 0 0 2px rgba(237,237,237,.85);font:600 36px/64px GeistSemi;text-align:center}
    figcaption{margin-top:14px;font-size:26px;line-height:1.3;color:#ededed}
  </style><header><h1>${item.title}</h1><p>${item.blank}</p></header><main>${files
    .map((f) => `<figure>${imgs(f)}<div class="label">${f.o.label}</div><figcaption>${escape(f.o.caption)}</figcaption></figure>`)
    .join("")}</main>`;
  writeFileSync(join(OUT, `${item.slug}-options.png`), await png(html, width, Math.round(height), 1));
}

function readme(): string {
  const cell = (t: string): string => t.replace(/\|/g, "\\|");
  const items = ITEMS.map((item) => {
    const rows = item.options.map((o) => {
      const files = o.render ? `[render](${item.slug}/${o.label}-render.webp), [photo](${item.slug}/${o.label}.webp)` : `[photo](${item.slug}/${o.label}.webp)`;
      return `| **${o.label}** | ${cell(o.description)} ${files} | ${cell(o.method)} | ${cell(o.colors)} | ${cell(o.placement)} | ${cell(o.flag ?? "")} |`;
    });
    return [`## ${item.title}`, "", `[${item.slug}-options.png](${item.slug}-options.png). ${item.blank}`, "", "| | Option | Method | Colors | Size and placement | Fourthwall |", "| --- | --- | --- | --- | --- | --- |", ...rows].join("\n");
  });
  return `${README_HEAD}\n${items.join("\n\n")}\n\n${README_TAIL}`;
}

const README_HEAD = `# Merch options

Design round for the Text.js collection, November 2026. None of this is on the live store at textjs.org/merch. Once an option is picked for each item, the store, artwork and tech packs are updated to match.

Each photo is a generated blank product with the real vector artwork composited on at the size and position listed, so every letter and ▼ is exact. Embroidered ▼ marks are turned into stitches by an image edit and then fitted back onto the exact ▼. Tee and hoodie sizes are one print size for every garment size, shown on a size L. "Left chest" is the wearer's left.
`;

const FENCE = "`".repeat(3);
const README_TAIL = [
  "## Fourthwall limits that apply",
  "",
  "- **DTG** (on demand, no minimum) prints colors from the file. Pantone spot colors are only matched by screen printing, which needs a minimum order: 75 units per the Help Center, 48 to 50 per the pricing sheet.",
  "- **Embroidery** allows up to 15,000 stitches and six thread colors, lowercase letters at least 0.25 in tall and strokes at least 0.05 in thick. The pricing sheet lists embroidery up to 4 × 4 in.",
  "- **Die-cut stickers** come in 2, 3, 4, 5 and 6 in sizes on white vinyl with a matte laminate. The cut follows the artwork's outline and there are no transparent areas, so each sticker's white edge is drawn into its artwork.",
  "",
  "## Regenerating",
  "",
  `${FENCE}sh`,
  "cd merch",
  "set -a; . ~/.config/textjs/openai.env; set +a   # only for blanks or edits not in photos/cache",
  "bun scripts/options-blanks.ts high               # blanks used only by this round",
  "bun scripts/options.ts                           # photos, contact sheets and this file",
  FENCE,
  "",
  "The image cache (`photos/cache/`) is local and ignored, so a fresh checkout calls the image API again for the five new blanks and the four embroidery edits. Options A for the cap and hoodie reuse the store's photos.",
  "",
].join("\n");

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

if (import.meta.main) {
  const only = process.argv.slice(2);
  mkdirSync(OUT, { recursive: true });
  for (const item of ITEMS) if (!only.length || only.includes(item.slug)) await writeItem(item);
  writeFileSync(join(OUT, "README.md"), readme());
  await close();
}


export {
  BLACK,
  BOTTLE,
  CAP_BACK_QUAD,
  CAP_MARK,
  embroider,
  embroideryPrompt,
  FITS,
  fit,
  HAND_STICKER,
  HOODIE_BACK,
  HOODIE_FLAT,
  ink,
  LAPTOP_PPI,
  lineArt,
  markArt,
  NOTEBOOK,
  on,
  onSurface,
  PAIR_BACK,
  PAIR_FRONT,
  pngFromWebp,
  rect,
  refine,
  shot,
  sizeIn,
  stackArt,
  blockMarkArt,
  stickerConsole,
  stickerKeys,
  stickerMark,
  stickerMm,
  stickerPercentC,
  stickerWordmark,
  studio,
  sub,
  TEE_BACK,
  TEE_FRONT,
  THREAD_WHITE,
  vinyl,
  WHITE,
  wordmarkArt,
  type Garment,
  type Sticker,
};
