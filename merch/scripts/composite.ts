/**
 * Puts the real vector artwork onto generated product photos, so marks and text are exact.
 *
 * Each layer maps an SVG onto a quadrilateral in the photo with a homography, then shades it
 * with the photo itself: the low-frequency light (folds, falloff) darkens and lightens the ink,
 * the high-frequency texture (weave, grain) breaks it up, and the local slope of the surface
 * displaces it slightly. Embroidery fills the shape with a real stitch texture and lights its
 * raised edge; debossing cuts the edge into the surface. Runs in headless Chromium (canvas),
 * so no native image tools are needed.
 */
import { readFileSync } from "node:fs";
import { open } from "./render";

export type Point = [number, number];
/** Corners of the artwork's box in photo pixels: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];

export interface Layer {
  /** SVG markup (the artwork file contents, or a fragment from it). */
  svg: string;
  quad: Quad;
  mode: "print" | "embroidery" | "deboss" | "flat" | "fit";
  /** Ink opacity for prints (water-based discharge sits a little into the fabric). */
  opacity?: number;
  /** Displacement strength in pixels per unit of surface slope. */
  displace?: number;
  /** How strongly the photo's light shades the layer (0 to 1). */
  shade?: number;
  /** How much the fabric texture breaks up the ink (0 to 1). */
  texture?: number;
  /** Stitch texture for embroidery (a photo of satin stitches), and its tint. */
  stitches?: string;
  /** Overrides the layer's own colors with one color (thread, deboss shadow). */
  color?: string;
  /** Edge relief in pixels for embroidery and deboss. */
  relief?: number;
  /** Width of one thread of the stitch texture, in photo pixels. */
  stitchPx?: number;
  /** Adds back the photo's own highlights over the layer (a glossy surface above the print). */
  gloss?: number;
  /**
   * `fit` mode: an image-model edit drew the mark approximately; move it onto the exact geometry.
   * The photo near `dst` is resampled with the affine map that sends the drawn triangle (`src`) onto
   * the exact one (`dst`), fading back to the untouched photo over `feather` pixels.
   */
  src?: [Point, Point, Point];
  dst?: [Point, Point, Point];
  feather?: number;
  /**
   * The surface is a vertical cylinder (a bottle, a cap's crown): `cx` is its axis and `r` its radius in
   * photo pixels. The quad is then given in unrolled coordinates, where x is arc length from the axis.
   */
  cylinder?: { cx: number; r: number; elev?: number };
  /** A soft cast shadow under the layer (stickers): offset and blur in photo pixels. */
  shadow?: { dx: number; dy: number; blur: number; opacity: number };
  /** Lights the top-left edge and darkens the bottom-right edge of a print, for a thin raised material. */
  edge?: number;
  /** Embroidery thread color: the stitch photo supplies only the thread's light and texture. */
  thread?: string;
  /**
   * A curved surface (a cap's crown): the art's unit square is split into `cols` × `rows` cells and
   * `points` ((rows + 1) × (cols + 1), row-major, top row first) gives each grid corner's photo position.
   * Each cell is mapped as two affine triangles. `quad` is still used to size the art raster.
   */
  mesh?: { cols: number; rows: number; points: Point[] };
  /**
   * Satin stitches drawn from the artwork itself (with `thread`): threads run across each stroke, found from
   * the stroke's local orientation, `spacing` photo pixels apart; `radius` is about half the stroke width in
   * photo pixels; `angle` (degrees) is the fill direction where there is no clear stroke.
   */
  satin?: { spacing: number; radius: number; angle?: number };
}

export interface Job {
  base: string;
  layers: Layer[];
  /** Crop applied after compositing: x, y, width, height in base pixels. */
  crop?: [number, number, number, number];
}

const dataUrl = (file: string): string => `data:image/${file.endsWith(".webp") ? "webp" : "png"};base64,${readFileSync(file).toString("base64")}`;

