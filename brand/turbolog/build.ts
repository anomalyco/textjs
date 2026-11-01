/**
 * Turbolog logo concepts: writes each concept's SVGs and renders the comparison sheet.
 *
 *   cd merch && bun install   # Geist, opentype.js and playwright-core live there
 *   bun brand/turbolog/build.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type opentype from "opentype.js";
import { fmt, fonts, measure, text } from "../../merch/scripts/lib.ts";
import { close, png } from "../../merch/scripts/render.ts";

const OUT = import.meta.dir;
const ROOT = join(OUT, "..", "..");

/** Accent gradient, green into yellow. Clear of Turbopack and Turborepo's blue-to-red. */
const G1 = "#00d68f";
const G2 = "#f5e14a";

type Paint = { fg: string; accent: string };
type Concept = {
  letter: string;
  slug: string;
  name: string;
  line: string;
  /** Drawn content in the 32-unit mark box: [x0, y0, x1, y1]. */
  box: [number, number, number, number];
  /** userSpaceOnUse gradient vector in the 32-unit box. */
  grad: [number, number, number, number];
  mark: (p: Paint) => string;
  /** Hinted geometry for 16px and 32px, when the full mark has detail below a pixel. */
  small?: (p: Paint) => string;
  font: opentype.Font;
  tracking: number;
};

const poly = (pts: Array<[number, number]>, fill: string): string =>
  `<path d="M${pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L")}Z" fill="${fill}"/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string): string =>
  `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" fill="${fill}"/>`;

/* ───────────── A · Append: the ▼ cut into three appended frames ───────────── */

function append({ fg, accent }: Paint): string {
  const w = (y: number): number => (32 * (30 - y)) / 28;
  const band = (y0: number, y1: number, fill: string): string =>
    poly(y1 >= 30 ? [[16 - w(y0) / 2, y0], [16 + w(y0) / 2, y0], [16, 30]] : [[16 - w(y0) / 2, y0], [16 + w(y0) / 2, y0], [16 + w(y1) / 2, y1], [16 - w(y1) / 2, y1]], fill);
  return band(2, 10, fg) + band(12, 20, fg) + band(22, 30, accent);
}

/* ───────────── B · Runs: the ▼ in character cells, top row run-length encoded ───────────── */

function runs({ fg, accent }: Paint): string {
  const c = 3.6;
  const g = 0.8;
  const h = 6;
  const gy = (28 - 4 * h) / 3;
  let out = rect(1, 2, 30, h, accent);
  for (let r = 1; r < 4; r++) {
    for (let i = r; i < 7 - r; i++) out += rect(1 + i * (c + g), 2 + r * (h + gy), c, h, fg);
  }
  return out;
}

function runsSmall({ fg, accent }: Paint): string {
  return rect(2, 2, 28, 6, accent) + rect(6, 10, 20, 6, fg) + rect(10, 18, 12, 6, fg) + rect(14, 26, 4, 6, fg);
}

/* ───────────── C · Descent: the ▼ moving down the console ───────────── */

function descent({ fg, accent }: Paint): string {
  const lines: Array<[number, number]> = [
    [6, 4],
    [12, 0],
    [18, 2],
    [24, 6],
  ];
  return lines.map(([x, top]) => rect(x, top, 2, 10 - top, accent)).join("") + poly([[2, 12], [30, 12], [16, 32]], fg);
}

/* ───────────── D · Percent: %c, with the ▼ and a character cell as the dots ───────────── */

function percent({ fg, accent }: Paint): string {
  return poly([[2, 2], [16, 2], [9, 14]], fg) + poly([[22, 2], [28, 2], [10, 30], [4, 30]], fg) + rect(20, 16, 9, 14, accent);
}

/* ───────────── E · Gate: the row-hash gate above the ▼ ───────────── */

function gate({ fg, accent }: Paint): string {
  const gap = 2 * Math.SQRT2;
  const top = 17;
  const apex = 27 - gap;
  const half = apex - top;
  return `<path d="M16 0L32 16L16 32L0 16ZM16 5L5 16L16 27L27 16Z" fill-rule="evenodd" fill="${accent}"/>` + poly([[16 - half, top], [16 + half, top], [16, apex]], fg);
}

