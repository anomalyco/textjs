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
export { frameToAnsi } from "./ansi-frame";
export { parseClassName, resolveUtilityColor, clearClassNameCache, classNameCacheSize, type ClassNameProps } from "./classname";
export { TAILWIND_COLORS, paletteColor } from "./palette";
export { mergeStyleProps } from "./host";
export {
  useApp,
  useViewport,
  usePageFocus,
  useConsoleStats,
  useInput,
  usePaste,
  useWheel,
  type AppApi,
  type ViewportApi,
  type UseInputOptions,
  type UseConsoleStatsOptions,
} from "./hooks";
export { useFocus, useFocusManager, FocusManager, FOCUS_OWNER, type UseFocusOptions, type UseFocusResult, type FocusManagerApi } from "./focus";
export {
  InputManager,
  FOCUSED_INPUT_PRIORITY,
  type KeyEvent,
  type PasteEvent,
  type WheelEvent,
  type EventControl,
} from "./input-manager";
export { useRuntime, createScope, ScopeContext, ROOT_SCOPE, shared, sharedContext, type RootRuntime, type Scope } from "./context";
export type { ConsoleStats, ViewportState } from "./stores";
export * from "./components/index";
export { tokenize, normalizeLanguage, type Token, type TokenKind } from "./highlight";
export { parseMarkdown, parseInline, type MarkdownBlock, type InlineSpan, type ListItem } from "./markdown";
export { parseUnifiedDiff, diffTexts, type DiffFile, type DiffHunk, type DiffLine, type DiffLineKind } from "./diff";
export { renderAsciiFont, ASCII_FONT_CHARS, type AsciiFontName, type AsciiFontRenderer } from "./fonts";
export { applyEditKey, type EditState } from "./editing";
export {
  useKeymap,
  useKeymapBindings,
  useKeymapRegistry,
  KeymapRegistry,
  type Keymap,
  type KeyBinding,
  type KeyHandler,
  type UseKeymapOptions,
  type RegisteredBinding,
} from "./keymap";
export { parseKeys, matchesKey, matchStroke, formatKeys, keyEventFromCombo, type KeyStroke, type KeySequence, type FormatKeysOptions } from "./keys";
export { fuzzyMatch, fuzzyFilter, type FuzzyMatch } from "./fuzzy";
export { sparkline, dataRange, formatCompact, DotCanvas, BrailleCanvas, SPARK_BLOCKS, QUADRANTS, type DotMarker, type Range } from "./charts";
export { useInterval, useTimeout, useAnimationFrame, type UseAnimationFrameOptions } from "./hooks/timers";
export { useTween, useSpring, easings, type Easing, type EasingName, type UseTweenOptions, type UseSpringOptions } from "./hooks/animation";
export { useMeasure, type Measurement } from "./hooks/measure";
export {
  useBreakpoint,
  useClipboard,
  useLocalStorage,
  BREAKPOINTS,
  type Breakpoint,
  type BreakpointApi,
  type ClipboardApi,
  type UseClipboardOptions,
} from "./hooks/environment";
export {
  installDevToolsHook,
  getDevToolsHook,
  DEVTOOLS_HOOK_KEY,
  DEVTOOLS_PROTOCOL,
  type TextDevToolsHook,
  type DevToolsRootHandle,
  type DevToolsRootInfo,
  type DevToolsFrameRecord,
  type DevToolsTreeSnapshot,
  type DevToolsTreeNode,
  type DevToolsFrameSnapshot,
  type DevToolsHookEvent,
} from "./devtools-hook";
