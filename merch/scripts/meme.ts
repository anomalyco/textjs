/**
 * The PSA tee and sticker: Adam's riff on the 2004 "You wouldn't steal a car" anti-piracy ad. Only the
 * wording and the format are borrowed. The ad's artwork, logos and MPA/FACT marks are not used, and
 * neither is its font (XBAND Rough is a personal-use-only clone of FF Confidential). The type is Barlow
 * Condensed (SIL Open Font License, merch/fonts/OFL.txt) with our own distress: a displaced, ragged edge,
 * pitted ink and a few scanline bands knocked sideways. The distress is 1-bit (every pixel is ink or
 * shirt), so it prints by DTG or screen print without halftones.
 *
 *   bun scripts/meme.ts   # options/meme/*.webp, options/meme-options.png
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import opentype from "opentype.js";
import { fmt, fonts, IN, MARK_RATIO, mark, measure, svgDoc, text } from "./lib";
import {
  BOTTLE,
  ink,
  LAPTOP_PPI,
  markArt,
  NOTEBOOK,
  on,
  onSurface,
  PAIR_BACK,
  PAIR_FRONT,
  rect,
  shot,
  sizeIn,
  stickerMm,
  studio,
  TEE_BACK,
  TEE_FRONT,
  vinyl,
  wordmarkArt,
} from "./options";
import { optionBasePath } from "./options-blanks";
import { basePath } from "./photos";
import { close, png, webp } from "./render";

const ROOT = join(import.meta.dir, "..");
const OUT = join(ROOT, "options", "meme");
mkdirSync(OUT, { recursive: true });
const W = 1024;
const H = 1280;
const INK = "#ededea";

const loadFont = (file: string): opentype.Font => {
  const buf = readFileSync(join(ROOT, "fonts", file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const BARLOW = loadFont("BarlowCondensed-SemiBold.ttf");
const capOf = (f: opentype.Font): number => (f.charToGlyph("H").getBoundingBox().y2 ?? 0) / f.unitsPerEm;

// ── Type ────────────────────────────────────────────────────────────────────────────────────────
/** A run of text in one font; runs on a line share a cap height. */
interface Run {
  text: string;
  font: opentype.Font;
  tracking?: number;
}
type Line = Run[];
const caps = (t: string): Run => ({ text: t, font: BARLOW, tracking: 0.04 });
const mono = (t: string): Run => ({ text: t, font: fonts.monoMedium, tracking: 0 });

/** Lays out centered lines at a cap height of `capMm`; returns path data and the block's size. */
function layout(lines: Line[], capMm: number, leading = 1.55, gaps: number[] = []): { d: string; w: number; h: number } {
  const widths = lines.map((line) => line.reduce((n, r) => n + measure(r.font, r.text, capMm / capOf(r.font), (r.tracking ?? 0) * (capMm / capOf(r.font))), 0));
  const w = Math.max(...widths);
  let d = "";
  let y = capMm;
  lines.forEach((line, i) => {
    let x = (w - (widths[i] as number)) / 2;
    for (const r of line) {
      const size = capMm / capOf(r.font);
      const ls = (r.tracking ?? 0) * size;
      d += text(r.font, r.text, x, y, size, ls);
      x += measure(r.font, r.text, size, ls);
    }
    y += capMm * leading + (gaps[i] ?? 0) * capMm;
  });
  return { d, w, h: y - capMm * leading - (gaps[lines.length - 1] ?? 0) * capMm };
}

// ── Distress ────────────────────────────────────────────────────────────────────────────────────
let seed = 1;
/**
 * Wraps `body` (white paths in a `w` × `h` mm box) in the distress: a fractal-noise displacement for the
 * ragged edge, noise-thresholded pits knocked out of the ink, then a hard alpha threshold so the result
 * is 1-bit. A few horizontal bands are shifted sideways, like a jittering scanline.
 */
interface Distress {
  /** Edge noise frequency (per mm) and displacement (as a fraction of the cap height, capped at 1.4 mm). */
  edgeFreq?: number;
  edge?: number;
  /** Pit noise frequency (per mm) and cut-off (higher cuts fewer pits). */
  pitFreq?: number;
  pitCut?: number;
  /** Share of scanline bands knocked sideways. */
  jitter?: number;
}

