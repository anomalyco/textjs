/**
 * `text build` step for server-rendered routes and Partial Prerendering:
 *
 * 1. `.text/server/live.mjs` — the SSR bundle (every route, the App Router and
 *    the console renderer) that renders live sessions in `text start` and
 *    the static shells below.
 * 2. `assets/player-[hash].js` — the frame player, when any page is
 *    `export const runtime = "server"`.
 * 3. Static shells: each static route's first frame inlined into its HTML
 *    (`index.html`, `<route>/index.html`; server routes under `.text/pages/`).
 * 4. `.text/live-manifest.json` — what `text start` needs to serve them.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { build, type InlineConfig, type Rollup } from "vite";
import { withFrameworkEntry } from "./vite-entry";
import { normalizeBasePath, resolveAnsiSize, type TextConfig } from "../config";
import type { AnsiFrame, ShellCall } from "./live-app";
import { textjsLivePlugin } from "./live-dev";
import { createLiveHtml, listServerPages, VIRTUAL_LIVE, VIRTUAL_PLAYER } from "./live-routes";
import { injectShell, shellPath, shellScript } from "./ppr";
import { LIVE_MANIFEST, type LiveManifest } from "./live-manifest";
import { listPages, type AppScan } from "./scan";

export { LIVE_MANIFEST, type LiveManifest } from "./live-manifest";

/** How long one route may take to prerender before it streams without a shell. */
export const PRERENDER_TIMEOUT_MS = 10_000;

/** One route's prerender: its PPR shell (`calls` or `error`) and its ANSI frame (`ansi` or `ansiError`). */
export interface PrerenderResult {
  calls?: ShellCall[];
  error?: string;
  /** `null` when the page opts out (`export const ansi = false`). */
  ansi?: AnsiFrame | null;
  ansiError?: string;
}

export interface PrerenderJob {
  /** Routes that get a PPR shell, at `cols × rows`. */
  paths: string[];
  cols: number;
  rows: number;
  theme?: string;
  /** Whether each shell clears the console first (default `true`). */
  initialClear?: boolean;
  timeoutMs: number;
  /** Routes that get an ANSI frame, at the app's ANSI size. */
  ansi?: { cols: number; rows: number; paths: string[] } | null;
}

export interface PrerenderOutput {
  /** Why `live.mjs` couldn't be imported (then no route has a result), or `null`. */
  importError: string | null;
  routes: Record<string, PrerenderResult>;
}

const RESULT_MARK = "\u0000textjs-prerender:";

/**
 * Prerender shells and ANSI frames in a disposable child process: route
 * modules' top-level side effects (timers, sockets, a patched `fetch`) can't
 * hang or leak into the build, and each route gets `timeoutMs`. The child
 * exits once its results are written.
 */
export async function prerenderInChild(liveBundle: string, job: PrerenderJob): Promise<PrerenderOutput> {
  const ansiPaths = job.ansi?.paths ?? [];
  if (job.paths.length === 0 && !job.ansi) return { importError: null, routes: {} };
  const runner = join(dirname(liveBundle), `prerender-${process.pid}-${Date.now()}.mjs`);
  writeFileSync(
    runner,
    `const job = JSON.parse(process.argv[3]);
const out = { importError: null, routes: {} };
const message = (error) => error instanceof Error ? error.message : String(error);
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("timed out after " + ms + "ms")), ms).unref?.());
let entry = null;
try {
  entry = await Promise.race([import(process.argv[2]), timeout(job.timeoutMs)]);
} catch (error) {
  out.importError = message(error);
}
if (entry) {
  for (const path of job.paths) {
    const r = (out.routes[path] ??= {});
    try {
      r.calls = await Promise.race([entry.prerenderShell({ routes: entry.routes, path, cols: job.cols, rows: job.rows, theme: job.theme, initialClear: job.initialClear }), timeout(job.timeoutMs)]);
    } catch (error) {
      r.error = message(error);
    }
  }
  for (const path of job.ansi ? job.ansi.paths : []) {
    const r = (out.routes[path] ??= {});
    try {
      r.ansi = await Promise.race([entry.prerenderAnsi({ routes: entry.routes, path, cols: job.ansi.cols, rows: job.ansi.rows, theme: job.theme }), timeout(job.timeoutMs)]);
    } catch (error) {
      r.ansiError = message(error);
    }
  }
}
process.stdout.write(${JSON.stringify(RESULT_MARK)} + JSON.stringify(out) + "\\n", () => process.exit(0));
`,
  );
  try {
    const budget = job.timeoutMs * (job.paths.length + ansiPaths.length + 1) + 30_000;
    const output = await new Promise<string>((resolveRun) => {
      const child = spawn(process.execPath, [runner, pathToFileURL(liveBundle).href, JSON.stringify(job)], { stdio: ["ignore", "pipe", "inherit"], env: process.env });
      let stdout = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      const timer = setTimeout(() => child.kill("SIGKILL"), budget);
      child.on("close", () => {
        clearTimeout(timer);
        resolveRun(stdout);
      });
      child.on("error", () => {
        clearTimeout(timer);
        resolveRun(stdout);
      });
    });
    const line = output.split("\n").find((l) => l.startsWith(RESULT_MARK));
    // Killed or crashed without saying why: treat it like a failed import, so terminals get HTML rather than renders that may crash the server too.
    if (line === undefined) return { importError: "the prerender process exited without results", routes: {} };
    return JSON.parse(line.slice(RESULT_MARK.length)) as PrerenderOutput;
  } finally {
    rmSync(runner, { force: true });
  }
}

