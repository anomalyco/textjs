/**
 * `text build --adapter <name>` dispatch.
 */

import { join } from "node:path";
import type { MiddlewareModule } from "../middleware";
import { adaptBun } from "./bun";
import { adaptCloudflare } from "./cloudflare";
import { adaptStatic } from "./static";
import { adaptVercel } from "./vercel";
import type { AdapterContext, AdapterName, AdapterResult } from "./shared";

export { ADAPTERS, detectAdapter, isAdapterName, type AdapterContext, type AdapterName, type AdapterResult } from "./shared";

/** `.text/server/` bundle paths written by `text build`. */
export const SERVER_DIR = join(".text", "server");

export async function runAdapter(name: AdapterName, ctx: AdapterContext, middleware: MiddlewareModule | null): Promise<AdapterResult> {
  switch (name) {
    case "static":
      return adaptStatic(ctx, middleware, join(ctx.outDir, SERVER_DIR, "api.mjs"));
    case "bun":
      return adaptBun(ctx);
    case "vercel":
      return adaptVercel(ctx, middleware);
    case "cloudflare":
      return adaptCloudflare(ctx, middleware);
  }
}
