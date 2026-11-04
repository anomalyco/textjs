/**
 * Bundle generated server entries (adapter servers, edge middleware,
 * `text start` runtime) into single self-contained ES modules with Vite.
 */

import { copyFileSync, existsSync, readFileSync, realpathSync } from "node:fs";
import { builtinModules } from "node:module";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, type InlineConfig, type Plugin } from "vite";
import { withFrameworkEntry } from "../vite-entry";
import type { TextConfig } from "../../config";
import { toPosix } from "../scan";

const here = dirname(realpathSync(fileURLToPath(import.meta.url)));

/**
 * Absolute path of a framework source file (`server/adapters/runtime.ts`),
 * also when this module runs from `dist/` (the sources ship in `src/`).
 */
export function frameworkFile(rel: string): string {
  const fromHere = join(here, "..", "..", rel);
  if (existsSync(fromHere)) return toPosix(fromHere);
  for (let dir = here; dirname(dir) !== dir; dir = dirname(dir)) {
    const pkgFile = join(dir, "package.json");
    if (!existsSync(pkgFile)) continue;
    const pkg = JSON.parse(readFileSync(pkgFile, "utf8")) as { name?: string };
    if (pkg.name === "@textjs/app" && existsSync(join(dir, "src", rel))) return toPosix(join(dir, "src", rel));
  }
  throw new Error(`▼ Text.js: could not locate the framework source file src/${rel}.`);
}

export type BundleTarget = "node" | "bun" | "webworker" | "edge";

export interface BundleOptions {
  root: string;
  config: TextConfig;
  /** Generated entry module source. */
  code: string;
  outFile: string;
  target: BundleTarget;
}

export interface BundleResult {
  /** `.wasm` modules the bundle imports, copied next to `outFile` (Cloudflare's `webworker` target only). */
  wasm: string[];
}

const ENTRY = "virtual:textjs/server-entry";

export async function bundleServerEntry(opts: BundleOptions): Promise<BundleResult> {
  const worker = opts.target === "webworker" || opts.target === "edge";
  // Cloudflare's runtime is workerd; Vercel's Edge Runtime is not, and resolves `edge-light`.
  const runtimeConditions = opts.target === "webworker" ? ["workerd", "worker", "edge-light"] : ["edge-light", "worker"];
  const entryPlugin: Plugin = {
    name: "textjs:server-entry",
    enforce: "pre",
    resolveId(id) {
      return id === ENTRY ? `\0${ENTRY}` : null;
    },
    load(id) {
      return id === `\0${ENTRY}` ? opts.code : null;
    },
  };
  // Workers resolve Node built-ins only by their `node:` names (nodejs_compat); dependencies often import `fs` / `async_hooks`.
  const builtins: Plugin = {
    name: "textjs:node-builtins",
    enforce: "pre",
    resolveId(id) {
      if (!worker) return null;
      if (id.startsWith("node:")) return { id, external: true };
      return builtinModules.includes(id) && !id.startsWith("_") ? { id: `node:${id}`, external: true } : null;
    },
  };
  // Cloudflare Workers compile WebAssembly only at deploy time, from `.wasm` modules uploaded with the worker
  // (`import yoga from "./yoga.wasm"` is a `WebAssembly.Module`): keep those imports and copy the files.
  const wasm = new Map<string, string>();
  const wasmModules: Plugin = {
    name: "textjs:worker-wasm",
    enforce: "pre",
    async resolveId(id, importer) {
      if (opts.target !== "webworker" || !/\.wasm$/.test(id)) return null;
      const resolved = await this.resolve(id, importer, { skipSelf: true });
      if (!resolved || resolved.external) return null;
      const file = resolved.id;
      let name = [...wasm].find(([, f]) => f === file)?.[0];
      if (name === undefined) {
        const base = basename(file, ".wasm");
        name = `${base}.wasm`;
        for (let i = 2; wasm.has(name); i++) name = `${base}-${i}.wasm`;
        wasm.set(name, file);
      }
      return { id: `./${name}`, external: "absolute" };
    },
    generateBundle(_options, output) {
      // Resolved before tree-shaking: keep only the modules the output still imports.
      const imported = new Set(Object.values(output).flatMap((chunk) => (chunk.type === "chunk" ? chunk.imports : [])));
      for (const name of wasm.keys()) if (!imported.has(`./${name}`)) wasm.delete(name);
    },
  };
  const inline: InlineConfig = {
    configFile: false,
    root: opts.root,
    mode: "production",
    logLevel: "warn",
    clearScreen: false,
    publicDir: false,
    define: worker ? { "process.env.NODE_ENV": JSON.stringify("production") } : undefined,
    resolve: worker ? { conditions: [...runtimeConditions, "browser", "import", "module", "default"] } : undefined,
    ssr: {
      target: worker ? "webworker" : "node",
      noExternal: true,
      ...(worker ? { resolve: { conditions: [...runtimeConditions, "import", "module", "default"], externalConditions: runtimeConditions.slice(0, 2) } } : {}),
    },
    build: {
      outDir: dirname(opts.outFile),
      emptyOutDir: false,
      copyPublicDir: false,
      target: worker ? "es2022" : "node18",
      minify: false,
      reportCompressedSize: false,
      rollupOptions: {
        external: worker ? [/^node:/] : undefined,
        output: { entryFileNames: basename(opts.outFile), format: "es", inlineDynamicImports: true },
      },
    },
    plugins: [entryPlugin, builtins, wasmModules],
  };
  await build(withFrameworkEntry(inline, opts.config.vite, { input: ENTRY, ssr: true }));
  for (const [name, file] of wasm) copyFileSync(file, join(dirname(opts.outFile), name));
  return { wasm: [...wasm.keys()] };
}