function distressed(body: string, w: number, h: number, capMm: number, pad = 2, o: Distress = {}): string {
  const s = seed++;
  const W2 = w + 2 * pad;
  const H2 = h + 2 * pad;
  const band = capMm * 0.16;
  const bands: string[] = [];
  const defs: string[] = [];
  let rnd = s * 9301;
  const next = (): number => ((rnd = (rnd * 9301 + 49297) % 233280) / 233280);
  for (let y = -pad, i = 0; y < h + pad; y += band, i++) {
    const shift = next() < (o.jitter ?? 0.14) ? (next() - 0.5) * capMm * 0.18 : 0;
    defs.push(`<clipPath id="b${s}-${i}" clipPathUnits="userSpaceOnUse"><rect x="${fmt(-pad)}" y="${fmt(y)}" width="${fmt(W2)}" height="${fmt(band + 0.01)}"/></clipPath>`);
    bands.push(`<g clip-path="url(#b${s}-${i})"><g transform="translate(${fmt(shift)} 0)">${body}</g></g>`);
  }
  // Frequencies are per millimetre, so the texture is the same at any print size.
  const filter = `<filter id="r${s}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="${fmt(-pad)}" y="${fmt(-pad)}" width="${fmt(W2)}" height="${fmt(H2)}" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${o.edgeFreq ?? 0.4}" numOctaves="3" seed="${s}" result="n1"/>
    <feDisplacementMap in="SourceGraphic" in2="n1" scale="${fmt(Math.min(1.4, capMm * (o.edge ?? 0.065)))}" xChannelSelector="R" yChannelSelector="G" result="rough"/>
    <feTurbulence type="fractalNoise" baseFrequency="${o.pitFreq ?? 1.6}" numOctaves="2" seed="${s + 40}" result="n2"/>
    <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  9 0 0 0 -${o.pitCut ?? 5.45}" result="pits"/>
    <feComposite in="rough" in2="pits" operator="out" result="inked"/>
    <feComponentTransfer in="inked"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>
  </filter>`;
  return svgDoc(W2, H2, `<defs>${filter}${defs.join("")}</defs><g transform="translate(${fmt(pad)} ${fmt(pad)})" filter="url(#r${s})">${bands.join("")}</g>`, "distressed");
}

/** Distressed white type at `wIn` wide. */
function psa(lines: Line[], wIn: number, fill = "#ffffff", leading = 1.55, gaps: number[] = []): string {
  const probe = layout(lines, 10, leading, gaps);
  const capMm = (10 * wIn * IN) / probe.w;
  const { d, w, h } = layout(lines, capMm, leading, gaps);
  return distressed(`<path d="${d}" fill="${fill}"/>`, w, h, capMm);
}

/** "We would." in Geist Medium, then the ▼ Text.js wordmark, on one line, `wIn` wide (clean, not distressed). */
function weWould(wIn: number, fill = "#ffffff"): string {
  const cap = 10;
  const sizeG = cap / 0.71;
  const t1 = measure(fonts.sansMedium, "We would.", sizeG);
  const mark0 = wordmarkArt(1, fill);
  const [mw, mh] = sizeIn(mark0).map((v) => v * IN) as [number, number];
  // The wordmark is drawn at the same cap height: its own cap height is 0.166 of its width.
  const wmW = cap / 0.1658;
  const k = wmW / mw;
  const gap = cap * 1.6;
  const total = t1 + gap + wmW;
  const s = (wIn * IN) / total;
  const inner = mark0.replace(/^[\s\S]*?<\/title>/, "").replace(/<\/svg>\s*$/, "");
  const body = `<g transform="scale(${fmt(s)})"><path d="${text(fonts.sansMedium, "We would.", 0, cap * 1.02, sizeG)}" fill="${fill}"/><g transform="translate(${fmt(t1 + gap)} ${fmt(cap * 1.02 - cap - (mh * k - cap) * 0.2)}) scale(${fmt(k)})">${inner}</g></g>`;
  return svgDoc(wIn * IN, cap * 1.35 * s, body, "We would. ▼ Text.js");
}

