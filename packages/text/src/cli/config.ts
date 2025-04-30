import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfigFromFile } from "vite";
import type { TextConfig } from "../config";

export const CONFIG_FILES = ["text.config.ts", "text.config.mts", "text.config.js", "text.config.mjs"] as const;

export function findConfigFile(root: string): string | null {
  for (const name of CONFIG_FILES) {
    const p = join(root, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Load `text.config.ts`. Bun runs TypeScript dependencies natively, so the
 * config is bundled with esbuild; on Node, Vite's module runner transforms
 * TypeScript workspace packages (`textjs` sources) imported by the config.
 */
export async function loadTextConfig(root: string, command: "serve" | "build", mode = command === "build" ? "production" : "development"): Promise<{ config: TextConfig; file: string | null }> {
  const file = findConfigFile(root);
  if (!file) return { config: {}, file: null };
  const loader = typeof process.versions.bun === "string" ? "bundle" : "runner";
  const loaded = await loadConfigFromFile({ command, mode }, file, root, "silent", undefined, loader);
  return { config: (loaded?.config ?? {}) as TextConfig, file };
}
