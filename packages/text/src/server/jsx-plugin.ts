/**
 * A Bun runtime plugin that compiles JSX against the server JSX runtime
 * (`@textjs/next/server/jsx-runtime`), so `async function` components render
 * on the console reconciler when route modules are imported directly from
 * disk: `text run`, `text mcp`, scripts and tests. Vite-based hosts (`text dev`,
 * `text build`) do the same with the `@textjs/next:server-jsx` Vite plugin.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const INSTALLED = Symbol.for("textjs.serverJsxPlugin");
const SHIM_FILE = /[\\/]server[\\/]jsx-(dev-)?runtime\.[cm]?[jt]sx?$/;

/** Absolute path of `server/jsx-runtime` / `server/jsx-dev-runtime` (sources or a built `dist/`). */
export function serverJsxRuntimeFile(kind: "jsx-runtime" | "jsx-dev-runtime"): string {
  const here = dirname(realpathSync(fileURLToPath(import.meta.url)));
  for (const ext of [".ts", ".js"]) {
    const sibling = join(here, `${kind}${ext}`);
    if (existsSync(sibling)) return sibling;
  }
  // Bundled into dist/bin: find the package.
  for (let dir = here; dirname(dir) !== dir; dir = dirname(dir)) {
    const pkg = join(dir, "package.json");
    if (!existsSync(pkg)) continue;
    if ((JSON.parse(readFileSync(pkg, "utf8")) as { name?: string }).name !== "@textjs/next") continue;
    for (const rel of [`src/server/${kind}.ts`, `dist/server/${kind}.js`]) if (existsSync(join(dir, rel))) return join(dir, rel);
  }
  throw new Error(`▼ Text.js: could not locate the server ${kind}.`);
}

interface BunPluginBuilder {
  onLoad(options: { filter: RegExp }, callback: (args: { path: string }) => Promise<{ contents: string; loader: string }> | { contents: string; loader: string }): void;
}
interface BunGlobal {
  plugin(plugin: { name: string; setup(build: BunPluginBuilder): void }): void;
  file(path: string): { text(): Promise<string> };
}

const JSX_FILE = /\.[cm]?[jt]sx$/;

/**
 * Install the plugin (Bun only; idempotent): JSX files outside `node_modules`
 * compile with `jsxImportSource` pointing at the server runtime. Returns
 * `false` on other runtimes, where route modules should go through Vite.
 */
export function installServerJsxPlugin(): boolean {
  const bun = (globalThis as { Bun?: BunGlobal }).Bun;
  if (!bun) return false;
  const g = globalThis as Record<symbol, boolean | undefined>;
  if (g[INSTALLED]) return true;
  // `<dir>/jsx-runtime` and `<dir>/jsx-dev-runtime`, by absolute path (no package resolution needed).
  const source = dirname(serverJsxRuntimeFile("jsx-runtime"));
  const pragma = `/** @jsxImportSource ${source} */ `;
  bun.plugin({
    name: "textjs:server-jsx",
    setup(build) {
      build.onLoad({ filter: JSX_FILE }, async (args) => {
        const code = await bun.file(args.path).text();
        const loader = /\.[cm]?tsx$/.test(args.path) ? "tsx" : "jsx";
        // Same line, so line numbers in stack traces don't move.
        if (args.path.includes("/node_modules/") || args.path.includes("\\node_modules\\") || SHIM_FILE.test(args.path) || code.includes("@jsxImportSource")) return { contents: code, loader };
        return { contents: pragma + code, loader };
      });
    },
  });
  g[INSTALLED] = true;
  return true;
}
