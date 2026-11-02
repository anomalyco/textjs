import { realpathSync } from "node:fs";
import { resolve } from "node:path";

/**
 * An absolute path as the file system spells it: symlinks resolved, Windows 8.3
 * short names (`C:\Users\RUNNER~1`) expanded and letter case canonical. Every
 * entry point resolves its project root with this, so one file never gets two
 * module identities. Paths that don't exist come back from `resolve()`.
 */
export function resolveRoot(path: string): string {
  const absolute = resolve(path);
  try {
    return realpathSync.native(absolute);
  } catch {
    return absolute;
  }
}

/** Windows and macOS file systems match names case-insensitively by default. */
export const CASE_INSENSITIVE_FS = process.platform === "win32" || process.platform === "darwin";
