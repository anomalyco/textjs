/**
 * Make a `tsc` output directory loadable by Node's ESM resolver:
 * `bun scripts/esm-specifiers.ts <distDir>...`.
 *
 * Sources use extensionless relative imports (`moduleResolution: "bundler"`),
 * which Vite and Bun resolve but Node does not. This rewrites relative
 * specifiers in emitted `.js` / `.d.ts` files to the file they resolve to
 * (`./root` → `./root.js`, `./dom` → `./dom/index.js`).
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bexport\s*\*\s*from\s*)(["'])(\.{1,2}\/[^"'\n]*)\2/g;
const HAS_EXT = /\.(?:m?js|cjs|json|css|wasm|node)$/;

/** The Node-resolvable form of `spec` imported from `file`, or `spec` unchanged. */
export function rewriteSpecifier(file: string, spec: string): string {
  if (HAS_EXT.test(spec)) return spec;
  const base = resolve(dirname(file), spec);
  const types = file.endsWith(".d.ts");
  const has = (p: string): boolean => existsSync(types ? `${p}.d.ts` : `${p}.js`);
  if (has(base)) return `${spec}.js`;
  if (existsSync(base) && statSync(base).isDirectory() && has(join(base, "index"))) return `${spec.replace(/\/$/, "")}/index.js`;
  return spec;
}

export function rewriteSource(file: string, source: string): string {
  return source.replace(SPECIFIER, (_m, head: string, q: string, spec: string) => `${head}${q}${rewriteSpecifier(file, spec)}${q}`);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".js") || name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

export function rewriteDir(dir: string): number {
  let changed = 0;
  for (const file of walk(dir)) {
    const before = readFileSync(file, "utf8");
    const after = rewriteSource(file, before);
    if (after !== before) {
      writeFileSync(file, after);
      changed++;
    }
  }
  return changed;
}

if (import.meta.main) {
  const dirs = process.argv.slice(2);
  if (dirs.length === 0) {
    console.error("usage: bun scripts/esm-specifiers.ts <distDir>...");
    process.exit(1);
  }
  // `tsc -b` may re-emit referenced projects, so packages also pass their references' dist dirs.
  for (const dir of dirs) if (existsSync(dir)) rewriteDir(resolve(dir));
}
