/**
 * The Unicode Bidirectional Algorithm (`bidi.ts`) as the scene painter uses
 * it, loaded on first use.
 *
 * Node, Bun, edge runtimes and browser bundles without the
 * `@textjs/client` condition bundle it with the rest of `@textjs/core`,
 * so it's always ready and every paint is synchronous. Client builds with the
 * condition (`text dev`, `text build`) fetch it as its own chunk the first
 * time a text node needs bidi (right-to-left characters, `dir="rtl"` or an
 * RLE/RLO/RLI control), so pages without right-to-left text never download
 * it. Until it arrives, that text paints in logical order, and
 * `ConsoleRenderer` repaints once it lands.
 */

import { bundledBidi, importBidi } from "#bidi-loader";
import type { CellBuffer } from "./cell-buffer";
import type { PackedColor } from "./color";
import { textNeedsBidi, type TextDirection } from "./rtl";

/** @internal The parts of `bidi.ts` the scene painter calls. */
export type BidiEngine = Pick<typeof import("./bidi"), "resolveGraphemeBidi" | "visualizeLine" | "visualizeText">;

let engine: BidiEngine | null = bundledBidi;
let loading: Promise<void> | null = null;
/** Resolves when the engine lands, however it was loaded. */
let ready: Promise<void> | null = null;
let markReady: (() => void) | null = null;
let autoTried = false;

/**
 * Start downloading the bidi engine now, so the first frame with
 * right-to-left text is already in display order. Without it,
 * `ConsoleRenderer` loads the engine on the first right-to-left text and
 * repaints when it arrives. Resolves at once when the engine is bundled, which
 * is every build except client builds with the `@textjs/client` condition
 * (`text dev` and `text build` set it). Rejects if the chunk fails to load;
 * call it again to retry.
 */
export function loadBidi(): Promise<void> {
  if (engine !== null) return Promise.resolve();
  // A failed load is forgotten, so the next call imports again. Whether that refetches is the browser's call:
  // headless Chromium 151 keeps the failed module in its module map and rejects again without a request.
  if (loading === null) {
    let p: Promise<void>;
    try {
      p = importBidi().then((m) => {
        engine = m;
        markReady?.();
      });
    } catch (error) {
      p = Promise.reject(error);
    }
    loading = p;
    p.catch(() => {
      if (loading === p) loading = null;
    });
  }
  return loading;
}

/**
 * @internal The bidi engine, or `null` while it loads. The first `null`
 * answer starts the load. Only that once: a page that's offline doesn't retry
 * the import on every frame (an explicit `loadBidi()` does).
 */
export function bidiEngine(): BidiEngine | null {
  if (engine === null && !autoTried) {
    autoTried = true;
    loadBidi().catch(() => {});
  }
  return engine;
}

/** @internal The engine's load in flight, or `null` when it's loaded, failed or never started. */
export function bidiLoading(): Promise<void> | null {
  return engine === null ? loading : null;
}

/**
 * @internal Resolves once the engine lands, from this load or a later
 * `loadBidi()`; `null` when it's loaded or nothing has needed it. Something
 * painted right-to-left text in logical order and needs a repaint then.
 */
export function bidiReady(): Promise<void> | null {
  if (engine !== null || !autoTried) return null;
  ready ??= new Promise<void>((resolve) => {
    markReady = resolve;
  });
  return ready;
}

/**
 * Draw one line of logical-order text into `buffer`, like `buffer.drawText`,
 * with right-to-left runs reordered, mirrored and shaped for display (cells
 * hold visual order). `maxWidth` keeps the logical start. Text with no
 * right-to-left content goes straight to `drawText`, as does all text while
 * the bidi engine loads or after it fails to load. Box titles use it via
 * `DrawBoxOptions.drawTitleText`.
 */
export function drawLogicalText(
  buffer: CellBuffer,
  x: number,
  y: number,
  text: string,
  fg: PackedColor,
  bg: PackedColor,
  attrs = 0,
  maxWidth = Infinity,
  dir: TextDirection = "auto",
): number {
  if (dir !== "rtl" && !textNeedsBidi(text)) return buffer.drawText(x, y, text, fg, bg, attrs, maxWidth);
  const bidi = bidiEngine();
  if (bidi === null) return buffer.drawText(x, y, text, fg, bg, attrs, maxWidth);
  if (maxWidth <= 0 || text.length === 0) return 0;
  const gs = bidi.visualizeText(text, dir, maxWidth);
  return buffer.drawGraphemes(x, y, gs, 0, gs.length, fg, bg, attrs);
}
