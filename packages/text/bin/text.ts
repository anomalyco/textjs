#!/usr/bin/env bun
import { main, parseArgs } from "../src/cli/index";

const argv = process.argv.slice(2);
const code = await main(argv);
// `text build` is done once main() returns: don't wait on handles user modules left open (database clients, timers).
if (parseArgs(argv).command === "build") {
  await new Promise<void>((resolve) => process.stdout.write("", () => resolve()));
  process.exit(code);
}
process.exitCode = code;
