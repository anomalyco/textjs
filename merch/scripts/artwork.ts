/**
 * Writes the print-ready artwork in merch/artwork/. Every file is a physical-size SVG (millimetres)
 * with all type converted to outlines, one group per ink or thread, and no raster content.
 *
 *   cd merch && bun install && bun run frame && bun run artwork
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { command, fmt, fonts, IN, mark, MARK_RATIO, measure, MONO_ADVANCE, MONO_CAP_HEIGHT, option, svgDoc, text } from "./lib";

const OUT = join(import.meta.dir, "..", "artwork");

/** Console colors in the captured frame, and the spot color each one prints as. */
export const INKS: Record<string, { id: string; name: string; hex: string }> = {
  "#ededed": { id: "ink-1-white", name: "White (water-based discharge)", hex: "#ededed" },
  "#a1a1a1": { id: "ink-2-cool-gray-6c", name: "PANTONE Cool Gray 6 C", hex: "#a1a1a1" },
  "#6b6b70": { id: "ink-3-cool-gray-9c", name: "PANTONE Cool Gray 9 C", hex: "#6b6b70" },
};

interface Run {
  row: number;
  col: number;
  text: string;
  color: string;
  bold: boolean;
}
const frame = JSON.parse(readFileSync(join(OUT, "frame.json"), "utf8")) as { cols: number; rows: number; runs: Run[] };

/** DevTools draws the frame at 12px with a 16px line box, and SF Mono's advance is 0.6em. */
const CELL_RATIO = 16 / (12 * 0.6);

function write(name: string, svg: string): void {
  writeFileSync(join(OUT, name), svg);
  console.log(`wrote artwork/${name}`);
}

/** One console cell: block elements become exact rectangles, ▼ becomes the mark, the rest is Geist Mono. */
function cell(ch: string, x: number, y: number, w: number, h: number, bold: boolean): string {
  switch (ch) {
    case "█":
      return `M${fmt(x)} ${fmt(y)}h${fmt(w)}v${fmt(h)}h${fmt(-w)}Z`;
    case "▀":
      return `M${fmt(x)} ${fmt(y)}h${fmt(w)}v${fmt(h / 2)}h${fmt(-w)}Z`;
    case "▄":
      return `M${fmt(x)} ${fmt(y + h / 2)}h${fmt(w)}v${fmt(h / 2)}h${fmt(-w)}Z`;
    case "▼": {
      const mw = w * 0.86;
      const capTop = y + h / 2 - (w / MONO_ADVANCE) * MONO_CAP_HEIGHT * 0.5;
      return mark(x + (w - mw) / 2, capTop, mw);
    }
    default: {
      const size = w / MONO_ADVANCE;
      // Centre the cap height in the line box, as DevTools does for a 12px font in a 16px line.
      const baseline = y + h / 2 + size * MONO_CAP_HEIGHT * 0.5;
      return text(bold ? fonts.monoBold : fonts.mono, ch, x, baseline, size);
    }
  }
}

/** The whole 104×32 frame at `widthMm` wide, one <g> per ink. */
function framePaths(widthMm: number): { body: string; height: number } {
  const w = widthMm / frame.cols;
  const h = w * CELL_RATIO;
  const byInk = new Map<string, string>();
  for (const run of frame.runs) {
    let col = run.col;
    for (const ch of run.text) {
      if (ch !== " ") byInk.set(run.color, (byInk.get(run.color) ?? "") + cell(ch, col * w, run.row * h, w, h, run.bold));
      col++;
    }
  }
  const body = [...byInk]
    .map(([color, d]) => {
      const ink = INKS[color];
      if (!ink) throw new Error(`no ink mapped for ${color}`);
      return `  <g id="${ink.id}" fill="${ink.hex}"><path d="${d}"/></g>`;
    })
    .join("\n");
  return { body, height: frame.rows * h };
}

// ── 1. The mark ────────────────────────────────────────────────────────────────
write("mark.svg", svgDoc(100, 100 * MARK_RATIO, `  <path d="${mark(0, 0, 100)}" fill="#000"/>`, "Text.js mark, master (100 mm)"));

