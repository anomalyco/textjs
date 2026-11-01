/** Deterministic motion: every value is a pure function of time. */

/** A CSS-style cubic-bezier easing. */
export function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number): number => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number): number => ((ay * t + by) * t + cy) * t;
  const dx = (t: number): number => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      const d = dx(t);
      if (Math.abs(err) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    if (Math.abs(sx(t) - x) > 1e-5) {
      t = x;
      for (let i = 0; i < 30; i++) {
        if (sx(t) < x) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return sy(t);
  };
}

/** Decisive entrances: fast start, long settle (Vercel's ease-out-expo feel). */
export const easeOut = bezier(0.16, 1, 0.3, 1);
/** Camera moves and travel. */
export const easeInOut = bezier(0.65, 0, 0.35, 1);
/** Soft exits. */
export const easeIn = bezier(0.55, 0, 1, 0.45);
export const linear = (t: number): number => Math.min(1, Math.max(0, t));

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
export const mix = (a: number, b: number, k: number): number => a + (b - a) * k;

/** 0→1 as `t` goes from `at` to `at + dur`, eased. */
export function ramp(t: number, at: number, dur: number, ease = easeOut): number {
  if (dur <= 0) return t >= at ? 1 : 0;
  return ease(clamp((t - at) / dur));
}

/** 0→1→0: in over `fadeIn` from `at`, out over `fadeOut` ending at `until`. */
export function window(t: number, at: number, until: number, fadeIn = 0.4, fadeOut = 0.4): number {
  return Math.min(ramp(t, at, fadeIn), 1 - ramp(t, until - fadeOut, fadeOut, easeIn));
}

export interface Look {
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
  blur?: number;
}

export function apply(el: HTMLElement | SVGElement, look: Look): void {
  const s = (el as HTMLElement).style;
  if (look.opacity !== undefined) s.opacity = String(Math.round(look.opacity * 1000) / 1000);
  const parts: string[] = [];
  if (look.x || look.y) parts.push(`translate3d(${(look.x ?? 0).toFixed(2)}px, ${(look.y ?? 0).toFixed(2)}px, 0)`);
  if (look.scale !== undefined && look.scale !== 1) parts.push(`scale(${look.scale.toFixed(4)})`);
  s.transform = parts.join(" ");
  if (look.blur !== undefined) s.filter = look.blur > 0.05 ? `blur(${look.blur.toFixed(2)}px)` : "";
}

/** Fade up into place from `dy` below, softly blurred. */
export function rise(el: HTMLElement, t: number, at: number, opts: { dur?: number; dy?: number; blur?: number } = {}): number {
  const k = ramp(t, at, opts.dur ?? 0.9);
  apply(el, { opacity: k, y: (1 - k) * (opts.dy ?? 24), blur: (1 - k) * (opts.blur ?? 6) });
  return k;
}

/** Plain fade. */
export function fade(el: HTMLElement | SVGElement, t: number, at: number, dur = 0.5): number {
  const k = ramp(t, at, dur, easeInOut);
  (el as HTMLElement).style.opacity = String(Math.round(k * 1000) / 1000);
  return k;
}

/** Wraps each word of `el`'s text in a mask, for line-by-line reveals. Returns the inner spans. */
export function maskWords(el: HTMLElement, text: string): HTMLElement[] {
  el.textContent = "";
  const inner: HTMLElement[] = [];
  const words = text.split(/(\s+)/);
  for (const w of words) {
    if (/^\s+$/.test(w)) {
      el.append(document.createTextNode(w));
      continue;
    }
    if (!w) continue;
    const m = document.createElement("span");
    m.className = "mask";
    const i = document.createElement("span");
    i.textContent = w;
    m.append(i);
    el.append(m);
    inner.push(i);
  }
  return inner;
}

/** Words slide up out of their masks, staggered. */
export function revealWords(spans: HTMLElement[], t: number, at: number, opts: { stagger?: number; dur?: number } = {}): void {
  const stagger = opts.stagger ?? 0.055;
  spans.forEach((s, i) => {
    const k = ramp(t, at + i * stagger, opts.dur ?? 1.0);
    s.style.transform = k >= 1 ? "" : `translate3d(0, ${((1 - k) * 112).toFixed(3)}%, 0)`;
    s.style.opacity = k < 0.001 ? "0" : "1";
  });
}

/** Creates an element. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  parent?.append(el);
  return el;
}

/** Positions an element absolutely. */
export function place<E extends HTMLElement>(el: E, x: number, y: number, w?: number, hgt?: number): E {
  el.style.position = "absolute";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  if (w !== undefined) el.style.width = `${w}px`;
  if (hgt !== undefined) el.style.height = `${hgt}px`;
  return el;
}

const SVG = "http://www.w3.org/2000/svg";
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.append(el);
  return el;
}

/** Draws an SVG path on: `k` of its length is visible. */
export function drawOn(path: SVGPathElement | SVGLineElement, k: number): void {
  const len = (path as SVGPathElement).getTotalLength?.() ?? 0;
  path.style.strokeDasharray = `${len} ${len}`;
  path.style.strokeDashoffset = String(len * (1 - clamp(k)));
}
