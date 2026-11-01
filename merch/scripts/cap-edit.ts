/**
 * Embroidered lettering that sits in the fabric. The exact vector type is mapped onto the crown (scripts/capmesh.ts)
 * as flat white, the image model turns it into real satin stitches in an edit that also gives the twill its
 * puckering, the raised relief, the contact shadow and the scene's light, and then the edit is corrected back onto
 * the exact letterforms:
 *
 *   1. Register: the edit's thread (bright pixels) is aligned to the exact mask by the best whole-pixel shift.
 *   2. Inside the exact letters, the edit's thread is kept; anywhere the model drew a letter thinner than the type,
 *      thread is grown in from the nearest stitched pixels, so no fabric shows through a stroke.
 *   3. Just outside the letters, thread the model drew too wide is replaced by the original twill, darkened by a
 *      soft contact shadow; the edit's own shadow and puckering are kept where they are fabric.
 *   4. Beyond a few millimetres the original photo returns, so the rest of the cap matches the other photos.
 *   5. The letter edge is the exact antialiased mask, so every glyph keeps its outline.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { composite, type Layer } from "./composite";
import { generate, type Quality } from "./imagegen";
import { open, png } from "./render";

const ROOT = join(import.meta.dir, "..");
const REFINE = join(ROOT, "photos", "refine");
const dataUrl = (file: string): string => `data:image/png;base64,${readFileSync(file).toString("base64")}`;

export interface Lettering {
  name: string;
  /** The blank the lettering goes on. */
  base: string;
  /** The lettering as a layer (any mode); it is drawn flat white for the edit and the mask. */
  layer: Layer;
  /** Thread width in photo pixels, for the prompt's sense of scale. */
  detail: "close-up" | "product";
  quality?: Quality;
}

const PROMPT = (detail: "close-up" | "product"): string =>
  `Photograph edit. The flat white lowercase lettering on the front of this black cotton twill dad cap becomes real white machine embroidery, the way white-thread embroidery looks on a real black dad hat${detail === "close-up" ? " in a close-up photo" : ""}: dense glossy satin stitches running across the width of each stroke and turning with every curve of each letter, individual thread lines visible, a soft sheen that catches the same light as the rest of the photo from the upper left, slightly raised letters with a soft contact shadow below them, and the twill gently puckered and compressed around the stitching so the letters sit in the fabric. Do not change the letters: keep every letter's exact shape, size, spacing, weight and position, and keep the text exactly as it is. Keep everything else in the photo identical. No new text.`;

export async function embroider(l: Lettering): Promise<string> {
  const flat = { ...l.layer, mode: "flat" as const, color: "#f4f4f2", relief: 0, shadow: undefined, satin: undefined, stitches: undefined };
  const flatPhoto = await composite({ base: l.base, layers: [flat] });
  const flatPath = join(REFINE, `cap-letters-${l.name}-flat.png`);
  writeFileSync(flatPath, flatPhoto);
  const black = join(REFINE, "black-1024x1536.png");
  writeFileSync(black, await png(`<body style="margin:0;background:#000">`, 1024, 1536, 1));
  const maskPath = join(REFINE, `cap-letters-${l.name}-mask.png`);
  writeFileSync(maskPath, await composite({ base: black, layers: [{ ...flat, color: "#ffffff" }] }));
  const edit = await generate({ prompt: PROMPT(l.detail), size: "1024x1536", quality: l.quality ?? "high", refs: [flatPath] }, `cap lettering ${l.name}`);
  const out = join(REFINE, `cap-letters-${l.name}-corrected.png`);
  writeFileSync(out, await correct(l.base, edit, maskPath));
  return out;
}

