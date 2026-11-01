/**
 * Writes the print-ready artwork in merch/artwork/. Every file is a physical-size SVG (millimetres)
 * with all type converted to outlines and no raster content. Colors are production colors: #ffffff
 * for white ink and thread. `bun run export` turns them into 300 DPI PNGs for Fourthwall's designer.
 *
 *   cd merch && bun install && bun run artwork
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { command, fmt, fonts, IN, mark, MARK_RATIO, measure, MONO_CAP_HEIGHT, option, svgDoc, text } from "./lib";
import { blockMarkArt, lineArt, markArt, stackArt, stickerConsole, stickerKeys, stickerMark, stickerPercentC, stickerWordmark, wordmarkArt } from "./options";

const OUT = join(import.meta.dir, "..", "artwork");
const INK = "#ffffff";

function write(name: string, svg: string): void {
  writeFileSync(join(OUT, name), svg);
  console.log(`wrote artwork/${name}`);
}

/** Replaces an svgDoc's title (the builders give short ones). */
const titled = (svg: string, title: string): string => svg.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);

// ── The mark ──────────────────────────────────────────────────────────────────
write("mark.svg", svgDoc(100, 100 * MARK_RATIO, `  <path d="${mark(0, 0, 100)}" fill="#000"/>`, "Text.js mark, master (100 mm)"));

// ── Tees (AS Colour 5082, printed on demand) ──────────────────────────────────
write("logo-tee-front.svg", titled(wordmarkArt(8, INK), "Logo Tee, front: ▼ Text.js in Geist SemiBold, 8 in wide, white, top 3 in below the front neck seam"));
write("block-tee-front.svg", titled(blockMarkArt(4.5, INK), "Block Tee, front: the block-letter ▼ (7, 5, 3 and 1 cells), 4.5 in wide, white, top 3 in below the front neck seam"));
write("console-tee-front.svg", titled(stackArt(10, INK), "console.log Tee, front: console / .log in Geist SemiBold, 10 in wide, white, left edge 6 in toward the wearer's right of center, top 3 in below the front neck seam"));
write("console-tee-sleeve.svg", titled(markArt(1.25, INK), "console.log Tee, left sleeve: ▼ 1.25 in wide, white, centered on the sleeve, 1 in above the hem band, pointing down the arm"));

// ── Hoodies (AS Colour 5161) ──────────────────────────────────────────────────
write("console-hoodie-front.svg", titled(lineArt(fonts.monoMedium, [["console.log", INK]], 9), "console.log Hoodie, front: console.log in Geist Mono Medium, 9 in wide, white, top 3.5 in below the front neck seam"));
write("mark-hoodie-chest.svg", titled(markArt(3.5, INK), "▼ Hoodie, center chest: ▼ 3.5 × 3.06 in, white thread, top 3.5 in below the front neck seam"));

// ── Caps (Yupoong 6245CM, embroidered) ────────────────────────────────────────
write("console-cap-front.svg", titled(lineArt(fonts.monoBold, [["console.log", INK]], 3.4), "console.log Cap, Front Large: console.log in Geist Mono Bold, 3.4 in wide (0.27 in lowercase), white thread, centered on the front seam, bottom 0.85 in above the brim"));
write("mark-cap-front.svg", titled(markArt(1.6, INK), "▼ Cap, Front Large: ▼ 1.6 × 1.4 in, white thread, centered on the front seam, apex 0.6 in above the brim"));

// ── Stickers (die-cut; the white edge is part of the artwork) ─────────────────
write("sticker-mark.svg", titled(stickerMark(3).svg, "▼ Sticker, die-cut, 3 in: black ▼ with a 0.12 in white edge"));
write("sticker-wordmark.svg", titled(stickerWordmark(3, 1.04).svg, "Wordmark Sticker, die-cut, 3 × 1.04 in: ▼ Text.js in black on white"));
write("sticker-console.svg", titled(stickerConsole(3).svg, "console.log Sticker, die-cut, 3 × 0.81 in: white Geist Mono on a black pill with a white edge"));
write("sticker-keys.svg", titled(stickerKeys(3).svg, "⌘⌥J Sticker, die-cut, 3 in wide: three keys, white on black with a white edge"));
write("sticker-percent-c.svg", titled(stickerPercentC(2).svg, "%c Sticker, die-cut, 2 × 2 in: %c in black on white"));

// ── Keycaps: ⌘ ⌥ J legends on Cherry-profile black PBT ──────────────────────
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

// ── Notebook cover: A5, blind deboss ────────────────────────────────────────
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
