/**
 * 300 DPI transparent PNGs of the artwork for Fourthwall's product designer, which takes PNG uploads
 * (the SVGs stay the source of truth for screen printers and embroiderers).
 *
 *   bun run export   # writes artwork/png/*.png
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { open, close } from "./render";

const ART = join(import.meta.dir, "..", "artwork");
const OUT = join(ART, "png");
mkdirSync(OUT, { recursive: true });
const DPI = 300;

/** File → which groups to drop before rendering (previews and guides never print). */
const FILES: Record<string, RegExp[]> = {
  "frame-tee-front.svg": [],
  "frame-tee-back.svg": [],
  "neck-label.svg": [],
  "hoodie-chest.svg": [],
  "cap-front.svg": [],
  "cap-back.svg": [],
  // Fourthwall adds the white border and the background color itself.
  "sticker-sheet.svg": [/<rect id="background"[^>]*\/>/, /<g id="border-preview[^"]*">[\s\S]*?<\/g>/],
};

const browser = await open();
for (const [file, drop] of Object.entries(FILES)) {
  let svg = readFileSync(join(ART, file), "utf8").replace(/<\?xml[^>]*>/, "");
  for (const re of drop) svg = svg.replace(re, "");
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) as RegExpExecArray;
  const w = Math.round((Number(vb[1]) / 25.4) * DPI);
  const h = Math.round((Number(vb[2]) / 25.4) * DPI);
  svg = svg.replace(/width="[^"]*mm" height="[^"]*mm"/, `width="${w}" height="${h}"`);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
  const png = await page.screenshot({ omitBackground: true, type: "png" });
  const name = file === "sticker-sheet.svg" ? "sticker-sheet-stickers.png" : file.replace(/\.svg$/, ".png");
  writeFileSync(join(OUT, name), png);
  console.log(`exported png/${name} (${w} × ${h} px at ${DPI} DPI)`);
  await page.close();
}
await close();
