#!/usr/bin/env node
// The CLI is loaded through the package's own `exports` (`@textjs/app/cli`),
// so it shares one module graph (one RouterContext, one RuntimeContext) with
// the app's `@textjs/app` imports: compiled `dist/` when installed from npm,
// TypeScript sources in the repo. Node can't run those sources, so an unbuilt
// checkout falls back to Bun.
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

// Resolved from this file's canonical path (symlinks and Windows 8.3 short names
// expanded), as the app's own imports are, so both load the same module files.
const self = realpathSync.native(fileURLToPath(import.meta.url));
const cli = pathToFileURL(realpathSync.native(createRequire(self).resolve("@textjs/app/cli"))).href;

if (typeof process.versions.bun === "string" || !/\.tsx?$/.test(cli)) {
  const { main, parseArgs } = await import(cli);
  const argv = process.argv.slice(2);
  const code = await main(argv);
  // `text build` is done once main() returns: don't wait on handles user modules left open (database clients, timers).
  if (parseArgs(argv).command === "build") {
    await Promise.all([process.stdout, process.stderr].map((s) => new Promise((resolve) => s.write("", () => resolve()))));
    process.exit(code);
  }
  process.exitCode = code;
} else {
  const source = fileURLToPath(new URL("./text.ts", pathToFileURL(self)));
  const r = spawnSync("bun", [source, ...process.argv.slice(2)], { stdio: "inherit" });
  if (r.error) {
    console.error("▼ text: this checkout runs the TypeScript CLI, which needs Bun (https://bun.sh).");
    process.exitCode = 1;
  } else process.exitCode = r.status ?? 1;
}
