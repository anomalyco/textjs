/**
 * Tailwind-style cell utilities: `className="flex-col gap-1 p-1 border rounded bg-surface text-muted"`.
 *
 * Units are terminal cells. Results are memoized per `(theme, className)` in a
 * bounded map, so re-renders with an unchanged `className` are a single lookup.
 */

import { NAMED_COLORS, withAlpha, parseColor, type BorderStyleValue, type SceneNodeProps } from "@textjs/core";
import { paletteColor } from "./palette";
import { themeToken, type TextTheme } from "./theme";

export type ClassNameProps = Partial<SceneNodeProps>;

type Mutable = { -readonly [K in keyof SceneNodeProps]?: SceneNodeProps[K] };

const EMPTY: ClassNameProps = Object.freeze({});
const CACHE_LIMIT = 2048;
const cache = new Map<string, ClassNameProps>();

/** Number of memoized `(theme, className)` entries (for tests and diagnostics). */
export function classNameCacheSize(): number {
  return cache.size;
}

export function clearClassNameCache(): void {
  cache.clear();
}

/** Parse a `className` string into scene props for the given theme. Memoized. */
export function parseClassName(className: string | undefined | null, theme: TextTheme): ClassNameProps {
  if (!className) return EMPTY;
  const key = `${theme.id}:${className}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const result = Object.freeze(compile(className, theme));
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, result);
  return result;
}

const BORDER_STYLES = new Set<BorderStyleValue>(["single", "rounded", "double", "heavy", "dashed", "ascii"]);

const JUSTIFY: Record<string, SceneNodeProps["justifyContent"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};

const ALIGN: Record<string, SceneNodeProps["alignItems"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
  auto: "auto",
};

function arbitrary(v: string): string | null {
  return v.length > 2 && v.charCodeAt(0) === 91 && v.charCodeAt(v.length - 1) === 93 ? v.slice(1, -1) : null;
}

function parseNumber(v: string): number | undefined {
  if (v === "px") return 1;
  const a = arbitrary(v);
  const s = a ?? v;
  if (!/^\d+(\.\d+)?$/.test(s)) return undefined;
  return Math.floor(Number(s));
}

/** Spacing / position length: `N`, `px`, `[N]`, `[N%]`, fractions. */
function parseLength(v: string): number | `${number}%` | undefined {
  const a = arbitrary(v);
  if (a !== null && /^\d+(\.\d+)?%$/.test(a)) return a as `${number}%`;
  const frac = /^(\d+)\/(\d+)$/.exec(v);
  if (frac) {
    const d = Number(frac[2]);
    if (d === 0) return undefined;
    return `${Math.round((Number(frac[1]) / d) * 1e4) / 100}%` as `${number}%`;
  }
  if (v === "full" || v === "screen") return "100%";
  return parseNumber(v);
}

function parseDimension(v: string): number | "auto" | `${number}%` | undefined {
  if (v === "auto") return "auto";
  return parseLength(v);
}

function negate<T>(v: T, neg: boolean): T {
  return neg && typeof v === "number" ? ((-v) as T) : v;
}

/** Resolve a color utility value: tokens, palette, `[#hex]`, named colors, with optional `/NN` opacity. */
export function resolveUtilityColor(value: string, theme: TextTheme): string | number | undefined {
  let v = value;
  let alpha: number | null = null;
  const slash = v.lastIndexOf("/");
  if (slash > 0 && !v.startsWith("[")) {
    const a = Number(v.slice(slash + 1));
    if (Number.isFinite(a)) {
      alpha = Math.max(0, Math.min(100, a)) / 100;
      v = v.slice(0, slash);
    }
  }
  let color: string | undefined;
  const arb = arbitrary(v);
  if (arb !== null) color = arb;
  else {
    color = themeToken(theme, v);
    if (color === undefined) {
      const dash = v.lastIndexOf("-");
      if (dash > 0) color = paletteColor(v.slice(0, dash), v.slice(dash + 1));
    }
    if (color === undefined && Object.prototype.hasOwnProperty.call(NAMED_COLORS, v)) color = v;
  }
  if (color === undefined) return undefined;
  if (alpha === null) return color;
  return withAlpha(parseColor(color), alpha);
}

const EDGE_KEYS = ["borderTop", "borderRight", "borderBottom", "borderLeft"] as const;

function compile(className: string, theme: TextTheme): Mutable {
  const p: Mutable = {};
  let fullBorder = false;
  const edges = new Set<(typeof EDGE_KEYS)[number]>();
  for (const raw of className.split(/\s+/)) {
    if (raw.length === 0) continue;
    const neg = raw.charCodeAt(0) === 45 /* - */ && raw.length > 1;
    const cls = neg ? raw.slice(1) : raw;
    if (cls === "border") fullBorder = true;
    if (applyStatic(cls, p)) continue;
    const dash = cls.indexOf("-");
    if (dash < 0) continue;
    const head = cls.slice(0, dash);
    const rest = cls.slice(dash + 1);
    switch (head) {
      case "flex": {
        if (rest === "row") p.flexDirection = "row";
        else if (rest === "col") p.flexDirection = "column";
        else if (rest === "row-reverse") p.flexDirection = "row-reverse";
        else if (rest === "col-reverse") p.flexDirection = "column-reverse";
        else if (rest === "wrap") p.flexWrap = "wrap";
        else if (rest === "nowrap") p.flexWrap = "nowrap";
        else if (rest === "wrap-reverse") p.flexWrap = "wrap-reverse";
        else if (rest === "1") {
          p.flexGrow = 1;
          p.flexShrink = 1;
          p.flexBasis = 0;
        } else if (rest === "auto") {
          p.flexGrow = 1;
          p.flexShrink = 1;
          p.flexBasis = "auto";
        } else if (rest === "initial") {
          p.flexGrow = 0;
          p.flexShrink = 1;
        } else if (rest === "none") {
          p.flexGrow = 0;
          p.flexShrink = 0;
        } else if (rest === "grow") p.flexGrow = 1;
        else if (rest === "grow-0") p.flexGrow = 0;
        else if (rest === "shrink") p.flexShrink = 1;
        else if (rest === "shrink-0") p.flexShrink = 0;
        break;
      }
      case "grow": {
        const n = parseNumber(rest);
        if (n !== undefined) p.flexGrow = n;
        break;
      }
      case "shrink": {
        const n = parseNumber(rest);
        if (n !== undefined) p.flexShrink = n;
        break;
      }
      case "basis": {
        const d = parseDimension(rest);
        if (d !== undefined) p.flexBasis = d;
        break;
      }
      case "items": {
        const a = ALIGN[rest];
        if (a) p.alignItems = a;
        break;
      }
      case "self": {
        const a = ALIGN[rest];
        if (a) p.alignSelf = a;
        break;
      }
      case "content": {
        const a = rest === "between" ? "space-between" : rest === "around" ? "space-around" : ALIGN[rest];
        if (a) p.alignContent = a;
        break;
      }
      case "justify": {
        const j = JUSTIFY[rest];
        if (j) p.justifyContent = j;
        break;
      }
      case "overflow": {
        if (rest === "hidden" || rest === "scroll" || rest === "visible") p.overflow = rest;
        else if (rest === "auto" || rest === "y-auto" || rest === "y-scroll") p.overflow = "scroll";
        break;
      }
      case "z": {
        const n = parseNumber(rest);
        if (n !== undefined) p.zIndex = neg ? -n : n;
        break;
      }
      case "inset": {
        let target: "all" | "x" | "y" = "all";
        let v = rest;
        if (rest.startsWith("x-")) {
          target = "x";
          v = rest.slice(2);
        } else if (rest.startsWith("y-")) {
          target = "y";
          v = rest.slice(2);
        }
        const l = parseLength(v);
        if (l === undefined) break;
        const n = negate(l, neg);
        if (target !== "y") p.left = p.right = n;
        if (target !== "x") p.top = p.bottom = n;
        break;
      }
      case "top":
      case "right":
      case "bottom":
      case "left": {
        const l = parseLength(rest);
        if (l !== undefined) p[head] = negate(l, neg);
        break;
      }
      case "w":
      case "h": {
        const d = parseDimension(rest);
        if (d !== undefined) p[head === "w" ? "width" : "height"] = d;
        break;
      }
      case "min":
      case "max": {
        const m = /^([wh])-(.+)$/.exec(rest);
        if (!m) break;
        const l = parseLength(m[2] as string);
        if (l === undefined) break;
        const key = `${head}${m[1] === "w" ? "Width" : "Height"}` as "minWidth" | "maxWidth" | "minHeight" | "maxHeight";
        p[key] = l;
        break;
      }
      case "gap": {
        if (rest.startsWith("x-")) {
          const l = parseLength(rest.slice(2));
          if (l !== undefined) p.columnGap = l;
        } else if (rest.startsWith("y-")) {
          const l = parseLength(rest.slice(2));
          if (l !== undefined) p.rowGap = l;
        } else {
          const l = parseLength(rest);
          if (l !== undefined) p.gap = l;
        }
        break;
      }
      case "p":
      case "px":
      case "py":
      case "pt":
      case "pr":
      case "pb":
      case "pl": {
        const l = parseLength(rest);
        if (l === undefined) break;
        const key = PADDING[head] as keyof Mutable;
        (p as Record<string, unknown>)[key] = l;
        break;
      }
      case "m":
      case "mx":
      case "my":
      case "mt":
      case "mr":
      case "mb":
      case "ml": {
        const l = rest === "auto" ? "auto" : parseLength(rest);
        if (l === undefined) break;
        (p as Record<string, unknown>)[MARGIN[head] as string] = negate(l, neg);
        break;
      }
      case "border": {
        if (rest === "none" || rest === "0") {
          p.border = false;
          fullBorder = false;
          edges.clear();
          break;
        }
        if (BORDER_STYLES.has(rest as BorderStyleValue)) {
          p.borderStyle = rest as BorderStyleValue;
          if (p.border === undefined || p.border === false) p.border = true;
          break;
        }
        const edge = EDGE_CLASS[rest];
        if (edge) {
          for (const e of edge) edges.add(e);
          break;
        }
        const c = resolveUtilityColor(rest, theme);
        if (c !== undefined) p.borderColor = c;
        break;
      }
      case "rounded":
        p.borderStyle = "rounded";
        break;
      case "bg": {
        const c = resolveUtilityColor(rest, theme);
        if (c !== undefined) p.bg = c;
        break;
      }
      case "text":
      case "fg": {
        if (head === "text" && (rest === "left" || rest === "center" || rest === "right")) {
          p.textAlign = rest;
          break;
        }
        const c = resolveUtilityColor(rest, theme);
        if (c !== undefined) p.fg = c;
        break;
      }
      case "font": {
        if (rest === "bold" || rest === "semibold" || rest === "extrabold" || rest === "black") p.bold = true;
        else if (rest === "normal" || rest === "light" || rest === "thin") p.bold = false;
        break;
      }
      case "whitespace": {
        if (rest === "nowrap" || rest === "pre") p.wrap = "nowrap";
        else if (rest === "normal" || rest === "pre-wrap") p.wrap = "wrap";
        break;
      }
      case "truncate": {
        if (rest === "start") p.wrap = "truncate-start";
        else if (rest === "middle") p.wrap = "truncate-middle";
        else if (rest === "end") p.wrap = "truncate-end";
        break;
      }
      case "opacity": {
        const n = parseNumber(rest);
        if (n !== undefined) p.dim = n < 100;
        break;
      }
      case "backdrop": {
        // backdrop-dim-60 → backdropDim 0.6
        const m = /^dim-(\d+)$/.exec(rest);
        if (m) p.backdropDim = Math.min(100, Number(m[1])) / 100;
        break;
      }
      default:
        break;
    }
  }
  if (edges.size > 0 && !fullBorder) {
    if (p.border === undefined || p.border === false) p.border = true;
    for (const k of EDGE_KEYS) if (!edges.has(k)) p[k] = false;
  }
  return p;
}

const PADDING: Record<string, keyof SceneNodeProps> = {
  p: "padding",
  px: "paddingX",
  py: "paddingY",
  pt: "paddingTop",
  pr: "paddingRight",
  pb: "paddingBottom",
  pl: "paddingLeft",
};

const MARGIN: Record<string, keyof SceneNodeProps> = {
  m: "margin",
  mx: "marginX",
  my: "marginY",
  mt: "marginTop",
  mr: "marginRight",
  mb: "marginBottom",
  ml: "marginLeft",
};

const EDGE_CLASS: Record<string, ReadonlyArray<(typeof EDGE_KEYS)[number]>> = {
  t: ["borderTop"],
  r: ["borderRight"],
  b: ["borderBottom"],
  l: ["borderLeft"],
  x: ["borderLeft", "borderRight"],
  y: ["borderTop", "borderBottom"],
};

/** Classes without a value segment. Returns `true` when handled. */
function applyStatic(cls: string, p: Mutable): boolean {
  switch (cls) {
    case "flex":
    case "block":
      p.display = "flex";
      return true;
    case "hidden":
      p.display = "none";
      return true;
    case "grow":
    case "flex-grow":
      p.flexGrow = 1;
      return true;
    case "shrink":
      p.flexShrink = 1;
      return true;
    case "relative":
    case "absolute":
      p.position = cls;
      return true;
    case "border":
      p.border = true;
      return true;
    case "rounded":
      p.borderStyle = "rounded";
      return true;
    case "bold":
      p.bold = true;
      return true;
    case "italic":
      p.italic = true;
      return true;
    case "not-italic":
      p.italic = false;
      return true;
    case "underline":
      p.underline = true;
      return true;
    case "no-underline":
      p.underline = false;
      return true;
    case "line-through":
    case "strikethrough":
      p.strikethrough = true;
      return true;
    case "dim":
      p.dim = true;
      return true;
    case "inverse":
      p.inverse = true;
      return true;
    case "truncate":
      p.wrap = "truncate-end";
      return true;
    case "wrap":
      p.wrap = "wrap";
      return true;
    case "link":
      p.allowLink = true;
      return true;
    case "overflow-hidden":
      p.overflow = "hidden";
      return true;
    default:
      return false;
  }
}
