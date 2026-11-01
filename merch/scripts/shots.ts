/**
 * The store's photographs: each shot is a generated blank (scripts/photos.ts) with the real artwork
 * composited at the position and size from the tech packs. Placements are measured on the cached
 * high-quality blanks with scripts/grid.ts; regenerating a blank means re-measuring its shot.
 *
 * Output: 1024 × 1280 (4:5) masters in photos/final/ (WebP, committed) and 600 / 1024 px WebP for
 * the site in apps/web/src/merch/images/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { composite, type Layer, type Point, type Quad } from "./composite";
import { command, fmt, fonts, IN, mark, MARK_RATIO, measure, MONO_CAP_HEIGHT, option, svgDoc, text } from "./lib";
import { cachedPath, generate } from "./imagegen";
import { basePath, PINNED } from "./photos";
import { close, webp } from "./render";

const ROOT = join(import.meta.dir, "..");
const FINAL = join(ROOT, "photos", "final");
const SITE = join(ROOT, "..", "apps", "web", "src", "merch", "images");
mkdirSync(FINAL, { recursive: true });
mkdirSync(SITE, { recursive: true });

export const OUT_W = 1024;
export const OUT_H = 1280;

const artFile = (name: string): string => readFileSync(join(ROOT, "artwork", name), "utf8");
/** The artwork without its preview-only groups (guides, the sticker border preview stays). */
const clean = (svg: string): string => svg.replace(/<g id="(guides|cover-guide)[^"]*"[\s\S]*?<\/g>|<rect id="cover-guide[^>]*\/>/g, "");
const markSvg = (): string => svgDoc(20, 20 * MARK_RATIO, `<path d="${mark(0, 0, 20)}" fill="#111"/>`, "mark");

/** An upright or rotated rectangle as a quad. */
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

/** Garment print box from the tech pack: centred on `cx`, top `topIn` below `seamY`, at `ppi`. */
function placed(svg: string, cx: number, seamY: number, topIn: number, ppi: number, deg = 0): Quad {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) as RegExpExecArray;
  const w = (Number(vb[1]) / IN) * ppi;
  const h = (Number(vb[2]) / IN) * ppi;
  return rect(cx, seamY + topIn * ppi + h / 2, w, h, deg);
}

// ── Legends for the keycaps (glyph boxes in mm, drawn like artwork/keycaps.svg) ──
const LEGEND = "#a1a1a1";
const legend = {
  cmd: (): string => svgDoc(7, 7, `<path d="${command(3.5, 3.5, 5.4)}" fill="none" stroke="${LEGEND}" stroke-width="0.6" stroke-linejoin="round"/>`, "⌘"),
  opt: (): string => svgDoc(7, 7, `<path d="${option(3.5, 3.5, 5.6)}" fill="none" stroke="${LEGEND}" stroke-width="0.6" stroke-linecap="square"/>`, "⌥"),
  J: (): string => {
    const capH = 4.6;
    const size = capH / MONO_CAP_HEIGHT;
    const w = measure(fonts.mono, "J", size);
    return svgDoc(7, 7, `<path d="${text(fonts.mono, "J", 3.5 - w / 2, 3.5 + capH / 2, size)}" fill="${LEGEND}"/>`, "J");
  },
};

const stitches = (): string => basePath("stitch-texture");

interface Shot {
  name: string;
  base: string;
  /** Top of the 1024 × 1280 crop in the 1024 × 1536 blank. */
  cropY: number;
  layers: () => Layer[];
  /**
   * Embroidery: a flat stand-in of the exact mark is composited first, the image model turns it into
   * stitches (an edit that keeps the photo), and `layers` then fits the stitched mark back onto the
   * exact geometry (a `fit` layer measured on the edit).
   */
  refine?: { fabric: string; quad: Quad; orientation?: string; kind?: "embroidery" | "deboss" };
}

const print = { mode: "print" as const, opacity: 0.93, displace: 0.6, shade: 0.85, texture: 0.55 };
const thread = (quad: Quad, stitchPx: number, relief = 1.5): Layer => ({ svg: markSvg(), quad, mode: "embroidery", stitches: stitches(), stitchPx, relief, color: "#151516" });