/** The correction (steps 1–5 above), in Chromium's canvas. */
async function correct(basePath: string, editPath: string, maskPath: string): Promise<Buffer> {
  const browser = await open();
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ base, edit, mask }) => {
      const load = async (src: string): Promise<HTMLImageElement> => {
        const img = new Image();
        img.src = src;
        await img.decode();
        return img;
      };
      const pixels = (img: HTMLImageElement): Uint8ClampedArray => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const x = c.getContext("2d") as CanvasRenderingContext2D;
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, c.width, c.height).data;
      };
      const [bi, ei, mi] = await Promise.all([load(base), load(edit), load(mask)]);
      const W = bi.naturalWidth;
      const H = bi.naturalHeight;
      const B = pixels(bi);
      const E0 = pixels(ei);
      const Mp = pixels(mi);
      const lum = (p: Uint8ClampedArray, i: number): number => (0.2126 * p[i * 4]! + 0.7152 * p[i * 4 + 1]! + 0.0722 * p[i * 4 + 2]!) / 255;
      const M = new Float32Array(W * H);
      let x0 = W, x1 = 0, y0 = H, y1 = 0;
      for (let i = 0; i < W * H; i++) {
        M[i] = Mp[i * 4]! / 255;
        if (M[i]! > 0.02) {
          const x = i % W, y = (i / W) | 0;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
      const pad = 40;
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);

      // Thread in the edit: brighter than the twill around it (threshold halfway between the two).
      let inside = 0, inN = 0, outside = 0, outN = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        const l = lum(E0, i);
        if (M[i]! > 0.9) { inside += l; inN++; } else if (M[i]! < 0.01) { outside += l; outN++; }
      }
      const thr = (inside / Math.max(1, inN) + outside / Math.max(1, outN)) / 2;

      // 1. Register the edit to the mask, letter by letter: the model moves each letter a pixel or two on its own.
      const comp = new Int32Array(W * H).fill(-1);
      const comps: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        if (M[i]! <= 0.3 || comp[i]! >= 0) continue;
        const id = comps.length;
        const box = { x0: x, x1: x, y0: y, y1: y };
        const stack = [i];
        comp[i] = id;
        while (stack.length) {
          const j = stack.pop() as number;
          const jx = j % W, jy = (j / W) | 0;
          box.x0 = Math.min(box.x0, jx); box.x1 = Math.max(box.x1, jx); box.y0 = Math.min(box.y0, jy); box.y1 = Math.max(box.y1, jy);
          for (const k of [j + 1, j - 1, j + W, j - W]) if (M[k]! > 0.3 && comp[k]! < 0) { comp[k] = id; stack.push(k); }
        }
        comps.push(box);
      }
      // Each letter's dot or tittle joins its nearest letter's shift; pixels near a letter take its shift.
      const shift = comps.map((box) => {
        let best = -Infinity, bx = 0, by = 0;
        for (let sy = -8; sy <= 8; sy++) for (let sx = -8; sx <= 8; sx++) {
          let score = 0;
          for (let y = box.y0 - 3; y <= box.y1 + 3; y++) for (let x = box.x0 - 3; x <= box.x1 + 3; x++) {
            const ex = x + sx, ey = y + sy;
            if (ex < 0 || ey < 0 || ex >= W || ey >= H) continue;
            score += (lum(E0, ey * W + ex) > thr ? 1 : -1) * (M[y * W + x]! - 0.5);
          }
          if (score > best) { best = score; bx = sx; by = sy; }
        }
        return [bx, by] as const;
      });
      // Nearest component for every pixel in the box (a few dilation passes).
      const owner = new Int32Array(comp);
      for (let pass = 0; pass < 24; pass++) {
        let changed = false;
        const next = new Int32Array(owner);
        for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
          const i = y * W + x;
          if (owner[i]! >= 0) continue;
          for (const k of [i + 1, i - 1, i + W, i - W]) if (owner[k]! >= 0) { next[i] = owner[k]!; changed = true; break; }
        }
        owner.set(next);
        if (!changed) break;
      }
      const E = new Uint8ClampedArray(E0);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        const [sx, sy] = owner[i]! >= 0 ? shift[owner[i]!]! : [0, 0];
        const ex = Math.min(W - 1, Math.max(0, x + sx)), ey = Math.min(H - 1, Math.max(0, y + sy));
        const o = i * 4, e = (ey * W + ex) * 4;
        E[o] = E0[e]!; E[o + 1] = E0[e + 1]!; E[o + 2] = E0[e + 2]!;
      }

      // The edit's letters: its thread pixels, closed over the dark gaps between stitches.
      const thread = new Float32Array(W * H);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) thread[y * W + x] = lum(E, y * W + x) > thr ? 1 : 0;
      const box = (src: Float32Array, r: number): Float32Array => {
        const out = new Float32Array(W * H);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          let s = 0, n = 0;
          for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
            const xx = x + ox, yy = y + oy;
            if (xx < x0 || yy < y0 || xx > x1 || yy > y1) continue;
            s += src[yy * W + xx]!; n++;
          }
          out[y * W + x] = s / n;
        }
        return out;
      };
      const letterE = box(thread, 2);
      const haloE = box(thread, 4);

      // 2. Inside the exact letters: the edit's stitches where the edit has a letter, grown in where it doesn't.
      const T = new Float32Array(W * H * 3);
      const known = new Uint8Array(W * H);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        if (M[i]! > 0.02 && letterE[i]! > 0.3) {
          known[i] = 1;
          T[i * 3] = E[i * 4]!; T[i * 3 + 1] = E[i * 4 + 1]!; T[i * 3 + 2] = E[i * 4 + 2]!;
        }
      }
      let grown = 0;
      for (let pass = 0; pass < 30; pass++) {
        const add: number[] = [];
        for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
          const i = y * W + x;
          if (known[i] || M[i]! <= 0.02) continue;
          let r = 0, g = 0, b = 0, n = 0;
          for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]] as const) {
            const j = (y + oy) * W + (x + ox);
            if (known[j]) { r += T[j * 3]!; g += T[j * 3 + 1]!; b += T[j * 3 + 2]!; n++; }
          }
          if (n) add.push(i, r / n, g / n, b / n);
        }
        if (!add.length) break;
        for (let k = 0; k < add.length; k += 4) {
          const i = add[k]!;
          known[i] = 1; T[i * 3] = add[k + 1]!; T[i * 3 + 1] = add[k + 2]!; T[i * 3 + 2] = add[k + 3]!;
          grown++;
        }
      }

      // Distance from the letters, for the shadow and the blend back to the original photo.
      const dist = new Float32Array(W * H).fill(1e9);
      for (let i = 0; i < W * H; i++) if (M[i]! > 0.5) dist[i] = 0;
      for (let y = y0 + 1; y <= y1; y++) for (let x = x0 + 1; x < x1; x++) {
        const i = y * W + x;
        dist[i] = Math.min(dist[i]!, dist[i - 1]! + 1, dist[i - W]! + 1, dist[i - W - 1]! + 1.414, dist[i - W + 1]! + 1.414);
      }
      for (let y = y1 - 1; y >= y0; y--) for (let x = x1 - 1; x > x0; x--) {
        const i = y * W + x;
        dist[i] = Math.min(dist[i]!, dist[i + 1]! + 1, dist[i + W]! + 1, dist[i + W + 1]! + 1.414, dist[i + W - 1]! + 1.414);
      }

      // 3–5. Outside: the edit's twill (puckering, shadow) where the edit has no letter; where it drew a letter wider
      // than the type, the original twill with a soft contact shadow. Far away, the original photo.
      const shadowAt = (x: number, y: number): number => {
        let s = 0;
        for (const [ox, oy, w] of [[-1, -2, 0.5], [-2, -3, 0.3], [0, -1, 0.2]] as const) {
          const xx = Math.min(W - 1, Math.max(0, x + ox)), yy = Math.min(H - 1, Math.max(0, y + oy));
          s += M[yy * W + xx]! * w;
        }
        return s;
      };
      const out = new Uint8ClampedArray(B);
      const near = 4;
      const fade = 16;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        const m = M[i]!;
        const d = dist[i]!;
        const o = i * 4;
        const shadow = Math.max(0, shadowAt(x, y) - m) * 0.55;
        const useEdit = haloE[i]! < 0.02;
        const back = Math.min(1, Math.max(0, (d - near) / fade));
        for (let ch = 0; ch < 3; ch++) {
          const twill = (useEdit ? E[o + ch]! : B[o + ch]!) * (1 - shadow);
          const outsideC = twill * (1 - back) + B[o + ch]! * back;
          const insideC = known[i] ? T[i * 3 + ch]! : outsideC;
          out[o + ch] = insideC * m + outsideC * (1 - m);
        }
      }
      const shifts = shift.map(([a, b2]) => `${a},${b2}`).join(" ");
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const x = c.getContext("2d") as CanvasRenderingContext2D;
      x.putImageData(new ImageData(out, W, H), 0, 0);
      return { png: c.toDataURL("image/png").split(",")[1] as string, info: `letter shifts ${shifts}; grew thread into ${grown} px; threshold ${thr.toFixed(3)}` };
    },
    { base: dataUrl(basePath), edit: dataUrl(editPath), mask: dataUrl(maskPath) },
  );
  await page.close();
  console.log(`corrected: ${result.info}`);
  return Buffer.from(result.png, "base64");
}
