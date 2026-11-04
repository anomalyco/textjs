/**
 * `#yoga-loader` for Cloudflare Workers and other edge runtimes, which only
 * instantiate WebAssembly compiled at deploy time: `yoga.wasm` is imported as
 * a `WebAssembly.Module`.
 */

import type { Yoga } from "yoga-layout/load";
import yogaModule from "../yoga.wasm";
import { instantiateYoga, type YogaWasmSource } from "./yoga-wasm";

export function loadPlatformYoga(wasm?: YogaWasmSource): Promise<Yoga> {
  return instantiateYoga(wasm ?? yogaModule);
}