// ── 2. Frame Tee: front chest lockup, the frame's first line ───────────────────
{
  const width = 2.75 * IN;
  const cellW = width / 9; // "▼ Text.js" is 9 cells
  const size = cellW / MONO_ADVANCE;
  const capH = size * MONO_CAP_HEIGHT;
  const mw = cellW * 0.86;
  const markH = mw * MARK_RATIO;
  const descent = size * 0.24; // the j descender
  const height = capH + descent;
  const d = mark((cellW - mw) / 2, (capH - markH) / 2, mw) + text(fonts.monoBold, "Text.js", cellW * 2, capH, size);
  write("frame-tee-front.svg", svgDoc(width, height, `  <g id="ink-1-white" fill="#ededed"><path d="${d}"/></g>`, "Frame Tee, front chest: ▼ Text.js, 2.75 in wide, 1 ink"));
}

// ── 3. Frame Tee: back, the full first frame ───────────────────────────────────
{
  const width = 12 * IN;
  const { body, height } = framePaths(width);
  write("frame-tee-back.svg", svgDoc(width, height, body, "Frame Tee, back: the first textjs.org console frame (104×32 cells), 12 in wide, 3 inks"));
}

// ── 4. Hoodie and cap: tonal ▼ for embroidery ──────────────────────────────────
for (const [name, inches, title] of [
  ["hoodie-chest.svg", 1.75, "Hoodie, centre chest: ▼ 1.75 in wide, tonal satin-stitch embroidery"],
  ["cap-front.svg", 1.6, "Cap, front: ▼ 1.6 in wide, tonal satin-stitch embroidery"],
] as const) {
  const w = inches * IN;
  write(name, svgDoc(w, w * MARK_RATIO, `  <g id="thread-black" fill="#111111"><path d="${mark(0, 0, w)}"/></g>`, title));
}
{
  const capH = 0.34 * IN;
  const size = capH / MONO_CAP_HEIGHT;
  const label = "textjs.org";
  // Fourthwall's embroidery minimums: lowercase 0.25 in tall and strokes 0.05 in thick. At a 0.34 in cap height
  // Geist Mono's x-height is about 0.25 in and Bold's stems are about 1.5 mm.
  const width = measure(fonts.monoBold, label, size);
  write("cap-back.svg", svgDoc(width, capH * 1.32, `  <g id="thread-black" fill="#111111"><path d="${text(fonts.monoBold, label, 0, capH, size)}"/></g>`, "Cap, back above the strap: textjs.org in Geist Mono Bold, 0.34 in cap height (0.25 in lowercase), tonal embroidery"));
}

// ── 5. Printed neck label (tagless), shared by the tee and hoodie ──────────────
{
  const W = 2 * IN;
  const H = 1.25 * IN;
  const lines: Array<[string, number, boolean]> = [
    ["Text.js", 3.4, true],
    ["M", 3.4, false],
    ["100% cotton", 2.3, false],
    ["Made in USA", 2.3, false],
    ["Machine wash cold", 2.3, false],
    ["textjs.org", 2.3, false],
  ];
  let d = "";
  let y = 4.2;
  const markW = 3.6;
  d += mark((W - (markW + 1.4 + measure(fonts.monoBold, "Text.js", 3.4 / MONO_CAP_HEIGHT))) / 2, y - 3.4, markW);
  for (const [i, [str, cap, bold]] of lines.entries()) {
    const size = cap / MONO_CAP_HEIGHT;
    const f = bold ? fonts.monoBold : fonts.mono;
    let x = (W - measure(f, str, size)) / 2;
    if (i === 0) x += (markW + 1.4) / 2;
    d += text(f, str, x, y, size);
    y += i === 0 ? 7 : i === 1 ? 5.2 : 3.9;
  }
  write("neck-label.svg", svgDoc(W, H, `  <g id="ink-1-white" fill="#ededed"><path d="${d}"/></g>`, "Printed neck label, size M shown, 2 × 1.25 in, 1 ink"));
}

