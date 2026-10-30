/**
 * Bump every publishable workspace package in lockstep.
 *
 *   bun scripts/release-version.ts <patch|minor|major|canary|stable|<x.y.z[-pre.N]>> [options]
 *
 *   patch | minor | major   next stable version (a canary graduates: 1.2.1-canary.3 → patch → 1.2.1)
 *   canary                  next canary: 1.2.0 → 1.2.1-canary.0, 1.2.1-canary.0 → 1.2.1-canary.1
 *   stable                  drop the prerelease: 1.2.1-canary.4 → 1.2.1
 *   <version>               an explicit semver version
 *
 *   --registry              (canary) continue numbering after canaries already on npm
 *   --dry-run               print the plan without writing
 *   --json                  print the plan as JSON
 *   --force                 allow packages whose versions have drifted apart
 *
 * Also rewrites version constants that mirror package.json
 * (`export const VERSION = "…"`, `rendererVersion: "…"`) and `peerDependencies`
 * ranges on sibling packages (`"@textjs/react": "^1.0.0"` → `"^<new>"`).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  /** e.g. `["canary", 3]`. */
  pre: Array<string | number>;
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function parseVersion(v: string): SemVer {
  const m = SEMVER.exec(v.trim());
  if (!m) throw new Error(`Invalid version ${JSON.stringify(v)} (expected x.y.z or x.y.z-pre.N)`);
  const pre = m[4] ? m[4].split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : [];
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre };
}

export function formatVersion(v: SemVer): string {
  return `${v.major}.${v.minor}.${v.patch}${v.pre.length ? `-${v.pre.join(".")}` : ""}`;
}

export type BumpKind = "patch" | "minor" | "major" | "canary" | "stable";

function canaryNumber(v: SemVer): number | null {
  return v.pre.length === 2 && v.pre[0] === "canary" && typeof v.pre[1] === "number" ? v.pre[1] : null;
}

/** The next version for `kind` (npm `semver.inc` semantics for prereleases). */
export function nextVersion(current: string, kind: BumpKind | string, published: readonly string[] = []): string {
  const v = parseVersion(current);
  const base = { major: v.major, minor: v.minor, patch: v.patch, pre: [] as Array<string | number> };
  const isPre = v.pre.length > 0;
  switch (kind) {
    case "major":
      return formatVersion(isPre && v.minor === 0 && v.patch === 0 ? base : { ...base, major: v.major + 1, minor: 0, patch: 0 });
    case "minor":
      return formatVersion(isPre && v.patch === 0 ? base : { ...base, minor: v.minor + 1, patch: 0 });
    case "patch":
      return formatVersion(isPre ? base : { ...base, patch: v.patch + 1 });
    case "stable":
      if (!isPre) throw new Error(`${current} is already a stable version`);
      return formatVersion(base);
    case "canary": {
      const n = canaryNumber(v);
      const target = isPre ? base : { ...base, patch: v.patch + 1 };
      let next = n !== null ? n + 1 : 0;
      for (const p of published) {
        let pv: SemVer;
        try {
          pv = parseVersion(p);
        } catch {
          continue;
        }
        const pn = canaryNumber(pv);
        if (pn !== null && pv.major === target.major && pv.minor === target.minor && pv.patch === target.patch) next = Math.max(next, pn + 1);
      }
      return formatVersion({ ...target, pre: ["canary", next] });
    }
    default:
      return formatVersion(parseVersion(kind));
  }
}

/** The npm dist-tag a version belongs on. */
export function distTagFor(version: string): "latest" | "canary" {
  const v = parseVersion(version);
  if (v.pre.length === 0) return "latest";
  if (canaryNumber(v) !== null) return "canary";
  throw new Error(`${version} is not a stable or canary version; publish it under an explicit dist-tag.`);
}

/** The dist-tag `planBump` proposes: `latest`, `canary`, or `next` for other prereleases (`-rc.N`, `-beta.N`). */
export function proposedDistTag(version: string): "latest" | "canary" | "next" {
  try {
    return distTagFor(version);
  } catch {
    return "next";
  }
}

export interface WorkspacePackage {
  name: string;
  version: string;
  dir: string;
  manifest: string;
}

/** Publishable (non-private) packages under `packages/*`. */
export function workspacePackages(root: string): WorkspacePackage[] {
  const dir = join(root, "packages");
  const out: WorkspacePackage[] = [];
  for (const name of readdirSync(dir).sort()) {
    const manifest = join(dir, name, "package.json");
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, "utf8")) as { name?: string; version?: string; private?: boolean };
    if (pkg.private || !pkg.name || !pkg.version) continue;
    out.push({ name: pkg.name, version: pkg.version, dir: join(dir, name), manifest });
  }
  return out;
}

export interface FileChange {
  file: string;
  before: string;
  after: string;
}

