import { realpathSync, statSync } from "node:fs";
import { join, normalize, relative, sep } from "node:path";

const realRoots = new Map<string, string>();

/**
 * The file a decoded `pathname` names inside `root`, only when it's spelled
 * exactly as on disk. Case-insensitive file systems (macOS, Windows) would
 * otherwise serve `admin/report.txt` for `/ADMIN/report.txt`, a path
 * middleware matching `/admin` never sees. With `index`, a directory serves
 * its `index.html`.
 */
export function staticFile(root: string, pathname: string, options: { index?: boolean } = {}): string | null {
  let path = normalize(join(root, pathname));
  if (path !== root && !path.startsWith(root + sep)) return null;
  try {
    if (options.index && statSync(path).isDirectory()) path = join(path, "index.html");
    if (!statSync(path).isFile()) return null;
    let realRoot = realRoots.get(root);
    if (realRoot === undefined) {
      realRoot = realpathSync.native(root);
      realRoots.set(root, realRoot);
    }
    return relative(realRoot, realpathSync.native(path)) === relative(root, path) ? path : null;
  } catch {
    return null;
  }
}

/** `true` when `pathname` reaches a file under `root` only because the file system ignores case. */
export function isMiscasedFile(root: string, pathname: string): boolean {
  const path = normalize(join(root, pathname));
  if (path !== root && !path.startsWith(root + sep)) return false;
  try {
    if (!statSync(path).isFile()) return false;
  } catch {
    return false;
  }
  return staticFile(root, pathname) === null;
}
