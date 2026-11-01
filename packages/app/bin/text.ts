#!/usr/bin/env bun
// Imported by package name (not `../src/cli`) so the CLI and the app resolve
// the same `@textjs/app` modules.
import { main, parseArgs } from "@textjs/app/cli";

const argv = process.argv.slice(2);
const code = await main(argv);
// `text build` is done once main() returns: don't wait on handles user modules left open (database clients, timers).
if (parseArgs(argv).command === "build") {
  await new Promise<void>((resolve) => process.stdout.write("", () => resolve()));
  process.exit(code);
}
process.exitCode = code;
