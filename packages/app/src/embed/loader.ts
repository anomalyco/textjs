/**
 * The code inside `embed.js`: paint the prerendered first frame, then wait for
 * the visitor to want the console before loading anything else. On touch
 * screens it does nothing.
 */

import { CONSOLE_OWNER, type ConsoleIntentReason, type ConsoleOwner } from "@textjs/core/experimental";
import { watchConsoleIntent } from "@textjs/core/internal";

/** What `embed.js` hands the runtime it loads. */
export interface EmbedBootState {
  reason: ConsoleIntentReason;
  /** `ConsoleIntentEvent.away`, for the runtime's input to read once it starts. */
  away: () => boolean;
  /** `embed.js` logged a prerendered first frame. */
  shell: boolean;
  /** When it did (`performance.now()`). */
  shellAt?: number;
}

/**
 * `paint` logs the prerendered frame and returns when it did (`null` when
 * there is none). `boot` loads and starts the runtime. `src` names this embed
 * in the warning it prints when another app already owns the console.
 *
 * Until the runtime starts, the embed holds the console with a claim the
 * page's own app takes over when it starts (see `claimConsole`).
 *
 * `element` loads the `<text-console>` module and mounts it on each element
 * that connects (see `text-console-element.ts`). The tag is defined on touch
 * screens too, unless something has already defined `text-console`, and the
 * module loads only when the tag is on the page. On touch screens only a
 * `mirror` or `chrome` one loads it: a bar would only hide there.
 */
export function startEmbed(paint: (() => number | undefined) | null, boot: (state: EmbedBootState) => unknown, src: string, element?: (el: HTMLElement) => Promise<unknown>): void {
  if (typeof window === "undefined") return;
  const touch = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
  if (element && !customElements.get("text-console")) {
    customElements.define(
      "text-console",
      class extends HTMLElement {
        connectedCallback(): void {
          // A file a redeploy removed: the tag stays empty.
          if (!touch || this.matches("[mirror],[chrome]")) element(this).catch(() => {});
        }
      },
    );
  }
  if (touch) return;
  const g = globalThis as Record<symbol, ConsoleOwner | undefined>;
  // Another app holds the console, or the page's own prerendered shell is painting.
  if (g[CONSOLE_OWNER] !== undefined || (window as { __TEXTJS_SHELL__?: unknown }).__TEXTJS_SHELL__ !== undefined) {
    console.warn(`▼ Text.js: another app is already rendering in this console, so ${src} won't start.`);
    return;
  }
  const release = (): void => {
    if (g[CONSOLE_OWNER] === claim) delete g[CONSOLE_OWNER];
  };
  const claim: ConsoleOwner = {
    embed: true,
    preempt: () => {
      release();
      intent.dispose();
    },
  };
  g[CONSOLE_OWNER] = claim;
  const shellAt = paint?.();
  const intent = watchConsoleIntent(({ reason, away }) => {
    // A failed load (often a redeploy that removed this build's files) stays out of the page's own error reporting.
    Promise.resolve()
      .then(() => boot({ reason, away, shell: shellAt !== undefined, shellAt }))
      .catch((error: unknown) => {
        release();
        console.warn(`▼ Text.js: ${src} couldn't load its files, so it won't start. If the site was just redeployed, reload the page.`, error);
      });
  });
}
