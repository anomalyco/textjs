/**
 * The code inside `embed.js`: paint the prerendered first frame, then wait for
 * the visitor to want the console before loading anything else. On touch
 * screens it does nothing at all.
 */

import { CONSOLE_OWNER, onConsoleIntent, type ConsoleIntentReason } from "@textjs/core/experimental";

/** What `embed.js` hands the runtime it loads. */
export interface EmbedBootState {
  reason: ConsoleIntentReason;
  /** `embed.js` logged a prerendered first frame. */
  shell: boolean;
  /** When it did (`performance.now()`). */
  shellAt?: number;
}

/**
 * `paint` logs the prerendered frame and returns when it did (`null` when
 * there is none). `boot` loads and starts the runtime. `src` names this embed
 * in the warning a second embed on the page prints.
 */
export function startEmbed(paint: (() => number | undefined) | null, boot: (state: EmbedBootState) => unknown, src: string): void {
  if (typeof window === "undefined" || window.matchMedia?.("(hover: none) and (pointer: coarse)").matches) return;
  const g = globalThis as Record<symbol, unknown>;
  if (g[CONSOLE_OWNER] !== undefined) {
    console.warn(`▼ Text.js: another app already renders in this console, so ${src} stays off.`);
    return;
  }
  g[CONSOLE_OWNER] = src;
  const shellAt = paint?.();
  onConsoleIntent(({ reason }) => void boot({ reason, shell: shellAt !== undefined, shellAt }));
}
