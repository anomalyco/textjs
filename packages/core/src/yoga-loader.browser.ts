/**
 * `#yoga-loader` for browsers (and every bundler without a more specific
 * condition): fetch `yoga.wasm` as an asset and compile it while it streams.
 * The package self-reference lets Vite, webpack and Rspack find and emit the
 * file, also from Vite's pre-bundled `node_modules/.vite/deps`.
 */

import type { Yoga } from "yoga-layout/load";
import { instantiateYoga, type YogaWasmSource } from "./yoga-wasm";

export function loadPlatformYoga(wasm?: YogaWasmSource): Promise<Yoga> {
  return instantiateYoga(wasm ?? new URL("@textjs/core/yoga.wasm", import.meta.url));
}
