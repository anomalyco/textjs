/**
 * Async Server Components for app files Bun imports in-process (`text mcp`,
 * `text run`). `text dev` / `text build` alias `react/jsx-runtime` for project
 * files to `@textjs/app/server/jsx-runtime` in Vite; here a Bun runtime
 * plugin does the same by adding a `@jsxImportSource` pragma to every
 * `.tsx` / `.jsx` file under the project root (dependencies are untouched).
 */

import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { resolveRoot } from "./paths";

/** Bun appends `/jsx-runtime` or `/jsx-dev-runtime` (see the package `exports`). */
export const SERVER_JSX_IMPORT_SOURCE = "@textjs/app/server";

interface BunPluginBuilder {
  onLoad(options: { filter: RegExp }, callback: (args: { path: string }) => { contents: string; loader: "tsx" | "jsx" }): void;
}
interface BunRuntime {
  plugin(options: { name: string; target?: "bun"; setup(build: BunPluginBuilder): void }): void;
}

const installed = new Set<string>();

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


/** The source as Bun should compile it: JSX through the server runtime, line numbers unchanged. */
export function withServerJsxPragma(source: string): string {
  return `/** @jsxImportSource ${SERVER_JSX_IMPORT_SOURCE} */ ${source}`;
}

/**
 * Compile JSX in project files under `root` against the server JSX runtime,
 * so `async function` components suspend instead of failing on the console
 * reconciler. Idempotent per root; returns `false` outside Bun.
 */
export function installServerJsxRuntime(root: string): boolean {
  const bun = (globalThis as { Bun?: BunRuntime }).Bun;
  if (!bun?.plugin) return false;
  const dirs = [...new Set([resolve(root), resolveRoot(root)])].map((d) => (d.endsWith(sep) ? d : d + sep)).filter((d) => !installed.has(d));
  if (dirs.length === 0) return true;
  for (const d of dirs) installed.add(d);
  const nm = escapeRegExp(`${sep}node_modules${sep}`);
  // Windows paths compare case-insensitively (`c:\app` and `C:\App` are one directory).
  const filter = new RegExp(`^(?:${dirs.map(escapeRegExp).join("|")})(?!.*${nm}).*\\.[jt]sx$`, process.platform === "win32" ? "i" : "");
  bun.plugin({
    name: `textjs-server-jsx:${dirs[0]}`,
    target: "bun",
    setup(build) {
      build.onLoad({ filter }, (args) => ({
        contents: withServerJsxPragma(readFileSync(args.path, "utf8")),
        loader: args.path.endsWith(".jsx") ? "jsx" : "tsx",
      }));
    },
  });
  return true;
}