/* ───────────── F · Cursor: T and L sharing a stem on a 4×4 cell grid ───────────── */

function cursor({ fg, accent }: Paint): string {
  return `<path d="M0 0H24V8H16V24H24V32H8V8H0Z" fill="${fg}"/>` + rect(26, 24, 6, 8, accent);
}

const CONCEPTS: Concept[] = [
  {
    letter: "A",
    slug: "append",
    name: "Append",
    line: "The ▼ cut into three appended frames, with the newest at the bottom.",
    box: [0, 2, 32, 30],
    grad: [6, 22, 26, 30],
    mark: append,
    font: fonts.sansSemiBold,
    tracking: -0.04,
  },
  {
    letter: "B",
    slug: "runs",
    name: "Runs",
    line: "The ▼ drawn in character cells, with its top row encoded as one %c span.",
    box: [1, 2, 31, 30],
    grad: [1, 2, 31, 8],
    mark: runs,
    small: runsSmall,
    font: fonts.sansSemiBold,
    tracking: -0.04,
  },
  {
    letter: "C",
    slug: "descent",
    name: "Descent",
    line: "The ▼ with motion lines, moving down the console like appended frames.",
    box: [2, 0, 30, 32],
    grad: [16, 10, 16, 0],
    mark: descent,
    font: fonts.sansSemiBold,
    tracking: -0.04,
  },
  {
    letter: "D",
    slug: "percent",
    name: "Percent",
    line: "A % sign whose dots are the ▼ and a character cell, as in %c.",
    box: [2, 2, 29, 30],
    grad: [20, 16, 29, 30],
    mark: percent,
    font: fonts.monoMedium,
    tracking: -0.06,
  },
  {
    letter: "E",
    slug: "gate",
    name: "Gate",
    line: "The ▼ inside a diamond gate, for the row-hash check that stops unchanged frames.",
    box: [0, 0, 32, 32],
    grad: [0, 0, 32, 32],
    mark: gate,
    font: fonts.sansSemiBold,
    tracking: -0.04,
  },
  {
    letter: "F",
    slug: "cursor",
    name: "Cursor",
    line: "T and L sharing a stem on a 4×4 cell grid, with a block cursor in the last cell.",
    box: [0, 0, 32, 32],
    grad: [26, 24, 32, 32],
    mark: cursor,
    font: fonts.monoSemiBold,
    tracking: -0.06,
  },
];

/* ───────────── SVG output ───────────── */

