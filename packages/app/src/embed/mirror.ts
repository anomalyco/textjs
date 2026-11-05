/**
 * The runtime's side of `<text-console>`: publishes the running app on the
 * embed hub, with its frames encoded only while an element asks for them.
 */

import { analyzeDock, CHROME_STORAGE_KEY, CssConsoleDriver, MAX_CHROME_PX } from "@textjs/core";
import type { CellGrid } from "@textjs/core/internal";
import { embedHub, type EmbedApp } from "./hub";
import type { HostInput } from "./host-input";

export interface PublishedEmbed {
  /** Call after each frame the app paints. */
  frame(): void;
  dispose(): void;
}

function docked(): boolean {
  let chrome: number | undefined;
  try {
    const v = Number(localStorage.getItem(CHROME_STORAGE_KEY) ?? Number.NaN);
    if (v >= 0 && v <= MAX_CHROME_PX) chrome = v;
  } catch {
    // Storage blocked.
  }
  return analyzeDock(window, chrome).dock !== "undocked";
}

export function publishEmbed(buffer: () => CellGrid, input: HostInput): PublishedEmbed {
  const hub = embedHub();
  // Inline spans with 14px line heights: the same CSS a DOM mirror needs, and what `embed.js`'s first frame has.
  let driver: CssConsoleDriver | null = null;
  let last: [string, string[], number, number] | null = null;
  // Nothing until the app paints its first frame: until then, elements keep `embed.js`'s.
  let stale = false;
  const app: EmbedApp = {
    frame() {
      if (stale) {
        stale = false;
        const b = buffer();
        if (b.width > 0 && b.height > 0) {
          driver ??= new CssConsoleDriver({ browser: "firefox", curtain: false, clear: "never" });
          // Nothing changed (a focus hint blinking in the console only): elements keep what they drew.
          const f = driver.encode(b).frame;
          if (f) last = [f.format, f.args, b.width, b.height];
        }
      }
      return last;
    },
    engaged: () => input.engaged,
    docked,
  };
  const notify = (): void => {
    for (const l of hub.listeners) l();
  };
  hub.app = app;
  notify();
  return {
    frame() {
      stale = true;
      notify();
    },
    dispose() {
      if (hub.app !== app) return;
      hub.app = null;
      notify();
    },
  };
}
