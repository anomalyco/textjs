/**
 * Build, pack and publish every publishable workspace package.
 *
 *   bun scripts/release-publish.ts --tag <latest|canary|lts|v<major>-lts> [--provenance] [--dry-run] [--skip-build]
 *
 * Packages are packed with `bun pm pack` (resolving `workspace:*` to the
 * lockstep version), `publishConfig` field overrides (`main`, `types`,
 * `exports`, …) are applied to the packed manifest, and the result is
 * published with `npm publish` so `--provenance` works on GitHub Actions.
 * Versions that already exist on npm are skipped, so reruns are safe.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseVersion, workspacePackages, type WorkspacePackage } from "./release-version";

/** `publishConfig` keys npm itself understands; everything else is a manifest override. */
const NPM_PUBLISH_KEYS = new Set(["registry", "access", "tag", "provenance"]);

/** Validate that `version` may be published under `tag`. */
export function checkChannel(version: string, tag: string): void {
  const v = parseVersion(version);
  const pre = v.pre.length > 0;
  if (tag === "latest" || tag === "lts" || /^v\d+-lts$/.test(tag)) {
    if (pre) throw new Error(`Refusing to publish prerelease ${version} under "${tag}".`);
    const m = /^v(\d+)-lts$/.exec(tag);
    if (m && Number(m[1]) !== v.major) throw new Error(`${version} does not belong on "${tag}".`);
    return;
  }
  if (tag === "canary") {
    if (!(v.pre[0] === "canary" && typeof v.pre[1] === "number" && v.pre.length === 2)) throw new Error(`Canary releases must be x.y.z-canary.N (got ${version}).`);
    return;
  }
  throw new Error(`Unknown dist-tag "${tag}". Use latest, canary, lts or v<major>-lts.`);
}

/** Hoist `publishConfig` overrides into the manifest (pnpm semantics) and check nothing still says `workspace:`. */
export function preparePackedManifest(manifest: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...manifest };
  const pc = (manifest.publishConfig ?? {}) as Record<string, unknown>;
  const kept: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(pc)) {
    if (NPM_PUBLISH_KEYS.has(k)) kept[k] = v;
    else out[k] = v;
  }
  if (Object.keys(kept).length > 0) out.publishConfig = kept;
  else delete out.publishConfig;
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [dep, range] of Object.entries((out[field] ?? {}) as Record<string, string>)) {
      if (range.startsWith("workspace:")) throw new Error(`${String(manifest.name)}: ${field}.${dep} is still "${range}" after packing.`);
    }
  }
  delete out.devDependencies;
  return out;
}

/** Workspace packages ordered so dependencies publish first. */
export function publishOrder(packages: readonly WorkspacePackage[]): WorkspacePackage[] {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const deps = (p: WorkspacePackage): string[] => {
    const m = JSON.parse(readFileSync(p.manifest, "utf8")) as Record<string, Record<string, string> | undefined>;
    return Object.keys({ ...m.dependencies, ...m.peerDependencies }).filter((d) => byName.has(d));
  };
  const out: WorkspacePackage[] = [];
  const seen = new Set<string>();
  const visit = (p: WorkspacePackage, stack: string[]): void => {
    if (seen.has(p.name)) return;
    if (stack.includes(p.name)) throw new Error(`Dependency cycle: ${[...stack, p.name].join(" → ")}`);
    for (const d of deps(p)) visit(byName.get(d) as WorkspacePackage, [...stack, p.name]);
    seen.add(p.name);
    out.push(p);
  };
  for (const p of packages) visit(p, []);
  return out;
}

function run(cmd: string, args: string[], cwd: string, env?: Record<string, string>): void {
  console.log(`  $ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (exit ${r.status})`);
}

function alreadyPublished(name: string, version: string): boolean {
  const r = spawnSync("npm", ["view", `${name}@${version}`, "version"], { encoding: "utf8" });
  return r.status === 0 && r.stdout.trim() === version;
}

function main(argv: string[]): number {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith(`${flag}=`))?.slice(flag.length + 1);
  };
  const tag = get("--tag");
  if (!tag) {
    console.log("usage: bun scripts/release-publish.ts --tag <latest|canary|lts|v<major>-lts> [--provenance] [--dry-run] [--skip-build]");
    return 1;
  }
  const dryRun = argv.includes("--dry-run");
  const root = resolve(import.meta.dir, "..");
  const packages = publishOrder(workspacePackages(root));
  const versions = new Set(packages.map((p) => p.version));
  if (versions.size !== 1) throw new Error(`Packages are not in lockstep: ${packages.map((p) => `${p.name}@${p.version}`).join(", ")}`);
  const version = (packages[0] as WorkspacePackage).version;
  checkChannel(version, tag);
  console.log(`▼ Publishing ${packages.length} packages @ ${version} → ${tag}${dryRun ? " (dry run)" : ""}`);

  const staging = mkdtempSync(join(tmpdir(), "textjs-release-"));
  for (const p of packages) {
    console.log(`\n▼ ${p.name}@${version}`);
    if (!dryRun && alreadyPublished(p.name, version)) {
      console.log("  already on npm, skipping");
      continue;
    }
    const manifest = JSON.parse(readFileSync(p.manifest, "utf8")) as { scripts?: Record<string, string> };
    if (!argv.includes("--skip-build") && manifest.scripts?.build) run("bun", ["run", "build"], p.dir);
    const dest = join(staging, p.name.replace("/", "__"));
    mkdirSync(dest, { recursive: true });
    run("bun", ["pm", "pack", "--destination", dest, "--ignore-scripts", "--quiet"], p.dir);
    const tarball = readdirSync(dest).find((f) => f.endsWith(".tgz"));
    if (!tarball) throw new Error(`bun pm pack produced no tarball for ${p.name}`);
    run("tar", ["xzf", tarball], dest);
    const packed = join(dest, "package", "package.json");
    writeFileSync(packed, `${JSON.stringify(preparePackedManifest(JSON.parse(readFileSync(packed, "utf8")) as Record<string, unknown>), null, 2)}\n`);
    const args = ["publish", join(dest, "package"), "--tag", tag, "--access", "public"];
    if (argv.includes("--provenance")) args.push("--provenance");
    if (dryRun) args.push("--dry-run");
    run("npm", args, root);
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
