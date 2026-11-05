/**
 * The Unicode Bidirectional Algorithm (`bidi.ts`) as the scene painter uses
 * it, loaded on first use.
 *
 * Node, Bun, edge runtimes and browser bundles without the
 * `@textjs/wasm-asset` condition bundle it with the rest of `@textjs/core`,
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
let failed = false;

/**
 * Load the right-to-left text engine now rather than on the first
 * right-to-left text, so that text's first frame is already in visual order.
 * Resolves at once where the engine is bundled (everywhere but Text.js client
 * builds). Apps don't need to call it: renderers load the engine and repaint
 * by themselves.
 */
export function loadBidi(): Promise<void> {
  if (engine !== null) return Promise.resolve();
  // Not retried after a failure: browsers keep a failed module fetch in their module map, and right-to-left text
  // keeps painting in logical order.
  loading ??= importBidi().then(
    (m) => {
      engine = m;
    },
    (error: unknown) => {
      failed = true;
      throw error;
    },
  );
  return loading;
}

/** @internal The bidi engine, or `null` while it loads. A `null` answer starts the load. */
export function bidiEngine(): BidiEngine | null {
  if (engine === null && loading === null) loadBidi().catch(() => {});
  return engine;
}

/** @internal The engine's load in flight: something painted right-to-left text in logical order and needs a repaint once it lands. */
export function bidiLoading(): Promise<void> | null {
  return engine === null && !failed ? loading : null;
}

/**
 * Draw one line of logical-order text into `buffer`, like `buffer.drawText`,
 * with right-to-left runs reordered, mirrored and shaped for display (cells
 * hold visual order). `maxWidth` keeps the logical start. Text with no
 * right-to-left content goes straight to `drawText`, as does all text while
 * the bidi engine loads. Box titles use it via `DrawBoxOptions.drawTitleText`.
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
