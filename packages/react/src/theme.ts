import { createElement, useContext, useMemo, type ReactNode } from "react";
import type { ColorInput } from "@textjs/core";
import { sharedContext } from "./context";

export interface SyntaxPalette {
  keyword: string;
  string: string;
  comment: string;
  number: string;
  type: string;
  function: string;
  tag: string;
  attribute: string;
  punctuation: string;
  operator: string;
  variable: string;
  constant: string;
}

export interface TextTheme {
  id: string;
  name: string;
  appearance: "dark" | "light";
  /** App background. */
  bg: string;
  /** Slightly raised surface (sidebars, cards). */
  surface: string;
  /** Panels and inputs. */
  panel: string;
  /** Floating layers (modals, popovers). */
  elevated: string;
  border: string;
  borderFocus: string;
  /** Primary text. */
  fg: string;
  muted: string;
  subtle: string;
  accent: string;
  /** Text drawn on `accent`. */
  accentFg: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  selection: string;
  codeBg: string;
  /** Row tints for `<Diff>`. */
  diffAddBg: string;
  diffRemoveBg: string;
  syntax: SyntaxPalette;
}

export type ThemeName = "geistDark" | "geistLight" | "opencodeDark" | "tokyoNight" | "amberCrt";

export const geistDark: TextTheme = Object.freeze({
  id: "geistDark",
  name: "Geist Dark",
  appearance: "dark",
  bg: "#0a0a0a",
  surface: "#111113",
  panel: "#161618",
  elevated: "#1c1c1f",
  border: "#27272a",
  borderFocus: "#3291ff",
  fg: "#ededed",
  muted: "#a1a1a1",
  subtle: "#6b6b70",
  accent: "#0070f3",
  accentFg: "#ffffff",
  success: "#45a557",
  warning: "#f5a524",
  danger: "#e5484d",
  info: "#3291ff",
  selection: "#0d2847",
  codeBg: "#0f0f11",
  diffAddBg: "#0b2e17",
  diffRemoveBg: "#3a1214",
  syntax: Object.freeze({
    keyword: "#ff4d8d",
    string: "#62c073",
    comment: "#6b6b70",
    number: "#3291ff",
    type: "#c472fb",
    function: "#c472fb",
    tag: "#47a8ff",
    attribute: "#f5a524",
    punctuation: "#a1a1a1",
    operator: "#ff4d8d",
    variable: "#ededed",
    constant: "#3291ff",
  }),
});

export const geistLight: TextTheme = Object.freeze({
  id: "geistLight",
  name: "Geist Light",
  appearance: "light",
  bg: "#fafafa",
  surface: "#ffffff",
  panel: "#f4f4f5",
  elevated: "#ffffff",
  border: "#e4e4e7",
  borderFocus: "#0070f3",
  fg: "#09090b",
  muted: "#52525b",
  subtle: "#a1a1aa",
  accent: "#0070f3",
  accentFg: "#ffffff",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0070f3",
  selection: "#dbeafe",
  codeBg: "#f4f4f5",
  diffAddBg: "#dcfce7",
  diffRemoveBg: "#fee2e2",
  syntax: Object.freeze({
    keyword: "#d6246e",
    string: "#297a3a",
    comment: "#8f8f8f",
    number: "#0068d6",
    type: "#7d00cc",
    function: "#7d00cc",
    tag: "#0068d6",
    attribute: "#a35200",
    punctuation: "#52525b",
    operator: "#d6246e",
    variable: "#09090b",
    constant: "#0068d6",
  }),
});

export const opencodeDark: TextTheme = Object.freeze({
  id: "opencodeDark",
  name: "OpenCode Dark",
  appearance: "dark",
  bg: "#0a0a0a",
  surface: "#141414",
  panel: "#141414",
  elevated: "#1e1e1e",
  border: "#262626",
  borderFocus: "#fab283",
  fg: "#eeeeee",
  muted: "#808080",
  subtle: "#525252",
  accent: "#fab283",
  accentFg: "#0a0a0a",
  success: "#7fd88f",
  warning: "#f5a742",
  danger: "#e06c75",
  info: "#5c9cf5",
  selection: "#303030",
  codeBg: "#101010",
  diffAddBg: "#20303b",
  diffRemoveBg: "#37222c",
  syntax: Object.freeze({
    keyword: "#9d7cd8",
    string: "#7fd88f",
    comment: "#808080",
    number: "#f5a742",
    type: "#e5c07b",
    function: "#fab283",
    tag: "#e06c75",
    attribute: "#f5a742",
    punctuation: "#eeeeee",
    operator: "#56b6c2",
    variable: "#e06c75",
    constant: "#f5a742",
  }),
});

