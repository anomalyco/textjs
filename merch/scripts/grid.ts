/**
 * Measuring aid: draws a labelled pixel grid over a photo (or a zoomed region of it) so print
 * placements can be read off by eye.
 *   bun scripts/grid.ts <photo.png> <out.png> [x y w h]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { close, png } from "./render";

const [file, out, ...rest] = process.argv.slice(2);
if (!file || !out) throw new Error("usage: grid.ts <photo.png> <out.png> [x y w h]");
const src = `data:image/png;base64,${readFileSync(file).toString("base64")}`;
const probe = await png(`<img id=i src="${src}">`, 10, 10);
void probe;
const [x, y, w, h] = rest.length === 4 ? rest.map(Number) : [0, 0, 0, 0];
const html = `<!doctype html><body style="margin:0;background:#000"><canvas id=c></canvas><script>
const img = new Image(); img.src = ${JSON.stringify(src)};
img.onload = () => {
  const X = ${x}, Y = ${y}, Wd = ${w} || img.naturalWidth, Ht = ${h} || img.naturalHeight;
  const scale = Math.min(1400 / Wd, 1400 / Ht);
  const c = document.getElementById("c"); c.width = Wd * scale; c.height = Ht * scale;
  const g = c.getContext("2d"); g.drawImage(img, X, Y, Wd, Ht, 0, 0, Wd * scale, Ht * scale);
  const step = Wd > 600 ? 50 : Wd > 200 ? 20 : 10;
  g.font = "11px monospace";
  for (let v = Math.ceil(X / step) * step; v < X + Wd; v += step) { g.strokeStyle = v % (step * 2) ? "rgba(0,255,255,.25)" : "rgba(0,255,255,.6)"; g.beginPath(); g.moveTo((v - X) * scale, 0); g.lineTo((v - X) * scale, c.height); g.stroke(); g.fillStyle = "#0ff"; g.fillText(v, (v - X) * scale + 2, 11); }
  for (let v = Math.ceil(Y / step) * step; v < Y + Ht; v += step) { g.strokeStyle = v % (step * 2) ? "rgba(255,0,255,.25)" : "rgba(255,0,255,.6)"; g.beginPath(); g.moveTo(0, (v - Y) * scale); g.lineTo(c.width, (v - Y) * scale); g.stroke(); g.fillStyle = "#f0f"; g.fillText(v, 2, (v - Y) * scale - 2); }
  document.title = c.width + "x" + c.height;
};
</script>`;
const { open } = await import("./render");
const b = await open();
const page = await b.newPage({ viewport: { width: 1400, height: 1400 } });
await page.setContent(html);
await page.waitForFunction(() => document.title.includes("x"));
const [cw, chh] = (await page.title()).split("x").map(Number) as [number, number];
await page.setViewportSize({ width: Math.ceil(cw), height: Math.ceil(chh) });
writeFileSync(out, await page.screenshot());
await close();
