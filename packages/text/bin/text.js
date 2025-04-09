#!/usr/bin/env node
// Bun runs the TypeScript CLI directly; Node runs the bundled `dist/bin/text.js`
// (`bun run build`), falling back to Bun when the bundle hasn't been built yet.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("./text.ts", import.meta.url));
const bundled = new URL("../dist/bin/text.js", import.meta.url);

if (typeof process.versions.bun === "string") {
  await import(source);
} else if (existsSync(bundled)) {
  await import(bundled.href);
} else {
  const r = spawnSync("bun", [source, ...process.argv.slice(2)], { stdio: "inherit" });
  if (r.error) {
    console.error("▼ text: missing dist/bin/text.js. Run `bun run build` (or install Bun).");
    process.exitCode = 1;
  } else process.exitCode = r.status ?? 1;
}