export const tokyoNight: TextTheme = Object.freeze({
  id: "tokyoNight",
  name: "Tokyo Night",
  appearance: "dark",
  bg: "#1a1b26",
  surface: "#1f2335",
  panel: "#24283b",
  elevated: "#292e42",
  border: "#3b4261",
  borderFocus: "#7aa2f7",
  fg: "#c0caf5",
  muted: "#a9b1d6",
  subtle: "#565f89",
  accent: "#7aa2f7",
  accentFg: "#1a1b26",
  success: "#9ece6a",
  warning: "#e0af68",
  danger: "#f7768e",
  info: "#7dcfff",
  selection: "#33467c",
  codeBg: "#16161e",
  diffAddBg: "#20303b",
  diffRemoveBg: "#37222c",
  syntax: Object.freeze({
    keyword: "#bb9af7",
    string: "#9ece6a",
    comment: "#565f89",
    number: "#ff9e64",
    type: "#2ac3de",
    function: "#7aa2f7",
    tag: "#f7768e",
    attribute: "#e0af68",
    punctuation: "#89ddff",
    operator: "#89ddff",
    variable: "#c0caf5",
    constant: "#ff9e64",
  }),
});

export const amberCrt: TextTheme = Object.freeze({
  id: "amberCrt",
  name: "Amber CRT",
  appearance: "dark",
  bg: "#0d0900",
  surface: "#140e00",
  panel: "#1a1200",
  elevated: "#221800",
  border: "#4d3500",
  borderFocus: "#ffb000",
  fg: "#ffb000",
  muted: "#cc8c00",
  subtle: "#805800",
  accent: "#ffcc00",
  accentFg: "#0d0900",
  success: "#ffd24d",
  warning: "#ff9500",
  danger: "#ff5f1f",
  info: "#ffc845",
  selection: "#3d2a00",
  codeBg: "#120c00",
  diffAddBg: "#2a2200",
  diffRemoveBg: "#2e1300",
  syntax: Object.freeze({
    keyword: "#ffd24d",
    string: "#ffc845",
    comment: "#805800",
    number: "#ffe08a",
    type: "#ffcc00",
    function: "#ffe08a",
    tag: "#ffd24d",
    attribute: "#cc8c00",
    punctuation: "#cc8c00",
    operator: "#ffd24d",
    variable: "#ffb000",
    constant: "#ffe08a",
  }),
});

export const themes: Readonly<Record<ThemeName, TextTheme>> = Object.freeze({
  geistDark,
  geistLight,
  opencodeDark,
  tokyoNight,
  amberCrt,
});

export const defaultTheme: TextTheme = geistDark;

export function resolveTheme(theme: TextTheme | ThemeName | undefined): TextTheme {
  if (theme === undefined) return defaultTheme;
  if (typeof theme === "string") return themes[theme] ?? defaultTheme;
  return theme;
}

/** Build a theme from a base preset with overrides. */
export function createTheme(overrides: Partial<TextTheme> & { id: string }, base: TextTheme | ThemeName = defaultTheme): TextTheme {
  const b = resolveTheme(base);
  return Object.freeze({ ...b, name: overrides.name ?? overrides.id, ...overrides, syntax: { ...b.syntax, ...overrides.syntax } });
}

/** Semantic token aliases accepted wherever a color is expected (`fg="muted"`, `bg-surface`, `border-focus`). */
const TOKEN_ALIASES: Readonly<Record<string, keyof TextTheme>> = {
  primary: "fg",
  foreground: "fg",
  default: "border",
  focus: "borderFocus",
  "border-focus": "borderFocus",
  "accent-fg": "accentFg",
  code: "codeBg",
  "code-bg": "codeBg",
  background: "bg",
};

const TOKEN_KEYS = new Set<string>([
  "bg",
  "surface",
  "panel",
  "elevated",
  "border",
  "borderFocus",
  "fg",
  "muted",
  "subtle",
  "accent",
  "accentFg",
  "success",
  "warning",
  "danger",
  "info",
  "selection",
  "codeBg",
  "diffAddBg",
  "diffRemoveBg",
]);

/** Resolve a semantic token name (`"muted"`, `"accent-fg"`, `"primary"`) against a theme, or `undefined`. */
export function themeToken(theme: TextTheme, name: string): string | undefined {
  const key = TOKEN_ALIASES[name] ?? name;
  if (!TOKEN_KEYS.has(key)) return undefined;
  return theme[key as keyof TextTheme] as string;
}

/** Map semantic token names to theme colors; anything else passes through to the core color parser. */
export function resolveColor(theme: TextTheme, color: ColorInput): ColorInput {
  if (typeof color !== "string" || color.length === 0 || color.charCodeAt(0) === 35 /* # */) return color;
  return themeToken(theme, color) ?? color;
}

const ThemeContext = sharedContext<TextTheme>("themeContext", defaultTheme, "TextThemeContext");

export interface ThemeProviderProps {
  theme: TextTheme | ThemeName;
  children?: ReactNode;
}

/** Provide a theme to a subtree. Nested providers override outer ones. */
export function ThemeProvider({ theme, children }: ThemeProviderProps): ReactNode {
  const value = useMemo(() => resolveTheme(theme), [theme]);
  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): TextTheme {
  return useContext(ThemeContext);
}
