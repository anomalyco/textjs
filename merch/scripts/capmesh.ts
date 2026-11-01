/**
 * The front of the cap in cap-front-2 as a curved surface, for lettering that wraps the crown.
 *
 * Measured with scripts/grid.ts: the crown's silhouette runs from x 240 to 860, so it is modelled as a
 * vertical cylinder on axis x 550 with a 310 px radius. The front centre seam meets the brim at x 410
 * (26.8° left of the axis) and the right side seam at x 718 (32.8° right), so each front panel spans
 * about 60°, as six panels should. The brim seam is nearly straight, falling 23 px per unit of sin θ to
 * the right (the cap is rolled slightly), with a 5 px bow from the view's height. Seams lean as they
 * rise: +0.225 px per px at the centre seam, -0.05 at the right seam, interpolated in between.
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
};

/**
 * Mesh for an artwork box `wIn` × `hIn` centred on the front seam with its bottom edge `aboveIn` above the
 * brim seam. Columns follow the arc (foreshortening toward the sides); rows climb along the leaning seams.
 */
export function capMesh(s: CapSurface, wIn: number, hIn: number, aboveIn: number, cols = 48, rows = 8): { cols: number; rows: number; points: Point[] } {
  const points: Point[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const v = j / rows;
      const theta = s.seam + ((u - 0.5) * wIn * s.ppiArc) / s.r;
      const xb = s.cx + s.r * Math.sin(theta);
      const yb = s.brim(theta);
      const h = (aboveIn + (1 - v) * hIn) * s.ppiUp;
      points.push([xb + s.lean(xb) * h, yb - h]);
    }
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
  };
}