export interface BumpPlan {
  from: string;
  to: string;
  distTag: string;
  packages: string[];
  changes: FileChange[];
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Point `peerDependencies` on lockstep siblings at `^<version>` (`workspace:` ranges are left to the packer). */
export function bumpPeerRanges(manifest: string, names: ReadonlySet<string>, version: string): string {
  const m = /("peerDependencies"\s*:\s*\{)([^}]*)(\})/.exec(manifest);
  if (!m) return manifest;
  const body = (m[2] as string).replace(/("([^"]+)"\s*:\s*")([^"]*)(")/g, (all, pre: string, name: string, range: string, post: string) =>
    names.has(name) && !range.startsWith("workspace:") ? `${pre}^${version}${post}` : all,
  );
  return manifest.slice(0, m.index) + m[1] + body + m[3] + manifest.slice(m.index + m[0].length);
}

export function planBump(root: string, kind: string, options: { published?: readonly string[]; force?: boolean } = {}): BumpPlan {
  const packages = workspacePackages(root);
  if (packages.length === 0) throw new Error("No publishable packages found under packages/");
  const versions = new Set(packages.map((p) => p.version));
  if (versions.size > 1 && !options.force) {
    throw new Error(`Packages are not in lockstep:\n${packages.map((p) => `  ${p.name}@${p.version}`).join("\n")}\nRe-run with --force to align them.`);
  }
  const from = (packages[0] as WorkspacePackage).version;
  const to = nextVersion(from, kind, options.published);
  if (to === from && versions.size === 1) throw new Error(`Version is already ${to}`);
  const changes: FileChange[] = [];
  const names = new Set(packages.map((p) => p.name));
  for (const p of packages) {
    const before = readFileSync(p.manifest, "utf8");
    const after = bumpPeerRanges(before.replace(/("version"\s*:\s*")[^"]+(")/, `$1${to}$2`), names, to);
    changes.push({ file: p.manifest, before, after });
  }
  for (const p of packages) {
    for (const file of sourceFiles(join(p.dir, "src"))) {
      const before = readFileSync(file, "utf8");
      let after = before;
      for (const old of versions) {
        after = after
          .replace(new RegExp(`(export const VERSION\\s*=\\s*")${escapeRe(old)}(")`, "g"), `$1${to}$2`)
          .replace(new RegExp(`(rendererVersion:\\s*")${escapeRe(old)}(")`, "g"), `$1${to}$2`);
      }
      if (after !== before) changes.push({ file, before, after });
    }
  }
  const distTag = proposedDistTag(to);
  return { from, to, distTag, packages: packages.map((p) => p.name), changes };
}

export function applyBump(plan: BumpPlan): void {
  for (const c of plan.changes) writeFileSync(c.file, c.after);
}

/** `true` when `npm view` failed because the package or version doesn't exist (as opposed to a network or registry error). */
export function isNpmNotFound(stdout: string, stderr: string): boolean {
  if (/\bE404\b/.test(stderr)) return true;
  try {
    const parsed = JSON.parse(stdout) as { error?: { code?: string } };
    return parsed?.error?.code === "E404";
  } catch {
    return false;
  }
}

export type NpmView = (args: string[]) => { status: number | null; stdout: string; stderr: string; error?: Error };

const npmView: NpmView = (args) => {
  const r = spawnSync("npm", ["view", ...args], { encoding: "utf8" });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
};

/**
 * Every version of the lockstep packages already published to npm. Unpublished
 * packages (E404) contribute nothing; any other failure throws, so a registry
 * outage can't restart canary numbering at `.0`.
 */
export function publishedVersions(names: readonly string[], view: NpmView = npmView): string[] {
  const out = new Set<string>();
  for (const name of names) {
    const r = view([name, "versions", "--json"]);
    if (r.error) throw new Error(`npm view ${name} failed: ${r.error.message}`);
    if (r.status !== 0) {
      if (isNpmNotFound(r.stdout, r.stderr)) continue;
      throw new Error(`npm view ${name} failed (exit ${r.status}):\n${(r.stderr || r.stdout).trim()}`);
    }
    let parsed: string | string[];
    try {
      parsed = JSON.parse(r.stdout) as string | string[];
    } catch {
      throw new Error(`npm view ${name} returned malformed output:\n${r.stdout.trim()}`);
    }
    for (const v of Array.isArray(parsed) ? parsed : [parsed]) out.add(v);
  }
  return [...out];
}

function main(argv: string[]): number {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const kind = argv.find((a) => !a.startsWith("--"));
  if (!kind || flags.has("--help")) {
    console.log("usage: bun scripts/release-version.ts <patch|minor|major|canary|stable|x.y.z> [--registry] [--dry-run] [--json] [--force]");
    return kind ? 0 : 1;
  }
  const root = resolve(import.meta.dir, "..");
  const names = workspacePackages(root).map((p) => p.name);
  const published = flags.has("--registry") ? publishedVersions(names) : [];
  const plan = planBump(root, kind, { published, force: flags.has("--force") });
  if (!flags.has("--dry-run")) applyBump(plan);
  if (flags.has("--json")) {
    console.log(JSON.stringify({ from: plan.from, to: plan.to, distTag: plan.distTag, packages: plan.packages, files: plan.changes.map((c) => relative(root, c.file)) }, null, 2));
  } else {
    console.log(`▼ ${plan.from} → ${plan.to} (dist-tag: ${plan.distTag})${flags.has("--dry-run") ? " [dry run]" : ""}`);
    for (const c of plan.changes) console.log(`  ${relative(root, c.file)}`);
  }
  return 0;
}

if (import.meta.main) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`▼ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