export interface LiveBuildOptions {
  root: string;
  config: TextConfig;
  outDir: string;
  scan: AppScan;
  /** Build plugins (the caller passes `textjsVitePlugin(config)`). */
  plugins: InlineConfig["plugins"];
  /** Per-route prerender budget (default {@link PRERENDER_TIMEOUT_MS}). */
  prerenderTimeoutMs?: number;
  /** Render ANSI frames for terminal clients (default: unless `ansi: false`; the static adapter can't serve them). */
  ansi?: boolean;
  /**
   * Write the app's own documents: page shells and the frame player page for
   * server routes (default `true`). An embed-only build has none.
   */
  documents?: boolean;
}

export interface LiveBuildResult {
  manifest: LiveManifest;
  shells: number;
  staticRoutes: number;
  /** Routes whose shell could not be prerendered, with the reason. */
  skipped: Array<{ pattern: string; reason: string }>;
  player: { bytes: number; gzip: number } | null;
  /** ANSI frames for terminal clients, when on. */
  ansi: { frames: number; routes: number; skipped: Array<{ pattern: string; reason: string }> } | null;
}

const META = ".text";

/** Output-relative and `/`-separated: the manifest is read wherever `dist/` is deployed, Windows builds included. */
function htmlFileFor(pattern: string, server: boolean): string {
  const dir = pattern === "/" ? "" : pattern.slice(1);
  if (server) return posix.join(META, "pages", dir, "index.html");
  return dir ? posix.join(dir, "index.html") : "index.html";
}

