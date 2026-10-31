import { createTheme, useTheme, type TextTheme } from "@textjs/next";
import catalog from "./themes.json";

export type NativeTheme = keyof typeof catalog;
export type Mode = "dark" | "light";
type Tokens = typeof catalog.opencode.dark;
export const themeNames = Object.keys(catalog).sort() as NativeTheme[];
export const nativeThemes = catalog as Record<NativeTheme, Partial<Record<Mode, Tokens>>>;
const cache = new Map<string, TextTheme>();
export function nativeTheme(name: NativeTheme, mode: Mode = "dark"): TextTheme {
  const t = nativeThemes[name][mode] ?? nativeThemes[name].dark ?? nativeThemes[name].light!;
  const appearance = nativeThemes[name].dark === t ? "dark" : "light";
  const id = `tui:${name}:${appearance}`;
  const previous = cache.get(id);
  if (previous) return previous;
  const theme = createTheme({ id, name, appearance, bg: t.bg, surface: t.raised, panel: t.raisedDown, elevated: t.high, border: t.border,
    borderFocus: t.primaryBgFocused, fg: t.text, muted: t.muted, subtle: t.faint, accent: t.primaryBgFocused, accentFg: t.primaryTextFocused,
    success: t.success, warning: t.warning, danger: t.error, info: t.info, selection: t.primaryBgFocused, codeBg: t.raised,
    diffAddBg: t.diffAddedBg, diffRemoveBg: t.diffRemovedBg, syntax: { keyword: t['syntax.keyword'], string: t['syntax.string'], comment: t['syntax.comment'],
      number: t['syntax.number'], type: t['syntax.type'], function: t['syntax.function'], tag: t['syntax.keyword'], attribute: t['syntax.variable'],
      punctuation: t['syntax.punctuation'], operator: t['syntax.operator'], variable: t['syntax.variable'], constant: t['syntax.number'] } }, "opencodeDark");
  cache.set(id, theme);
  return theme;
}
export function tokens(theme: TextTheme): Tokens {
  return nativeThemes[theme.name as NativeTheme]?.[theme.appearance] ?? catalog.opencode.dark;
}
export const useTokens = () => tokens(useTheme());
