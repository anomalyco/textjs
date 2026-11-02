import { blendOver, colorToCss, withAlpha, type PackedColor } from "../color";
import {
  ATTR_ALLOW_LINK,
  ATTR_BOLD,
  ATTR_DIM,
  ATTR_INVERSE,
  ATTR_ITALIC,
  ATTR_STRIKETHROUGH,
  ATTR_UNDERLINE,
} from "../cell-buffer";

export interface ConsoleTypographyOptions {
  fontFamily: string;
  /** Font size in CSS pixels. */
  fontSize: number;
  /** Line height in CSS pixels. */
  lineHeight: number;
  /** Vertical margin applied to every span so stacked background rows seal without gaps. */
  rowMarginY: number;
  /** Vertical padding that extends inline backgrounds to the full line box. */
  rowPaddingY: number;
  /** Extra CSS appended to every span. */
  extraCss: string;
}

export const DEFAULT_TYPOGRAPHY: Readonly<ConsoleTypographyOptions> = Object.freeze({
  fontFamily: '"SF Mono",Menlo,Consolas,monospace',
  fontSize: 12,
  lineHeight: 14,
  rowMarginY: -1,
  rowPaddingY: 1,
  extraCss: "",
});

export interface StyleResolveOptions {
  /** Foreground used when inverse is applied to a default background. */
  inverseFg: PackedColor;
  /** Background used when inverse is applied to a default foreground. */
  inverseBg: PackedColor;
  /** Foreground used for dimmed text whose foreground is the theme default. */
  dimFallbackFg: PackedColor;
  /** Opacity multiplier applied to dimmed foregrounds. */
  dimOpacity: number;
}

export const DEFAULT_STYLE_RESOLVE: Readonly<StyleResolveOptions> = Object.freeze({
  inverseFg: 0x18181bff,
  inverseBg: 0xe4e4e7ff,
  dimFallbackFg: 0x808080ff,
  dimOpacity: 0.6,
});

/** Style flags that survive into the effective style key (inverse and dim are resolved into colors). */
export const KEY_FLAG_MASK = ATTR_BOLD | ATTR_ITALIC | ATTR_UNDERLINE | ATTR_STRIKETHROUGH | ATTR_ALLOW_LINK;

export interface EffectiveStyle {
  fg: PackedColor;
  bg: PackedColor;
  flags: number;
}

/** Resolve inverse and dim into concrete colors. Writes into `out` to avoid allocation. */
export function resolveStyle(
  fg: PackedColor,
  bg: PackedColor,
  attrs: number,
  opts: StyleResolveOptions,
  out: EffectiveStyle,
): EffectiveStyle {
  let f = fg;
  let b = bg;
  if (attrs & ATTR_INVERSE) {
    f = (bg & 255) === 0 ? opts.inverseFg : bg;
    b = (fg & 255) === 0 ? opts.inverseBg : fg;
    if ((b & 255) !== 255) b = blendOver(b, opts.inverseFg);
  }
  if (attrs & ATTR_DIM) {
    const base = (f & 255) === 0 ? opts.dimFallbackFg : f;
    f = withAlpha(base, ((base & 255) / 255) * opts.dimOpacity);
  }
  out.fg = f >>> 0;
  out.bg = b >>> 0;
  out.flags = attrs & KEY_FLAG_MASK;
  return out;
}

export function styleKeyOf(style: EffectiveStyle): bigint {
  return (BigInt(style.fg) << 40n) | (BigInt(style.bg) << 8n) | BigInt(style.flags & 0xff);
}

/**
 * Per-span typography. DevTools copies every *longhand* of a `%c` style onto
 * every line of the span, so shorthands are expensive: `font:` alone expands
 * to ~20 properties. Vertical padding is folded into the line height (an
 * inline-block's background fills its whole line box), which paints the same
 * box with fewer properties.
 */
export function typographyCss(t: ConsoleTypographyOptions): string {
  let css = `font-family:${t.fontFamily};font-size:${t.fontSize}px;line-height:${t.lineHeight + 2 * t.rowPaddingY}px;`;
  // The default stack has no programming ligatures; custom fonts may.
  if (t.fontFamily !== DEFAULT_TYPOGRAPHY.fontFamily) css += "font-variant-ligatures:none;";
  if (t.rowMarginY !== 0) css += `margin-top:${t.rowMarginY}px;margin-bottom:${t.rowMarginY}px;`;
  if (t.extraCss) css += t.extraCss.endsWith(";") ? t.extraCss : `${t.extraCss};`;
  return css;
}

/**
 * Per-span typography for consoles that keep `%c` spans inline (Firefox,
 * Safari). Vertical margins don't apply to inline boxes and the line box is
 * the line height itself, so rows are exactly `lineHeight` apart with no
 * margins. `rowPaddingY` becomes real padding: it extends each background
 * without moving the rows. `text-wrap-mode: nowrap` keeps a row that is wider
 * than the console on one line (clipped), where soft wrapping would break the
 * grid.
 */
export function inlineTypographyCss(t: ConsoleTypographyOptions): string {
  let css = `font-family:${t.fontFamily};font-size:${t.fontSize}px;line-height:${t.lineHeight}px;text-wrap-mode:nowrap;`;
  if (t.fontFamily !== DEFAULT_TYPOGRAPHY.fontFamily) css += "font-variant-ligatures:none;";
  if (t.rowPaddingY !== 0) css += `padding-top:${t.rowPaddingY}px;padding-bottom:${t.rowPaddingY}px;`;
  if (t.extraCss) css += t.extraCss.endsWith(";") ? t.extraCss : `${t.extraCss};`;
  return css;
}

/** Typography defaults for inline consoles: 14px rows with nothing folded into the line height. */
export const INLINE_TYPOGRAPHY: Readonly<Pick<ConsoleTypographyOptions, "lineHeight" | "rowMarginY" | "rowPaddingY">> = Object.freeze({
  lineHeight: 14,
  rowMarginY: 0,
  rowPaddingY: 0,
});

export function styleCss(base: string, style: EffectiveStyle): string {
  let css = base;
  if ((style.fg & 255) !== 0) css += `color:${colorToCss(style.fg)};`;
  if ((style.bg & 255) !== 0) css += `background-color:${colorToCss(style.bg)};`;
  const f = style.flags;
  if (f & ATTR_BOLD) css += "font-weight:700;";
  if (f & ATTR_ITALIC) css += "font-style:italic;";
  if (f & (ATTR_UNDERLINE | ATTR_STRIKETHROUGH)) {
    css += `text-decoration-line:${f & ATTR_UNDERLINE ? "underline" : ""}${f & ATTR_UNDERLINE && f & ATTR_STRIKETHROUGH ? " " : ""}${f & ATTR_STRIKETHROUGH ? "line-through" : ""};`;
  }
  return css;
}