/** `.text/server/live.mjs`, the SSR bundle. Returns its directory. */
export async function buildLiveBundle(o: Pick<LiveBuildOptions, "root" | "config" | "outDir" | "plugins">): Promise<string> {
  const serverDir = join(o.outDir, META, "server");
  await build(
    withFrameworkEntry(
      {
        configFile: false,
        root: o.root,
        mode: "production",
        logLevel: "error",
        clearScreen: false,
        build: { outDir: serverDir, emptyOutDir: false, target: "node18", rollupOptions: { output: { entryFileNames: "live.mjs", format: "es" } } },
        ssr: { noExternal: [/^@textjs\//] },
        plugins: o.plugins,
      },
      o.config.vite,
      { input: VIRTUAL_LIVE, ssr: true },
    ),
  );
  return serverDir;
}

/** Run after the client build. Returns `null` when there is nothing to do. */
export async function buildLiveRoutes(o: LiveBuildOptions): Promise<LiveBuildResult | null> {
  const { config, outDir, scan } = o;
  const basePath = normalizeBasePath(config.basePath);
  const serverPages = listServerPages(scan);
  const serverSet = new Set(serverPages.map((p) => p.pattern));
  const pages = listPages(scan);
  const documents = o.documents !== false;
  const ppr = config.ppr !== false;
  // Without documents there are no pages to put shells in, and nothing for curl either.
  const staticPages = ppr && documents ? pages.filter((p) => !p.dynamic) : [];
  const ansiSize = o.ansi === false || !documents ? null : resolveAnsiSize(config);
  const ansiPages = ansiSize ? pages.filter((p) => !p.dynamic) : [];
  if (serverPages.length === 0 && staticPages.length === 0 && !(ansiSize && pages.length > 0)) return null;

  const serverDir = await buildLiveBundle(o);

  let player: LiveBuildResult["player"] = null;
  let playerUrl: string | null = null;
  if (serverPages.length > 0 && documents) {
    const out = (await build(
      withFrameworkEntry(
        {
          configFile: false,
          root: o.root,
          base: basePath ? `${basePath}/` : "/",
          mode: "production",
          logLevel: "error",
          clearScreen: false,
          publicDir: false,
          build: { outDir, emptyOutDir: false, target: "es2022", modulePreload: false, rollupOptions: { output: { entryFileNames: "assets/player-[hash].js", format: "es" } } },
          // The player imports only @textjs/core: no React, no route modules.
          plugins: textjsLivePlugin({ appDir: config.appDir, root: o.root }),
        },
        config.vite,
        { input: { player: VIRTUAL_PLAYER } },
      ),
    )) as Rollup.RollupOutput | Rollup.RollupOutput[];
    const outputs = Array.isArray(out) ? out : [out];
    const chunk = outputs.flatMap((r) => r.output).find((c): c is Rollup.OutputChunk => c.type === "chunk" && c.isEntry);
    if (chunk) {
      const code = readFileSync(join(outDir, chunk.fileName));
      player = { bytes: code.length, gzip: gzipSync(code).length };
      playerUrl = `${basePath}/${chunk.fileName}`;
    }
  }

  const title = config.title ?? "\u25BC Text.js";
  const manifest: LiveManifest = {
    version: 1,
    basePath,
    title,
    viewport: config.viewport ?? {},
    player: playerUrl,
    serverRoutes: serverPages.map((p) => p.pattern),
    pages: {},
    liveHtml: null,
    ...(config.live ? { live: config.live } : {}),
    ...(config.focusHint === false ? { focusHint: false } : {}),
  };
  const write = (rel: string, html: string): void => {
    const file = join(outDir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
  };
  const liveDoc = (shell?: string): string => createLiveHtml({ title, basePath, viewport: config.viewport, playerSrc: playerUrl ?? "", shell });
  if (playerUrl) {
    manifest.liveHtml = posix.join(META, "live.html");
    write(manifest.liveHtml, liveDoc());
  }

  const skipped: LiveBuildResult["skipped"] = [];
  let shells = 0;
  const indexFile = join(outDir, "index.html");
  const template = existsSync(indexFile) ? readFileSync(indexFile, "utf8") : null;
  const vp = config.viewport ?? {};
  const wanted = staticPages.filter((p) => serverSet.has(p.pattern) || template !== null);
  const prerendered =
    wanted.length > 0 || ansiSize
      ? await prerenderInChild(join(serverDir, "live.mjs"), {
          paths: wanted.map((p) => p.pattern),
          cols: vp.width ?? 120,
          rows: vp.height ?? 36,
          theme: vp.theme,
          timeoutMs: o.prerenderTimeoutMs ?? PRERENDER_TIMEOUT_MS,
          ansi: ansiSize ? { ...ansiSize, paths: ansiPages.map((p) => p.pattern) } : null,
        })
      : { importError: null, routes: {} };
  const failed = (path: string): string => prerendered.importError ?? (prerendered.routes[path] ? "" : "prerendering did not finish");
  for (const page of wanted) {
    const server = serverSet.has(page.pattern);
    try {
      const result = prerendered.routes[page.pattern];
      if (!result || result.error !== undefined || !result.calls) throw new Error(result?.error ?? failed(page.pattern));
      const script = shellScript(result.calls, shellPath(basePath, page.pattern));
      const rel = htmlFileFor(page.pattern, server);
      write(rel, server ? liveDoc(script) : injectShell(template as string, script));
      manifest.pages[page.pattern] = rel;
      shells++;
    } catch (error) {
      skipped.push({ pattern: page.pattern, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  let ansi: LiveBuildResult["ansi"] = null;
  if (ansiSize) {
    ansi = { frames: 0, routes: ansiPages.length, skipped: [] };
    const frames: Record<string, string> = {};
    for (const page of ansiPages) {
      const result = prerendered.routes[page.pattern];
      // Opted out (`export const ansi = false`): the page serves HTML to terminals too.
      if (result?.ansi === null) continue;
      if (!result?.ansi || result.ansi.status !== 200) {
        ansi.skipped.push({ pattern: page.pattern, reason: result?.ansiError ?? (result?.ansi ? "the page called notFound()" : failed(page.pattern)) });
        continue;
      }
      // A file at the same path (`public/about`) is served as is.
      const file = join(outDir, ...page.pattern.split("/").filter(Boolean));
      if (page.pattern !== "/" && existsSync(file) && statSync(file).isFile()) continue;
      const rel = posix.join(META, "ansi", page.pattern === "/" ? "" : page.pattern.slice(1), "index.txt");
      write(rel, result.ansi.ansi);
      frames[page.pattern] = rel;
      ansi.frames++;
    }
    manifest.ansi = { ...ansiSize, frames, onRequest: prerendered.importError === null };
  }
  write(join(META, LIVE_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, shells, staticRoutes: staticPages.length, skipped, player, ansi };
}

/** Bytes of every client `.js` and `.wasm` asset except the frame player (for size comparisons). */
export function clientBundleBytes(outDir: string): { bytes: number; gzip: number } {
  let bytes = 0;
  let gzip = 0;
  const dir = join(outDir, "assets");
  if (!existsSync(dir)) return { bytes, gzip };
  for (const name of readdirSync(dir)) {
    if (!/\.(js|wasm)$/.test(name) || name.startsWith("player-")) continue;
    const buf = readFileSync(join(dir, name));
    bytes += buf.length;
    gzip += gzipSync(buf).length;
  }
  return { bytes, gzip };
}
