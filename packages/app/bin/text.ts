#!/usr/bin/env bun
// Imported by package name (not `../src/cli`) so the CLI and the app resolve
// the same `@textjs/app` modules.
import { main, parseArgs } from "@textjs/app/cli";

const argv = process.argv.slice(2);
const code = await main(argv);
// `text build` is done once main() returns: don't wait on handles user modules left open (database clients, timers).
if (parseArgs(argv).command === "build") {
  await Promise.all([process.stdout, process.stderr].map((s) => new Promise<void>((resolve) => s.write("", () => resolve()))));
  process.exit(code);
}
process.exitCode = code;
