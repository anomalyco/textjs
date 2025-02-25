export {
  createConsoleRoot,
  createConsoleRootSync,
  renderToConsole,
  type ConsoleRoot,
  type ConsoleRootOptions,
} from "./root";
export {
  reconciler,
  runWithPriority,
  toSceneProps,
  DiscreteEventPriority,
  ContinuousEventPriority,
  DefaultEventPriority,
  type ConsoleContainer,
  type HostProps,
} from "./reconciler";
export {
  themes,
  defaultTheme,
  geistDark,
  geistLight,
  opencodeDark,
  tokyoNight,
  amberCrt,
  createTheme,
  resolveTheme,
  resolveColor,
  themeToken,
  ThemeProvider,
  useTheme,
  type TextTheme,
  type ThemeName,
  type ThemeProviderProps,
  type SyntaxPalette,
} from "./theme";
export { parseClassName, resolveUtilityColor, clearClassNameCache, classNameCacheSize, type ClassNameProps } from "./classname";
export { TAILWIND_COLORS, paletteColor } from "./palette";
export { mergeStyleProps } from "./host";
export {
  useApp,
  useViewport,
  useConsoleStats,
  useInput,
  usePaste,
  useWheel,
  type AppApi,
  type ViewportApi,
  type UseInputOptions,
  type UseConsoleStatsOptions,
} from "./hooks";
export { useFocus, useFocusManager, FocusManager, type UseFocusOptions, type UseFocusResult, type FocusManagerApi } from "./focus";
export {
  InputManager,
  FOCUSED_INPUT_PRIORITY,
  type KeyEvent,
  type PasteEvent,
  type WheelEvent,
  type EventControl,
} from "./input-manager";
export { useRuntime, createScope, ScopeContext, ROOT_SCOPE, type RootRuntime, type Scope } from "./context";
export type { ConsoleStats, ViewportState } from "./stores";
export * from "./components/index";
export { tokenize, normalizeLanguage, type Token, type TokenKind } from "./highlight";
export { parseMarkdown, parseInline, type MarkdownBlock, type InlineSpan, type ListItem } from "./markdown";
export { parseUnifiedDiff, diffTexts, type DiffFile, type DiffHunk, type DiffLine, type DiffLineKind } from "./diff";
export { renderAsciiFont, ASCII_FONT_CHARS, type AsciiFontName } from "./fonts";
export { applyEditKey, type EditState } from "./editing";
