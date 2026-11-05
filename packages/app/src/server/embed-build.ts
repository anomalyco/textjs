/**
 * @experimental `text build --embed`: the app as one script tag for other sites.
 *
 * - `embed.js`: the route's prerendered first frame and the console intent
 *   trigger, with every other URL relative to its own (`import.meta.url`), so
 *   the same files work from a subfolder, a CDN or another origin.
 * - `assets/embed-[hash].js`: the same script under an immutable URL.
 * - Loaded on console intent: `assets/embed-client-[hash].js` and
 *   `assets/yoga-[hash].wasm` (fetched together), or for a server-rendered
 *   route `assets/embed-player-[hash].js`, streaming from `__textjs/live`.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { build, type InlineConfig, type Plugin, type Rollup } from "vite";
import type { TextConfig } from "../config";
import { textjsVitePlugin } from "../vite-plugin";
import { buildLiveBundle, PRERENDER_TIMEOUT_MS, prerenderInChild } from "./live-build";
import { textjsLivePlugin } from "./live-dev";
import { createRuntimeMatcher } from "./live-routes";
import { compileShellCalls, createShellReplayCode } from "./ppr";
import type { AppScan } from "./scan";
import { withFrameworkEntry } from "./vite-entry";
import { loadMiddlewareConfig } from "./adapters/build-step";
import { createEmbedEntry, EMBED_FILE, GUARDED_SHELL, middlewareCouldGuard, textjsEmbedPlugin, VIRTUAL_EMBED_CLIENT, VIRTUAL_EMBED_PLAYER, type EmbedSettings } from "./embed";
import { LIVE_PATH } from "../live-protocol";

export interface EmbedBuildOptions {
  root: string;
  config: TextConfig;
  outDir: string;
  scan: AppScan;
  settings: EmbedSettings;
  prerenderTimeoutMs?: number;
  /**
   * This build already wrote `.text/server/live.mjs` (`buildLiveRoutes` ran).
   * Otherwise it's built here: a copy left in the output by an earlier build
   * (`emptyOutDir: false`) would render the old page.
   */
  liveBundleBuilt?: boolean;
}

export interface Size {
  bytes: number;
  gzip: number;
}

export interface EmbedBuildResult {
  runtime: "client" | "server";
  /** `embed.js`. */
  entry: Size;
  /** `assets/embed-[hash].js`. */
  hashedEntry: string;
  /** What loads on console intent: the runtime's scripts, plus Yoga's `.wasm` for a client runtime. */
  lazy: Size;
  /** Output-relative files loaded on console intent. */
  lazyFiles: string[];
  /** Whether `embed.js` carries a prerendered first frame. */
  shell: boolean;
  /** Why it doesn't, when the prerender failed. */
  shellError?: string;
}

const size = (buf: Uint8Array): Size => ({ bytes: buf.length, gzip: gzipSync(buf).length });

type EsbuildBuild = (options: Record<string, unknown>) => Promise<{ outputFiles: Array<{ contents: Uint8Array }> }>;
let esbuildBuild: EsbuildBuild | null = null;

/** esbuild's `build` (a dependency of Vite, which Text.js depends on). */
function esbuild(): EsbuildBuild {
  if (esbuildBuild === null) {
    const require = createRequire(import.meta.url);
    const fromVite = createRequire(require.resolve("vite/package.json"));
    esbuildBuild = (fromVite("esbuild") as { build: EsbuildBuild }).build;
  }
  return esbuildBuild;
}

/** Bundle and minify the `embed.js` source; `external` are the runtime files it imports lazily. */
async function bundleEntry(root: string, code: string, external: string[]): Promise<Uint8Array> {
  const result = await esbuild()({
    stdin: { contents: code, loader: "js", resolveDir: root, sourcefile: EMBED_FILE },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    charset: "utf8",
    legalComments: "none",
    external,
    define: { "process.env.NODE_ENV": '"production"' },
  });
  return result.outputFiles[0]!.contents;
}

/** Pin the entry, `base: "./"` (URLs relative to each chunk) and the entry's exports, after every other plugin's `config`. */
function entryPlugin(input: Rollup.InputOption): Plugin {
  return {
    name: "@textjs/app:embed-entry",
    config: {
      order: "post",
      handler: () => ({ base: "./", build: { rollupOptions: { input, preserveEntrySignatures: "exports-only" } } }),
    },
  };
}

