#!/usr/bin/env bun
/**
 * Rename the framework package `@textjs/next` to `@textjs/app`.
 *
 *   bun scripts/rename-next-to-app.ts [--dry-run] [--no-move] [--no-bump] [--no-install] [--verbose]
 *
 * Run it from a clean checkout. Steps, each skipped when it's already done:
 *
 *   1. `git mv packages/text packages/app` (`--no-move` keeps the directory).
 *   2. Every tracked or untracked-but-not-ignored text file: `@textjs/next` and its
 *      subpaths become `@textjs/app`, `packages/text` becomes `packages/app` (also
 *      relative paths such as `../../text/src` that resolve into it), and narration
 *      says "at textjs slash app".
 *   3. History stays as written: released CHANGELOG sections, `status-incidents.ts`
 *      and blog sections that announced the `@textjs/next` name. Only commands a
 *      reader would copy (`bunx @textjs/next …`, `bun add @textjs/next`) are rewritten
 *      there. Lines that mention both names (rename notes) are never touched.
 *   4. Lockstep version to 1.0.2 (the first `@textjs/app` release) if it's lower, so
 *      create-text-app templates pin `^1.0.2` (`--no-bump` skips).
 *   5. An Unreleased CHANGELOG entry and a note under the 1.0 blog post's rename.
 *   6. The re-rendered Learn videos in `apps/web/src/learn/video.ts` (`VIDEOS` below: `-v2` files, durations).
 *   7. `bun install` to relink the workspace and rewrite `bun.lock` (`--no-install` skips).
 *
 * Running it twice changes nothing the second time. `--dry-run` prints what would
 * change and exits 1 if anything would.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { applyBump, parseVersion, planBump, workspacePackages } from "./release-version";

const OLD = "@textjs/next";
const NEW = "@textjs/app";
const OLD_DIR = "packages/text";
const NEW_DIR = "packages/app";
const FIRST_VERSION = "1.0.2";

/** Learn chapters re-rendered for the rename and the copy audit: file revision and duration (seconds, from manifest.json). */
export const VIDEOS: Record<string, { revision: number; duration: number }> = {
  "getting-started": { revision: 3, duration: 234.3 },
  layout: { revision: 3, duration: 218.7 },
  styling: { revision: 3, duration: 204.4 },
  "input-and-keymaps": { revision: 2, duration: 205.1 },
  routing: { revision: 3, duration: 226.1 },
  "data-fetching": { revision: 2, duration: 212.3 },
  components: { revision: 3, duration: 184.8 },
  testing: { revision: 2, duration: 194.4 },
  terminal: { revision: 2, duration: 211.1 },
  shipping: { revision: 2, duration: 183.7 },
};

const ROOT = resolve(import.meta.dir, "..");
const SELF = relative(ROOT, import.meta.path);

// ---------------------------------------------------------------------------
// Text transforms
// ---------------------------------------------------------------------------

const PKG_RE = /@textjs\/next(?![\w-])/g;
const SPOKEN_RE = /\btextjs slash next\b/g;
const PATH_RE = /(?<![\w-])packages\/text(?![\w-])/g;
const COMMAND_RE =
  /\b((?:bunx|npx|pnpx|bun x|pnpm dlx|yarn dlx|(?:bun|pnpm|yarn) add|npm (?:i|install|add))(?: -{1,2}[\w-]+(?:=\S+)?)*) @textjs\/next(?![\w-])/g;
/** A line about the rename itself (it names both packages): leave it alone. */
const RENAME_NOTE_RE = /@textjs\/next(?![\w-]).*@textjs\/app|@textjs\/app.*@textjs\/next(?![\w-])/;

export type Counts = Record<"package" | "path" | "spoken" | "command" | "pin", number>;

const count = (s: string, re: RegExp): number => s.match(re)?.length ?? 0;