// ── 6. Sticker sheet: Fourthwall "Kiss Cut Sticker Sheet with Custom Background", 5.83 × 8.27 in ──
// The sticker stock is white and Fourthwall adds a 0.12 in white border around every sticker, so the
// stickers are white shapes with black artwork on a black background: the border reads as part of the sticker.
{
  const W = 148.1;
  const H = 210.1;
  const BORDER = 3.05; // Fourthwall's white border (0.12 in), drawn here as the cut preview
  const white: string[] = [];
  const black: string[] = [];
  const cuts: string[] = [];
  const round = (x: number, y: number, w: number, h: number, r: number): string =>
    `M${fmt(x + r)} ${fmt(y)}H${fmt(x + w - r)}A${r} ${r} 0 0 1 ${fmt(x + w)} ${fmt(y + r)}V${fmt(y + h - r)}A${r} ${r} 0 0 1 ${fmt(x + w - r)} ${fmt(y + h)}H${fmt(x + r)}A${r} ${r} 0 0 1 ${fmt(x)} ${fmt(y + h - r)}V${fmt(y + r)}A${r} ${r} 0 0 1 ${fmt(x + r)} ${fmt(y)}Z`;
  const triangleOutset = (x: number, y: number, w: number, pad: number): string => {
    // The same triangle scaled about its incentre, so every edge sits `pad` outside.
    const h = w * MARK_RATIO;
    const side = Math.hypot(w / 2, h);
    const r = (w * h) / (w + 2 * side);
    const k = (r + pad) / r;
    return mark(x + w / 2 - (w / 2) * k, y + r - r * k, w * k);
  };

  // a. The ▼, black, cut to shape (it gets Fourthwall's white border).
  {
    const w = 64;
    const x = (W - w) / 2;
    const y = 16;
    black.push(mark(x, y, w));
    cuts.push(triangleOutset(x, y, w, BORDER));
  }
  // b. Wordmark: ▼ Text.js in Geist SemiBold, black on a white rounded rectangle.
  {
    const bw = 84;
    const bh = 24;
    const x = (W - bw) / 2;
    const y = 88;
    white.push(round(x, y, bw, bh, 5));
    cuts.push(round(x - BORDER, y - BORDER, bw + 2 * BORDER, bh + 2 * BORDER, 5 + BORDER));
    const capH = 9;
    const size = capH / 0.7;
    const tw = measure(fonts.sansSemiBold, "Text.js", size, -0.02 * size);
    const mw = capH * 1.15;
    const gap = 3;
    const left = x + (bw - (mw + gap + tw)) / 2;
    black.push(mark(left, y + (bh - mw * MARK_RATIO) / 2, mw));
    black.push(text(fonts.sansSemiBold, "Text.js", left + mw + gap, y + (bh + capH) / 2, size, -0.02 * size));
  }
  // c. %c, the console's CSS format specifier, and the ▼ from the first frame's block-letter font.
  {
    const y = 126;
    const s1 = 30;
    const x1 = 22;
    white.push(round(x1, y, s1, s1, 5));
    cuts.push(round(x1 - BORDER, y - BORDER, s1 + 2 * BORDER, s1 + 2 * BORDER, 5 + BORDER));
    const capH = 10;
    const size = capH / MONO_CAP_HEIGHT;
    const tw = measure(fonts.mono, "%c", size);
    black.push(text(fonts.mono, "%c", x1 + (s1 - tw) / 2, y + (s1 + capH) / 2, size));

    const cw = 3.6;
    const ch = cw * 1.25;
    const bw = 7 * cw + 14;
    const x2 = W - 22 - bw;
    white.push(round(x2, y, bw, s1, 5));
    cuts.push(round(x2 - BORDER, y - BORDER, bw + 2 * BORDER, s1 + 2 * BORDER, 5 + BORDER));
    const left = x2 + 7;
    const top = y + (s1 - 4 * ch) / 2;
    for (let r = 0; r < 4; r++) black.push(`M${fmt(left + r * cw)} ${fmt(top + r * ch)}h${fmt((7 - 2 * r) * cw)}v${fmt(ch)}h${fmt(-(7 - 2 * r) * cw)}Z`);
  }
  // d. ⌘ ⌥ J, the DevTools Console shortcut on macOS, as three keycaps.
  const strokes: string[] = [];
  {
    const s1 = 26;
    const gap = 15;
    const total = 3 * s1 + 2 * gap;
    const x0 = (W - total) / 2;
    const y = 170;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * (s1 + gap);
      white.push(round(x, y, s1, s1, 4.5));
      cuts.push(round(x - BORDER, y - BORDER, s1 + 2 * BORDER, s1 + 2 * BORDER, 4.5 + BORDER));
    }
    strokes.push(`<path d="${command(x0 + s1 / 2, y + s1 / 2, 11)}" fill="none" stroke="#0a0a0a" stroke-width="1.2" stroke-linejoin="round"/>`);
    strokes.push(`<path d="${option(x0 + s1 + gap + s1 / 2, y + s1 / 2, 11.5)}" fill="none" stroke="#0a0a0a" stroke-width="1.2" stroke-linecap="square"/>`);
    const capH = 9;
    const size = capH / MONO_CAP_HEIGHT;
    const jx = x0 + 2 * (s1 + gap);
    black.push(text(fonts.mono, "J", jx + (s1 - measure(fonts.mono, "J", size)) / 2, y + (s1 + capH) / 2, size));
  }
  // Fourthwall adds the border itself (0.12 in outside each sticker's outline), so it is a preview group:
  // leave it out of the uploaded PNG. The background is set as the sheet's custom background color.
  const outline = [...white, black[0] as string].join("");
  const body = [
    `  <rect id="background" width="${fmt(W)}" height="${fmt(H)}" fill="#0a0a0a"/>`,
    `  <g id="border-preview-added-by-fourthwall"><path d="${outline}" fill="#ffffff" stroke="#ffffff" stroke-width="${fmt(BORDER * 2)}" stroke-linejoin="round"/></g>`,
    `  <g id="sticker-white" fill="#ffffff"><path d="${white.join("")}"/></g>`,
    `  <g id="sticker-black" fill="#0a0a0a"><path d="${black.join("")}"/>${strokes.join("")}</g>`,
  ].join("\n");
  void cuts;
  write("sticker-sheet.svg", svgDoc(W, H, body, "Sticker sheet for Fourthwall's Kiss Cut Sticker Sheet with Custom Background, 5.83 × 8.27 in. Background #0a0a0a. The white border group previews the 0.12 in border Fourthwall adds; leave it out of the upload"));
}

