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

/** The artwork Fourthwall prints or stitches (the Keycap Set and Notebook go to other vendors as SVG). */
const FILES = [
  "logo-tee-front.svg",
  "block-tee-front.svg",
  "console-tee-front.svg",
  "console-tee-sleeve.svg",
  "console-hoodie-front.svg",
  "mark-hoodie-chest.svg",
  "console-cap-front.svg",
  "mark-cap-front.svg",
  "sticker-mark.svg",
  "sticker-wordmark.svg",
  "sticker-console.svg",
  "sticker-keys.svg",
  "sticker-percent-c.svg",
];

const browser = await open();
for (const file of FILES) {
  let svg = readFileSync(join(ART, file), "utf8").replace(/<\?xml[^>]*>/, "");
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) as RegExpExecArray;
  const w = Math.round((Number(vb[1]) / 25.4) * DPI);
  const h = Math.round((Number(vb[2]) / 25.4) * DPI);
  svg = svg.replace(/width="[^"]*mm" height="[^"]*mm"/, `width="${w}" height="${h}"`);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
  const png = await page.screenshot({ omitBackground: true, type: "png" });
  const name = file.replace(/\.svg$/, ".png");
  writeFileSync(join(OUT, name), png);
  console.log(`exported png/${name} (${w} × ${h} px at ${DPI} DPI)`);
  await page.close();
}
await close();
