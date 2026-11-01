import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { loadConfigFromFile } from "vite";
import { txWarn } from "@textjs/core";
import type { TextConfig } from "../config";

/** Every `TextConfig` key; the `Record` type fails typecheck when a new option is not listed. */
const CONFIG_KEYS: Record<keyof TextConfig, true> = {
  viewport: true,
  devIndicators: true,
  showMirrorDefault: true,
  outDir: true,
  appDir: true,
  basePath: true,
  title: true,
  hints: true,
  action: true,
  proxy: true,
  rewrites: true,
  configureServer: true,
  vite: true,
  cacheHandler: true,
  ppr: true,
  live: true,
  server: true,
};

/** Warn (once each) about keys Text.js does not read. */
export function warnUnknownConfigKeys(config: object, file: string): void {
  for (const key of Object.keys(config)) if (!(key in CONFIG_KEYS)) txWarn("TX029", JSON.stringify(key), basename(file));
}

export const CONFIG_FILES = ["text.config.ts", "text.config.mts", "text.config.js", "text.config.mjs"] as const;

export function findConfigFile(root: string): string | null {
  for (const name of CONFIG_FILES) {
    const p = join(root, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Run `fn` and put `process.env.NODE_ENV` back afterwards. Vite's module
 * runner (the Node config loader) sets an unset `NODE_ENV` to
 * `"development"`, which would make the following `vite build` bundle
 * React's development builds.
 */
export async function preservingNodeEnv<T>(fn: () => Promise<T>): Promise<T> {
  const before = process.env.NODE_ENV;
  try {
    return await fn();
  } finally {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  }
}

/**
 * Load `text.config.ts`. Bun runs TypeScript dependencies natively, so the
 * config is bundled with esbuild; on Node, Vite's module runner transforms
 * TypeScript workspace packages (`@textjs/app` sources) imported by the config.
 */
export async function loadTextConfig(root: string, command: "serve" | "build", mode = command === "build" ? "production" : "development"): Promise<{ config: TextConfig; file: string | null }> {
  const file = findConfigFile(root);
  if (!file) return { config: {}, file: null };
  const loader = typeof process.versions.bun === "string" ? "bundle" : "runner";
  const loaded = await preservingNodeEnv(() => loadConfigFromFile({ command, mode }, file, root, "silent", undefined, loader));
  const config = (loaded?.config ?? {}) as TextConfig;
  warnUnknownConfigKeys(config, file);
  return { config, file };
}