/** A 16:9 screen: distressed type inside a thin rounded outline, ▼ Text.js small in the corner. */
function screen(wIn: number): string {
  const w = wIn * IN;
  const h = (w * 9) / 16;
  const stroke = w * 0.006;
  const lines: Line[] = [[caps("YOU WOULDN’T")], [caps("RENDER A WEBSITE")], [caps("IN THE CONSOLE")]];
  const probe = layout(lines, 10);
  const capMm = (10 * w * 0.62) / probe.w;
  const block = layout(lines, capMm);
  const tx = (w - block.w) / 2;
  const ty = (h - block.h) / 2;
  const wm = wordmarkArt((w * 0.14) / IN, "#ffffff");
  const [ww, wh] = sizeIn(wm).map((v) => v * IN) as [number, number];
  const wmInner = wm.replace(/^[\s\S]*?<\/title>/, "").replace(/<\/svg>\s*$/, "");
  const body = `<rect x="${fmt(stroke / 2)}" y="${fmt(stroke / 2)}" width="${fmt(w - stroke)}" height="${fmt(h - stroke)}" rx="${fmt(w * 0.025)}" fill="none" stroke="#ffffff" stroke-width="${fmt(stroke)}"/><g transform="translate(${fmt(tx)} ${fmt(ty)})"><path d="${block.d}" fill="#ffffff"/></g><g transform="translate(${fmt(w - ww - w * 0.04)} ${fmt(h - wh - w * 0.035)})">${wmInner}</g>`;
  return distressed(body, w, h, capMm);
}

// ── Stickers ────────────────────────────────────────────────────────────────────────────────────
const EDGE = 0.12 * IN;
/** A black rounded card with a white edge and distressed white type, `wIn` × `hIn`. */
function card(lines: Line[], wIn: number, hIn: number, fill = 0.78, gaps: number[] = []): string {
  const w = wIn * IN;
  const h = hIn * IN;
  const art = psa(lines, (wIn - 2 * 0.12) * fill, "#ffffff", 1.45, gaps);
  const [aw, ah] = sizeIn(art).map((v) => v * IN) as [number, number];
  const inner = art.replace(/^[\s\S]*?<\/title>/, "").replace(/<\/svg>\s*$/, "");
  const r = Math.min(w, h) * 0.12;
  return svgDoc(w, h, `<rect width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(r)}" fill="#ffffff"/><rect x="${fmt(EDGE)}" y="${fmt(EDGE)}" width="${fmt(w - 2 * EDGE)}" height="${fmt(h - 2 * EDGE)}" rx="${fmt(r - EDGE * 0.6)}" fill="#0b0b0b"/><g transform="translate(${fmt((w - aw) / 2)} ${fmt((h - ah) / 2)})">${inner.replace(/id="(r|b)(\d+)/g, 'id="$1$2c').replace(/url\(#(r|b)(\d+)/g, "url(#$1$2c")}</g>`, "PSA sticker");
}

// ── Concepts ────────────────────────────────────────────────────────────────────────────────────
interface Concept {
  label: string;
  caption: string;
  description: string;
  placement: string;
  photo: () => Promise<Buffer>;
  render?: () => Promise<Buffer>;
}

const L_THREE: Line[] = [[caps("YOU WOULDN’T")], [caps("RENDER A WEBSITE")], [caps("IN THE CONSOLE")]];
const L_ADAM: Line[] = [[caps("YOU WOULDN’T RENDER")], [caps("IN THE CONSOLE.")]];
const L_BEATS: Line[] = [[caps("YOU WOULDN’T STEAL A CAR")], [caps("YOU WOULDN’T STEAL A HANDBAG")], [caps("YOU WOULDN’T RENDER IN "), mono("console.log")]];
const L_BACK: Line[] = [[caps("YOU WOULDN’T STEAL A CAR")], [caps("YOU WOULDN’T STEAL A HANDBAG")], [caps("YOU WOULDN’T STEAL A TELEVISION")], [caps("YOU WOULDN’T RENDER A WEBSITE")], [caps("IN THE CONSOLE")]];

