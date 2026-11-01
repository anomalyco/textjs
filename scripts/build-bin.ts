/**
 * Bundle a package CLI (`bin/*.ts`) into a Node-compatible ESM executable:
 * `bun scripts/build-bin.ts <entry> <outfile>`.
 */

import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Never bundled: third-party runtime packages, plus the building package itself
 * and everything it depends on. A bundled copy of `@textjs/*` would carry its
 * own React contexts, which providers in the app's copy never reach.
 */
export function externals(manifest: { name?: string; dependencies?: Record<string, string>; peerDependencies?: Record<string, string> }): string[] {
  const own = [manifest.name, ...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})].filter((n): n is string => !!n);
  const names = new Set(["vite", "@vitejs/plugin-react", "react", "react-dom", "react-reconciler", "yoga-layout", "@modelcontextprotocol/sdk", "zod", "@textjs/core", "@textjs/react", "@textjs/app", ...own]);
  return [...names].flatMap((n) => [n, `${n}/*`]);
}

async function main(entry: string, outfile: string): Promise<void> {
  const manifest = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as Parameters<typeof externals>[0];
  const result = await Bun.build({
    entrypoints: [resolve(entry)],
    target: "node",
    format: "esm",
    external: externals(manifest),
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
}

if (import.meta.main) {
  const [entry, outfile] = process.argv.slice(2);
  if (!entry || !outfile) {
    console.error("usage: bun scripts/build-bin.ts <entry> <outfile>");
    process.exit(1);
  }
  await main(entry, outfile);
}