/** Rewrite one line everywhere outside history. */
function currentLine(line: string, c: Counts): string {
  if (RENAME_NOTE_RE.test(line)) return line;
  c.package += count(line, PKG_RE);
  c.path += count(line, PATH_RE);
  c.spoken += count(line, SPOKEN_RE);
  return line.replace(PKG_RE, NEW).replace(PATH_RE, NEW_DIR).replace(SPOKEN_RE, "textjs slash app");
}

/** Rewrite one line of history: only commands a reader would copy, and repo paths (the old ones no longer exist). */
function historyLine(line: string, c: Counts): string {
  if (RENAME_NOTE_RE.test(line)) return line;
  c.command += count(line, COMMAND_RE);
  c.path += count(line, PATH_RE);
  return line.replace(COMMAND_RE, `$1 ${NEW}`).replace(PATH_RE, NEW_DIR);
}

/** Relative specifiers (`"../../text/src/x"`, `](../text/README.md)`) that resolve into the old package directory. */
function relativePaths(text: string, file: string, c: Counts): string {
  const oldAbs = join(ROOT, OLD_DIR);
  return text.replace(/(["'`(])(\.\.?\/[^"'`()\s]*)/g, (all, open: string, spec: string) => {
    const parts = spec.split("/");
    let at = dirname(join(ROOT, file));
    for (let i = 0; i < parts.length; i++) {
      at = resolve(at, parts[i] as string);
      if (at === oldAbs && parts[i] === "text") {
        c.path++;
        parts[i] = "app";
        return open + parts.join("/");
      }
    }
    return all;
  });
}

type Mode = "current" | "history";

/** Which lines of a file are history. `null` means the whole file is current. */
function historyOf(file: string, lines: string[]): Mode[] | null {
  if (file === "CHANGELOG.md") {
    let mode: Mode = "current";
    return lines.map((l) => {
      if (/^## \[/.test(l)) mode = /^## \[Unreleased\]/i.test(l) ? "current" : "history";
      return mode;
    });
  }
  if (file === "apps/web/src/pages/status-incidents.ts") return lines.map(() => "history");
  // A blog section that announced the old name ("is now `@textjs/next`") is history.
  if (/^apps\/web\/src\/blog\/.+\.md$/.test(file)) {
    const modes: Mode[] = lines.map(() => "current");
    const starts = lines.flatMap((l, i) => (/^##? /.test(l) ? [i] : []));
    const bounds = [0, ...starts, lines.length];
    for (let b = 0; b < bounds.length - 1; b++) {
      const [from, to] = [bounds[b] as number, bounds[b + 1] as number];
      if (lines.slice(from, to).some((l) => /\bnow `@textjs\/next`/.test(l))) for (let i = from; i < to; i++) modes[i] = "history";
    }
    return modes;
  }
  // Tests that assert on released history.
  if (file === "apps/web/test/resources.test.tsx") return lines.map((l) => (/v1\?\.body/.test(l) ? "history" : "current"));
  return null;
}

export function transform(file: string, text: string, c: Counts): string {
  const lines = text.split("\n");
  const modes = historyOf(file, lines);
  let out = lines.map((l, i) => (modes?.[i] === "history" ? historyLine(l, c) : currentLine(l, c))).join("\n");
  out = relativePaths(out, file, c);
  // `@textjs/app` starts at 1.0.2: pin ranges no lower than that.
  if (/(^|\/)package\.json$/.test(file)) {
    const pin = /("@textjs\/app"\s*:\s*")\^1\.0\.[01](")/g;
    c.pin += count(out, pin);
    out = out.replace(pin, `$1^${FIRST_VERSION}$2`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Additions: CHANGELOG entry, blog note, video revisions
// ---------------------------------------------------------------------------

const CHANGELOG_ENTRY =
  "- The framework and CLI package is now `@textjs/app`, renamed from `@textjs/next` so the name doesn't suggest an official Next.js integration. " +
  "`@textjs/next` is deprecated in favour of `@textjs/app` and gets no new releases. " +
  "To switch, run `bun remove @textjs/next && bun add @textjs/app` and replace `@textjs/next` with `@textjs/app` in imports, including subpaths such as `@textjs/app/link`. " +
  "The CLI is still `text`, and create-text-app templates depend on `@textjs/app`.";

export function addChangelogEntry(text: string): string {
  if (text.includes("is now `@textjs/app`")) return text;
  const lines = text.split("\n");
  const head = lines.findIndex((l) => /^## \[Unreleased\]/i.test(l));
  if (head < 0) throw new Error("CHANGELOG.md has no ## [Unreleased] section");
  let end = lines.findIndex((l, i) => i > head && /^## /.test(l));
  if (end < 0) end = lines.length;
  const changed = lines.findIndex((l, i) => i > head && i < end && /^### Changed\s*$/.test(l));
  if (changed >= 0) {
    // First bullet of the existing "Changed" list.
    let at = changed + 1;
    while (at < end && (lines[at] as string).trim() === "") at++;
    lines.splice(at, 0, CHANGELOG_ENTRY);
  } else {
    // Keep a Changelog order: Added, Changed, …; a new "Changed" goes after "Added" when there is one.
    const nextSub = lines.findIndex((l, i) => i > head && i < end && /^### /.test(l) && !/^### Added\s*$/.test(l));
    const at = nextSub >= 0 ? nextSub : end;
    const block = ["### Changed", "", CHANGELOG_ENTRY, ""];
    if (at === end && (lines[at - 1] as string).trim() !== "") block.unshift("");
    lines.splice(at, 0, ...block);
  }
  return lines.join("\n");
}

const BLOG_NOTE =
  "**Update, 1.0.2:** the package is now `@textjs/app`, and `@textjs/next` is deprecated. To switch, run `bun remove @textjs/next && bun add @textjs/app` and import from `@textjs/app`.";

/** Append the note to each blog section that announced `@textjs/next`. */
export function addBlogNote(text: string): string {
  const lines = text.split("\n");
  const starts = lines.flatMap((l, i) => (/^## /.test(l) ? [i] : []));
  const bounds = [...starts, lines.length];
  for (let b = bounds.length - 2; b >= 0; b--) {
    const [from, to] = [bounds[b] as number, bounds[b + 1] as number];
    const section = lines.slice(from, to);
    if (!section.some((l) => /\bnow `@textjs\/next`/.test(l)) || section.some((l) => l.includes(NEW))) continue;
    let at = to;
    while (at > from && (lines[at - 1] as string).trim() === "") at--;
    lines.splice(at, 0, "", BLOG_NOTE);
  }
  return lines.join("\n");
}

export function setVideos(text: string, videos: typeof VIDEOS): string {
  let out = text;
  const keyOf = (slug: string): string => (/^[a-z]+$/.test(slug) ? slug : `"${slug}"`);
  for (const [slug, { duration }] of Object.entries(videos)) {
    const published = new RegExp(`(\\n  ${keyOf(slug).replace(/[.*+?^${}()|[\]\\"]/g, "\\$&")}: )[\\d.]+,`);
    if (!published.test(out)) throw new Error(`video.ts: no PUBLISHED entry for ${slug}`);
    out = out.replace(published, `$1${duration},`);
  }
  const revisions = /(export const REVISIONS: Readonly<Record<string, number>> = \{)([^}]*)(\};)/.exec(out);
  if (!revisions) throw new Error("video.ts: no REVISIONS map");
  // VIDEOS order first, then any other chapters already listed.
  const entries = new Map<string, string>(Object.entries(videos).map(([slug, v]) => [keyOf(slug), String(v.revision)]));
  for (const m of (revisions[2] as string).matchAll(/\s*("?[\w-]+"?): (\d+),/g)) if (!entries.has(m[1] as string)) entries.set(m[1] as string, m[2] as string);
  const body = [...entries].map(([k, v]) => `\n  ${k}: ${v},`).join("") + "\n";
  return out.slice(0, revisions.index) + revisions[1] + body + revisions[3] + out.slice(revisions.index + revisions[0].length);
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const BINARY = /\.(png|jpe?g|webp|gif|ico|pdf|woff2?|ttf|otf|gz|zip|mp4|webm|mp3|wav|flf|lockb)$/i;
/** Regenerated by `bun install`, or this script. */
const SKIP = new Set(["bun.lock", SELF, "docs/ops/rename-to-app.md"]);

function listFiles(): string[] {
  const r = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ls-files failed: ${r.stderr}`);
  return [...new Set(r.stdout.split("\0").filter(Boolean))].filter((f) => {
    if (BINARY.test(f) || SKIP.has(f) || f.endsWith("/bun.lock")) return false;
    const abs = join(ROOT, f);
    return existsSync(abs) && statSync(abs).isFile();
  });
}

const CATEGORIES: Array<[string, RegExp]> = [
  ["History (CHANGELOG, status, blog)", /^(CHANGELOG\.md|apps\/web\/src\/pages\/status-incidents\.ts|apps\/web\/src\/blog\/)/],
  ["Tests and fixtures", /(^|\/)(test|tests|e2e|__tests__)\/|\.test\.[jt]sx?$/],
  ["Package manifests", /(^|\/)package\.json$/],
  ["create-text-app templates", /^packages\/create-text-app\/templates\//],
  ["Framework package (packages/app)", /^packages\/(app|text)\//],
  ["Error codes and docs", /^packages\/core\/src\/(errors|error-docs)\.ts$/],
  ["ESLint plugin", /^packages\/eslint-plugin-textjs\//],
  ["VS Code and DevTools extensions", /^packages\/(vscode-textjs|devtools-extension)\//],
  ["Other packages", /^packages\//],
  ["Docs and Learn content", /^apps\/web\/src\/(docs|learn)\/content\//],
  ["Site code, samples and OG", /^apps\/web\//],
  ["Learn videos (scripts, narration)", /^media\//],
  ["Apps and examples", /^(apps|examples)\//],
  ["Release and QA scripts, CI", /^(scripts|\.github)\//],
  ["Repo docs and config", /./],
];

const categoryOf = (f: string): string => (CATEGORIES.find(([, re]) => re.test(f)) as [string, RegExp])[0];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function git(args: string[]): void {
  const r = spawnSync("git", args, { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
}

function main(): number {
  const { values: opt } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      "no-move": { type: "boolean", default: false },
      "no-bump": { type: "boolean", default: false },
      "no-install": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (opt.help) {
    console.log("usage: bun scripts/rename-next-to-app.ts [--dry-run] [--no-move] [--no-bump] [--no-install] [--verbose]");
    return 0;
  }
  const dry = opt["dry-run"];
  const steps: string[] = [];
  const warnings: string[] = [];

  // 1. Directory.
  const oldAbs = join(ROOT, OLD_DIR);
  const newAbs = join(ROOT, NEW_DIR);
  if (!opt["no-move"] && existsSync(join(oldAbs, "package.json"))) {
    if (existsSync(newAbs)) {
      // Left over from switching branches: only ignored build output (node_modules, dist), nothing git tracks.
      const tracked = spawnSync("git", ["ls-files", "--", NEW_DIR], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
      if (tracked || existsSync(join(newAbs, "package.json"))) throw new Error(`Both ${OLD_DIR} and ${NEW_DIR} exist; resolve that by hand first.`);
      if (!dry) rmSync(newAbs, { recursive: true, force: true });
      steps.push(`removed untracked leftovers in ${NEW_DIR}`);
    }
    if (!dry) git(["mv", OLD_DIR, NEW_DIR]);
    steps.push(`moved ${OLD_DIR} → ${NEW_DIR}`);
  }

  // 2–3. Text.
  const byCategory = new Map<string, { files: number; counts: Counts }>();
  const changed: string[] = [];
  for (const file of listFiles()) {
    const abs = join(ROOT, file);
    const before = readFileSync(abs, "utf8");
    if (before.includes("\0")) continue;
    const c: Counts = { package: 0, path: 0, spoken: 0, command: 0, pin: 0 };
    let after = transform(file, before, c);
    if (file === "CHANGELOG.md") after = addChangelogEntry(after);
    if (/^apps\/web\/src\/blog\/.+\.md$/.test(file)) after = addBlogNote(after);
    if (file === "apps/web/src/learn/video.ts" && Object.keys(VIDEOS).length > 0) {
      try {
        after = setVideos(after, VIDEOS);
      } catch (e) {
        warnings.push(`${(e as Error).message}: point the re-rendered Learn videos at their -v2 files by hand`);
      }
    }
    if (after === before) continue;
    changed.push(file);
    if (!dry) writeFileSync(abs, after);
    const cat = categoryOf(file);
    const entry = byCategory.get(cat) ?? { files: 0, counts: { package: 0, path: 0, spoken: 0, command: 0, pin: 0 } };
    entry.files++;
    for (const k of Object.keys(c) as Array<keyof Counts>) entry.counts[k] += c[k];
    byCategory.set(cat, entry);
    if (opt.verbose) console.log(`  ${file}`);
  }

  // 4. Version.
  if (!opt["no-bump"]) {
    const pkgs = workspacePackages(ROOT);
    const v = parseVersion((pkgs[0] as { version: string }).version);
    const lower = v.major < 1 || (v.major === 1 && v.minor === 0 && v.patch < 2);
    if (lower) {
      const plan = planBump(ROOT, FIRST_VERSION);
      if (!dry) applyBump(plan);
      steps.push(`version ${plan.from} → ${plan.to} in ${plan.changes.length} files (${plan.packages.join(", ")})`);
    }
  }

  // 7. Lockfile and links.
  if (!opt["no-install"] && !dry) {
    const lock = join(ROOT, "bun.lock");
    const before = existsSync(lock) ? readFileSync(lock, "utf8") : "";
    const r = spawnSync("bun", ["install"], { cwd: ROOT, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`bun install failed:\n${r.stderr}`);
    if (readFileSync(lock, "utf8") !== before) steps.push("bun install: bun.lock updated");
  }

  // Summary.
  const head = dry ? "▼ rename @textjs/next → @textjs/app (dry run)" : "▼ rename @textjs/next → @textjs/app";
  console.log(head);
  for (const s of steps) console.log(`  ${s}`);
  if (changed.length === 0 && steps.length === 0) {
    console.log("  nothing to do: already renamed");
  } else if (changed.length > 0) {
    const rows = [...byCategory].sort((a, b) => CATEGORIES.findIndex(([n]) => n === a[0]) - CATEGORIES.findIndex(([n]) => n === b[0]));
    const w = Math.max(...rows.map(([n]) => n.length));
    console.log(`  ${changed.length} files:`);
    for (const [name, { files, counts }] of rows) {
      const parts = [
        counts.package && `${counts.package} package refs`,
        counts.path && `${counts.path} paths`,
        counts.spoken && `${counts.spoken} narration`,
        counts.command && `${counts.command} commands in history`,
        counts.pin && `${counts.pin} ranges → ^${FIRST_VERSION}`,
      ].filter(Boolean);
      console.log(`    ${name.padEnd(w)}  ${String(files).padStart(3)} files  ${parts.join(", ") || "additions"}`);
    }
  }

  for (const w of warnings) console.log(`  warning: ${w}`);

  // What still says @textjs/next: history and rename notes only.
  const left: string[] = [];
  for (const file of dry ? [] : listFiles()) {
    const text = readFileSync(join(ROOT, file), "utf8");
    if (!text.includes(OLD)) continue;
    text.split("\n").forEach((l, i) => {
      if (l.includes(OLD)) left.push(`${file}:${i + 1}`);
    });
  }
  if (left.length > 0) {
    console.log(`  ${left.length} lines still name ${OLD} (history and rename notes):`);
    for (const l of left) console.log(`    ${l}`);
  }
  return dry && (changed.length > 0 || steps.length > 0) ? 1 : 0;
}

if (import.meta.main) process.exit(main());

