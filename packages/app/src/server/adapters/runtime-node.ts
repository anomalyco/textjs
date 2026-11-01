/**
 * `.text/server/runtime.mjs`: `middleware.ts` and the `cacheHandler` store,
 * bundled by `text build` for `text start`.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setCacheStore, type CacheStore } from "../cache";
import type { MiddlewareModule } from "../middleware";

export const RUNTIME_BUNDLE = "runtime.mjs";

export interface ServerRuntime {
  middleware?: MiddlewareModule;
  cacheStore?: CacheStore;
}

/** Entry source for `runtime.mjs`. */
export function serverRuntimeEntry(middlewareFile: string | null, cacheHandlerFile: string | null): string {
  const lines: string[] = [];
  if (middlewareFile) lines.push(`import * as middleware from ${JSON.stringify(middlewareFile)};`, "export { middleware };");
  if (cacheHandlerFile) lines.push(`import cacheStore from ${JSON.stringify(cacheHandlerFile)};`, "export { cacheStore };");
  return lines.join("\n");
}

/** Load `runtime.mjs` from a build (installing its cache store). */
export async function loadServerRuntime(outDir: string, fresh = false): Promise<ServerRuntime | null> {
  const file = join(outDir, ".text", "server", RUNTIME_BUNDLE);
  if (!existsSync(file)) return null;
  const mod = (await import(pathToFileURL(file).href + (fresh ? `?t=${Date.now()}` : ""))) as ServerRuntime;
  if (mod.cacheStore) setCacheStore(mod.cacheStore);
  return mod;
}
