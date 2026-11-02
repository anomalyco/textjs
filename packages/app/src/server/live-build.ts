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
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { build, type InlineConfig, type Rollup } from "vite";
import { withFrameworkEntry } from "./vite-entry";
import { normalizeBasePath, type TextConfig } from "../config";
import type { ShellCall } from "./live-app";
import { textjsLivePlugin } from "./live-dev";
import { createLiveHtml, listServerPages, VIRTUAL_LIVE, VIRTUAL_PLAYER } from "./live-routes";
import { injectShell, shellPath, shellScript } from "./ppr";
import { LIVE_MANIFEST, type LiveManifest } from "./live-manifest";
import { listPages, type AppScan } from "./scan";

export { LIVE_MANIFEST, type LiveManifest } from "./live-manifest";

/** How long one route may take to prerender before it streams without a shell. */
export const PRERENDER_TIMEOUT_MS = 10_000;

type PrerenderResult = { calls: ShellCall[] } | { error: string };

const RESULT_MARK = "\u0000textjs-prerender:";

/**
 * Prerender shells in a disposable child process: route modules' top-level
 * side effects (timers, sockets, a patched `fetch`) can't hang or leak into the
 * build, and each route gets `timeoutMs`. The child exits once its results are
 * written.
 */
export async function prerenderInChild(
  liveBundle: string,
  job: { paths: string[]; cols: number; rows: number; theme?: string; timeoutMs: number },
): Promise<Record<string, PrerenderResult>> {
  if (job.paths.length === 0) return {};
  const runner = join(dirname(liveBundle), `prerender-${process.pid}-${Date.now()}.mjs`);
  writeFileSync(
    runner,
    `const job = JSON.parse(process.argv[3]);
const out = {};
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("timed out after " + ms + "ms")), ms).unref?.());
try {
  const entry = await Promise.race([import(process.argv[2]), timeout(job.timeoutMs)]);
  for (const path of job.paths) {
    try {
      const calls = await Promise.race([entry.prerenderShell({ routes: entry.routes, path, cols: job.cols, rows: job.rows, theme: job.theme }), timeout(job.timeoutMs)]);
      out[path] = { calls };
    } catch (error) {
      out[path] = { error: error instanceof Error ? error.message : String(error) };
    }
  }
} catch (error) {
  for (const path of job.paths) out[path] ??= { error: error instanceof Error ? error.message : String(error) };
}
process.stdout.write(${JSON.stringify(RESULT_MARK)} + JSON.stringify(out) + "\\n", () => process.exit(0));
`,
  );
  try {
    const budget = job.timeoutMs * job.paths.length + 30_000;
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
    if (line === undefined) return Object.fromEntries(job.paths.map((p) => [p, { error: "the prerender process exited without results" }]));
    return JSON.parse(line.slice(RESULT_MARK.length)) as Record<string, PrerenderResult>;
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
}

export interface LiveBuildResult {
  manifest: LiveManifest;
  shells: number;
  staticRoutes: number;
  /** Routes whose shell could not be prerendered, with the reason. */
  skipped: Array<{ pattern: string; reason: string }>;
  player: { bytes: number; gzip: number } | null;
}

const META = ".text";

/** Output-relative and `/`-separated: the manifest is read wherever `dist/` is deployed, Windows builds included. */
function htmlFileFor(pattern: string, server: boolean): string {
  const dir = pattern === "/" ? "" : pattern.slice(1);
  if (server) return posix.join(META, "pages", dir, "index.html");
  return dir ? posix.join(dir, "index.html") : "index.html";
}

/** Run after the client build. Returns `null` when there is nothing to do. */
export async function buildLiveRoutes(o: LiveBuildOptions): Promise<LiveBuildResult | null> {
  const { config, outDir, scan } = o;
  const basePath = normalizeBasePath(config.basePath);
  const serverPages = listServerPages(scan);
  const serverSet = new Set(serverPages.map((p) => p.pattern));
  const pages = listPages(scan);
  const ppr = config.ppr !== false;
  const staticPages = ppr ? pages.filter((p) => !p.dynamic) : [];
  if (serverPages.length === 0 && staticPages.length === 0) return null;

  const serverDir = join(outDir, META, "server");
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
      config.vite,
      { input: VIRTUAL_LIVE, ssr: true },
    ),
  );

  let player: LiveBuildResult["player"] = null;
  let playerUrl: string | null = null;
  if (serverPages.length > 0) {
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
  if (staticPages.length > 0) {
    const indexFile = join(outDir, "index.html");
    const template = existsSync(indexFile) ? readFileSync(indexFile, "utf8") : null;
    const vp = config.viewport ?? {};
    const wanted = staticPages.filter((p) => serverSet.has(p.pattern) || template !== null);
    const results = await prerenderInChild(join(serverDir, "live.mjs"), {
      paths: wanted.map((p) => p.pattern),
      cols: vp.width ?? 120,
      rows: vp.height ?? 36,
      theme: vp.theme,
      timeoutMs: o.prerenderTimeoutMs ?? PRERENDER_TIMEOUT_MS,
    });
    for (const page of wanted) {
      const server = serverSet.has(page.pattern);
      try {
        const result = results[page.pattern] ?? { error: "prerendering did not finish" };
        if ("error" in result) throw new Error(result.error);
        const script = shellScript(result.calls, shellPath(basePath, page.pattern));
        const rel = htmlFileFor(page.pattern, server);
        write(rel, server ? liveDoc(script) : injectShell(template as string, script));
        manifest.pages[page.pattern] = rel;
        shells++;
      } catch (error) {
        skipped.push({ pattern: page.pattern, reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  write(join(META, LIVE_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, shells, staticRoutes: staticPages.length, skipped, player };
}

/** Bytes of every client `.js` asset except the frame player (for size comparisons). */
export function clientBundleBytes(outDir: string): { bytes: number; gzip: number } {
  let bytes = 0;
  let gzip = 0;
  const dir = join(outDir, "assets");
  if (!existsSync(dir)) return { bytes, gzip };
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".js") || name.startsWith("player-")) continue;
    const buf = readFileSync(join(dir, name));
    bytes += buf.length;
    gzip += gzipSync(buf).length;
  }
  return { bytes, gzip };
}
