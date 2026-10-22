/**
 * Packed RGBA colors.
 *
 * Every color is an unsigned 32-bit integer laid out as `0xRRGGBBAA`. An alpha
 * of `0` means "transparent / terminal default", so `COLOR_DEFAULT` (`0`) lets
 * the console theme's own foreground/background show through.
 */

export type PackedColor = number;

/** Accepted color inputs: CSS-ish strings, packed numbers, or nothing. */
export type ColorInput = string | number | null | undefined;

export const COLOR_DEFAULT: PackedColor = 0;
export const COLOR_TRANSPARENT: PackedColor = 0x00000000;
export const COLOR_BLACK: PackedColor = 0x000000ff;
export const COLOR_WHITE: PackedColor = 0xffffffff;

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function packRGBA(r: number, g: number, b: number, a = 255): PackedColor {
  return (((r & 255) << 24) | ((g & 255) << 16) | ((b & 255) << 8) | (a & 255)) >>> 0;
}

export function unpackRGBA(c: PackedColor): RGBA {
  return { r: (c >>> 24) & 255, g: (c >>> 16) & 255, b: (c >>> 8) & 255, a: c & 255 };
}

export function alphaOf(c: PackedColor): number {
  return c & 255;
}

export function isTransparent(c: PackedColor): boolean {
  return (c & 255) === 0;
}

export function isOpaque(c: PackedColor): boolean {
  return (c & 255) === 255;
}

/** Replace the alpha channel. `alpha0to1` is clamped to `[0, 1]`. */
export function withAlpha(c: PackedColor, alpha0to1: number): PackedColor {
  const a = Math.round(Math.min(1, Math.max(0, alpha0to1)) * 255);
  return ((c & 0xffffff00) | a) >>> 0;
}

/**
 * Integer Porter-Duff `src-over` compositing of two packed colors.
 * A fully transparent destination yields the source unchanged, so overlays on
 * the console's default background stay translucent instead of guessing a color.
 */
export function blendOver(src: PackedColor, dst: PackedColor): PackedColor {
  const sa = src & 255;
  if (sa === 255) return src >>> 0;
  if (sa === 0) return dst >>> 0;
  const da = dst & 255;
  if (da === 0) return src >>> 0;
  const inv = 255 - sa;
  // outA in 0..255*255 space to keep precision.
  const daInv = da * inv;
  const outA255 = sa * 255 + daInv;
  const sr = (src >>> 24) & 255;
  const sg = (src >>> 16) & 255;
  const sb = (src >>> 8) & 255;
  const dr = (dst >>> 24) & 255;
  const dg = (dst >>> 16) & 255;
  const db = (dst >>> 8) & 255;
  const half = outA255 >>> 1;
  const r = ((sr * sa * 255 + dr * daInv + half) / outA255) | 0;
  const g = ((sg * sa * 255 + dg * daInv + half) / outA255) | 0;
  const b = ((sb * sa * 255 + db * daInv + half) / outA255) | 0;
  const a = ((outA255 + 127) / 255) | 0;
  return packRGBA(r, g, b, a);
}

/** Linear interpolation between two opaque colors (`t = 0` → `a`, `t = 1` → `b`). */
export function mixColors(a: PackedColor, b: PackedColor, t: number): PackedColor {
  const k = Math.min(1, Math.max(0, t));
  const ik = 1 - k;
  return packRGBA(
    Math.round(((a >>> 24) & 255) * ik + ((b >>> 24) & 255) * k),
    Math.round(((a >>> 16) & 255) * ik + ((b >>> 16) & 255) * k),
    Math.round(((a >>> 8) & 255) * ik + ((b >>> 8) & 255) * k),
    Math.round((a & 255) * ik + (b & 255) * k),
  );
}

/** Named colors. Base hues follow the Tailwind 500 shades; terminal names map to their natural hue. */
export const NAMED_COLORS: Readonly<Record<string, string>> = {
  transparent: "#00000000",
  default: "#00000000",
  black: "#000000",
  white: "#ffffff",
  gray: "#71717a",
  grey: "#71717a",
  zinc: "#71717a",
  slate: "#64748b",
  neutral: "#737373",
  stone: "#78716c",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  magenta: "#d946ef",
  pink: "#ec4899",
  rose: "#f43f5e",
  silver: "#c0c0c0",
  maroon: "#800000",
  navy: "#000080",
  olive: "#808000",
  aqua: "#00ffff",
  lightgray: "#d4d4d8",
  darkgray: "#3f3f46",
  blackbright: "#52525b",
  redbright: "#f87171",
  greenbright: "#4ade80",
  yellowbright: "#facc15",
  bluebright: "#60a5fa",
  magentabright: "#e879f9",
  cyanbright: "#22d3ee",
  whitebright: "#fafafa",
};