const display = (svg: string): string => svg.replace(/#ffffff/g, INK);
const print = (svg: string, g: typeof TEE_FRONT, top: number, dx = 0) => ink(display(svg), on(g, svg, top, dx), { texture: 0.6 });

const TEES: Concept[] = [
  {
    label: "A",
    caption: "Three lines, front; ▼ Text.js, back",
    description: "YOU WOULDN’T / RENDER A WEBSITE / IN THE CONSOLE across the chest, and a small ▼ Text.js below the back collar.",
    placement: "Front: 11 in wide (1.06 in cap height), centered, top 3 in below the neck seam. Back: wordmark 3 in wide, top 2 in below the back neck seam",
    photo: async () => shot(basePath("tee-pair"), 120, [print(psa(L_THREE, 11), PAIR_FRONT, 3), print(wordmarkArt(3, "#ffffff"), PAIR_BACK, 2)]),
  },
  {
    label: "B",
    caption: "The ad's beats, console.log last",
    description: "Three beats in the ad's order, the last one ending in console.log in Geist Mono.",
    placement: "Front: 11 in wide (0.6 in cap height), centered, top 3 in below the neck seam",
    photo: async () => shot(basePath("tee-front"), 130, [print(psa(L_BEATS, 11, "#ffffff", 2.2), TEE_FRONT, 3)]),
  },
  {
    label: "C",
    caption: "Adam's line, front; We would., back",
    description: "YOU WOULDN’T RENDER / IN THE CONSOLE. on the front; We would. ▼ Text.js small on the back.",
    placement: "Front: 10 in wide (1.25 in cap height), centered, top 3 in below the neck seam. Back: 3.5 in wide, top 2 in below the back neck seam",
    photo: async () => shot(basePath("tee-pair"), 120, [print(psa(L_ADAM, 10), PAIR_FRONT, 3), print(weWould(3.5), PAIR_BACK, 2)]),
  },
  {
    label: "D",
    caption: "Full sequence on the back, ▼ on the chest",
    description: "The whole sequence down the back, ending on the console; a 1.5 in ▼ on the left chest.",
    placement: "Back: 11 in wide, 5 lines, centered, top 3 in below the back neck seam. Front: ▼ 1.5 in, left chest",
    photo: async () => shot(basePath("tee-pair"), 120, [print(psa(L_BACK, 11, "#ffffff", 1.9), PAIR_BACK, 3), ink(display(markArt(1.5)), on(PAIR_FRONT, markArt(1.5), 1.75, 3.75))]),
  },
  {
    label: "E",
    caption: "The frame: a 16:9 screen",
    description: "The three lines inside a thin 16:9 screen outline, with ▼ Text.js in the corner.",
    placement: "Front: 11 × 6.19 in, centered, top 3 in below the neck seam",
    photo: async () => shot(basePath("tee-front"), 130, [print(screen(11), TEE_FRONT, 3)]),
  },
  {
    label: "F",
    caption: "Small, left chest; ▼ Text.js, back",
    description: "Adam's line at pocket size on the left chest, with the wordmark on the back.",
    placement: "Front: 4 in wide, left chest, top 1.75 in below the neck seam. Back: wordmark 3 in, top 2 in below the back neck seam",
    photo: async () => shot(basePath("tee-front"), 130, [print(psa(L_ADAM, 4), TEE_FRONT, 1.75, 3.5)]),
  },
];

const S1 = (): string => card(L_THREE, 4, 2.25, 0.78);
const S2 = (): string => card(L_ADAM, 3.5, 1.3, 0.86);
const S3 = (): string => card([[caps("YOU WOULDN’T STEAL A CAR")], [caps("YOU WOULDN’T RENDER IN "), mono("console.log")]], 3, 1.1, 0.86, [0.25]);

const STICKERS: Concept[] = [
  {
    label: "S1",
    caption: "16:9 card, 4 in",
    description: "The three lines on a black 16:9 card with a white edge, like a frame of the ad.",
    placement: "Die-cut, 4 × 2.25 in",
    render: () => studio(S1(), 700, -4),
    photo: async () => {
      const [w, h] = stickerMm(S1());
      return shot(optionBasePath("sticker-laptop-close"), 200, [vinyl(S1(), rect(540, 780, (w / IN) * LAPTOP_PPI, (h / IN) * LAPTOP_PPI, -6), { shadow: { dx: 2, dy: 4, blur: 5, opacity: 0.5 } })]);
    },
  },
  {
    label: "S2",
    caption: "Adam's line, 3.5 in",
    description: "YOU WOULDN’T RENDER / IN THE CONSOLE. on a black strip.",
    placement: "Die-cut, 3.5 × 1.3 in",
    render: () => studio(S2(), 740, 3),
    photo: async () => {
      const [w, h] = stickerMm(S2());
      return shot(basePath("notebook"), 150, [vinyl(S2(), onSurface(NOTEBOOK, 145, 210, 60, 110, w, h, -5), { shadow: { dx: 1, dy: 2, blur: 2.5, opacity: 0.5 } })]);
    },
  },
  {
    label: "S3",
    caption: "Two beats, 3 in",
    description: "YOU WOULDN’T STEAL A CAR over YOU WOULDN’T RENDER IN console.log.",
    placement: "Die-cut, 3 × 1.1 in",
    render: () => studio(S3(), 700, -3),
    photo: async () => {
      const px = BOTTLE.ppi;
      const [w, h] = stickerMm(S3());
      return shot(optionBasePath("sticker-bottle"), 128, [vinyl(S3(), rect(BOTTLE.cx, 760, (w / IN) * px * 0.82, (h / IN) * px * 0.82), { cylinder: { cx: BOTTLE.cx, r: BOTTLE.r }, shadow: { dx: 0.5, dy: 1, blur: 1.5, opacity: 0.4 }, shade: 0.6 })]);
    },
  },
];

// ── Output ──────────────────────────────────────────────────────────────────────────────────────
async function save(name: string, bytes: Buffer): Promise<string> {
  const file = join(OUT, `${name}.webp`);
  writeFileSync(file, (await webp(bytes, [W], 0.9)).get(W) as Buffer);
  writeFileSync(join(ROOT, "photos", "check", `meme-${name}.png`), bytes);
  return file;
}

async function sheet(tees: Array<[Concept, string]>, stickers: Array<[Concept, string, string]>): Promise<void> {
  const font = (f: string): string => `data:font/woff2;base64,${readFileSync(join(ROOT, "node_modules/geist/dist/fonts", f)).toString("base64")}`;
  const img = (f: string): string => `<img src="data:image/webp;base64,${readFileSync(f).toString("base64")}">`;
  const cell = 760;
  const html = `<!doctype html><style>
    @font-face{font-family:G;src:url(${font("geist-sans/Geist-Medium.woff2")})}
    @font-face{font-family:GS;src:url(${font("geist-sans/Geist-SemiBold.woff2")})}
    html,body{margin:0;background:#0a0a0a;color:#ededed;font-family:G}
    header{padding:44px 40px 0}
    h1{font:600 44px GS;margin:0;letter-spacing:-0.02em}
    h2{font:600 32px GS;margin:0;padding:40px 40px 0}
    header p{margin:10px 0 0;color:#8f8f8f;font-size:22px;max-width:2200px}
    main{display:grid;grid-template-columns:repeat(3,${cell}px);gap:40px;padding:28px 40px}
    figure{margin:0;position:relative}
    figure img{display:block;width:100%;border-radius:6px}
    .pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .label{position:absolute;top:16px;left:16px;min-width:64px;height:64px;padding:0 10px;box-sizing:border-box;border-radius:32px;background:#0a0a0a;color:#ededed;box-shadow:0 0 0 2px rgba(237,237,237,.85);font:600 34px/64px GS;text-align:center}
    figcaption{margin-top:14px;font-size:26px;line-height:1.3}
  </style><header><h1>PSA tee and sticker</h1><p>The 2004 anti-piracy ad's wording and format, rewritten. Barlow Condensed (open license) with our own 1-bit distress; no artwork, logos or font from the ad. White ink on AS Colour 5082; die-cut stickers.</p></header>
  <h2>Tee</h2><main>${tees.map(([c, f]) => `<figure>${img(f)}<div class="label">${c.label}</div><figcaption>${c.caption}</figcaption></figure>`).join("")}</main>
  <h2>Sticker</h2><main>${stickers.map(([c, r, f]) => `<figure><div class="pair">${img(r)}${img(f)}</div><div class="label">${c.label}</div><figcaption>${c.caption}</figcaption></figure>`).join("")}</main>`;
  const height = 150 + 90 + 2 * (cell * 1.25 + 110) + 90 + ((cell / 2 - 4) * 1.25 + 110) + 40;
  writeFileSync(join(ROOT, "options", "meme-options.png"), await png(html, 3 * cell + 4 * 40, Math.round(height), 1));
}

function readme(): string {
  const row = (c: Concept, kind: string): string => `| **${c.label}** | ${c.description} ([photo](meme/${kind}-${c.label}.webp)${c.render ? `, [render](meme/${kind}-${c.label}-render.webp)` : ""}) | ${c.placement} |`;
  return [
    "# PSA tee and sticker (design round)",
    "",
    "Adam's riff on the 2004 anti-piracy ad (\"You wouldn't steal a car\"): YOU WOULDN'T RENDER IN THE CONSOLE. Contact sheet: [meme-options.png](meme-options.png). Adam picked tee A and sticker S1; both are in the store as the PSA Tee and PSA Sticker, re-set in the ad's layout ([tech-packs/psa.md](../tech-packs/psa.md)).",
    "",
    "## Legal",
    "",
    "- Only the wording and the format are borrowed. No footage, artwork, logos, or MPA or FACT marks from the ad.",
    "- The ad's font is FF Confidential (Just van Rossum, 1992, licensed through Monotype); its campaign materials used XBAND Rough, an unlicensed clone whose license allows personal use only. Neither is used here.",
    "- The type is Barlow Condensed SemiBold, SIL Open Font License 1.1 (`merch/fonts/OFL.txt`), which allows it in products for sale. console.log is Geist Mono, also OFL. The distress is our own: a noise-displaced edge, pitted ink and a few scanline bands shifted sideways (`scripts/meme.ts`).",
    "",
    "## Decoration",
    "",
    "The distress is 1-bit: every pixel is ink or shirt, with no grays. It prints as is by DTG, and by screen printing as one white screen with no halftone. If the finest pits fill in on a screen-print sample, coarsen them in `scripts/meme.ts`. On Fourthwall the tee is the AS Colour 5082 (Printed), the stickers die-cut (Allcolor 957).",
    "",
    "## Copy",
    "",
    "- **Name:** PSA Tee, PSA Sticker",
    "- **Description:** The 2004 anti-piracy ad's format, with a new last line: YOU WOULDN’T RENDER IN THE CONSOLE. White distressed type on a heavyweight black tee.",
    "",
    "## Tee",
    "",
    "| | Concept | Size and placement |",
    "| --- | --- | --- |",
    ...TEES.map((c) => row(c, "tee")),
    "",
    "## Sticker",
    "",
    "| | Concept | Size |",
    "| --- | --- | --- |",
    ...STICKERS.map((c) => row(c, "sticker")),
    "",
  ].join("\n");
}

if (import.meta.main) {
  const tees: Array<[Concept, string]> = [];
  for (const c of TEES) {
    tees.push([c, await save(`tee-${c.label}`, await c.photo())]);
    console.log(`tee ${c.label}`);
  }
  const stickers: Array<[Concept, string, string]> = [];
  for (const c of STICKERS) {
    const r = await save(`sticker-${c.label}-render`, await (c.render as () => Promise<Buffer>)());
    stickers.push([c, r, await save(`sticker-${c.label}`, await c.photo())]);
    console.log(`sticker ${c.label}`);
  }
  await sheet(tees, stickers);
  console.log("wrote options/meme-options.png");
  writeFileSync(join(ROOT, "options", "meme.md"), readme());
  console.log("wrote options/meme.md");
  await close();
}

export { TEES, STICKERS, psa, card, distressed, L_THREE, L_ADAM, BARLOW, capOf };
void MARK_RATIO;
void mark;
