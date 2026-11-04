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

function describe(source: YogaWasmSource): string {
  if (typeof source === "string" || source instanceof URL) return String(source);
  if (source instanceof WebAssembly.Module) return "a WebAssembly.Module";
  if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) return "bytes";
  return "a Response";
}

async function instantiate(source: YogaWasmSource, imports: WebAssembly.Imports): Promise<WebAssembly.Instance> {
  let where = describe(source);
  let type = "";
  try {
    if (source instanceof WebAssembly.Module) return await WebAssembly.instantiate(source, imports);
    if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) return await WebAssembly.instantiate(await WebAssembly.compile(source as BufferSource), imports);
    const response = await (typeof source === "string" || source instanceof URL ? fetch(source) : (source as Response | PromiseLike<Response>));
    where = response.url || where;
    type = (response.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    // Streaming compiles only `application/wasm`; anything else (a host that doesn't know .wasm) compiles from the bytes.
    if (type === "application/wasm" && typeof WebAssembly.instantiateStreaming === "function") return (await WebAssembly.instantiateStreaming(response, imports)).instance;
    return await WebAssembly.instantiate(await WebAssembly.compile(await response.arrayBuffer()), imports);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw txError("TX032", where, type ? `${reason}, Content-Type ${type}` : reason);
  }
}
