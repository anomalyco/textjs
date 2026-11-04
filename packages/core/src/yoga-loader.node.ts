/**
 * `#yoga-loader` for Node and Bun: `yoga-layout/load`, which carries its
 * WebAssembly inline, so server bundles (`dist/server.js`, `live.mjs`, the
 * VS Code runner) stay single files with no `.wasm` to find on disk.
 */

import { loadYoga, type Yoga } from "yoga-layout/load";
import { instantiateYoga, type YogaWasmSource } from "./yoga-wasm";

export function loadPlatformYoga(wasm?: YogaWasmSource): Promise<Yoga> {
  return wasm === undefined ? loadYoga() : instantiateYoga(wasm);
}