/** Gradient ids are stable in the written files and numbered on the sheet, where every SVG shares one document. */
let uid: number | undefined;
function gradient(c: Concept, id: string): string {
  const [x1, y1, x2, y2] = c.grad;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop stop-color="${G1}"/><stop offset="1" stop-color="${G2}"/></linearGradient>`;
}

type Mode = "color" | "mono";

function paint(c: Concept, mode: Mode, fg: string): { defs: string; p: Paint } {
  if (mode === "mono") return { defs: "", p: { fg, accent: fg } };
  const id = uid === undefined ? `turbolog-${c.slug}` : `turbolog-${c.slug}-${uid++}`;
  return { defs: `<defs>${gradient(c, id)}</defs>`, p: { fg, accent: `url(#${id})` } };
}

function markSvg(c: Concept, mode: Mode, opts: { fg?: string; small?: boolean; size?: number } = {}): string {
  const { defs, p } = paint(c, mode, opts.fg ?? "currentColor");
  const draw = opts.small && c.small ? c.small : c.mark;
  const size = opts.size ? ` width="${opts.size}" height="${opts.size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${size} fill="none" role="img" aria-label="Turbolog">${defs}${draw(p)}</svg>`;
}

const capOf = (f: opentype.Font): number => (f.charToGlyph("H").getBoundingBox().y2 ?? 0) / f.unitsPerEm;
const descOf = (f: opentype.Font): number => -(f.charToGlyph("g").getBoundingBox().y1 ?? 0) / f.unitsPerEm;

/** Mark plus "Turbolog", outlined. Mark content is 1.3× the cap height, centred on the caps. */
function lockupSvg(c: Concept, mode: Mode, opts: { fg?: string; height?: number } = {}): string {
  const fg = opts.fg ?? "currentColor";
  const { defs, p } = paint(c, mode, fg);
  const size = 40;
  const cap = capOf(c.font) * size;
  const [x0, y0, x1, y1] = c.box;
  const markH = cap * 1.3;
  const s = markH / (y1 - y0);
  const markW = (x1 - x0) * s;
  const gap = markH * 0.4;
  const top = 0;
  const baseline = top + (markH + cap) / 2;
  const tx = markW + gap;
  const tracking = c.tracking * size;
  const width = tx + measure(c.font, "Turbolog", size, tracking);
  const height = baseline + descOf(c.font) * size;
  const d = text(c.font, "Turbolog", tx, baseline, size, tracking);
  const h = opts.height ? ` height="${opts.height}" width="${fmt((width / height) * opts.height)}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(width)} ${fmt(height)}"${h} fill="none" role="img" aria-label="Turbolog">${defs}<g transform="translate(${fmt(-x0 * s)} ${fmt(top - y0 * s)}) scale(${fmt(s)})">${c.mark(p)}</g><path d="${d}" fill="${fg}"/></svg>`;
}

const write = (file: string, svg: string): void => writeFileSync(join(OUT, file), `${svg}\n`);

for (const c of CONCEPTS) {
  const dir = `${c.letter.toLowerCase()}-${c.slug}`;
  mkdirSync(join(OUT, dir), { recursive: true });
  write(`${dir}/mark.svg`, markSvg(c, "color"));
  write(`${dir}/mark-mono.svg`, markSvg(c, "mono"));
  if (c.small) write(`${dir}/mark-small.svg`, markSvg(c, "mono", { small: true }));
  write(`${dir}/lockup.svg`, lockupSvg(c, "color"));
  write(`${dir}/lockup-mono.svg`, lockupSvg(c, "mono"));
}

/* ───────────── Comparison sheet ───────────── */

uid = 0;

const dataUri = (mime: string, buf: Buffer): string => `data:${mime};base64,${buf.toString("base64")}`;

/** The mono mark rasterised at 1× by Chromium, as a browser tab would draw it. */
async function raster(c: Concept, px: number, bg: string, fg: string): Promise<string> {
  const html = `<html><body style="margin:0;background:${bg}">${markSvg(c, "mono", { fg, small: true, size: px })}</body></html>`;
  return dataUri("image/png", await png(html, px, px, 1));
}

const font = (file: string): string => dataUri("font/woff2", readFileSync(join(ROOT, "apps/web/public/fonts", file)));

async function row(c: Concept): Promise<string> {
  const [k16, k32, w16, w32] = await Promise.all([raster(c, 16, "#000", "#fff"), raster(c, 32, "#000", "#fff"), raster(c, 16, "#fff", "#000"), raster(c, 32, "#fff", "#000")]);
  return `
  <section class="row">
    <div class="meta">
      <div class="letter">${c.letter}</div>
      <div class="name">${c.name}</div>
      <p>${c.line}</p>
    </div>
    <div class="tile big">${markSvg(c, "color", { fg: "#fff" })}</div>
    <div class="locks">
      <div class="tile lock dark">${lockupSvg(c, "color", { fg: "#fff", height: 34 })}</div>
      <div class="tile lock light">${lockupSvg(c, "color", { fg: "#000", height: 34 })}</div>
      <div class="pair">
        <div class="tile lock dark sm">${lockupSvg(c, "mono", { fg: "#fff", height: 20 })}</div>
        <div class="tile lock light sm">${lockupSvg(c, "mono", { fg: "#000", height: 20 })}</div>
      </div>
    </div>
    <div class="sizes">
      <div class="tile px dark"><img src="${k16}" width="16" height="16"><img src="${k32}" width="32" height="32"><img class="zoom" src="${k16}" width="64" height="64"></div>
      <div class="tile px light"><img src="${w16}" width="16" height="16"><img src="${w32}" width="32" height="32"><img class="zoom" src="${w16}" width="64" height="64"></div>
    </div>
    <div class="tile context">
      <div class="eyebrow">${lockupSvg(c, "color", { fg: "#ededed", height: 18 })}</div>
      <h2>Every changed frame is one <code>console.log</code> call</h2>
      <p>A commit that changes no cells never reaches the console.</p>
    </div>
  </section>`;
}

const rows = [];
for (const c of CONCEPTS) rows.push(await row(c));

const W = 1880;
const ROW_H = 260;
const HEAD_H = 132;
const H = HEAD_H + CONCEPTS.length * ROW_H + 40;

const html = `<!doctype html><html><head><style>
@font-face { font-family: Geist; src: url(${font("geist-latin.woff2")}) format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Geist Mono"; src: url(${font("geist-mono-latin.woff2")}) format("woff2"); font-weight: 100 900; }
* { box-sizing: border-box; }
body { margin: 0; width: ${W}px; height: ${H}px; background: #0a0a0a; color: #ededed; font-family: Geist, sans-serif; padding: 40px 48px; }
header { height: ${HEAD_H - 40}px; display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.1); }
header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.03em; }
header p { margin: 6px 0 0; color: #a1a1a1; font-size: 14px; }
.cols { display: grid; grid-template-columns: 300px 220px 440px 248px 1fr; gap: 20px; font-family: "Geist Mono"; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #707070; margin-top: 18px; }
.legend { display: flex; gap: 16px; align-items: center; font-size: 13px; color: #a1a1a1; }
.legend i { display: inline-block; width: 28px; height: 10px; border-radius: 2px; background: linear-gradient(90deg, ${G1}, ${G2}); vertical-align: middle; margin-right: 8px; }
.row { height: ${ROW_H}px; display: grid; grid-template-columns: 300px 220px 440px 248px 1fr; gap: 20px; align-items: center; border-bottom: 1px solid rgba(255,255,255,.08); }
.meta .letter { font-family: "Geist Mono"; font-size: 13px; color: #707070; }
.meta .name { font-size: 26px; font-weight: 600; letter-spacing: -0.03em; margin: 2px 0 8px; }
.meta p { margin: 0; color: #a1a1a1; font-size: 14px; line-height: 1.5; }
.tile { border-radius: 10px; border: 1px solid rgba(255,255,255,.1); }
.dark { background: #000; }
.light { background: #fff; border-color: #fff; }
.big { width: 220px; height: 220px; background: #000; display: grid; place-items: center; }
.big svg { width: 120px; height: 120px; }
.locks { display: grid; gap: 10px; }
.lock { height: 70px; display: grid; place-items: center; }
.lock.sm { height: 50px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sizes { display: grid; gap: 10px; }
.px { height: 100px; display: flex; align-items: center; justify-content: center; gap: 22px; }
.px img { image-rendering: pixelated; }
.px .zoom { outline: 1px dashed rgba(128,128,128,.35); outline-offset: 4px; }
.context { height: 220px; background: #000; padding: 30px 32px; border-color: rgba(255,255,255,.12); overflow: hidden; }
.context .eyebrow { height: 18px; margin-bottom: 16px; display: flex; }
.context h2 { margin: 0 0 12px; font-size: 32px; line-height: 1.05; font-weight: 700; letter-spacing: -0.045em; color: #ededed; }
.context h2 code { font-family: "Geist Mono"; font-size: .86em; letter-spacing: -0.03em; font-weight: 600; }
.context p { margin: 0; color: #a1a1a1; font-size: 16px; }
</style></head><body>
<header>
  <div><h1>Turbolog logo concepts</h1><p>Mark, lockup (colour and one-colour), mono mark at 16px and 32px (with 16px at 4×), and the landing page's Turbolog section with the lockup as its eyebrow.</p></div>
  <div class="legend"><span><i></i>Accent ${G1} → ${G2}</span><span>Wordmarks: Geist SemiBold (A, B, C, E), Geist Mono (D, F)</span></div>
</header>
<div class="cols"><span>Concept</span><span>Mark</span><span>Lockup</span><span>16px · 32px · 16px at 4×</span><span>In context</span></div>
${rows.join("")}
</body></html>`;

writeFileSync(join(OUT, "concepts.png"), await png(html, W, H, 2));
console.log(`wrote ${CONCEPTS.length} concepts and concepts.png`);

/* ───────────── Final: concept E with "TURBOLOG" ───────────── */

/**
 * The mark on a 32-unit grid. The ring is the diamond with a hollow of half-width 11.5; the ▼ runs
 * parallel to the ring's lower edges, 3 units clear of them, with its top edge on the diamond's
 * equator (y = 16, a whole pixel at 16px).
 */
const HOLLOW = 11.5;
const CLEAR = 3;
const APEX = 16 + HOLLOW - CLEAR * Math.SQRT2;
const HALF = APEX - 16;
const RING = `M16 0L32 16L16 32L0 16ZM16 ${16 - HOLLOW}L${16 - HOLLOW} 16L16 ${16 + HOLLOW}L${16 + HOLLOW} 16Z`;
const ARROW = `M${fmt(16 - HALF)} 16H${fmt(16 + HALF)}L16 ${fmt(APEX)}Z`;

/** Gradients: the dark one is the concept's; the light one is darker so it holds contrast on white. */
const DARK: [string, string] = [G1, G2];
const LIGHT: [string, string] = ["#00a36c", "#c9a800"];

/** Lockup geometry, in units where the mark is 100 tall. */
const MARK = 100;
const CAP = MARK / 1.4;
const WORD_FONT = fonts.sansSemiBold;
const WORD_SIZE = CAP / capOf(WORD_FONT);
const WORD_X = MARK * 1.28;
const BASELINE = MARK / 2 + CAP / 2;
/** Caps get +0.05em tracking, then per-pair optical spacing on top of Geist's kerning (1/1000 em). */
const TRACKING = 0.05;
const PAIRS: Record<string, number> = { TU: -15, UR: 5, RB: 8, LO: -30 };

function wordmark(str: string): { d: string; width: number } {
  let d = "";
  let x = WORD_X;
  const glyphs = [...str].map((ch) => WORD_FONT.charToGlyph(ch));
  glyphs.forEach((g, i) => {
    d += g
      .getPath(x, BASELINE, WORD_SIZE)
      .commands.map((c) =>
        c.type === "M" || c.type === "L" ? `${c.type}${fmt(c.x)} ${fmt(c.y)}` : c.type === "Q" ? `Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}` : c.type === "C" ? `C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}` : "Z",
      )
      .join("");
    const next = glyphs[i + 1];
    if (!next) {
      x += ((g.getBoundingBox().x2 ?? 0) / WORD_FONT.unitsPerEm) * WORD_SIZE;
      return;
    }
    const kern = WORD_FONT.getKerningValue(g, next) + (PAIRS[str[i]! + str[i + 1]!] ?? 0);
    x += (((g.advanceWidth ?? 0) + kern) / WORD_FONT.unitsPerEm) * WORD_SIZE + TRACKING * WORD_SIZE;
  });
  // opentype.js leaves Geist's contours open; close each one explicitly.
  return { d: `${d.replace(/(?<!^)M/g, "ZM")}Z`.replace(/ZZ/g, "Z"), width: x };
}

const WORD = wordmark("TURBOLOG");
const LOCKUP_W = Math.ceil(WORD.width * 100) / 100;

type Look = { fg: string; gradient: [string, string] | null; id: string };

/** The gradient runs corner to corner of the 32-unit mark; in the lockup it is used inside the scaled group. */
function finalDefs({ gradient, id }: Look): string {
  if (!gradient) return "";
  return `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="32" y2="32"><stop stop-color="${gradient[0]}"/><stop offset="1" stop-color="${gradient[1]}"/></linearGradient></defs>`;
}

function finalMark(look: Look, size?: number): string {
  const ring = look.gradient ? `url(#${look.id})` : look.fg;
  const dims = size ? ` width="${size}" height="${size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"${dims} fill="none" role="img" aria-label="Turbolog">${finalDefs(look)}<path d="${RING}" fill-rule="evenodd" fill="${ring}"/><path d="${ARROW}" fill="${look.fg}"/></svg>`;
}

function finalLockup(look: Look, height?: number): string {
  const s = MARK / 32;
  const ring = look.gradient ? `url(#${look.id})` : look.fg;
  const dims = height ? ` width="${fmt((LOCKUP_W / MARK) * height)}" height="${height}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(LOCKUP_W)} ${MARK}"${dims} fill="none" role="img" aria-label="Turbolog">${finalDefs(look)}<g transform="scale(${fmt(s)})"><path d="${RING}" fill-rule="evenodd" fill="${ring}"/><path d="${ARROW}" fill="${look.fg}"/></g><path d="${WORD.d}" fill="${look.fg}"/></svg>`;
}

const LOOKS: Record<string, Look> = {
  "color-on-black": { fg: "#fff", gradient: DARK, id: "turbolog-dark" },
  "color-on-white": { fg: "#000", gradient: LIGHT, id: "turbolog-light" },
  "mono-on-black": { fg: "#fff", gradient: null, id: "" },
  "mono-on-white": { fg: "#000", gradient: null, id: "" },
};

mkdirSync(join(OUT, "final"), { recursive: true });
for (const [name, look] of Object.entries(LOOKS)) {
  write(`final/turbolog-lockup-${name}.svg`, finalLockup(look));
  write(`final/turbolog-mark-${name}.svg`, finalMark(look));
}

/** Path data for `TurbologLockup` in apps/web/src/site/brand-marks.tsx. */
writeFileSync(
  join(OUT, "final", "paths.json"),
  `${JSON.stringify({ viewBox: `0 0 ${fmt(LOCKUP_W)} ${MARK}`, markScale: MARK / 32, ring: RING, arrow: ARROW, word: WORD.d, baseline: fmt(BASELINE), dark: DARK, light: LIGHT }, null, 2)}\n`,
);

/* ───────────── Final sheet ───────────── */

let sheetId = 0;
const look = (name: keyof typeof LOOKS): Look => ({ ...LOOKS[name]!, id: `${LOOKS[name]!.id}-${sheetId++}` });

async function finalRaster(name: string, px: number, bg: string): Promise<string> {
  const html = `<html><body style="margin:0;background:${bg}">${finalMark(look(name), px)}</body></html>`;
  return dataUri("image/png", await png(html, px, px, 1));
}

const rasters: Record<string, string> = {};
for (const name of Object.keys(LOOKS)) {
  const bg = name.endsWith("black") ? "#000" : "#fff";
  for (const px of [16, 32]) rasters[`${name}-${px}`] = await finalRaster(name, px, bg);
}

/** Construction: cap height and baseline rules, the mark's centre line and the mark-to-word gap. */
function construction(): string {
  const h = 200;
  const k = h / MARK;
  const w = LOCKUP_W * k;
  const y = (v: number): string => fmt(v * k);
  const capTop = BASELINE - CAP;
  return `<svg width="${fmt(w + 232)}" height="${h + 40}" viewBox="-1 -20 ${fmt(w + 232)} ${h + 40}">
    <g stroke="#f5e14a" stroke-opacity=".55" stroke-width="1" stroke-dasharray="4 4">
      <line x1="-1" x2="${fmt(w + 16)}" y1="${y(capTop)}" y2="${y(capTop)}"/>
      <line x1="-1" x2="${fmt(w + 16)}" y1="${y(BASELINE)}" y2="${y(BASELINE)}"/>
    </g>
    <g stroke="#00d68f" stroke-opacity=".7" stroke-width="1">
      <line x1="-1" x2="${fmt(w + 16)}" y1="${y(MARK / 2)}" y2="${y(MARK / 2)}"/>
      <line x1="${y(MARK)}" x2="${y(MARK)}" y1="-20" y2="${h + 20}"/>
      <line x1="${y(WORD_X)}" x2="${y(WORD_X)}" y1="-20" y2="${h + 20}"/>
    </g>
    <g transform="scale(${fmt(k)})" opacity=".9">${finalLockup(look("mono-on-black")).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</g>
    <g font-family="Geist Mono" font-size="12" fill="#a1a1a1">
      <text x="${fmt(w + 24)}" y="${fmt(Number(y(capTop)) + 4)}">cap height · mark is 1.4×</text>
      <text x="${fmt(w + 24)}" y="${fmt(Number(y(BASELINE)) + 4)}">baseline</text>
      <text x="${fmt(w + 24)}" y="${fmt(Number(y(MARK / 2)) + 4)}">mark centre = cap centre</text>
      <text x="${fmt(Number(y(MARK)) + 4)}" y="${h + 14}">gap 0.28×</text>
    </g>
  </svg>`;
}

const FINAL_W = 1880;
const FINAL_H = 1370;
const finalHtml = `<!doctype html><html><head><style>
@font-face { font-family: Geist; src: url(${font("geist-latin.woff2")}) format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Geist Mono"; src: url(${font("geist-mono-latin.woff2")}) format("woff2"); font-weight: 100 900; }
* { box-sizing: border-box; }
body { margin: 0; width: ${FINAL_W}px; height: ${FINAL_H}px; background: #0a0a0a; color: #ededed; font-family: Geist, sans-serif; padding: 40px 48px; }
header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,.1); margin-bottom: 28px; }
h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.03em; }
header p { margin: 6px 0 0; color: #a1a1a1; font-size: 14px; }
.legend { display: grid; gap: 6px; font-size: 13px; color: #a1a1a1; text-align: right; }
.legend i { display: inline-block; width: 28px; height: 10px; border-radius: 2px; vertical-align: middle; margin-right: 8px; }
.label { font-family: "Geist Mono"; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #707070; margin: 0 0 10px; }
.tile { border-radius: 12px; border: 1px solid rgba(255,255,255,.1); display: grid; place-items: center; }
.black { background: #000; }
.white { background: #fff; border-color: #fff; }
.top { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.top .tile { height: 300px; }
.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 28px; }
.grid4 .tile { height: 150px; gap: 14px; }
.row2 { margin-top: 28px; }
.build { height: 290px; background: #000; }
.small { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.small .tile { height: 150px; grid-auto-flow: column; gap: 28px; }
.small img { image-rendering: pixelated; }
.small .zoom { outline: 1px dashed rgba(128,128,128,.35); outline-offset: 4px; }
.sizes { display: flex; align-items: center; gap: 28px; }
</style></head><body>
<header>
  <div><h1>Turbolog</h1><p>Concept E, Gate. Wordmark: Geist SemiBold caps, outlined, +0.05em tracking with optical pair spacing.</p></div>
  <div class="legend">
    <span><i style="background:linear-gradient(90deg,${DARK[0]},${DARK[1]})"></i>On black ${DARK[0]} → ${DARK[1]}</span>
    <span><i style="background:linear-gradient(90deg,${LIGHT[0]},${LIGHT[1]})"></i>On white ${LIGHT[0]} → ${LIGHT[1]}</span>
  </div>
</header>
<p class="label">Colour</p>
<div class="top">
  <div class="tile black">${finalLockup(look("color-on-black"), 96)}</div>
  <div class="tile white">${finalLockup(look("color-on-white"), 96)}</div>
</div>
<div class="grid4">
  <div><p class="label">One colour on black</p><div class="tile black">${finalLockup(look("mono-on-black"), 48)}</div></div>
  <div><p class="label">One colour on white</p><div class="tile white">${finalLockup(look("mono-on-white"), 48)}</div></div>
  <div><p class="label">Lockup at 24 · 16px</p><div class="tile black" style="grid-auto-flow:row">${finalLockup(look("color-on-black"), 24)}${finalLockup(look("color-on-black"), 16)}</div></div>
  <div><p class="label">Mark</p><div class="tile black" style="grid-auto-flow:column">${finalMark(look("color-on-black"), 96)}${finalMark(look("mono-on-black"), 48)}</div></div>
</div>
<div class="row2">
  <div><p class="label">Construction</p><div class="tile build">${construction()}</div></div>
</div>
<div class="row2">
  <div><p class="label">Mark at 16px · 32px · 16px at 4× (colour and one colour, on black and on white)</p>
    <div class="small">
      ${Object.keys(LOOKS)
        .map((name) => `<div class="tile ${name.endsWith("black") ? "black" : "white"}"><img src="${rasters[`${name}-16`]}" width="16" height="16"><img src="${rasters[`${name}-32`]}" width="32" height="32"><img class="zoom" src="${rasters[`${name}-16`]}" width="64" height="64"></div>`)
        .join("")}
    </div>
  </div>
</div>
</body></html>`;

writeFileSync(join(OUT, "final.png"), await png(finalHtml, FINAL_W, FINAL_H, 2));
console.log("wrote final/ and final.png");

await close();
process.exit(0);
