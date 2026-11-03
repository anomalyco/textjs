import { DEFAULT_TYPOGRAPHY, type ConsoleTypographyOptions } from "./style";

/**
 * Which browser's DevTools console the frames land in. The three consoles
 * accept the same `%c` CSS (Turbolog emits only properties all three allow),
 * but lay styled spans out differently:
 *
 * - `chromium` (Chrome, Edge, Brave, Arc, Opera): every line of a `%c` span is
 *   an `inline-block` with `contain: paint`, so vertical margins apply and a
 *   span's background fills its line box.
 * - `firefox` and `safari` (Web Inspector): spans stay `inline`. Vertical
 *   margins are ignored, the line box is at least the console's own line
 *   height, and long rows soft-wrap unless wrapping is turned off.
 */
export type ConsoleBrowser = "chromium" | "firefox" | "safari";

/** The globals `detectConsoleBrowser` reads (`globalThis` by default). */
export interface DetectGlobals {
  chrome?: unknown;
  navigator?: { userAgentData?: unknown };
  document?: unknown;
  CSS?: { supports?(property: string, value: string): boolean };
}

/**
 * Detects the browser from feature support rather than the user agent:
 * `-moz-appearance` (Gecko only), then `window.chrome` or
 * `navigator.userAgentData` (Chromium only), then `-webkit-hyphens` or
 * `-webkit-backdrop-filter` (WebKit only; Chromium supports neither).
 * Returns `null` outside a browser (Node.js, Bun, workers without a document).
 */
export function detectConsoleBrowser(g: DetectGlobals = globalThis as DetectGlobals): ConsoleBrowser | null {
  if (!g.document || typeof g.CSS?.supports !== "function") return null;
  try {
    if (g.CSS.supports("-moz-appearance", "none")) return "firefox";
    if (g.chrome || g.navigator?.userAgentData) return "chromium";
    if (g.CSS.supports("-webkit-hyphens", "auto") || g.CSS.supports("-webkit-backdrop-filter", "none")) return "safari";
  } catch {
    // An exotic CSS.supports: treat it as Chromium below.
  }
  return "chromium";
}

/** How Turbolog fits frames to one browser's console. */
export interface ConsoleProfile {
  /** Spans are inline boxes (Firefox, Safari) rather than per-line inline-blocks (Chromium). */
  inline: boolean;
  /** Whether `%c` styles preserve `background-image: url("data:...")` (Chromium, Firefox) vs stripping `url(...)` (Safari). */
  supportsSpriteUrl: boolean;
  /** Whether 2–3 frame `@keyframes` SVG batching is used to cross Chromium's 50ms `viewportThrottler`. */
  supportsTemporalBatching: boolean;
  /** Typography defaults for this console (merged over `DEFAULT_TYPOGRAPHY`). */
  typography: Readonly<Partial<ConsoleTypographyOptions>>;
  /** Row pitch in CSS px, used to fit the grid to the console's height. */
  rowHeight: number;
  /** Horizontal console chrome in CSS px (gutter, padding, source link column). */
  consolePaddingX: number;
  /** CSS of the zero-width span that pushes earlier frames above the console. */
  curtainCss: string;
}

/** Inline spans: the line box is the line height itself, so rows are exactly 14px apart with no margins. */
const INLINE_ROWS = { lineHeight: 14, rowMarginY: 0, rowPaddingY: 0 } as const;

/**
 * Measured in each console docked at the bottom, at default zoom:
 * - Chromium: rows are 14px (16px line height, -1px margins); frames wrap unless
 *   the console is 52–55px wider than the frame.
 * - Firefox: a `line-height: 14px` span gives 14px rows. The source link sits in its
 *   own column beside every line of the message, about 100px for `viewport:3:21`.
 * - Safari: a 14px span in Web Inspector's 12px system font gives 14px rows on macOS
 *   at 1x and 2x. The source link floats on the curtain's line, so frames use the full
 *   width. Safari's pages can't use a user-installed SF Mono but Web Inspector may, so
 *   Menlo comes first: the page then measures the font the console draws.
 * Inline spans ignore `margin-top`, so the curtain is one 100vh-tall line instead.
 */
export const CONSOLE_PROFILES: Readonly<Record<ConsoleBrowser, Readonly<ConsoleProfile>>> = Object.freeze({
  chromium: Object.freeze({
    inline: false,
    supportsSpriteUrl: true,
    supportsTemporalBatching: true,
    typography: Object.freeze({}),
    rowHeight: 14,
    consolePaddingX: 56,
    curtainCss: "margin-top:100vh;",
  }),
  firefox: Object.freeze({
    inline: true,
    supportsSpriteUrl: true,
    supportsTemporalBatching: false,
    typography: Object.freeze({ ...INLINE_ROWS }),
    rowHeight: 14,
    consolePaddingX: 140,
    curtainCss: "line-height:100vh;",
  }),
  safari: Object.freeze({
    inline: true,
    supportsSpriteUrl: false,
    supportsTemporalBatching: false,
    typography: Object.freeze({ ...INLINE_ROWS, fontFamily: 'Menlo,"SF Mono",Consolas,monospace' }),
    rowHeight: 14,
    consolePaddingX: 40,
    curtainCss: "line-height:100vh;",
  }),
});

let detected: ConsoleBrowser | undefined;

/** The profile for `browser`, or for the detected browser (Chromium outside a browser). */
export function consoleProfile(browser?: ConsoleBrowser): Readonly<ConsoleProfile> {
  if (browser === undefined) {
    // Only a real answer is cached: outside a browser the globals may still appear later (test DOMs).
    detected ??= detectConsoleBrowser() ?? undefined;
    browser = detected ?? "chromium";
  }
  return CONSOLE_PROFILES[browser];
}

/**
 * Per-span typography for consoles that keep `%c` spans inline (Firefox,
 * Safari). Vertical margins don't apply to inline boxes and the line box is
 * the line height itself, so rows are exactly `lineHeight` apart with no
 * margins. `rowPaddingY` becomes real padding: it extends each background
 * without moving the rows. `text-wrap-mode: nowrap` keeps a row that is wider
 * than the console on one line (clipped), where soft wrapping would break the
 * grid. `defaultFamily` is the profile's own stack, which needs no ligature reset.
 */
export function inlineTypographyCss(t: ConsoleTypographyOptions, defaultFamily: string = DEFAULT_TYPOGRAPHY.fontFamily): string {
  let css = `font-family:${t.fontFamily};font-size:${t.fontSize}px;line-height:${t.lineHeight}px;text-wrap-mode:nowrap;`;
  if (t.fontFamily !== defaultFamily) css += "font-variant-ligatures:none;";
  if (t.rowPaddingY !== 0) css += `padding-top:${t.rowPaddingY}px;padding-bottom:${t.rowPaddingY}px;`;
  if (t.extraCss) css += t.extraCss.endsWith(";") ? t.extraCss : `${t.extraCss};`;
  return css;
}
