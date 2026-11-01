#!/usr/bin/env node
// Bun runs the TypeScript sources in this repo. Installed packages, and Node, run the compiled dist/.
import { existsSync } from "node:fs";

const source = new URL("../src/cli.ts", import.meta.url);
const compiled = new URL("../dist/cli.js", import.meta.url);
const entry = typeof process.versions.bun === "string" && existsSync(source) ? source : compiled;

if (entry === compiled && !existsSync(compiled)) {
  console.error("▼ textjs-opencode: missing dist/cli.js. Run `bun run build`, or run this file with Bun.");
  process.exitCode = 1;
} else {
  const { main } = await import(entry.href);
  process.exitCode = await main(process.argv.slice(2));
}
