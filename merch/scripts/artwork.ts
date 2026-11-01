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
  const capH = 0.25 * IN;
  const size = capH / MONO_CAP_HEIGHT;
  const label = "textjs.org";
  // Bold: at this size Geist Mono Bold's stems are about 1.1 mm, the narrowest satin column that stitches cleanly.
  const width = measure(fonts.monoBold, label, size);
  write("cap-back.svg", svgDoc(width, capH * 1.32, `  <g id="thread-black" fill="#111111"><path d="${text(fonts.monoBold, label, 0, capH, size)}"/></g>`, "Cap, back above the strap: textjs.org in Geist Mono Bold, 0.25 in cap height, tonal embroidery"));
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

// ── 6. Sticker sheet: 4 × 6 in, kiss-cut, black matte vinyl ────────────────────
{
  const W = 4 * IN;
  const H = 6 * IN;
  const print: string[] = [];
  const white: string[] = [];
  const cuts: string[] = [];
  const pad = 1.6; // cut line offset from the art
  const round = (x: number, y: number, w: number, h: number, r: number): string =>
    `M${fmt(x + r)} ${fmt(y)}H${fmt(x + w - r)}A${r} ${r} 0 0 1 ${fmt(x + w)} ${fmt(y + r)}V${fmt(y + h - r)}A${r} ${r} 0 0 1 ${fmt(x + w - r)} ${fmt(y + h)}H${fmt(x + r)}A${r} ${r} 0 0 1 ${fmt(x)} ${fmt(y + h - r)}V${fmt(y + r)}A${r} ${r} 0 0 1 ${fmt(x + r)} ${fmt(y)}Z`;

  // a. The ▼, die-cut to shape (white vinyl look: printed white, cut 1.6 mm outside).
  {
    const w = 52;
    const x = (W - w) / 2;
    const y = 12;
    white.push(mark(x, y, w));
    // Cut line: the same triangle scaled about its incentre, so every edge sits `pad` outside the art.
    const h = w * MARK_RATIO;
    const side = Math.hypot(w / 2, h);
    const r = (w * h) / (w + 2 * side);
    const ix = x + w / 2;
    const iy = y + r;
    const k = (r + pad) / r;
    cuts.push(mark(ix - (w / 2) * k, iy - (iy - y) * k, w * k));
  }
  // b. Wordmark: ▼ Text.js in Geist SemiBold on a black rounded rectangle.
  {
    const capH = 7;
    const size = capH / 0.7;
    const tw = measure(fonts.sansSemiBold, "Text.js", size, -0.02 * size);
    const mw = capH * 1.15;
    const gap = 2.4;
    const bw = mw + gap + tw + 14;
    const bh = 18;
    const x = (W - bw) / 2;
    const y = 72;
    cuts.push(round(x, y, bw, bh, 4));
    white.push(mark(x + 7, y + (bh - mw * MARK_RATIO) / 2, mw));
    white.push(text(fonts.sansSemiBold, "Text.js", x + 7 + mw + gap, y + (bh + capH) / 2, size, -0.02 * size));
  }
  // c. %c, the console's CSS format specifier.
  {
    const s = 22;
    const x = 16;
    const y = 102;
    cuts.push(round(x, y, s, s, 4));
    const capH = 7.5;
    const size = capH / MONO_CAP_HEIGHT;
    const tw = measure(fonts.mono, "%c", size);
    white.push(text(fonts.mono, "%c", x + (s - tw) / 2, y + (s + capH) / 2, size));
  }
  // d. The ▼ from the ASCII font in the first frame (rows 9–12, cells 30–36): 7, 5, 3 and 1 blocks.
  {
    const cw = 2.6;
    const ch = cw * 1.25;
    const x0 = W - 16 - 7 * cw - 8;
    const y = 102;
    cuts.push(round(x0, y, 7 * cw + 8, 22, 4));
    const left = x0 + 4;
    const top = y + (22 - 4 * ch) / 2;
    for (let r = 0; r < 4; r++) white.push(`M${fmt(left + r * cw)} ${fmt(top + r * ch)}h${fmt((7 - 2 * r) * cw)}v${fmt(ch)}h${fmt(-(7 - 2 * r) * cw)}Z`);
  }
  // e. ⌘ ⌥ J, the DevTools Console shortcut on macOS, as three keycaps.
  {
    const s = 17;
    const gap = 4;
    const total = 3 * s + 2 * gap;
    const x0 = (W - total) / 2;
    const y = 132;
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * (s + gap);
      cuts.push(round(x, y, s, s, 3.2));
      if (i === 2) {
        const capH = 6;
        const size = capH / MONO_CAP_HEIGHT;
        const tw = measure(fonts.mono, "J", size);
        white.push(text(fonts.mono, "J", x + (s - tw) / 2, y + (s + capH) / 2, size));
      }
    }
    print.push(`<path d="${command(x0 + s / 2, y + s / 2, 7.2)}" fill="none" stroke="#ededed" stroke-width="0.85" stroke-linejoin="round"/>`);
    print.push(`<path d="${option(x0 + s + gap + s / 2, y + s / 2, 7.6)}" fill="none" stroke="#ededed" stroke-width="0.85" stroke-linecap="square"/>`);
  }
  const body = [
    `  <rect id="sheet" width="${fmt(W)}" height="${fmt(H)}" rx="3" fill="#0a0a0a"/>`,
    `  <g id="ink-1-white" fill="#ededed"><path d="${white.join("")}"/>${print.join("")}</g>`,
    `  <g id="CutContour" fill="none" stroke="#ec008c" stroke-width="0.25">${cuts.map((d) => `<path d="${d}"/>`).join("")}</g>`,
  ].join("\n");
  write("sticker-sheet.svg", svgDoc(W, H, body, "Sticker sheet, 4 × 6 in, black matte vinyl, kiss-cut along CutContour (100% magenta, do not print)"));
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