async function buildRuntime(o: EmbedBuildOptions, runtime: "client" | "server"): Promise<{ entry: string; wasm?: string; files: string[] }> {
  const client = runtime === "client";
  const name = client ? "embed-client" : "embed-player";
  const input = { [name]: client ? VIRTUAL_EMBED_CLIENT : VIRTUAL_EMBED_PLAYER };
  const inline: InlineConfig = {
    configFile: false,
    root: o.root,
    mode: "production",
    logLevel: "error",
    clearScreen: false,
    publicDir: false,
    build: {
      outDir: o.outDir,
      emptyOutDir: false,
      target: "es2022",
      modulePreload: false,
      rollupOptions: { output: { entryFileNames: `assets/${name}-[hash].js`, chunkFileNames: "assets/[name]-[hash].js", assetFileNames: "assets/[name]-[hash][extname]", format: "es" } },
    },
    // The player needs no React and no route modules.
    plugins: [...(client ? textjsVitePlugin({ ...o.config, root: o.root }) : textjsLivePlugin({ appDir: o.config.appDir, root: o.root })), textjsEmbedPlugin({ config: o.config }), entryPlugin(input)],
  };
  const out = (await build(withFrameworkEntry(inline, o.config.vite, { input }))) as Rollup.RollupOutput | Rollup.RollupOutput[];
  const files = (Array.isArray(out) ? out : [out]).flatMap((r) => r.output);
  const entry = files.find((f): f is Rollup.OutputChunk => f.type === "chunk" && f.isEntry);
  if (!entry) throw new Error("▼ Text.js: the embed runtime build produced no entry chunk.");
  const wasm = files.find((f) => f.type === "asset" && f.originalFileNames.some((n) => /(^|\/)yoga\.wasm$/.test(n)));
  // Eager imports only: route chunks other pages load later don't count toward what intent downloads.
  const eager = new Set<string>();
  const walk = (file: string): void => {
    if (eager.has(file)) return;
    eager.add(file);
    const chunk = files.find((f): f is Rollup.OutputChunk => f.type === "chunk" && f.fileName === file);
    for (const dep of chunk?.imports ?? []) walk(dep);
  };
  walk(entry.fileName);
  return { entry: entry.fileName, wasm: wasm?.fileName, files: [...eager, ...(wasm ? [wasm.fileName] : [])] };
}

/** Run after the client build (or instead of it) and `buildLiveRoutes`. */
export async function buildEmbed(o: EmbedBuildOptions): Promise<EmbedBuildResult> {
  const { config, outDir, settings } = o;
  const pathname = settings.initialPath.split(/[?#]/)[0] as string;
  const runtime = createRuntimeMatcher(o.scan)(pathname);

  let shell: string | null = null;
  let shellError: string | undefined;
  // A middleware config that can't be read counts as matching every route.
  const middleware = config.ppr !== false ? await loadMiddlewareConfig(o.root, config, outDir).catch(() => ({})) : null;
  if (config.ppr !== false && middlewareCouldGuard(middleware, settings.initialPath)) shellError = GUARDED_SHELL;
  else if (config.ppr !== false) {
    const live = join(outDir, ".text", "server", "live.mjs");
    if (o.liveBundleBuilt !== true) await buildLiveBundle({ root: o.root, config, outDir, plugins: textjsVitePlugin({ ...config, root: o.root }) });
    const vp = config.viewport ?? {};
    const out = await prerenderInChild(live, {
      paths: [settings.initialPath],
      cols: vp.width ?? 120,
      rows: vp.height ?? 36,
      theme: vp.theme,
      initialClear: settings.initialClear,
      timeoutMs: o.prerenderTimeoutMs ?? PRERENDER_TIMEOUT_MS,
    });
    const result = out.routes[settings.initialPath];
    if (result?.calls) shell = createShellReplayCode(compileShellCalls(result.calls));
    else shellError = out.importError ?? result?.error ?? "prerendering did not finish";
  }

  const built = await buildRuntime(o, runtime);
  const entryFor = async (prefix: string): Promise<Uint8Array> => {
    const rel = (file: string): string => `${prefix}${file.slice("assets/".length)}`;
    const runtimeUrl = rel(built.entry);
    const code = createEmbedEntry({
      shell,
      runtime: runtimeUrl,
      ...(runtime === "client" && built.wasm ? { wasm: rel(built.wasm) } : {}),
      ...(runtime === "server" ? { endpoint: `${prefix === "./" ? "../" : "./"}${LIVE_PATH.slice(1)}` } : {}),
    });
    return bundleEntry(o.root, code, [runtimeUrl]);
  };
  // embed.js sits above assets/, its immutable copy inside it.
  const top = await entryFor("./assets/");
  const copy = await entryFor("./");
  const hashed = `assets/embed-${createHash("sha256").update(copy).digest("base64url").slice(0, 8)}.js`;
  mkdirSync(join(outDir, "assets"), { recursive: true });
  writeFileSync(join(outDir, EMBED_FILE), top);
  writeFileSync(join(outDir, hashed), copy);

  const lazy = { bytes: 0, gzip: 0 };
  for (const f of built.files) {
    const s = size(readFileSync(join(outDir, f)));
    lazy.bytes += s.bytes;
    lazy.gzip += s.gzip;
  }
  return { runtime, entry: size(top), hashedEntry: hashed, lazy, lazyFiles: built.files, shell: shell !== null, ...(shellError ? { shellError } : {}) };
}
