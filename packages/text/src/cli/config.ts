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

/** Load `text.config.ts` (bundled with esbuild, so it runs under Node or Bun). */
export async function loadTextConfig(root: string, command: "serve" | "build", mode = command === "build" ? "production" : "development"): Promise<{ config: TextConfig; file: string | null }> {
  const file = findConfigFile(root);
  if (!file) return { config: {}, file: null };
  const loaded = await loadConfigFromFile({ command, mode }, file, root, "silent");
  return { config: (loaded?.config ?? {}) as TextConfig, file };
}
