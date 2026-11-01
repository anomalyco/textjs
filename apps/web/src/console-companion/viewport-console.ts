import type { ConsoleTarget } from "@textjs/core";

/**
 * The companion logs every frame through this file, so the source link beside a
 * frame in DevTools reads `viewport:3` and opens it in Sources. Chrome labels
 * `text://viewport` as `(index)`, hence the empty host.
 */
export const VIEWPORT_SOURCE = `// Every frame in the Console is one call to log() below.
({
  log(...args) { console.log(...args) },
  clear() { console.clear() },
})
//# sourceURL=text:///viewport`;

/** Indirect eval keeps the file exactly as written. `null` where a CSP blocks eval: frames then use the global console. */
export function viewportConsole(): ConsoleTarget | null {
  try {
    return (0, eval)(VIEWPORT_SOURCE) as ConsoleTarget;
  } catch {
    return null;
  }
}