// ── 7. Keycaps: ⌘ ⌥ J legends on Cherry-profile black PBT ──────────────────────
{
  const U = 19.05; // key pitch
  const base = (u: number): number => u * U - 1.05; // keycap base width (18.0 mm at 1u)
  const keys: Array<{ u: number; legend: "cmd" | "opt" | "J" }> = [
    { u: 1.25, legend: "cmd" },
    { u: 1.25, legend: "opt" },
    { u: 1, legend: "J" },
  ];
  let x = 4;
  const y = 4;
  const guides: string[] = [];
  const legends: string[] = [];
  for (const k of keys) {
    const w = base(k.u);
    const cx = x + w / 2;
    const cy = y + 9 - 0.8; // Cherry tops sit slightly behind centre
    guides.push(`<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="18" rx="1.5"/>`);
    guides.push(`<rect x="${fmt(x + (w - (w - 5.6)) / 2)}" y="${fmt(y + 1.6)}" width="${fmt(w - 5.6)}" height="12.6" rx="2.2"/>`);
    if (k.legend === "cmd") legends.push(`<path d="${command(cx, cy, 5.4)}" fill="none" stroke="#a1a1a1" stroke-width="0.6" stroke-linejoin="round"/>`);
    else if (k.legend === "opt") legends.push(`<path d="${option(cx, cy, 5.6)}" fill="none" stroke="#a1a1a1" stroke-width="0.6" stroke-linecap="square"/>`);
    else {
      const capH = 4.6;
      const size = capH / MONO_CAP_HEIGHT;
      legends.push(`<path d="${text(fonts.mono, "J", cx - measure(fonts.mono, "J", size) / 2, cy + capH / 2, size)}" fill="#a1a1a1"/>`);
    }
    x += w + 4;
  }
  const body = [
    `  <g id="guides-do-not-print" fill="none" stroke="#00a0e9" stroke-width="0.15" stroke-dasharray="0.6 0.6">${guides.join("")}</g>`,
    `  <g id="legend-cool-gray-6c">${legends.join("")}</g>`,
  ].join("\n");
  write("keycaps.svg", svgDoc(x, 26, body, "Keycap legends: ⌘ (1.25u), ⌥ (1.25u), J (1u, homing bar). Reverse dye-sublimation on black PBT, legend Cool Gray 6 C"));
}

// ── 8. Notebook cover: A5, blind deboss ────────────────────────────────────────
{
  const W = 145;
  const H = 210;
  const w = 22;
  const body = [
    `  <rect id="cover-guide-do-not-print" width="${W}" height="${H}" fill="none" stroke="#00a0e9" stroke-width="0.2"/>`,
    `  <g id="deboss-blind" fill="#000"><path d="${mark((W - w) / 2, 78, w)}"/></g>`,
  ].join("\n");
  write("notebook-cover.svg", svgDoc(W, H, body, "Notebook front cover, A5 (145 × 210 mm): ▼ 22 mm wide, blind deboss, top edge 78 mm from the head"));
}
