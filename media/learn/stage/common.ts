import { clamp, easeOut, h, place, ramp } from "./motion";
import type { SceneData, TuiFrame } from "./types";

export const W = 1920;
export const H = 1080;

export interface Scene {
  root: HTMLElement;
  /** Draws the scene at scene time `t` (may be negative or past the end while the camera travels). */
  update(t: number): void | Promise<void>;
  /** Where the camera looks, in scene coordinates (default: the centre, zoom 1). */
  camera?(t: number): Camera;
  /** Screen-fixed layer (not moved by the camera), shown while the scene is on screen. */
  overlay?: HTMLElement;
  /** Hide the persistent HUD marks (cover and outro). */
  bare?: boolean;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export type SceneFactory = (data: SceneData, cue: Cue) => Scene;

/** Resolves a cue reference: a number of seconds, `"name"`, or `"name+0.4"` / `"name-0.2"`. */
export type Cue = (ref: string | number | undefined, fallback?: number) => number;

export function cueResolver(data: SceneData): Cue {
  return (ref, fallback = 0) => {
    if (ref === undefined) return fallback;
    if (typeof ref === "number") return ref;
    const m = /^([\w.-]+?)(?:([+-])(\d+(?:\.\d+)?))?$/.exec(ref);
    if (!m) throw new Error(`Bad cue "${ref}" in ${data.id}`);
    const base = data.cues[m[1]!];
    if (base === undefined) throw new Error(`Unknown cue "${m[1]}" in ${data.id} (have ${Object.keys(data.cues).join(", ")})`);
    return base + (m[2] === "-" ? -1 : 1) * Number(m[3] ?? 0);
  };
}

/**
 * Frame lines: two horizontal and two vertical hairlines through the frame's corners, running past the scene's
 * edges (so neighbouring scenes' lines continue into each other), with crosshairs at the corners.
 */
export function frameLines(root: HTMLElement, rect = { x: 240, y: 120, w: 1440, h: 840 }): (t: number) => void {
  const rules: HTMLElement[] = [];
  for (const y of [rect.y, rect.y + rect.h]) rules.push(place(h("div", "rule h", root), -120, y, W + 240));
  for (const x of [rect.x, rect.x + rect.w]) rules.push(place(h("div", "rule v", root), x, -120, undefined, H + 240));
  const crosses = [
    [rect.x, rect.y],
    [rect.x + rect.w, rect.y],
    [rect.x, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h],
  ].map(([x, y]) => place(h("div", "cross", root), x!, y!));
  return (t) => {
    for (const r of rules) r.style.opacity = String(ramp(t, -1.2, 1.2));
    crosses.forEach((c, i) => {
      const k = ramp(t, 0.1 + i * 0.08, 0.7);
      c.style.opacity = String(k);
      c.style.transform = `rotate(${(1 - k) * 90}deg)`;
    });
  };
}

/** The ▼ mark as crisp vector. */
export function mark(size: number, color = "currentColor"): SVGSVGElement {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("width", String(size));
  s.setAttribute("height", String(size));
  s.innerHTML = `<path d="M2 4 H22 L12 21 Z" fill="${color}"/>`;
  return s;
}

/** Text.js dark theme default colours, for cells without an explicit colour. */
export const TUI_FG = "#ededed";
export const TUI_BG = "#0a0a0a";

/** Renders a real Text.js frame as DOM text (cells in a monospace grid). */
export function tui(frame: TuiFrame, size: number, opts: { cols?: [number, number]; rows?: [number, number] } = {}): HTMLElement {
  const el = h("div", "tui");
  el.style.fontSize = `${size}px`;
  el.style.background = TUI_BG;
  const [r0, r1] = opts.rows ?? [0, frame.height];
  for (const row of frame.rows.slice(r0, r1)) {
    const line = h("div", "row", el);
    for (const s of row) {
      const span = h("span", "", line, s.text);
      if (s.fg) span.style.color = s.fg;
      if (s.bg) span.style.background = s.bg;
      if (s.bold) span.style.fontWeight = "700";
      if (s.dim) span.style.opacity = "0.6";
      if (s.italic) span.style.fontStyle = "italic";
      if (s.underline) span.style.textDecoration = "underline";
    }
    if (!row.length) line.textContent = " ";
  }
  return el;
}

/** A soft dimming spotlight: everything but `box` darkens. */
export function spotlight(parent: HTMLElement): (box: { x: number; y: number; w: number; h: number } | null, k: number) => void {
  const el = h("div", "", parent);
  Object.assign(el.style, { position: "absolute", borderRadius: "10px", pointerEvents: "none", zIndex: "20" });
  // Dark UIs barely change when dimmed, so the lit box also gets the code-highlight treatment: a faint accent wash
  // (screen-blended, so text stays white) and an accent bar on its left edge.
  const tint = h("div", "", parent);
  Object.assign(tint.style, { position: "absolute", borderRadius: "6px", pointerEvents: "none", zIndex: "21", mixBlendMode: "screen", transformOrigin: "0 50%" });
  return (box, k) => {
    if (!box || k <= 0.001) {
      el.style.display = "none";
      tint.style.display = "none";
      return;
    }
    el.style.display = "block";
    tint.style.display = "block";
    place(el, box.x, box.y, box.w, box.h);
    place(tint, box.x, box.y, box.w, box.h);
    el.style.boxShadow = `0 0 0 4000px rgba(0,0,0,${(0.66 * clamp(k)).toFixed(3)})`;
    tint.style.background = `rgba(50,145,255,${(0.2 * clamp(k)).toFixed(3)})`;
    tint.style.boxShadow = `inset 3px 0 0 rgba(50,145,255,${clamp(k).toFixed(3)})`;
    tint.style.transform = `scaleX(${(0.2 + 0.8 * easeOut(clamp(k))).toFixed(4)})`;
  };
}

/** Typed text: the first `n` characters of `text`, with `n` growing at `cps` from `at`. */
export function typed(text: string, t: number, at: number, cps = 38): string {
  const n = Math.floor(clamp((t - at) * cps, 0, text.length));
  return text.slice(0, n);
}

export { easeOut };
