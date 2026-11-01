/**
 * The front of the cap in cap-front-2 as a curved surface, for lettering that wraps the crown.
 *
 * Measured with scripts/grid.ts: the crown's silhouette runs from x 240 to 860, so it is modelled as a
 * vertical cylinder on axis x 550 with a 310 px radius. The front centre seam meets the brim at x 410
 * (26.8° left of the axis) and the right side seam at x 718 (32.8° right), so each front panel spans
 * about 60°, as six panels should. The brim seam is nearly straight, falling 23 px per unit of sin θ to
 * the right (the cap is rolled slightly), with a 5 px bow from the view's height. Seams lean as they
 * rise: +0.225 px per px at the centre seam, -0.05 at the right seam, interpolated in between.
 *
 * The centre seam itself is measured as a polyline (`seamLine`, brim upward), because it curves as the crown
 * turns back: designs are centred on it, not on the cylinder's estimate of it.
 */
import type { Point } from "./composite";

export interface CapSurface {
  cx: number;
  r: number;
  /** Arc angle (radians) of the front centre seam at the brim. */
  seam: number;
  brim: (theta: number) => number;
  lean: (x: number) => number;
  /** Pixels per inch along the arc and up the crown. */
  ppiArc: number;
  ppiUp: number;
  /** The centre front seam as measured, from where it meets the brim upward. */
  seamLine: Point[];
}

/** x of the measured centre seam at height y (extrapolated past its ends). */
export function seamX(s: CapSurface, y: number): number {
  const l = s.seamLine;
  for (let i = 0; i < l.length - 1; i++) {
    const [x0, y0] = l[i]!;
    const [x1, y1] = l[i + 1]!;
    if ((y <= y0 && y >= y1) || i === l.length - 2 || (i === 0 && y > y0)) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
  }
  return l[0]![0];
}

export const CAP_FRONT_2: CapSurface = {
  cx: 550,
  r: 310,
  seam: Math.asin((410 - 550) / 310),
  brim: (t) => 852.4 + 23 * Math.sin(t) + 10 * Math.cos(t),
  // Half the seams' measured lean: the full lean reads as italic type, because the crown also tilts back.
  lean: (x) => 0.5 * (0.225 - (0.275 * (x - 410)) / 308),
  ppiArc: 95,
  ppiUp: 88,
  seamLine: [[407, 850], [420, 800], [430, 760], [438, 720], [442, 680], [451, 640], [460, 620], [475, 580]],
};

/**
 * Mesh for an artwork box `wIn` × `hIn` centred on the front seam with its bottom edge `aboveIn` above the
 * brim seam. Columns follow the arc (foreshortening toward the sides).
 *
 * - `"centre"` (lettering): rows climb along the half-lean of the seams, so verticals stay upright enough to
 *   read as roman type, and the whole mesh is shifted so its centre column crosses the measured seam at the
 *   box's mid-height.
 * - `"seam"` (the ▼): the centre column runs along the measured seam itself, so the mark is symmetric about it.
 */
export function capMesh(s: CapSurface, wIn: number, hIn: number, aboveIn: number, cols = 48, rows = 8, follow: "centre" | "seam" = "centre"): { cols: number; rows: number; points: Point[] } {
  const points: Point[] = [];
  const brimAtSeam = s.seamLine[0]![1];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const v = j / rows;
      const h = (aboveIn + (1 - v) * hIn) * s.ppiUp;
      const d = ((u - 0.5) * wIn * s.ppiArc) / s.r;
      if (follow === "seam") {
        const ys = brimAtSeam - h;
        const ts = Math.asin(Math.max(-1, Math.min(1, (seamX(s, ys) - s.cx) / s.r)));
        points.push([s.cx + s.r * Math.sin(ts + d), ys + s.brim(ts + d) - s.brim(ts)]);
      } else {
        const theta = s.seam + d;
        const xb = s.cx + s.r * Math.sin(theta);
        const yb = s.brim(theta);
        points.push([xb + s.lean(xb) * h, yb - h]);
      }
    }
  }
  if (follow === "centre") {
    const mid = points[Math.round(rows / 2) * (cols + 1) + Math.round(cols / 2)]!;
    const dx = seamX(s, mid[1]) - mid[0];
    for (const p of points) p[0] += dx;
  }
  return { cols, rows, points };
}

/** The same surface in a crop of the photo enlarged `k` times from (`ox`, `oy`). */
export function enlarged(s: CapSurface, ox: number, oy: number, k: number): CapSurface {
  return {
    cx: (s.cx - ox) * k,
    r: s.r * k,
    seam: s.seam,
    brim: (t) => (s.brim(t) - oy) * k,
    lean: (x) => s.lean(x / k + ox),
    ppiArc: s.ppiArc * k,
    ppiUp: s.ppiUp * k,
    seamLine: s.seamLine.map(([x, y]) => [(x - ox) * k, (y - oy) * k] as Point),
  };
}
