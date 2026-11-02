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

interface DetectGlobals {
  chrome?: unknown;
  navigator?: { userAgentData?: unknown };
  document?: unknown;
  CSS?: { supports?(property: string, value: string): boolean };
}

/**
 * Detects the browser from feature support rather than the user agent:
 * `window.chrome` or `navigator.userAgentData` (Chromium only),
 * `-moz-appearance` (Gecko only), and `-webkit-hyphens` or
 * `-webkit-backdrop-filter` (WebKit only; Chromium supports neither).
 * Returns `null` outside a browser (Node.js, Bun, workers without a document).
 */
export function detectConsoleBrowser(g: DetectGlobals = globalThis as DetectGlobals): ConsoleBrowser | null {
  if (g.document === undefined || typeof g.CSS?.supports !== "function") return null;
  if (g.chrome !== undefined || g.navigator?.userAgentData !== undefined) return "chromium";
  try {
    if (g.CSS.supports("-moz-appearance", "none")) return "firefox";
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
  /** Row pitch in CSS px, used to fit the grid to the console's height. */
  rowHeight: number;
  /** Horizontal console chrome in CSS px (gutter, padding, source link column). */
  consolePaddingX: number;
  /** CSS of the zero-width span that pushes earlier frames above the console. */
  curtainCss: string;
}

/**
 * Measured in each console docked at the bottom, at default zoom:
 * - Chromium: rows are 14px (16px line height, -1px margins); frames wrap unless
 *   the console is 52–55px wider than the frame.
 * - Firefox: a `line-height: 14px` span gives 14px rows. The source link sits in its
 *   own column beside every line of the message, about 100px for `viewport:3:21`.
 * - Safari: rows are the taller of the span and the console's 12px system font
 *   (about 14.3px). The source link floats on the curtain's line, so frames use
 *   the full width.
 * Inline spans ignore `margin-top`, so the curtain is one 100vh-tall line instead.
 */
export const CONSOLE_PROFILES: Readonly<Record<ConsoleBrowser, Readonly<ConsoleProfile>>> = Object.freeze({
  chromium: Object.freeze({ inline: false, rowHeight: 14, consolePaddingX: 56, curtainCss: "margin-top:100vh;" }),
  firefox: Object.freeze({ inline: true, rowHeight: 14, consolePaddingX: 140, curtainCss: "line-height:100vh;" }),
  safari: Object.freeze({ inline: true, rowHeight: 15, consolePaddingX: 40, curtainCss: "line-height:100vh;" }),
});

let detected: ConsoleBrowser | null | undefined;

/** The profile for `browser`, or for the detected browser (Chromium outside a browser). */
export function consoleProfile(browser?: ConsoleBrowser): Readonly<ConsoleProfile> {
  if (browser === undefined) {
    if (detected === undefined) detected = detectConsoleBrowser();
    browser = detected ?? "chromium";
  }
  return CONSOLE_PROFILES[browser];
}