const parseCache = new Map<string, PackedColor>();
const PARSE_CACHE_MAX = 2048;

const HEX2: readonly string[] = Array.from({ length: 256 }, (_, i) => (i < 16 ? "0" : "") + i.toString(16));

function clampByte(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : Math.round(n);
}

function parseChannel(raw: string): number {
  const s = raw.trim();
  if (s.endsWith("%")) return clampByte((parseFloat(s) / 100) * 255);
  return clampByte(parseFloat(s));
}

function parseAlpha(raw: string): number {
  const s = raw.trim();
  if (s.endsWith("%")) return clampByte((parseFloat(s) / 100) * 255);
  const v = parseFloat(s);
  return clampByte((v > 1 ? v / 255 : v) * 255);
}

function hexNibble(code: number): number {
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 97 && code <= 102) return code - 87;
  if (code >= 65 && code <= 70) return code - 55;
  return -1;
}

function parseHex(s: string): PackedColor | null {
  const n = s.length - 1;
  if (n !== 3 && n !== 4 && n !== 6 && n !== 8) return null;
  const v: number[] = [];
  for (let i = 1; i < s.length; i++) {
    const h = hexNibble(s.charCodeAt(i));
    if (h < 0) return null;
    v.push(h);
  }
  const at = (i: number): number => v[i] ?? 0;
  if (n === 3 || n === 4) {
    return packRGBA(at(0) * 17, at(1) * 17, at(2) * 17, n === 4 ? at(3) * 17 : 255);
  }
  return packRGBA(
    at(0) * 16 + at(1),
    at(2) * 16 + at(3),
    at(4) * 16 + at(5),
    n === 8 ? at(6) * 16 + at(7) : 255,
  );
}

function parseUncached(input: string): PackedColor {
  const s = input.trim().toLowerCase();
  if (s.length === 0) return COLOR_DEFAULT;
  if (s.charCodeAt(0) === 35 /* # */) return parseHex(s) ?? COLOR_DEFAULT;
  const fn = /^rgba?\(([^)]*)\)$/.exec(s);
  if (fn) {
    const body = fn[1] ?? "";
    let parts: string[];
    let alpha: string | undefined;
    if (body.includes(",")) {
      parts = body.split(",");
      alpha = parts.length > 3 ? parts[3] : undefined;
    } else {
      const [rgb, a] = body.split("/");
      parts = (rgb ?? "").trim().split(/\s+/);
      alpha = a;
    }
    if (parts.length < 3) return COLOR_DEFAULT;
    return packRGBA(
      parseChannel(parts[0] ?? "0"),
      parseChannel(parts[1] ?? "0"),
      parseChannel(parts[2] ?? "0"),
      alpha === undefined ? 255 : parseAlpha(alpha),
    );
  }
  const named = NAMED_COLORS[s.replace(/[\s_-]/g, "")];
  if (named !== undefined) return parseHex(named) ?? COLOR_DEFAULT;
  if (/^0x[0-9a-f]{1,8}$/.test(s)) return parseInt(s.slice(2), 16) >>> 0;
  return COLOR_DEFAULT;
}

/**
 * Parse any supported color input into a packed `0xRRGGBBAA` integer.
 * Unknown or empty input resolves to `COLOR_DEFAULT` (`0`). Results are interned.
 */
export function parseColor(input: ColorInput): PackedColor {
  if (input === undefined || input === null) return COLOR_DEFAULT;
  if (typeof input === "number") return Number.isFinite(input) ? input >>> 0 : COLOR_DEFAULT;
  const cached = parseCache.get(input);
  if (cached !== undefined) return cached;
  const value = parseUncached(input);
  if (parseCache.size >= PARSE_CACHE_MAX) {
    const oldest = parseCache.keys().next();
    if (!oldest.done) parseCache.delete(oldest.value);
  }
  parseCache.set(input, value);
  return value;
}

const cssCache = new Map<number, string>();
const CSS_CACHE_MAX = 8192;

/** Convert a packed color to CSS hex (`#rrggbb` when opaque, `#rrggbbaa` otherwise). Interned. */
export function colorToCss(c: PackedColor): string {
  const key = c >>> 0;
  const cached = cssCache.get(key);
  if (cached !== undefined) return cached;
  const r = (key >>> 24) & 255;
  const g = (key >>> 16) & 255;
  const b = (key >>> 8) & 255;
  const a = key & 255;
  const css =
    a === 255
      ? `#${HEX2[r] as string}${HEX2[g] as string}${HEX2[b] as string}`
      : `#${HEX2[r] as string}${HEX2[g] as string}${HEX2[b] as string}${HEX2[a] as string}`;
  if (cssCache.size >= CSS_CACHE_MAX) {
    const oldest = cssCache.keys().next();
    if (!oldest.done) cssCache.delete(oldest.value);
  }
  cssCache.set(key, css);
  return css;
}
