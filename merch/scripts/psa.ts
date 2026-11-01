/**
 * PSA Tee and PSA Sticker (design-round options A and S1, merch/options/meme.md), set in the layout of the 2004
 * "Piracy. It's a crime." frames. Measured on the "YOU WOULDN'T STEAL A CAR" frame (1280 × 720):
 *
 *   - Two lines fill about 86% of the frame's width, each centred.
 *   - Each word has its own size and baseline: "YOU" (cap 178 px) sits high and "WOULDN'T" (160) drops 38 px;
 *     "STEAL" (145) and the small "A" (120, raised 25 px) lead into the large "CAR" (200), dropped 100 px.
 *   - Tracking is wide, about 0.25 of the cap height, and word gaps are about 0.45 of it.
 *   - Letters bob a few pixels off their word's baseline ("STEAL"'s L drops 22 px).
 *
 * Our text runs to three lines with the same rules: YOU WOULDN'T / RENDER A WEBSITE / IN THE CONSOLE, with
 * "RENDER A WEBSITE" set like "STEAL A CAR" and "IN THE CONSOLE" like "YOU WOULDN'T". No footage, artwork,
 * logos, marks or font from the ad: the type is Barlow Condensed (OFL) with the distress from scripts/meme.ts.
 */
import { measure, svgDoc, text, fmt, IN } from "./lib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import opentype from "opentype.js";
import { capOf, distressed } from "./meme";

// Barlow Condensed Bold, widened 12%: the ad's letters are heavier and wider than Barlow Condensed SemiBold.
const BARLOW = (() => {
  const buf = readFileSync(join(import.meta.dir, "..", "fonts", "BarlowCondensed-Bold.ttf"));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
})();
const WIDEN = 1.12;

interface Word {
  text: string;
  /** Cap height, in units of the reference frame's pixels. */
  cap: number;
  /** Baseline offset from the line's baseline (positive is lower). */
  drop: number;
  /** Per-letter baseline offsets, in reference pixels. */
  bob?: number[];
}

/** The reference frame's lines, rewritten. Word widths come from the font; everything else is measured. */
const LINES: Word[][] = [
  [
    { text: "YOU", cap: 178, drop: 0, bob: [0, -4, 2] },
    { text: "WOULDN’T", cap: 160, drop: 38, bob: [0, 3, -2, 0, 4, 0, 0, -3] },
  ],
  [
    { text: "RENDER", cap: 145, drop: 0, bob: [0, 4, -3, 0, 6, 20] },
    { text: "A", cap: 120, drop: -25 },
    { text: "WEBSITE", cap: 200, drop: 100, bob: [0, -4, 3, 0, -2, 5, 0] },
  ],
  [
    { text: "IN", cap: 145, drop: 0, bob: [0, 5] },
    { text: "THE", cap: 120, drop: -25, bob: [0, 3, -2] },
    { text: "CONSOLE", cap: 200, drop: 100, bob: [0, -3, 4, 0, -5, 2, 0] },
  ],
];
/** Baseline of each line's first word, and the gap ratios, from the reference. */
const LINE_STEP = 260; // from "YOU"'s baseline (240) to "STEAL"'s (490), plus room for the dropped big word
const TRACK = 0.13;
const WORD_GAP = 0.45;

/** Lays out LINES in reference pixels; returns path data and the block's bounds. */
function setLines(): { d: string; w: number; h: number } {
  const words = LINES.map((line) =>
    line.map((w) => {
      const size = w.cap / capOf(BARLOW);
      const track = TRACK * w.cap;
      return { ...w, size, track, width: measure(BARLOW, w.text, size, track / WIDEN) * WIDEN };
    }),
  );
  const lineW = words.map((line) => line.reduce((n, w, i) => n + w.width + (i ? WORD_GAP * Math.max(w.cap, line[i - 1]!.cap) : 0), 0));
  const W = Math.max(...lineW);
  let d = "";
  let top = Infinity;
  let bottom = -Infinity;
  words.forEach((line, li) => {
    // Each line's first-word baseline: the first line's cap top at 0, then LINE_STEP plus the previous line's drop.
    const base = line[0]!.cap + li * LINE_STEP + (li > 1 ? 70 : 0) + (li ? Math.max(...words[li - 1]!.map((w) => w.drop)) * 0.55 : 0);
    let x = (W - lineW[li]!) / 2;
    line.forEach((w, wi) => {
      if (wi) x += WORD_GAP * Math.max(w.cap, line[wi - 1]!.cap);
      const y = base + w.drop;
      let cx = x;
      [...w.text].forEach((ch, ci) => {
        const by = y + (w.bob?.[ci] ?? 0);
        d += `<path transform="translate(${fmt(cx)} 0) scale(${WIDEN} 1)" d="${text(BARLOW, ch, 0, by, w.size)}"/>`;
        cx += measure(BARLOW, ch, w.size) * WIDEN + w.track;
        top = Math.min(top, by - w.cap);
        bottom = Math.max(bottom, by + (ch === "’" ? 0 : 0));
      });
      x += w.width;
    });
  });
  return { d: `<g transform="translate(0 ${fmt(-top)})" fill="#ffffff">${d}</g>`, w: W, h: bottom - top };
}

/** The block as distressed white type, `wIn` wide. */
export function psaBlock(wIn: number, small = false): string {
  const { d, w, h } = setLines();
  const k = (wIn * IN) / w;
  const body = `<g transform="scale(${fmt(k)})">${d}</g>`;
  // Distress scale is set by a representative cap height in millimetres (the 160 px "WOULDN'T").
  // Bigger, sparser pits and a rougher edge than the design round, closer to the ad's blotted ink.
  // On the 4 in sticker the type is a third of the tee's size, so the pits are finer and fewer.
  return distressed(body, w * k, h * k, 160 * k, 2, small ? { edgeFreq: 0.7, edge: 0.06, pitFreq: 1.8, pitCut: 6.1, jitter: 0.1 } : { edgeFreq: 0.3, edge: 0.07, pitFreq: 0.8, pitCut: 5.6, jitter: 0.1 });
}

/** The PSA Sticker: the block on a black 16:9 card with a white edge, `wIn` wide. */
export function psaCard(wIn: number): string {
  const w = wIn * IN;
  const h = (w * 9) / 16;
  const edge = 0.12 * IN;
  const block = psaBlock((wIn - 2 * 0.12) * 0.84, true);
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(block) as RegExpExecArray;
  const [bw, bh] = [Number(vb[1]), Number(vb[2])];
  const inner = block.replace(/^[\s\S]*?<\/title>/, "").replace(/<\/svg>\s*$/, "");
  const r = h * 0.1;
  return svgDoc(
    w,
    h,
    `<rect width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(r)}" fill="#ffffff"/><rect x="${fmt(edge)}" y="${fmt(edge)}" width="${fmt(w - 2 * edge)}" height="${fmt(h - 2 * edge)}" rx="${fmt(r - edge * 0.6)}" fill="#0b0b0b"/><g transform="translate(${fmt((w - bw) / 2)} ${fmt((h - bh) / 2)})">${inner}</g>`,
    "PSA Sticker",
  );
}
