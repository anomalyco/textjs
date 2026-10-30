/**
 * The `text build` hooks for middleware, the cache handler and adapters
 * (kept here so `cli/build.ts` only calls two functions).
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { MiddlewareModule } from "../middleware";
import { normalizeBasePath, type Rewrite, type TextConfig } from "../../config";
import { findMiddlewareFile } from "../middleware-node";
import { compileMatcher } from "../middleware-runtime";
import type { ApiRoute, AppScan } from "../scan";
import { toPosix } from "../scan";
import { bundleServerEntry } from "./bundle";
import { runAdapter } from "./index";
import { RUNTIME_BUNDLE, serverRuntimeEntry } from "./runtime-node";
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
  const mw = await loadMiddlewareConfig(root, config, outDir);
  if (mw) compileMatcher(mw.config?.matcher);
  return true;
}

const CONFIG_MARK = "\u0000textjs-middleware-config:";
const EXTRACT_TIMEOUT_MS = 60_000;

/**
 * `middleware.ts`'s `config` export, read in a short-lived child process: the
 * build never runs the cache handler, and middleware top-level side effects
 * (database clients, timers) can't crash or hang it. `null` without middleware.
 */
export async function loadMiddlewareConfig(root: string, config: TextConfig, outDir: string): Promise<MiddlewareModule | null> {
  const { middlewareFile } = serverFiles(root, config);
  if (!middlewareFile) return null;
  mkdirSync(join(outDir, ".text"), { recursive: true });
  const dir = mkdtempSync(join(outDir, ".text", "middleware-config-"));
  try {
    const bundle = join(dir, "config.mjs");
    await bundleServerEntry({
      root,
      config,
      code: `import * as middleware from ${JSON.stringify(middlewareFile)};\nexport const config = middleware.config;`,
      outFile: bundle,
      target: "node",
    });
    const runner = join(dir, "extract.mjs");
    writeFileSync(
      runner,
      `const m = await import(process.argv[2]);\nprocess.stdout.write(${JSON.stringify(CONFIG_MARK)} + JSON.stringify(m.config ?? null) + "\\n");\nprocess.exit(0);\n`,
    );
    const r = spawnSync(process.execPath, [runner, pathToFileURL(bundle).href], { cwd: root, encoding: "utf8", timeout: EXTRACT_TIMEOUT_MS, env: { ...process.env, NODE_ENV: "production" } });
    const line = (r.stdout ?? "").split("\n").find((l) => l.startsWith(CONFIG_MARK));
    if (r.error || line === undefined) {
      const reason = r.error?.message ?? (r.stderr || `exit code ${r.status}`);
      throw new Error(`▼ Text.js: could not read \`config\` from ${middlewareFile}:\n${reason.trim()}`);
    }
    const value = JSON.parse(line.slice(CONFIG_MARK.length)) as MiddlewareModule["config"] | null;
    return value ? { config: value } : {};
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
  const middleware = await loadMiddlewareConfig(step.root, step.config, step.outDir);
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
    middleware,
  );
  if (step.config.proxy && Object.keys(step.config.proxy).length > 0) {
    result.notes.push("`proxy` in text.config.ts only runs in `text dev` / `text start` and is not part of adapter output; use rewrites.");
  }
  return result;
}
