/**
 * Instantiate Yoga from its WebAssembly (`@textjs/core/yoga.wasm`), from
 * wherever the platform keeps it.
 */

import type { Yoga } from "yoga-layout/load";
import { txError } from "./errors";
import { createYoga } from "./yoga-glue";

/**
 * Yoga's WebAssembly: a compiled `WebAssembly.Module` (Workers' `.wasm`
 * imports), its bytes, a `Response` (or a promise of one), or a URL to fetch.
 */
export type YogaWasmSource = WebAssembly.Module | BufferSource | Response | PromiseLike<Response> | URL | string;

export function instantiateYoga(source: YogaWasmSource): Promise<Yoga> {
  return createYoga((imports) => instantiate(source, imports));
}

async function instantiate(source: YogaWasmSource, imports: WebAssembly.Imports): Promise<WebAssembly.Instance> {
  if (source instanceof WebAssembly.Module) return WebAssembly.instantiate(source, imports);
  if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) return WebAssembly.instantiate(await WebAssembly.compile(source as BufferSource), imports);
  const url = typeof source === "string" || source instanceof URL ? String(source) : null;
  let response: Response;
  try {
    response = await (url === null ? (source as Response | PromiseLike<Response>) : fetch(url));
  } catch (error) {
    throw txError("TX032", url ?? "a Response", error instanceof Error ? error.message : String(error));
  }
  if (!response.ok) throw txError("TX032", response.url || url || "a Response", `HTTP ${response.status}`);
  if (typeof WebAssembly.instantiateStreaming === "function") {
    try {
      return (await WebAssembly.instantiateStreaming(response.clone(), imports)).instance;
    } catch {
      // Served without `Content-Type: application/wasm`: compile from the bytes instead.
    }
  }
  return WebAssembly.instantiate(await WebAssembly.compile(await response.arrayBuffer()), imports);
}