/** Measured on each embroidery edit: where the model drew the ▼ (src) and where it belongs (dst). */
const fit = (src: [Point, Point, Point], dst: Quad, feather: number): Layer[] => {
  // dst is the mark's box: the ▼ runs from its top-left and top-right corners to the middle of its bottom edge.
  const [tl, tr, br, bl] = dst;
  const apex: Point = [(br[0] + bl[0]) / 2, (br[1] + bl[1]) / 2];
  return [{ svg: "", quad: dst, mode: "fit", src, dst: [tl, tr, apex], feather }];
};
const FITS: Record<string, Layer[]> = {
  "hoodie-1": fit([[482.8, 595.4], [522.3, 595.1], [501.8, 629.4]], rect(502, 516 + 4 * 20.4 + (1.53 * 20.4) / 2, 1.75 * 20.4, 1.53 * 20.4), 3),
  "hoodie-2": fit([[484.4, 583.1], [522.0, 582.5], [502.7, 618.2]], rect(502, 586 + 14.5, 33.3, 29.1), 3),
  "hoodie-3": fit([[238, 523], [793, 523], [513, 995]], rect(512, 768, 560, 490), 24),
  "cap-1": fit([[389.6, 642], [539.6, 660], [441.4, 773.4]], [[385.9, 636.6], [545.1, 653.4], [525.5, 792.0], [366.3, 775.2]], 6),
  "notebook-1": fit([[524.6, 616], [598.9, 628.6], [551.4, 684.6]], sub([[362, 342], [847, 419], [750, 1117], [204, 1037]], 61.5 / 145, 78 / 210, 83.5 / 145, 97.25 / 210), 4),
  "notebook-2": fit([[180.9, 582.3], [599.1, 585.7], [386.5, 933.7]], rect(390, 768, 420, 367), 18),
  "cap-3": fit([[245, 541], [769, 541], [517, 970]], rect(512, 768, 520, 455), 24),
};

const flatMark = (): string => svgDoc(20, 20 * MARK_RATIO, `<path d="${mark(0, 0, 20)}" fill="#1b1b1c"/>`, "mark");

function debossPrompt(material: string, orientation = "It points straight down."): string {
  return `Photograph edit. Turn the flat dark triangle into a blind deboss pressed into this ${material}: no ink or foil, the triangle is recessed a fraction of a millimeter into the cover with crisp pressed walls, the cover grain continuing inside it, the upper wall in soft shadow and the lower wall catching the light. Keep the triangle's exact shape, size, position and straight edges. ${orientation} Keep everything else in the photo identical. No text, no letters.`;
}

function embroideryPrompt(fabric: string, orientation = "It points straight down."): string {
  return `Photograph edit. Turn the flat dark triangle into real tonal black satin-stitch machine embroidery on this ${fabric}: dense glossy black thread stitched at a diagonal, a slightly raised edge with a thin satin border, and natural sheen that catches the same light as the rest of the photo. Keep the triangle's exact shape, size, position and straight edges. ${orientation} Keep everything else in the photo identical. No text, no letters.`;
}

