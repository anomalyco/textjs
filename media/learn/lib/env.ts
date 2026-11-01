import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

/** media/learn */
export const ROOT = resolve(import.meta.dir, "..");
/** The monorepo root. */
export const REPO = resolve(ROOT, "../..");
export const OUT = join(ROOT, "out");
export const CACHE = join(ROOT, ".cache");

const ENV_FILE = join(homedir(), ".config", "textjs", "elevenlabs.env");

/**
 * ELEVENLABS_* settings from the environment, falling back to `~/.config/textjs/elevenlabs.env`
 * (KEY=value lines). Values are never printed.
 */
export function setting(name: string): string | undefined {
  const own = process.env[name]?.trim();
  if (own) return own;
  if (!existsSync(ENV_FILE)) return undefined;
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && m[1] === name) return m[2]!.replace(/^["']|["']$/g, "") || undefined;
  }
  return undefined;
}

export const FFMPEG = existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg";
export const FFPROBE = existsSync("/opt/homebrew/bin/ffprobe") ? "/opt/homebrew/bin/ffprobe" : "ffprobe";

/** Runs a command, throwing with its stderr on failure. */
export function run(cmd: string[], opts: { quiet?: boolean } = {}): string {
  const p = Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" });
  if (p.exitCode !== 0) throw new Error(`${cmd[0]} failed (${p.exitCode}): ${p.stderr.toString().slice(-2000)}`);
  if (!opts.quiet && p.stderr.length && process.env.LEARN_MEDIA_VERBOSE) console.error(p.stderr.toString());
  return p.stdout.toString();
}

/** Duration of a media file in seconds. */
export function duration(file: string): number {
  return Number(run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).trim());
}

const CHROMIUM_CACHE = join(homedir(), "Library", "Caches", "ms-playwright");
const collator = new Intl.Collator("en", { numeric: true });

/** Full Chromium (Chrome for Testing), for the real DevTools frontend. */
export function chromiumPath(): string {
  const found = [...new Bun.Glob("chromium-*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing").scanSync(CHROMIUM_CACHE)]
    .sort(collator.compare)
    .at(-1);
  if (found) return join(CHROMIUM_CACHE, found);
  const sys = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(sys)) return sys;
  throw new Error("No Chromium: run `bunx playwright install chromium`");
}

/** Chromium headless shell, for rendering stage frames (fast screenshots). */
export function headlessShellPath(): string {
  const found = [...new Bun.Glob("chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell").scanSync(CHROMIUM_CACHE)]
    .sort(collator.compare)
    .at(-1);
  if (found) return join(CHROMIUM_CACHE, found);
  return chromiumPath();
}
