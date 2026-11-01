/**
 * One real console frame of the site's console companion, rendered by `@textjs/react/testing`
 * and mirrored to HTML with `<ConsoleMirror>` (the component the site's own DevTools mirrors use).
 * Used by ./share.ts for the X share images. Import it after `test/setup`, which registers Vite's
 * `?raw` imports for the site modules.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { extractStyledFrame } from "@textjs/core";
import { render } from "@textjs/react/testing";
import { ConsoleMirror } from "@textjs/react/dom";
import { CompanionApp } from "../../src/console-companion/App";
import { resetLocation } from "../../src/router";

export interface OgFrame {
  /** `<ConsoleMirror>` markup of one real frame. */
  html: string;
  cols: number;
  rows: number;
}

interface FrameOptions {
  /** App time to let pass before the frame is taken (timers run on a virtual clock). */
  ms?: number;
  fontSize?: number;
}

/** Seeded `Math.random` (mulberry32) so demo frames are the same on every build. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Timer {
  at: number;
  every: number;
  run: () => void;
}

/**
 * A virtual clock for app timers (`setInterval`, and `setTimeout` with a delay), so a demo can be
 * advanced to a known moment without waiting for it. Zero-delay timeouts stay real: React and the
 * renderer use them to flush work.
 */
function virtualClock(): { advance(ms: number): void; restore(): void } {
  const real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval, random: Math.random };
  const timers = new Map<number, Timer>();
  let now = 0;
  let seq = 0;
  const add = (cb: (...a: unknown[]) => void, ms: number, args: unknown[], repeat: boolean): number => {
    const id = 0x40000000 + ++seq;
    const every = Math.max(1, ms);
    timers.set(id, { at: now + every, every: repeat ? every : 0, run: () => cb(...args) });
    return id;
  };
  const g = globalThis as unknown as Record<string, unknown>;
  g.setTimeout = (cb: (...a: unknown[]) => void, ms?: number, ...args: unknown[]) => (ms && ms > 0 ? add(cb, ms, args, false) : real.setTimeout(cb, ms, ...args));
  g.setInterval = (cb: (...a: unknown[]) => void, ms?: number, ...args: unknown[]) => add(cb, ms ?? 0, args, true);
  const clear = (fallback: (id: never) => void) => (id: unknown) => (typeof id === "number" && timers.has(id) ? timers.delete(id) : fallback(id as never));
  g.clearTimeout = clear(real.clearTimeout);
  g.clearInterval = clear(real.clearInterval);
  Math.random = seeded(7);
  return {
    advance(ms) {
      const until = now + ms;
      for (;;) {
        let next: [number, Timer] | undefined;
        for (const entry of timers) if (entry[1].at <= until && (!next || entry[1].at < next[1].at)) next = entry;
        if (!next) break;
        const [id, t] = next;
        now = t.at;
        if (t.every) t.at += t.every;
        else timers.delete(id);
        t.run();
      }
      now = until;
    },
    restore() {
      Object.assign(globalThis, { setTimeout: real.setTimeout, clearTimeout: real.clearTimeout, setInterval: real.setInterval, clearInterval: real.clearInterval });
      Math.random = real.random;
    },
  };
}

// Geist Mono cells are 0.6em wide, so at 15px (or 10, 20, 25) a cell is a whole number of pixels.
// Its █ is 1.3em tall and sits 0.045em low; mirror rows clip to their line height, so a row at
// most 1.21em tall is covered top to bottom and block characters join without seams.
const FRAME_FONT_SIZE = 15;
export const frameLineHeight = (fontSize: number): number => Math.floor(fontSize * 1.21);

/** Renders the console companion at `path` and returns one frame. */
export async function companionFrame(path: string, cols: number, rows: number, { ms = 0, fontSize = FRAME_FONT_SIZE }: FrameOptions = {}): Promise<OgFrame> {
  resetLocation(path);
  const clock = virtualClock();
  try {
    const app = await render(<CompanionApp />, { cols, rows, theme: "geistDark", tabFocus: false });
    // Small steps, so each tick renders the way a browser would paint between them.
    for (let t = 0; t < ms; t += 100) await app.act(() => clock.advance(100));
    const frame = extractStyledFrame(app.root.renderer.buffer);
    await app.unmount();
    return { html: renderToStaticMarkup(<ConsoleMirror frame={frame} fontSize={fontSize} lineHeight={frameLineHeight(fontSize)} style={{ display: "block" }} />), cols, rows };
  } finally {
    clock.restore();
  }
}
