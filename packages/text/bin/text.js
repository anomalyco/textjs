#!/usr/bin/env node
// The CLI is loaded through the package's own `exports` (`@textjs/next/cli`),
// so it shares one module graph (one RouterContext, one RuntimeContext) with
// the app's `@textjs/next` imports: compiled `dist/` when installed from npm,
// TypeScript sources in the repo. Node can't run those sources, so an unbuilt
// checkout falls back to Bun.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = import.meta.resolve("@textjs/next/cli");

if (typeof process.versions.bun === "string" || !/\.tsx?$/.test(cli)) {
  const { main } = await import(cli);
  process.exitCode = await main(process.argv.slice(2));
} else {
  const source = fileURLToPath(new URL("./text.ts", import.meta.url));
  const r = spawnSync("bun", [source, ...process.argv.slice(2)], { stdio: "inherit" });
  if (r.error) {
    console.error("▼ text: this checkout runs the TypeScript CLI, which needs Bun (https://bun.sh).");
    process.exitCode = 1;
  } else process.exitCode = r.status ?? 1;
}
