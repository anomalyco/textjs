/**
 * Bundle generated server entries (adapter servers, edge middleware,
 * `text start` runtime) into single self-contained ES modules with Vite.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { builtinModules } from "node:module";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, mergeConfig, type InlineConfig, type Plugin } from "vite";
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
    if (pkg.name === "@textjs/next" && existsSync(join(dir, "src", rel))) return toPosix(join(dir, "src", rel));
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

const ENTRY = "virtual:textjs/server-entry";

export async function bundleServerEntry(opts: BundleOptions): Promise<void> {
  const worker = opts.target === "webworker" || opts.target === "edge";
  const entryPlugin: Plugin = {
    name: "textjs:server-entry",
    enforce: "pre",
    resolveId(id) {
      return id.endsWith(ENTRY) ? `\0${ENTRY}` : null;
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
  const inline: InlineConfig = {
    configFile: false,
    root: opts.root,
    mode: "production",
    logLevel: "warn",
    clearScreen: false,
    publicDir: false,
    define: worker ? { "process.env.NODE_ENV": JSON.stringify("production") } : undefined,
    resolve: worker ? { conditions: ["workerd", "worker", "edge-light", "browser", "import", "module", "default"] } : undefined,
    ssr: {
      target: worker ? "webworker" : "node",
      noExternal: true,
      ...(worker ? { resolve: { conditions: ["workerd", "worker", "edge-light", "import", "module", "default"], externalConditions: ["workerd", "worker"] } } : {}),
    },
    build: {
      ssr: ENTRY,
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
    plugins: [entryPlugin, builtins],
  };
  await build(opts.config.vite ? mergeConfig(inline, opts.config.vite) : inline);
}