export const SHOTS: Shot[] = [
  // ── 001 Frame Tee ──
  {
    name: "frame-tee-1",
    base: "tee-pair",
    cropY: 120,
    layers: () => {
      // Back tee: 21.3 px/in, back neck seam y 349, centre x 640. Front tee: 21.2 px/in, front neck seam y 655, centre x 411.
      const back = artFile("frame-tee-back.svg");
      const front = artFile("frame-tee-front.svg");
      return [
        { ...print, svg: back, quad: placed(back, 640, 349, 3, 21.3) },
        { ...print, svg: front, quad: placed(front, 411, 655, 3, 21.2) },
      ];
    },
  },
  {
    name: "frame-tee-2",
    base: "tee-back",
    cropY: 130,
    layers: () => {
      const back = artFile("frame-tee-back.svg");
      return [{ ...print, svg: back, quad: placed(back, 511, 397, 3, 25.7) }];
    },
  },
  {
    name: "frame-tee-3",
    base: "tee-front",
    cropY: 130,
    layers: () => {
      const front = artFile("frame-tee-front.svg");
      return [{ ...print, svg: front, quad: placed(front, 511, 496, 3, 25.7) }];
    },
  },
  {
    name: "frame-tee-4",
    base: "tee-detail",
    cropY: 128,
    layers: () => {
      // Close-up: 12 in of print at 1700 px, the block-letter title centred in the crop.
      const back = artFile("frame-tee-back.svg");
      const w = 1700;
      const h = (w * 208.41) / 304.8;
      const left = 512 - (w * 52.5) / 104;
      const top = 640 - (h * 11.5) / 32;
      return [{ ...print, displace: 1.2, texture: 0.7, svg: back, quad: [[left, top], [left + w, top], [left + w, top + h], [left, top + h]] }];
    },
  },
  {
    name: "frame-tee-5",
    base: "tee-label",
    cropY: 128,
    layers: () => {
      const label = artFile("neck-label.svg");
      return [{ ...print, opacity: 0.9, displace: 0.8, texture: 0.8, svg: label, quad: rect(512, 445 + 103, 330, 206) }];
    },
  },
  // ── 002 Hoodie ──
  {
    name: "hoodie-1",
    base: "hoodie-front",
    cropY: 110,
    // 20.4 px/in, front neck seam y 516: ▼ 1.75 in wide, top 4 in below the seam.
    refine: { fabric: "black heavyweight cotton fleece hoodie", quad: rect(502, 516 + 4 * 20.4 + (1.53 * 20.4) / 2, 1.75 * 20.4, 1.53 * 20.4) },
    layers: () => FITS["hoodie-1"] ?? [],
  },
  {
    name: "hoodie-2",
    base: "hoodie-flat",
    cropY: 120,
    refine: { fabric: "black heavyweight cotton fleece hoodie", quad: rect(502, 586 + 14.5, 33.3, 29.1) },
    layers: () => FITS["hoodie-2"] ?? [],
  },
  {
    name: "hoodie-3",
    base: "fleece-macro",
    cropY: 200,
    refine: { fabric: "black heavyweight cotton fleece sweatshirt", quad: rect(512, 768, 560, 490) },
    layers: () => FITS["hoodie-3"] ?? [],
  },
  // ── 003 Cap ──
  {
    name: "cap-1",
    base: "cap-front-2",
    cropY: 140,
    // Straddling the front seam, apex 0.6 in above the brim seam, at about 100 px/in: the top edge follows the
    // brim seam (6° down to the right) and the axis leans 8° with the front seam.
    refine: { fabric: "black cotton chino twill cap", quad: [[385.9, 636.6], [545.1, 653.4], [525.5, 792.0], [366.3, 775.2]], orientation: "Its top edge follows the brim seam and its point follows the cap's front center seam, so it leans slightly with the cap." },
    layers: () => FITS["cap-1"] ?? [],
  },
  {
    name: "cap-2",
    base: "cap-back",
    cropY: 170,
    layers: () => {
      const label = artFile("cap-back.svg").replace(/#111111/g, "#121213");
      return [{ svg: label, quad: [[208, 748], [452, 732], [452, 772], [208, 790]], mode: "embroidery", stitches: stitches(), stitchPx: 1.2, relief: 1, color: "#151516" }];
    },
  },
  {
    name: "cap-3",
    base: "twill-macro",
    cropY: 128,
    refine: { fabric: "black cotton chino twill cap", quad: rect(512, 768, 520, 455) },
    layers: () => FITS["cap-3"] ?? [],
  },
  // ── 004 Sticker Sheet ──
  {
    name: "stickers-1",
    base: "sticker-sheet",
    cropY: 128,
    layers: () => {
      const sheet = clean(artFile("sticker-sheet.svg")).replace(/<rect id="background"[^>]*\/>/, "");
      return [{ svg: sheet, quad: [[301, 373], [809, 431], [730, 1168], [198, 1101]], mode: "print", opacity: 1, displace: 0, shade: 0.5, texture: 0.15, gloss: 0.6 }];
    },
  },
  {
    name: "stickers-2",
    base: "sticker-laptop",
    cropY: 128,
    layers: () => {
      // Lid 52–971 × 439–1062 px for a 304 mm lid: 3.02 px/mm. Stickers cut from the sheet artwork with their white border.
      const sheet = clean(artFile("sticker-sheet.svg")).replace(/<rect id="background"[^>]*\/>/, "");
      const crop = (x: number, y: number, w: number, h: number): string => sheet.replace(/viewBox="0 0 [\d.]+ [\d.]+"/, `viewBox="${x} ${y} ${w} ${h}"`).replace(/width="[^"]*mm" height="[^"]*mm"/, `width="${w}mm" height="${h}mm"`);
      const s = 3.02;
      const sticker = { mode: "print" as const, opacity: 1, displace: 0, shade: 0.7, texture: 0.08, gloss: 0.3 };
      return [
        { ...sticker, svg: crop(39, 13, 70, 62), quad: rect(700, 690, 70 * s, 62 * s, -7) },
        { ...sticker, svg: crop(29, 85, 90, 30), quad: rect(330, 860, 90 * s, 30 * s, 3) },
        { ...sticker, svg: crop(16.9, 166.9, 32.2, 32.2), quad: rect(440, 640, 32.2 * s, 32.2 * s, -12) },
      ];
    },
  },
  // ── 005 Keycaps ──
  {
    name: "keycaps-1",
    base: "keycaps",
    cropY: 150,
    layers: () => {
      const key = { mode: "print" as const, opacity: 0.95, displace: 0, shade: 0.7, texture: 0.35 };
      // Top faces: 1.25u at about 14.7 px/mm across and 9.6 px/mm deep; the 1u key at 11.5 px/mm.
      return [
        { ...key, svg: legend.cmd(), quad: rect(236, 778, 7 * 14.7, 7 * 9.6) },
        { ...key, svg: legend.opt(), quad: rect(557, 777, 7 * 14.7, 7 * 9.6) },
        { ...key, svg: legend.J(), quad: rect(826, 777, 7 * 11.5, 7 * 9.6) },
      ];
    },
  },
  {
    name: "keycaps-2",
    base: "keyboard",
    cropY: 128,
    layers: () => {
      const key = { mode: "print" as const, opacity: 0.95, displace: 0, shade: 0.7, texture: 0.3 };
      const s = 3.3;
      return [
        { ...key, svg: legend.opt(), quad: rect(143, 755, 7 * s, 7 * s, 15.5) },
        { ...key, svg: legend.cmd(), quad: rect(210, 773, 7 * s, 7 * s, 15.5) },
        { ...key, svg: legend.J(), quad: rect(525, 741, 7 * s, 7 * s, 15.5) },
      ];
    },
  },
  // ── 006 Notebook ──
  {
    name: "notebook-1",
    base: "notebook",
    cropY: 150,
    // The cover is 145 × 210 mm; the ▼ is 22 mm wide with its top 78 mm from the head.
    refine: { kind: "deboss", fabric: "black textured hardcover notebook cover", quad: sub([[362, 342], [847, 419], [750, 1117], [204, 1037]], 61.5 / 145, 78 / 210, 83.5 / 145, 97.25 / 210), orientation: "It points toward the bottom edge of the notebook." },
    layers: () => FITS["notebook-1"] ?? [],
  },
  {
    name: "notebook-2",
    base: "notebook-macro",
    cropY: 128,
    refine: { kind: "deboss", fabric: "black textured hardcover notebook cover", quad: rect(390, 768, 420, 367) },
    layers: () => FITS["notebook-2"] ?? [],
  },
  {
    name: "notebook-3",
    base: "notebook-open",
    cropY: 128,
    layers: () => [],
  },
];

export async function render(only: string[]): Promise<void> {
  for (const shot of SHOTS) {
    if (only.length && !only.some((o) => shot.name.startsWith(o))) continue;
    let base = basePath(shot.base);
    if (shot.refine) {
      const flat = await composite({ base, layers: [{ svg: flatMark(), quad: shot.refine.quad, mode: "flat" }] });
      const flatPath = join(ROOT, "photos", "refine", `${shot.name}-flat.png`);
      mkdirSync(dirname(flatPath), { recursive: true });
      writeFileSync(flatPath, flat);
      const prompt = shot.refine.kind === "deboss" ? debossPrompt(shot.refine.fabric, shot.refine.orientation) : embroideryPrompt(shot.refine.fabric, shot.refine.orientation);
      const pinned = join(PINNED, `${shot.name}-edit.webp`);
      const request = { prompt, size: "1024x1536" as const, quality: "high" as const, refs: [flatPath] };
      // Use the committed edit when the local cache doesn't have this exact request.
      base = existsSync(cachedPath(request)) || !existsSync(pinned) ? await generate(request, `${shot.name} ${shot.refine.kind ?? "embroidery"}`) : pinned;
      writeFileSync(join(ROOT, "photos", "refine", `${shot.name}-edit.txt`), `${base}\n`);
    }
    const png = await composite({ base, layers: shot.layers(), crop: [0, shot.cropY, OUT_W, OUT_H] });
    writeFileSync(join(FINAL, `${shot.name}.png`), png);
    for (const [w, bytes] of await webp(png, [600, OUT_W], 0.9)) writeFileSync(w === OUT_W ? join(FINAL, `${shot.name}.webp`) : join(SITE, `${shot.name}-${w}.webp`), bytes);
    writeFileSync(join(SITE, `${shot.name}-${OUT_W}.webp`), readFileSync(join(FINAL, `${shot.name}.webp`)));
    console.log(`rendered ${shot.name}`);
  }
  await close();
}

/** Copies every blank and embroidery edit the shots use into photos/blanks/ as near-lossless WebP. */
export async function pin(): Promise<void> {
  mkdirSync(PINNED, { recursive: true });
  const files = new Map<string, string>();
  for (const shot of SHOTS) {
    files.set(shot.base, basePath(shot.base));
    const edit = join(ROOT, "photos", "refine", `${shot.name}-edit.txt`);
    if (shot.refine && existsSync(edit)) files.set(`${shot.name}-edit`, readFileSync(edit, "utf8").trim());
  }
  files.set("stitch-texture", basePath("stitch-texture"));
  for (const [name, file] of files) {
    if (file.startsWith(PINNED)) continue;
    const bytes = readFileSync(file);
    const [, out] = [...(await webp(bytes, [1024], 0.95))][0] as [number, Buffer];
    writeFileSync(join(PINNED, `${name}.webp`), out);
    console.log(`pinned ${name}`);
  }
  await close();
}

void fmt;
