/**
 * The `text build` hooks for middleware, the cache handler and adapters
 * (kept here so `cli/build.ts` only calls two functions).
 */

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { normalizeBasePath, type Rewrite, type TextConfig } from "../../config";
import { findMiddlewareFile } from "../middleware-node";
import { compileMatcher } from "../middleware-runtime";
import type { ApiRoute, AppScan } from "../scan";
import { toPosix } from "../scan";
import { bundleServerEntry } from "./bundle";
import { runAdapter } from "./index";
import { loadServerRuntime, RUNTIME_BUNDLE, serverRuntimeEntry } from "./runtime-node";
import { detectAdapter, isAdapterName, type AdapterName, type AdapterResult } from "./shared";

export interface ServerFiles {
  middlewareFile: string | null;
  cacheHandlerFile: string | null;
}

export function serverFiles(root: string, config: TextConfig): ServerFiles {
  const mw = findMiddlewareFile(root);
  let cacheHandlerFile: string | null = null;
  if (config.cacheHandler) {
    cacheHandlerFile = resolve(root, config.cacheHandler);
    if (!existsSync(cacheHandlerFile)) throw new Error(`▼ Text.js: cacheHandler ${JSON.stringify(config.cacheHandler)} does not exist.`);
  }
  return { middlewareFile: mw ? toPosix(mw) : null, cacheHandlerFile: cacheHandlerFile ? toPosix(cacheHandlerFile) : null };
}

/** Bundle `.text/server/runtime.mjs` (middleware + cache handler) for `text start`. Returns `true` when written. */
export async function buildServerRuntime(root: string, config: TextConfig, outDir: string): Promise<boolean> {
  const files = serverFiles(root, config);
  if (!files.middlewareFile && !files.cacheHandlerFile) return false;
  await bundleServerEntry({
    root,
    config,
    code: serverRuntimeEntry(files.middlewareFile, files.cacheHandlerFile),
    outFile: join(outDir, ".text", "server", RUNTIME_BUNDLE),
    target: "node",
  });
  // Validate the matcher at build time instead of on the first request.
  const runtime = await loadServerRuntime(outDir, true);
  if (runtime?.middleware) compileMatcher(runtime.middleware.config?.matcher);
  return true;
}

/** Resolve `--adapter` (or the environment's default) and validate it. */
export function resolveAdapter(name: string | undefined, env: Record<string, string | undefined> = process.env): AdapterName | undefined {
  const value = name ?? env.TEXTJS_ADAPTER ?? detectAdapter(env);
  if (value === undefined || value === "" || value === "node") return undefined;
  if (!isAdapterName(value)) throw new Error(`▼ Text.js: unknown adapter ${JSON.stringify(value)}. Use static, bun, vercel or cloudflare.`);
  return value;
}

export interface AdapterStep {
  root: string;
  config: TextConfig;
  outDir: string;
  scan: AppScan;
  api: ApiRoute[];
  adapter: AdapterName;
  print(line?: string): void;
}

export async function runBuildAdapter(step: AdapterStep): Promise<AdapterResult> {
  const files = serverFiles(step.root, step.config);
  const rewrites: Rewrite[] = typeof step.config.rewrites === "function" ? await step.config.rewrites() : (step.config.rewrites ?? []);
  const runtime = files.middlewareFile ? await loadServerRuntime(step.outDir, true) : null;
  const result = await runAdapter(
    step.adapter,
    {
      root: step.root,
      outDir: step.outDir,
      config: step.config,
      scan: step.scan,
      api: step.api,
      basePath: normalizeBasePath(step.config.basePath),
      rewrites,
      middlewareFile: files.middlewareFile,
      cacheHandlerFile: files.cacheHandlerFile,
      print: step.print,
    },
    runtime?.middleware ?? null,
  );
  if (step.config.proxy && Object.keys(step.config.proxy).length > 0) {
    result.notes.push("`proxy` in text.config.ts only runs in `text dev` / `text start` and is not part of adapter output; use rewrites.");
  }
  return result;
}
