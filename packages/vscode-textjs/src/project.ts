/**
 * Locate Text.js projects and map files to preview targets. Pure Node (no `vscode`).
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const CONFIG_FILES = ["text.config.ts", "text.config.mts", "text.config.js", "text.config.mjs"];
const ROUTE_KINDS = ["page", "layout", "loading", "error", "not-found", "route"] as const;
export type RouteFileKind = (typeof ROUTE_KINDS)[number];

const toPosix = (p: string): string => (sep === "\\" ? p.split(sep).join("/") : p);

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function dependsOnText(pkg: Record<string, unknown>): boolean {
  for (const k of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = pkg[k] as Record<string, string> | undefined;
    if (deps && ("@textjs/next" in deps)) return true;
  }
  return false;
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** `true` when `dir` is a Text.js app: a `text.config.*`, or a package that depends on `@textjs/next` with an `app/` directory. */
export function isProjectRoot(dir: string): boolean {
  if (CONFIG_FILES.some((f) => existsSync(join(dir, f)))) return true;
  const pkg = readJson(join(dir, "package.json"));
  return pkg !== null && dependsOnText(pkg) && isDir(join(dir, "app"));
}

/** Whether `path` is `parent` or inside it (lexically). */
export function isInside(path: string, parent: string): boolean {
  const rel = relative(resolve(parent), resolve(path));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * The nearest Text.js project root at or above `file`. With `stopAt` (a
 * workspace folder) the search never leaves that folder, and files outside it
 * have no project.
 */
export function findProjectRoot(file: string, stopAt?: string): string | null {
  if (stopAt !== undefined && !isInside(file, stopAt)) return null;
  let dir = isDir(file) ? file : dirname(file);
  const stop = stopAt === undefined ? undefined : toPosix(resolve(stopAt));
  for (;;) {
    if (isProjectRoot(dir)) return dir;
    if (stop !== undefined && toPosix(resolve(dir)) === stop) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export interface RouteFileInfo {
  kind: RouteFileKind;
  /** Segments relative to `app/` (`["(shop)", "items", "[id]"]`). */
  segments: string[];
}

/** Classify a file inside `<root>/app`, or `null` when it is not a route file. */
export function routeFileInfo(root: string, file: string): RouteFileInfo | null {
  const rel = toPosix(relative(join(root, "app"), file));
  if (rel.startsWith("..") || rel.startsWith("/")) return null;
  const parts = rel.split("/");
  const base = parts.pop() as string;
  const m = /^(.+)\.(tsx|ts|jsx|js)$/.exec(base);
  if (!m || !(ROUTE_KINDS as readonly string[]).includes(m[1] as string)) return null;
  if (parts.some((p) => p.startsWith("_") || p.startsWith("."))) return null;
  return { kind: m[1] as RouteFileKind, segments: parts };
}

/**
 * A concrete URL for previewing segments: groups are dropped, `[id]` becomes
 * `id`, `[...slug]` becomes `slug` and `[[...slug]]` is omitted.
 */
export function previewPath(segments: readonly string[]): string {
  const out: string[] = [];
  for (const s of segments) {
    if (/^\(.+\)$/.test(s)) continue;
    if (/^\[\[\.\.\..+\]\]$/.test(s)) continue;
    const dyn = /^\[(?:\.\.\.)?(.+)\]$/.exec(s);
    out.push(dyn ? (dyn[1] as string) : s);
  }
  return `/${out.join("/")}`;
}

export type PreviewTarget =
  | { kind: "route"; root: string; path: string; file: string }
  | { kind: "component"; root: string; file: string };

/** What the preview should show for `file` (`null` for non-previewable files such as `route.ts`). */
export function previewTargetForFile(file: string, root: string | null = findProjectRoot(file)): PreviewTarget | null {
  if (!root || !/\.(tsx|jsx)$/.test(file)) return null;
  const info = routeFileInfo(root, file);
  if (info) {
    if (info.kind === "route") return null;
    return { kind: "route", root, path: previewPath(info.segments), file };
  }
  return { kind: "component", root, file };
}

/**
 * {@link previewTargetForFile} limited to the workspace folder that contains
 * `file`: files outside every folder (`folder` undefined) are never previewed,
 * and the project search stops at the folder.
 */
export function previewTargetInFolder(file: string, folder: string | undefined): PreviewTarget | null {
  if (folder === undefined) return null;
  return previewTargetForFile(file, findProjectRoot(file, folder));
}

/** `"bun" | "pnpm" | "yarn" | "npm"` by lockfile, searching up from `root`. */
export function detectPackageManager(root: string): "bun" | "pnpm" | "yarn" | "npm" {
  let dir = root;
  for (;;) {
    if (existsSync(join(dir, "bun.lock")) || existsSync(join(dir, "bun.lockb"))) return "bun";
    if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
    if (existsSync(join(dir, "yarn.lock"))) return "yarn";
    if (existsSync(join(dir, "package-lock.json"))) return "npm";
    const parent = dirname(dir);
    if (parent === dir) return "npm";
    dir = parent;
  }
}

/** The shell command that starts `text dev` for `root`. */
export function devCommand(root: string, port?: number): string {
  const pm = detectPackageManager(root);
  const pkg = readJson(join(root, "package.json"));
  const script = (pkg?.scripts as Record<string, string> | undefined)?.dev;
  const portArg = port ? ` --port ${port}` : "";
  if (script && /\btext\s+dev\b/.test(script)) {
    const run = pm === "npm" ? "npm run dev" : `${pm} run dev`;
    return portArg ? `${run}${pm === "npm" ? " --" : ""}${portArg}` : run;
  }
  const exec = pm === "bun" ? "bunx" : pm === "pnpm" ? "pnpm exec" : pm === "yarn" ? "yarn exec" : "npx";
  return `${exec} text dev${portArg}`;
}

/** Whether the project uses TypeScript. */
export function usesTypeScript(root: string): boolean {
  return existsSync(join(root, "tsconfig.json")) || CONFIG_FILES.slice(0, 2).some((f) => existsSync(join(root, f)));
}
