/**
 * Enlarged close-ups that keep a blank's geometry: crop a region, scale it to 1024 × 1536 in Chromium, then
 * ask the image model to re-render the enlargement with real macro detail. Because the edit keeps the
 * composition, anything measured on the original blank maps into the close-up as (p − origin) × scale.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generate } from "./imagegen";
import { png } from "./render";

export interface Enlargement {
  name: string;
  base: string;
  /** Left and top of the crop in the blank; the crop is 1024 / k by 1536 / k. */
  x: number;
  y: number;
  k: number;
  subject: string;
}

export async function enlarge(e: Enlargement): Promise<string> {
  const w = 1024 / e.k;
  const h = 1536 / e.k;
  const src = `data:image/png;base64,${readFileSync(e.base).toString("base64")}`;
  const html = `<!doctype html><style>html,body{margin:0;overflow:hidden}canvas{display:block}</style><canvas id="c" width="1024" height="1536"></canvas><script>
    const img = new Image();
    img.onload = () => { const c = document.getElementById("c").getContext("2d"); c.imageSmoothingQuality = "high"; c.drawImage(img, ${e.x}, ${e.y}, ${w}, ${h}, 0, 0, 1024, 1536); document.title = "ok"; };
    img.src = "${src}";
  </script>`;
  const crop = await png(html, 1024, 1536, 1);
  const file = join(import.meta.dir, "..", "photos", "refine", `enlarge-${e.name}.png`);
  mkdirSync(join(import.meta.dir, "..", "photos", "refine"), { recursive: true });
  writeFileSync(file, crop);
  const prompt = `Photograph edit. This is an enlarged crop of a product photo of ${e.subject}. Re-render it as a sharp, high-resolution macro photograph of the same object: crisp fabric weave and fiber detail, crisp stitching on the seams, the same lighting and color. Keep the composition identical: every edge, seam, fold and eyelet stays exactly where it is. No text, no logos, no embroidery.`;
  return generate({ prompt, size: "1024x1536", quality: "high", refs: [file] }, `enlarge ${e.name}`);
}
