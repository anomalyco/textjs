/**
 * `#bidi-loader` under the `@textjs/wasm-asset` condition, which `text dev`
 * and `text build` set for client builds: the bidi engine and its Unicode
 * tables are a separate chunk, fetched the first time text needs them.
 */

import type { BidiEngine } from "./bidi-engine";

export const bundledBidi: BidiEngine | null = null;

export function importBidi(): Promise<BidiEngine> {
  return import("./bidi");
}
