import type { ConsoleTarget } from "@textjs/core";

/**
 * The companion logs every frame through this file, so the source link beside a
 * frame in DevTools reads `viewport:3` and opens it in Sources. Chrome labels
 * `text://viewport` as `(index)`, hence the empty host. Vite puts it in every page
 * as an inline script before the head `<style>` (allowed by hash under the site's
 * Content-Security-Policy, which has no `unsafe-eval`). It sets `__textjsViewport`:
 * `window.viewport` is Chrome's Viewport Segments API.
 */
export const VIEWPORT_SOURCE = `// Every frame in the console is one call to log() below.
globalThis.__textjsViewport = {
  log(...args) { console.log(...args) },
  clear() { console.clear() },
};
//# sourceURL=text:///viewport`;

/** What the page's inline script defines, or `null` (frames then use the global console). */
export function viewportConsole(): ConsoleTarget | null {
  const v = (globalThis as { __textjsViewport?: Partial<ConsoleTarget> }).__textjsViewport;
  return v && typeof v.log === "function" && typeof v.clear === "function" ? (v as ConsoleTarget) : null;
}

/** `console.clear()` from the same file as the frames, so its "Console was cleared" row links there too. */
export function clearViewportConsole(): void {
  (viewportConsole() ?? console).clear();
}
