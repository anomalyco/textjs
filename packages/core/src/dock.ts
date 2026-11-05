/**
 * Reading a DevTools dock from the page's window metrics. No imports, so
 * bootstrap code (console intent, `embed.js`) stays a few kilobytes and never
 * pulls in the renderer's modules.
 */

export interface WindowLike {
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  devicePixelRatio?: number;
  addEventListener?(type: "resize", listener: () => void): void;
  removeEventListener?(type: "resize", listener: () => void): void;
}

/** Window metrics interpreted as a DevTools dock (all lengths in device-independent pixels). */
export interface DockAnalysis {
  dock: "side" | "bottom" | "undocked";
  /** Page zoom (Chrome reports `inner*` in zoomed CSS pixels and `outer*` in DIPs). */
  zoom: number;
  /** Width and height of the DevTools panel, or `0` when undocked. */
  panelWidth: number;
  panelHeight: number;
  /** A browser chrome height observation, when DevTools isn't docked at the bottom. */
  chromeSample: number | null;
}

/** Until learned: macOS Chrome with a bookmarks bar (~116px); overestimating only costs a row. */
export const DEFAULT_CHROME_PX = 120;
/** DevTools panels narrower than this are treated as absent. */
const DOCK_THRESHOLD_PX = 100;
/** Plausible browser chrome heights; anything taller is a small bottom dock. */
export const MAX_CHROME_PX = 160;
/** Window frame slack on the horizontal axis (Windows reports a 16px frame). */
const SLACK_X = 16;
/** Uncertainty of the browser chrome height. */
const SLACK_Y = 60;
/** Common OS display scale factors (`devicePixelRatio` at page zoom 100%). */
const DISPLAY_SCALES = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4];
/** Chrome's presets, plus Safari's 85% and 115%. */
const ZOOM_LEVELS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 0.8, 0.85, 0.9, 1, 1.1, 1.15, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
export const CHROME_STORAGE_KEY = "textjs:browser-chrome";

/** The nearest of Chrome's preset zoom levels within 5%, or `null`. */
export function snapZoom(z: number): number | null {
  if (!Number.isFinite(z) || z <= 0) return null;
  let best: number | null = null;
  for (const level of ZOOM_LEVELS) {
    const err = Math.abs(z / level - 1);
    if (err < 0.05 && (best === null || err < Math.abs(z / best - 1))) best = level;
  }
  return best;
}

/**
 * Interpret window metrics as a DevTools dock. Page zoom scales `inner*` but
 * not `outer*`, so each hypothesis (docked at the bottom, or on a side) picks
 * the zoom that makes its undocked axis line up, and the best fit wins.
 */
export function analyzeDock(win: WindowLike, browserChromeHeight: number = DEFAULT_CHROME_PX): DockAnalysis {
  const { innerWidth: iw, innerHeight: ih, outerWidth: ow, outerHeight: oh } = win;
  const chrome = browserChromeHeight;
  const out = (dock: DockAnalysis["dock"], zoom = 1, panelWidth = 0, panelHeight = 0, chromeSample: number | null = null): DockAnalysis => ({ dock, zoom, panelWidth, panelHeight, chromeSample });
  if (!(iw > 0 && ih > 0 && ow > 0 && oh > 0)) return out("undocked");
  // Page zoom is always one of Chrome's presets; each axis proposes one. `devicePixelRatio`
  // includes the zoom, so an integer ratio (the common unzoomed case) only allows zoom 1, and
  // a zoom must leave a plausible display scale. Unexplained metrics fall back to undocked.
  const candidates = new Set([1]);
  const dpr = win.devicePixelRatio;
  if (dpr === undefined || !Number.isInteger(dpr)) {
    for (const z of [snapZoom(ow / iw), snapZoom((oh - chrome) / ih)]) {
      if (z !== null && (dpr === undefined || DISPLAY_SCALES.some((s) => Math.abs(dpr / z / s - 1) < 0.02))) candidates.add(z);
    }
  }
  // Width residual for "bottom or nothing" (the width axis must line up), height residual for "side".
  let best: { side: boolean; zoom: number; score: number } | null = null;
  for (const z of candidates) {
    const dockW = ow - z * iw;
    const dockH = oh - chrome - z * ih;
    // The bottom (or closed) hypothesis only needs the page to fit in the window: gating on the assumed
    // chrome height would discard the slim toolbars of Safari (~52px) and Firefox (~40px) before they're learned.
    const bottomScore = oh - z * ih >= -SLACK_X ? Math.abs(dockW) / SLACK_X : Infinity;
    const sideScore = dockW >= -SLACK_X && dockW > DOCK_THRESHOLD_PX ? Math.abs(dockH) / SLACK_Y : Infinity;
    // Prefer zoom 1 and the bottom hypothesis on ties.
    const bias = z === 1 ? 0 : 0.05;
    if (bottomScore + bias < (best?.score ?? Infinity)) best = { side: false, zoom: z, score: bottomScore + bias };
    if (sideScore + bias + 0.01 < (best?.score ?? Infinity)) best = { side: true, zoom: z, score: sideScore + bias + 0.01 };
  }
  if (best === null || best.score > 2) return out("undocked");
  const z = best.zoom;
  const sample = (): number | null => {
    const c = Math.round(oh - z * ih);
    return z === 1 && c >= 0 && c <= MAX_CHROME_PX ? c : null;
  };
  if (best.side) {
    return out("side", z, ow - z * iw, z * ih, sample());
  }
  const dockH = oh - chrome - z * ih;
  if (dockH > DOCK_THRESHOLD_PX && oh - z * ih > MAX_CHROME_PX) {
    return out("bottom", z, z * iw, dockH);
  }
  return out("undocked", z, 0, 0, sample());
}
