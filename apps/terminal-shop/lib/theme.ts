/** `theme.BasicTheme` from the SSH shop (dark variant). */

import { span, type Span, type Style } from "./ui";

export const palette = {
  background: "#000000",
  border: "#3A3F42",
  body: "#889096",
  accent: "#FFFFFF",
  brand: "#FF5C00",
  /** ANSI 203. */
  error: "#FF5F5F",
} as const;

export interface Theme {
  highlight: string;
  border: string;
  base: (t: string, extra?: Style) => Span;
  accent: (t: string, extra?: Style) => Span;
  bold: (t: string, extra?: Style) => Span;
  highlightText: (t: string, extra?: Style) => Span;
  brand: (t: string, extra?: Style) => Span;
  error: (t: string, extra?: Style) => Span;
  baseStyle: Style;
}

export function makeTheme(highlight?: string | null): Theme {
  const h = highlight || palette.brand;
  return {
    highlight: h,
    border: palette.border,
    base: (t, extra) => span(t, { fg: palette.body, ...extra }),
    accent: (t, extra) => span(t, { fg: palette.accent, ...extra }),
    bold: (t, extra) => span(t, { fg: palette.accent, bold: true, ...extra }),
    highlightText: (t, extra) => span(t, { fg: h, ...extra }),
    brand: (t, extra) => span(t, { fg: palette.brand, ...extra }),
    error: (t, extra) => span(t, { fg: palette.error, ...extra }),
    baseStyle: { fg: palette.body },
  };
}

export const defaultTheme = makeTheme(null);
