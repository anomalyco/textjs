/**
 * Finds a Chromium for the e2e tests, probe and harness, on any OS:
 *
 *   1. `TEXTJS_CHROMIUM` (or `CHROME_PATH`): an explicit executable.
 *   2. playwright-core's own `chromium.executablePath()`, when installed.
 *   3. The newest `chromium-*` build in the Playwright browser cache
 *      (`PLAYWRIGHT_BROWSERS_PATH` or the OS default), in case
 *      playwright-core expects a different revision than the one installed.
 *
 * Install one with `bunx playwright-core install chromium`. Branded Chrome
 * ignores `--load-extension`, so Chrome for Testing / Chromium is required.
 */

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

const CANDIDATES: Record<string, string[]> = {
  darwin: [
    "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
  ],
  linux: ["chrome-linux64/chrome", "chrome-linux/chrome"],
  win32: ["chrome-win64/chrome.exe", "chrome-win/chrome.exe"],
};

export function playwrightCache(env: NodeJS.ProcessEnv = process.env, platform = process.platform, home = homedir()): string {
  if (env.PLAYWRIGHT_BROWSERS_PATH && env.PLAYWRIGHT_BROWSERS_PATH !== "0") return env.PLAYWRIGHT_BROWSERS_PATH;
  if (platform === "darwin") return join(home, "Library/Caches/ms-playwright");
  if (platform === "win32") return join(env.LOCALAPPDATA ?? join(home, "AppData/Local"), "ms-playwright");
  return join(env.XDG_CACHE_HOME ?? join(home, ".cache"), "ms-playwright");
}

export function findChromiumInCache(cache: string, platform = process.platform): string | undefined {
  if (!existsSync(cache)) return undefined;
  const dirs = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
  for (const d of dirs) {
    for (const rel of CANDIDATES[platform] ?? []) {
      const p = join(cache, d, rel);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

/** An executable path, or `undefined` to let Playwright use its default. */
export function resolveChromium(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const explicit = env.TEXTJS_CHROMIUM ?? env.CHROME_PATH;
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`TEXTJS_CHROMIUM points at a missing file: ${explicit}`);
    return explicit;
  }
  try {
    const p = chromium.executablePath();
    if (p && existsSync(p)) return p;
  } catch {
    // Unsupported platform for playwright's registry.
  }
  return findChromiumInCache(playwrightCache(env));
}

/** Like `resolveChromium`, but for callers that must spawn a binary themselves. */
export function requireChromium(env: NodeJS.ProcessEnv = process.env): string {
  const p = resolveChromium(env);
  if (!p) throw new Error("Chromium not found. Set TEXTJS_CHROMIUM or run `bunx playwright-core install chromium`.");
  return p;
}
