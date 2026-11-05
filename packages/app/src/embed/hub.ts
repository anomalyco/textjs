/**
 * How `<text-console>` elements reach the app `embed.js` started. They load
 * separately, so they meet at one object on `globalThis`, made by whichever
 * comes first. Duck-typed, like `CONSOLE_OWNER`.
 */

/** The running app, as a `<text-console>` sees it. */
export interface EmbedApp {
  /**
   * The current frame as an inline console (Firefox's) would log it: the format string, the CSS
   * for each `%c`, and the grid's size. `null` until the app paints one.
   */
  frame(): [format: string, css: string[], cols: number, rows: number] | null;
  /** Whether keys reach the app. */
  engaged(): boolean;
  /** Whether DevTools is docked to the page. */
  docked(): boolean;
}

export interface EmbedHub {
  app: EmbedApp | null;
  /** Called when the app starts or stops, and after each of its frames. */
  listeners: Set<() => void>;
}

const HUB = Symbol.for("textjs.embed");

export function embedHub(): EmbedHub {
  const g = globalThis as Record<symbol, EmbedHub | undefined>;
  return (g[HUB] ??= { app: null, listeners: new Set() });
}