/** Composites `job` and returns PNG bytes. */
export async function composite(job: Job): Promise<Buffer> {
  const browser = await open();
  const page = await browser.newPage();
  const input = {
    base: dataUrl(job.base),
    crop: job.crop ?? null,
    layers: job.layers.map((l) => ({ ...l, svg: `data:image/svg+xml;base64,${Buffer.from(l.svg).toString("base64")}`, stitches: l.stitches ? dataUrl(l.stitches) : null })),
  };
  const b64 = await page.evaluate(async (job) => {
    const load = async (src: string): Promise<HTMLImageElement> => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return img;
    };
    const base = await load(job.base);
    const W = base.naturalWidth;
    const H = base.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    ctx.drawImage(base, 0, 0);
    const photo = ctx.getImageData(0, 0, W, H);
    const px = photo.data;

    // Luminance, and box blurs of it at two scales.
    const lum = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) lum[i] = (0.2126 * px[i * 4]! + 0.7152 * px[i * 4 + 1]! + 0.0722 * px[i * 4 + 2]!) / 255;
    const blur = (src: Float32Array, r: number): Float32Array => {
      const tmp = new Float32Array(W * H);
      const out = new Float32Array(W * H);
      for (let y = 0; y < H; y++) {
        let acc = 0;
        for (let x = -r; x <= r; x++) acc += src[y * W + Math.min(W - 1, Math.max(0, x))]!;
        for (let x = 0; x < W; x++) {
          tmp[y * W + x] = acc / (2 * r + 1);
          acc += src[y * W + Math.min(W - 1, x + r + 1)]! - src[y * W + Math.max(0, x - r)]!;
        }
      }
      for (let x = 0; x < W; x++) {
        let acc = 0;
        for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]!;
        for (let y = 0; y < H; y++) {
          out[y * W + x] = acc / (2 * r + 1);
          acc += tmp[Math.min(H - 1, y + r + 1) * W + x]! - tmp[Math.max(0, y - r) * W + x]!;
        }
      }
      return out;
    };
    const fine = blur(lum, 2);
    const mid = blur(lum, 10);
    const wide = blur(lum, 48);

    // Solve the homography that maps the unit square onto the quad, and invert it.
    const homography = (q: number[][]): number[] => {
      const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q as [[number, number], [number, number], [number, number], [number, number]];
      const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
      const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
      const den = dx1 * dy2 - dx2 * dy1;
      const g = (dx3 * dy2 - dx2 * dy3) / den;
      const h = (dx1 * dy3 - dx3 * dy1) / den;
      const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
      const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
      return [a, b, c, d, e, f, g, h, 1];
    };
    const invert = (m: number[]): number[] => {
      const [a, b, c, d, e, f, g, h, i] = m as [number, number, number, number, number, number, number, number, number];
      const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
      const det = a * A + b * B + c * C;
      return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
    };

    for (const layer of job.layers) {
      if (layer.mode === "fit" && layer.src && layer.dst) {
        const [s0, s1, s2] = layer.src as [number[], number[], number[]];
        const [d0, d1, d2] = layer.dst as [number[], number[], number[]];
        // Affine map dst → src from three point pairs.
        const solve = (a: number, b: number, c: number): [number, number, number] => {
          const det = (d1[0]! - d0[0]!) * (d2[1]! - d0[1]!) - (d2[0]! - d0[0]!) * (d1[1]! - d0[1]!);
          const p = ((b - a) * (d2[1]! - d0[1]!) - (c - a) * (d1[1]! - d0[1]!)) / det;
          const q2 = ((c - a) * (d1[0]! - d0[0]!) - (b - a) * (d2[0]! - d0[0]!)) / det;
          return [p, q2, a - p * d0[0]! - q2 * d0[1]!];
        };
        const mx = solve(s0[0]!, s1[0]!, s2[0]!);
        const my = solve(s0[1]!, s1[1]!, s2[1]!);
        const orig = new Uint8ClampedArray(px);
        const edges = [[d0, d1], [d1, d2], [d2, d0]] as Array<[number[], number[]]>;
        const cxT = (d0[0]! + d1[0]! + d2[0]!) / 3, cyT = (d0[1]! + d1[1]! + d2[1]!) / 3;
        // Signed distance outside the triangle (negative inside), from its three edges.
        const outside = (x: number, y: number): number => {
          let d = -Infinity;
          for (const [a, b] of edges) {
            const nx = b[1]! - a[1]!, ny = -(b[0]! - a[0]!);
            const len = Math.hypot(nx, ny);
            let sd = ((x - a[0]!) * nx + (y - a[1]!) * ny) / len;
            if (((cxT - a[0]!) * nx + (cyT - a[1]!) * ny) / len > 0) sd = -sd;
            d = Math.max(d, sd);
          }
          return d;
        };
        const feather = layer.feather ?? 12;
        const xs = [d0[0]!, d1[0]!, d2[0]!], ys = [d0[1]!, d1[1]!, d2[1]!];
        const pad = feather * 3;
        for (let y = Math.max(0, Math.floor(Math.min(...ys) - pad)); y <= Math.min(H - 1, Math.ceil(Math.max(...ys) + pad)); y++) {
          for (let x = Math.max(0, Math.floor(Math.min(...xs) - pad)); x <= Math.min(W - 1, Math.ceil(Math.max(...xs) + pad)); x++) {
            const d = outside(x + 0.5, y + 0.5);
            const w = d <= feather ? 1 : d >= feather * 3 ? 0 : 1 - (d - feather) / (feather * 2);
            if (w <= 0) continue;
            const sx = mx[0] * (x + 0.5) + mx[1] * (y + 0.5) + mx[2] - 0.5;
            const sy = my[0] * (x + 0.5) + my[1] * (y + 0.5) + my[2] - 0.5;
            const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
            if (x0 < 0 || y0 < 0 || x0 + 1 >= W || y0 + 1 >= H) continue;
            const o = (y * W + x) * 4;
            for (let ch = 0; ch < 3; ch++) {
              const at = (xx: number, yy: number): number => orig[(yy * W + xx) * 4 + ch]!;
              const val = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
              px[o + ch] = orig[o + ch]! * (1 - w) + val * w;
            }
          }
        }
        continue;
      }
      const q = layer.quad;
      const side = (p: number[], r: number[]): number => Math.hypot(p[0]! - r[0]!, p[1]! - r[1]!);
      const aw = Math.ceil(Math.max(side(q[0]!, q[1]!), side(q[3]!, q[2]!)) * 2);
      const ah = Math.ceil(Math.max(side(q[0]!, q[3]!), side(q[1]!, q[2]!)) * 2);
      const artImg = await load(layer.svg);
      const ac = document.createElement("canvas");
      ac.width = aw;
      ac.height = ah;
      const actx = ac.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
      actx.drawImage(artImg, 0, 0, aw, ah);
      const art = actx.getImageData(0, 0, aw, ah).data;
      let tex: Uint8ClampedArray | null = null;
      let tw = 0, th = 0;
      if (layer.stitches) {
        // The stitch photo has threads about 54 px wide; scale it so one thread is `stitchPx` photo pixels.
        const t = await load(layer.stitches);
        const quadW = Math.max(side(q[0]!, q[1]!), side(q[3]!, q[2]!));
        const k = Math.min(1, ((layer.stitchPx ?? 4) * (aw / quadW)) / 54);
        tw = Math.max(8, Math.round(t.naturalWidth * k));
        th = Math.max(8, Math.round(t.naturalHeight * k));
        const tcv = document.createElement("canvas");
        tcv.width = tw;
        tcv.height = th;
        const tctx = tcv.getContext("2d") as CanvasRenderingContext2D;
        tctx.imageSmoothingQuality = "high";
        tctx.drawImage(t, 0, 0, tw, th);
        tex = tctx.getImageData(0, 0, tw, th).data;
      }
      // Stitch photo luminance statistics, for recoloring its thread.
      let texMean = 0, texStd = 1;
      if (tex) {
        let sum = 0, sq = 0;
        const n = tex.length / 4;
        for (let k = 0; k < tex.length; k += 4) {
          const l = (0.2126 * tex[k]! + 0.7152 * tex[k + 1]! + 0.0722 * tex[k + 2]!) / 255;
          sum += l;
          sq += l * l;
        }
        texMean = sum / n;
        texStd = Math.sqrt(Math.max(1e-6, sq / n - texMean * texMean));
      }
      const thread = layer.thread ? [parseInt(layer.thread.slice(1, 3), 16), parseInt(layer.thread.slice(3, 5), 16), parseInt(layer.thread.slice(5, 7), 16)] : null;
      const fixed = layer.color ? [parseInt(layer.color.slice(1, 3), 16), parseInt(layer.color.slice(3, 5), 16), parseInt(layer.color.slice(5, 7), 16)] : null;

      const inv = invert(homography(q as number[][]));
      const sample = (u: number, v: number, ch: number): number => {
        const x = u * aw - 0.5, y = v * ah - 0.5;
        const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
        const at = (xx: number, yy: number): number => (xx < 0 || yy < 0 || xx >= aw || yy >= ah ? 0 : art[(yy * aw + xx) * 4 + ch]!);
        return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
      };
      const alphaAt = (u: number, v: number): number => sample(u, v, 3) / 255;
      const cyl = layer.cylinder;
      /** Photo position → art coordinates (through the cylinder, if any). */
      const mesh = layer.mesh;
      let uvMap: Float32Array | null = null;
      if (mesh) {
        // Rasterize the mesh: every photo pixel it covers gets its art coordinates.
        uvMap = new Float32Array(W * H * 2).fill(Number.NaN);
        const P = (i: number, j: number): number[] => mesh.points[j * (mesh.cols + 1) + i] as number[];
        const tri = (a: number[], b: number[], c: number[], ua: number[], ub: number[], uc: number[]): void => {
          const x0 = Math.max(0, Math.floor(Math.min(a[0]!, b[0]!, c[0]!)) - 1), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0]!, b[0]!, c[0]!)) + 1);
          const y0 = Math.max(0, Math.floor(Math.min(a[1]!, b[1]!, c[1]!)) - 1), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1]!, b[1]!, c[1]!)) + 1);
          const den = (b[1]! - c[1]!) * (a[0]! - c[0]!) + (c[0]! - b[0]!) * (a[1]! - c[1]!);
          if (Math.abs(den) < 1e-9) return;
          for (let y = y0; y <= y1; y++)
            for (let x = x0; x <= x1; x++) {
              const X = x + 0.5, Y = y + 0.5;
              const l1 = ((b[1]! - c[1]!) * (X - c[0]!) + (c[0]! - b[0]!) * (Y - c[1]!)) / den;
              const l2 = ((c[1]! - a[1]!) * (X - c[0]!) + (a[0]! - c[0]!) * (Y - c[1]!)) / den;
              const l3 = 1 - l1 - l2;
              if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
              uvMap![(y * W + x) * 2] = l1 * ua[0]! + l2 * ub[0]! + l3 * uc[0]!;
              uvMap![(y * W + x) * 2 + 1] = l1 * ua[1]! + l2 * ub[1]! + l3 * uc[1]!;
            }
        };
        for (let j = 0; j < mesh.rows; j++)
          for (let i = 0; i < mesh.cols; i++) {
            const u0 = i / mesh.cols, u1 = (i + 1) / mesh.cols, v0 = j / mesh.rows, v1 = (j + 1) / mesh.rows;
            tri(P(i, j), P(i + 1, j), P(i + 1, j + 1), [u0, v0], [u1, v0], [u1, v1]);
            tri(P(i, j), P(i + 1, j + 1), P(i, j + 1), [u0, v0], [u1, v1], [u0, v1]);
          }
      }
      const toUV = (px0: number, py0: number): [number, number] => {
        if (uvMap) {
          // Bilinear lookup in the rasterized mesh (outside it, the art is transparent).
          const fx0 = px0 - 0.5, fy0 = py0 - 0.5;
          const xi = Math.floor(fx0), yi = Math.floor(fy0);
          let uu = 0, vv = 0, wsum = 0;
          for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
            const X = xi + dx, Y = yi + dy;
            if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
            const mu = uvMap[(Y * W + X) * 2]!;
            if (Number.isNaN(mu)) continue;
            const w = (dx ? fx0 - xi : 1 - (fx0 - xi)) * (dy ? fy0 - yi : 1 - (fy0 - yi));
            uu += mu * w;
            vv += uvMap[(Y * W + X) * 2 + 1]! * w;
            wsum += w;
          }
          return wsum > 0.5 ? [uu / wsum, vv / wsum] : [-1, -1];
        }
        let sx = px0, sy = py0;
        if (cyl) {
          // Unroll: arc length across, and undo the curve a horizontal line takes when seen from above (elev = sine of the view's elevation).
          const t = Math.asin(Math.max(-0.999, Math.min(0.999, (px0 - cyl.cx) / cyl.r)));
          sx = cyl.cx + cyl.r * t;
          sy = py0 + cyl.r * (cyl.elev ?? 0) * (1 - Math.cos(t));
        }
        const w = inv[6]! * sx + inv[7]! * sy + inv[8]!;
        return [(inv[0]! * sx + inv[1]! * sy + inv[2]!) / w, (inv[3]! * sx + inv[4]! * sy + inv[5]!) / w];
      };
      const alphaPx = (px0: number, py0: number): number => {
        const [uu, vv] = toUV(px0, py0);
        return alphaAt(uu, vv);
      };
      const sh = layer.shadow;
      const RING = Array.from({ length: 12 }, (_, k) => [Math.cos((k * Math.PI) / 6), Math.sin((k * Math.PI) / 6)] as const);

      const xs = (mesh ? mesh.points : q).map((p) => p[0]!), ys = (mesh ? mesh.points : q).map((p) => p[1]!);
      const pad = (layer.relief ?? 0) * 3 + 4 + (sh ? Math.abs(sh.dx) + Math.abs(sh.dy) + sh.blur * 2 : 0) + (cyl ? cyl.r * (cyl.elev ?? 0) : 0);
      const minX = Math.max(0, Math.floor(Math.min(...xs) - pad)), maxX = Math.min(W - 1, Math.ceil(Math.max(...xs) + pad));
      const minY = Math.max(0, Math.floor(Math.min(...ys) - pad)), maxY = Math.min(H - 1, Math.ceil(Math.max(...ys) + pad));
      // Satin: the structure tensor of the artwork's alpha gives each stroke's orientation (threads cross it).
      let Jxx: Float32Array | null = null, Jxy: Float32Array | null = null, Jyy: Float32Array | null = null;
      if (layer.satin) {
        const A = new Float32Array(W * H);
        for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) A[y * W + x] = alphaPx(x + 0.5, y + 0.5);
        const As = blur(A, 1);
        const gxx = new Float32Array(W * H), gxy = new Float32Array(W * H), gyy = new Float32Array(W * H);
        for (let y = Math.max(1, minY); y <= Math.min(H - 2, maxY); y++)
          for (let x = Math.max(1, minX); x <= Math.min(W - 2, maxX); x++) {
            const i = y * W + x;
            const gx = (As[i + 1]! - As[i - 1]!) / 2, gy = (As[i + W]! - As[i - W]!) / 2;
            gxx[i] = gx * gx;
            gxy[i] = gx * gy;
            gyy[i] = gy * gy;
          }
        const r = Math.max(1, Math.round(layer.satin.radius));
        Jxx = blur(gxx, r);
        Jxy = blur(gxy, r);
        Jyy = blur(gyy, r);
      }
      const disp = layer.displace ?? 0;
      const shade = layer.shade ?? 0.8;
      const texture = layer.texture ?? 0.5;
      const opacity = layer.opacity ?? 1;
      const relief = layer.relief ?? 2;
      // One art pixel in photo pixels, for edge sampling distances.
      const du = 1 / aw, dv = 1 / ah;

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const i = y * W + x;
          // Surface slope from the blurred light: folds push the print sideways a little.
          const gx = (mid[Math.min(W * H - 1, i + 1)]! - mid[Math.max(0, i - 1)]!) * 0.5;
          const gy = (mid[Math.min(W * H - 1, i + W)]! - mid[Math.max(0, i - W)]!) * 0.5;
          const sx = x + 0.5 + gx * disp * 40, sy = y + 0.5 + gy * disp * 40;
          const [u, v] = toUV(sx, sy);
          const o = i * 4;
          const light = Math.min(1.6, Math.max(0.45, mid[i]! / Math.max(0.02, wide[i]!)));
          const grain = lum[i]! - fine[i]!; // weave and fibre detail
          if (layer.mode === "print" || layer.mode === "flat") {
            const a = alphaAt(u, v);
            if (sh && a < 1) {
              let sa = alphaPx(sx - sh.dx, sy - sh.dy) * 2;
              for (const [cx0, cy0] of RING) sa += alphaPx(sx - sh.dx + cx0 * sh.blur, sy - sh.dy + cy0 * sh.blur) + alphaPx(sx - sh.dx + cx0 * sh.blur * 0.5, sy - sh.dy + cy0 * sh.blur * 0.5);
              const k = 1 - sh.opacity * (sa / 26) * (1 - a);
              for (let ch = 0; ch < 3; ch++) px[o + ch] = px[o + ch]! * k;
            }
            if (a <= 0) continue;
            const s = layer.mode === "flat" ? 1 : 1 + (light - 1) * shade;
            const cover = Math.min(1, Math.max(0, a * opacity * (1 + grain * texture * 10)));
            let sheen = (layer.gloss ?? 0) * Math.max(0, mid[i]! - 0.05) * 255;
            let edgeK = 1;
            if (layer.edge) {
              const lit = Math.max(0, a - alphaPx(sx - 1.3, sy - 1.3));
              const dark = Math.max(0, a - alphaPx(sx + 1.3, sy + 1.3));
              sheen += lit * layer.edge * 60;
              edgeK = 1 - dark * layer.edge * 0.45;
            }
            for (let ch = 0; ch < 3; ch++) {
              const ink = ((fixed ? fixed[ch]! : sample(u, v, ch) / Math.max(a, 0.001)) * s + grain * texture * 255 * 0.6 + sheen) * edgeK;
              px[o + ch] = px[o + ch]! * (1 - cover) + Math.min(255, Math.max(0, ink)) * cover;
            }
          } else if (layer.mode === "embroidery") {
            // Raised thread: fill with the stitch photo, light the top-left edge, shadow the bottom-right.
            const a = alphaAt(u, v);
            const off = relief / Math.max(1, aw / (maxX - minX + 1));
            const aUp = alphaAt(u - du * off * 2, v - dv * off * 2);
            const aDown = alphaAt(u + du * off * 2, v + dv * off * 2);
            const shadow = Math.max(0, alphaAt(u - du * off * 3, v - dv * off * 3) - a) * 0.75;
            if (shadow > 0) for (let ch = 0; ch < 3; ch++) px[o + ch] = px[o + ch]! * (1 - shadow);
            if (a <= 0) continue;
            // Thread colour comes from the stitch photo itself (black satin with its own sheen), lit like the fabric.
            let rgb = fixed ?? [20, 20, 20];
            if (tex) {
              // Mirrored tiling, so the stitch photo repeats without visible seams.
              const fx = ((u * aw) % (2 * tw) + 2 * tw) % (2 * tw), fy = ((v * ah) % (2 * th) + 2 * th) % (2 * th);
              const tx = Math.max(0, Math.min(tw - 1, Math.floor(fx < tw ? fx : 2 * tw - 1 - fx))), ty = Math.max(0, Math.min(th - 1, Math.floor(fy < th ? fy : 2 * th - 1 - fy)));
              const k = (ty * tw + tx) * 4;
              rgb = [tex[k]!, tex[k + 1]!, tex[k + 2]!];
              if (thread && !layer.satin) {
                const l = (0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!) / 255;
                // Satin columns are rounded: darker toward the edge of each stroke.
                let inner = 0;
                for (const [cx0, cy0] of RING) inner += alphaPx(sx + cx0 * 1.6, sy + cy0 * 1.6);
                inner /= RING.length;
                const f = Math.min(1.1, Math.max(0.45, 0.8 + 0.2 * ((l - texMean) / texStd))) * (0.68 + 0.32 * inner * inner);
                rgb = [thread[0]! * f, thread[1]! * f, thread[2]! * f];
              }
            }
            if (layer.satin && thread && Jxx && Jxy && Jyy) {
              // Threads run across the stroke: along the dominant gradient direction of the alpha.
              const jxx = Jxx[i]!, jxy = Jxy[i]!, jyy = Jyy[i]!;
              const strength = Math.sqrt((jxx - jyy) * (jxx - jyy) + 4 * jxy * jxy);
              const fill = ((layer.satin.angle ?? 35) * Math.PI) / 180;
              const stroke = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
              const k = Math.min(1, strength * 60);
              const tx = Math.cos(stroke) * k + Math.cos(fill) * (1 - k), ty = Math.sin(stroke) * k + Math.sin(fill) * (1 - k);
              const tl = Math.hypot(tx, ty) || 1;
              const tX = tx / tl, tY = ty / tl;
              // Threads as a line-integral convolution of value noise along the thread direction: streaks that
              // follow the local direction without a global phase, so curves don't moiré.
              const cell = layer.satin.spacing;
              const hsh = (ix: number, iy: number): number => {
                const h = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
                return h - Math.floor(h);
              };
              const vnoise = (X: number, Y: number): number => {
                const gx0 = X / cell, gy0 = Y / cell;
                const ix = Math.floor(gx0), iy = Math.floor(gy0), fx = gx0 - ix, fy = gy0 - iy;
                const a0 = hsh(ix, iy), a1 = hsh(ix + 1, iy), a2 = hsh(ix, iy + 1), a3 = hsh(ix + 1, iy + 1);
                return (a0 * (1 - fx) + a1 * fx) * (1 - fy) + (a2 * (1 - fx) + a3 * fx) * fy;
              };
              const steps = 7;
              const stepLen = (layer.satin.radius * 1.6) / steps;
              let lic = 0;
              for (let k = -steps; k <= steps; k++) lic += vnoise(sx + k * stepLen * tX, sy + k * stepLen * tY);
              lic /= 2 * steps + 1;
              const round = Math.max(0, Math.min(1, 0.5 + (lic - 0.5) * 3.2));
              // Satin sheen depends on the thread direction against the light from the upper left.
              const lx = -0.6, ly = -0.8;
              const facing = Math.abs(tX * lx + tY * ly);
              let inner = 0;
              for (const [cx0, cy0] of RING) inner += alphaPx(sx + cx0 * layer.satin.radius * 0.8, sy + cy0 * layer.satin.radius * 0.8);
              inner /= RING.length;
              let fiber = 0;
              if (tex) {
                const l = (0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!) / 255;
                fiber = Math.max(-1.5, Math.min(1.5, (l - texMean) / texStd));
              }
              const f = (0.62 + 0.32 * round + 0.03 * fiber) * (0.8 + 0.28 * facing) * (0.72 + 0.28 * inner);
              rgb = [thread[0]! * f, thread[1]! * f, thread[2]! * f];
            }
            const edgeLight = Math.max(0, a - aUp) * 0.9 - Math.max(0, a - aDown) * 0.6;
            for (let ch = 0; ch < 3; ch++) {
              const val = rgb[ch]! * (0.35 + 0.75 * light) + edgeLight * 70;
              px[o + ch] = px[o + ch]! * (1 - a) + Math.min(255, Math.max(0, val)) * a;
            }
          } else if (layer.mode === "deboss") {
            // Pressed in: the inside sits a touch darker, the top-left wall is in shadow, the bottom-right wall catches light.
            const a = alphaAt(u, v);
            const off = relief / Math.max(1, aw / (maxX - minX + 1));
            const aUp = alphaAt(u - du * off * 2, v - dv * off * 2);
            const aDown = alphaAt(u + du * off * 2, v + dv * off * 2);
            const wallDark = Math.max(0, a - aUp);
            const wallLight = Math.max(0, a - aDown);
            const k = 1 - a * 0.12 - wallDark * 0.55 + wallLight * 0.35;
            for (let ch = 0; ch < 3; ch++) px[o + ch] = Math.min(255, px[o + ch]! * k + wallLight * 18);
          }
        }
      }
    }
    ctx.putImageData(photo, 0, 0);
    let out = canvas;
    if (job.crop) {
      const [cx, cy, cw, chh] = job.crop;
      out = document.createElement("canvas");
      out.width = cw;
      out.height = chh;
      (out.getContext("2d") as CanvasRenderingContext2D).drawImage(canvas, cx, cy, cw, chh, 0, 0, cw, chh);
    }
    return out.toDataURL("image/png").split(",")[1] as string;
  }, input);
  await page.close();
  return Buffer.from(b64, "base64");
}
