/**
 * `#bidi-loader` by default (Node, Bun, edge runtimes and every bundler):
 * the bidi engine ships with `@textjs/core`, so synchronous paints (SSR, the
 * CLI, `flushSyncRender`, tests, ANSI output) always have it.
 */

import { resolveGraphemeBidi, visualizeLine, visualizeText } from "./bidi";
import type { BidiEngine } from "./bidi-engine";

export const bundledBidi: BidiEngine | null = { resolveGraphemeBidi, visualizeLine, visualizeText };

export function importBidi(): Promise<BidiEngine> {
  return Promise.resolve(bundledBidi as BidiEngine);
}
