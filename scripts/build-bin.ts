/**
 * Bundle a package CLI (`bin/*.ts`) into a Node-compatible ESM executable:
 * `bun scripts/build-bin.ts <entry> <outfile>`.
 */

import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [entry, outfile] = process.argv.slice(2);
if (!entry || !outfile) {
  console.error("usage: bun scripts/build-bin.ts <entry> <outfile>");
  process.exit(1);
}

const EXTERNAL = ["vite", "@vitejs/plugin-react", "react", "react-dom", "react-reconciler", "yoga-layout"];

const result = await Bun.build({
  entrypoints: [resolve(entry)],
  target: "node",
  format: "esm",
  external: EXTERNAL,
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const output = result.outputs[0];
if (!output) throw new Error(`No output for ${entry}`);
const body = (await output.text())
  .split("\n")
  .filter((line, i) => !(i < 3 && (line.startsWith("#!") || line.trim() === "// @bun")))
  .join("\n");
const target = resolve(outfile);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `#!/usr/bin/env node\n${body}`);
chmodSync(target, 0o755);
console.log(`  ${outfile}  ${(readFileSync(target).length / 1024).toFixed(1)} KB`);
