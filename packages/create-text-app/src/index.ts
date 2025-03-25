/**
 * create-text-app — scaffold a Text.js project from a template.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VERSION = "0.1.0";

export const TEMPLATES = {
  starter: "Clean starter: layout, keyboard counter and <Link> navigation",
  dashboard: "Real-time metrics & deployments App Router dashboard",
} as const;

export type TemplateName = keyof typeof TEMPLATES;

export function isTemplateName(name: string): name is TemplateName {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, name);
}

export const TEMPLATES_DIR = fileURLToPath(new URL("../templates", import.meta.url));

/** Files stored under a different name so package managers don't drop them. */
const RENAMES: Record<string, string> = { _gitignore: ".gitignore" };

const TEXT_EXTENSIONS = /\.(tsx?|jsx?|json|md|css|html|txt|gitignore)$|^_gitignore$/;

export type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

export function detectPackageManager(userAgent: string | undefined = process.env.npm_config_user_agent): PackageManager {
  if (!userAgent) return "bun";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("npm")) return "npm";
  return "bun";
}

export function runCommand(pm: PackageManager, script: string): string {
  if (pm === "npm") return script === "dev" || script === "build" ? `npm run ${script}` : `npm ${script}`;
  if (pm === "bun") return script === "build" ? "bun run build" : `bun ${script}`;
  return `${pm} ${script}`;
}

/** npm-safe package name from a directory name. */
export function toPackageName(dir: string): string {
  const name = basename(resolve(dir))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]+/, "")
    .replace(/[^a-z0-9-~._]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return name || "text-app";
}

export function validateProjectName(name: string): string | null {
  if (name.length === 0) return "Project name cannot be empty.";
  if (name.length > 214) return "Project name is too long.";
  if (/[A-Z]/.test(name)) return "Project name cannot contain capital letters.";
  if (!/^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)) return "Project name can only contain URL-friendly characters.";
  return null;
}

export interface ScaffoldOptions {
  /** Target directory (created when missing; must be empty). */
  dir: string;
  template?: TemplateName;
  /** `textjs` dependency specifier (default `^0.1.0`). */
  textjsVersion?: string;
  /** Allow writing into a non-empty directory. */
  force?: boolean;
}

export interface ScaffoldResult {
  dir: string;
  name: string;
  template: TemplateName;
  files: string[];
}

function isEmptyDir(dir: string): boolean {
  if (!existsSync(dir)) return true;
  const ignored = new Set([".git", ".DS_Store", ".idea", ".vscode", "Thumbs.db"]);
  return readdirSync(dir).every((f) => ignored.has(f));
}

function listFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, base));
    else out.push(relative(base, p));
  }
  return out;
}

export function templateFiles(template: TemplateName): string[] {
  return listFiles(join(TEMPLATES_DIR, template));
}

/** Copy a template into `dir`, filling in `{{name}}` and `{{textjsVersion}}`. */
export function scaffold(options: ScaffoldOptions): ScaffoldResult {
  const template = options.template ?? "starter";
  if (!isTemplateName(template)) throw new Error(`Unknown template "${String(template)}". Available: ${Object.keys(TEMPLATES).join(", ")}.`);
  const dir = resolve(options.dir);
  if (!options.force && !isEmptyDir(dir)) {
    throw new Error(`The directory ${basename(dir)} contains files that could conflict. Either try using a new directory name, or remove the files.`);
  }
  const name = toPackageName(dir);
  const vars: Record<string, string> = { name, textjsVersion: options.textjsVersion ?? `^${VERSION}`, template };
  const src = join(TEMPLATES_DIR, template);
  const written: string[] = [];
  for (const rel of listFiles(src)) {
    const parts = rel.split(/[\\/]/);
    const last = parts.pop() as string;
    const outRel = [...parts, RENAMES[last] ?? last].join("/");
    const target = join(dir, outRel);
    mkdirSync(dirname(target), { recursive: true });
    const buf = readFileSync(join(src, rel));
    if (TEXT_EXTENSIONS.test(last)) writeFileSync(target, buf.toString("utf8").replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m));
    else writeFileSync(target, buf);
    written.push(outRel);
  }
  return { dir, name, template, files: written.sort() };
}
