/**
 * `#yoga-loader` by default (browsers, Node, Bun, edge runtimes and every
 * bundler): `yoga-layout/load`, which carries its WebAssembly inline as base64.
 * It needs no asset handling, and server bundles (`dist/server.js`,
 * `live.mjs`, the VS Code runner) stay single files.
 */

import { loadYoga, type Yoga } from "yoga-layout/load";
import { instantiateYoga, type YogaWasmSource } from "./yoga-wasm";

export function loadPlatformYoga(wasm?: YogaWasmSource): Promise<Yoga> {
  return wasm === undefined ? loadYoga() : instantiateYoga(wasm);
}
