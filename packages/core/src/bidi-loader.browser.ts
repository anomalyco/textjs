/**
 * `#bidi-loader` under the `@textjs/client` condition, which `text dev`
 * and `text build` set for client builds: the bidi engine and its Unicode
 * tables are a separate chunk, fetched the first time text needs them.
 */

import type { BidiEngine } from "./bidi-engine";

export const bundledBidi: BidiEngine | null = null;

export function importBidi(): Promise<BidiEngine> {
  // Named exports, so the bundler drops the rest of `bidi.ts` (reorderLine, paragraphDirection…) from the chunk.
  return import("./bidi").then(({ resolveGraphemeBidi, visualizeLine, visualizeText }) => ({ resolveGraphemeBidi, visualizeLine, visualizeText }));
}
