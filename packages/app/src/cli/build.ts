import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { build, mergeConfig, type InlineConfig } from "vite";
import { ENGINE_NAME, VERSION } from "@textjs/core";
import { normalizeBasePath } from "../config";
import { listApiRoutes, listPages, scanApp } from "../server/scan";
import { buildLiveRoutes } from "../server/live-build";
import { listServerPages } from "../server/live-routes";
import { textjsVitePlugin, VIRTUAL_API } from "../vite-plugin";
import { withFrameworkEntry } from "../server/vite-entry";
import { buildServerRuntime, resolveAdapter, runBuildAdapter, serverFiles } from "../server/adapters/build-step";
import type { AdapterResult } from "../server/adapters/shared";
import { resolveEmbedSettings, withEmbed } from "../server/embed";
import { buildEmbed, type EmbedBuildResult } from "../server/embed-build";
import { loadTextConfig } from "./config";
import { brand, color, fail, formatBytes, LEGEND, ok, routeTable, SERVER_LEGEND, summarize, type SummaryRoute } from "./ui";
import { resolveRoot } from "../server/paths";

export interface BuildOptions {
  root: string;
  /** Deploy adapter (`--adapter`); defaults to `TEXTJS_ADAPTER`, or Vercel / Cloudflare Pages when building there. */
  adapter?: string;
  /** Print the summary (default `true`). */
  log?: boolean;
  /** @experimental `--embed`: build `embed.js`, as `embed` in `text.config.ts` does. */
  embed?: boolean;
}

export interface BuildManifest {
  version: string;
  engine: string;
  basePath: string;
  routes: Array<{ pattern: string; type: "static" | "dynamic"; file?: string }>;
  api: Array<{ pattern: string }>;
  firstLoad: { bytes: number; gzip: number };
}

export interface BuildResult {
  outDir: string;
  routes: SummaryRoute[];
  manifest: BuildManifest;
  output: string;
  durationMs: number;
  /** Deploy output written by `--adapter`. */
  adapter?: AdapterResult;
  /** @experimental `embed.js`, when the app is an embed. */
  embed?: EmbedBuildResult;
}

const errorText = (error: unknown): string => (error instanceof Error ? (error.stack ?? error.message) : String(error));

/** `.text/` inside the output directory holds build metadata and the API server bundle. */
export const META_DIR = ".text";

function fileSize(file: string): { bytes: number; gzip: number } {
  const buf = readFileSync(file);
  return { bytes: buf.length, gzip: gzipSync(buf).length };
}

/** Client scripts and the WebAssembly they load (Yoga's `yoga-[hash].wasm`). */
function clientFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (name === META_DIR) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".js") || name.endsWith(".wasm")) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/**
 * Empty the output directory once, before anything is written, as Vite's
 * `build.emptyOutDir` would: by default only when it's inside the project,
 * always with `true`, never with `false`. Every bundle after that adds to it.
 */
function emptyOutDir(root: string, outDir: string, setting: unknown): void {
  mkdirSync(outDir, { recursive: true });
  if (setting !== true && (setting === false || !outDir.startsWith(root + sep))) return;
  // Like Vite, keep a `.git` (a gh-pages checkout of the output).
  for (const name of readdirSync(outDir)) if (name !== ".git") rmSync(join(outDir, name), { recursive: true, force: true });
}

export async function buildApp(options: BuildOptions): Promise<BuildResult> {
  const opts = { ...options, root: resolveRoot(options.root) };
  const log = opts.log ?? true;
  const lines: string[] = [];
  const print = (s = ""): void => {
    lines.push(s);
    if (log) console.log(s);
  };
  const started = performance.now();
  // Failures print once, with their step's heading where it has one; anything else prints here.
  let printed = false;
  try {
    return await run();
  } catch (error) {
    if (!printed) print(fail(errorText(error)));
    throw error;
  }

  async function run(): Promise<BuildResult> {
    const loaded = await loadTextConfig(opts.root, "build");
    const config = withEmbed(loaded.config, opts.embed);
    const outDir = resolve(opts.root, config.outDir ?? "dist");
    let embedSettings: ReturnType<typeof resolveEmbedSettings>;
    try {
      embedSettings = resolveEmbedSettings(config);
    } catch (error) {
      print(fail(error instanceof Error ? error.message : String(error)));
      printed = true;
      throw error;
    }
    // An embed build has no pages of its own unless `standalone`: no index.html, no react-dom.
    const documents = embedSettings === null || embedSettings.standalone;

    print(`   ${brand()}`);
    print();
    print("   Creating an optimized console production build...");
    print();

    const base: InlineConfig = {
      configFile: false,
      root: opts.root,
      mode: "production",
      logLevel: "warn",
      clearScreen: false,
      build: { outDir },
      plugins: [textjsVitePlugin({ ...config, root: opts.root })],
    };
    const scan = scanApp(opts.root, config.appDir ?? "app");
    let adapterName: ReturnType<typeof resolveAdapter>;
    try {
      adapterName = resolveAdapter(opts.adapter);
    } catch (error) {
      print(fail(error instanceof Error ? error.message : String(error)));
      printed = true;
      throw error;
    }
    let hasMiddleware = false;
    const api = listApiRoutes(scan);
    try {
      emptyOutDir(opts.root, outDir, (config.vite?.build as { emptyOutDir?: unknown } | undefined)?.emptyOutDir);
      if (documents) {
        const client = config.vite ? mergeConfig(base, config.vite) : base;
        await build({ ...client, build: { ...client.build, emptyOutDir: false } });
      }
      if (api.length > 0) await buildApiServer();
      hasMiddleware = (await buildServerRuntime(opts.root, config, outDir)) && serverFiles(opts.root, config).middlewareFile !== null;
    } catch (error) {
      print(fail(color.red("Failed to compile.")));
      print();
      print(errorText(error));
      printed = true;
      throw error;
    }

    async function buildApiServer(): Promise<void> {
      const serverBuild: InlineConfig = {
        configFile: false,
        root: opts.root,
        mode: "production",
        logLevel: "warn",
        clearScreen: false,
        build: {
          outDir: join(outDir, META_DIR, "server"),
          emptyOutDir: true,
          target: "node18",
          rollupOptions: { output: { entryFileNames: "api.mjs", format: "es" } },
        },
        // Bundle the framework into api.mjs so `text start` runs on plain Node.
        ssr: { noExternal: ["@textjs/app", /^@textjs\//] },
        plugins: [textjsVitePlugin({ ...config, root: opts.root })],
      };
      await build(withFrameworkEntry(serverBuild, config.vite, { input: VIRTUAL_API, ssr: true }));
    }

    const compiledMs = performance.now() - started;
    print(ok(`Compiled successfully in ${(compiledMs / 1000).toFixed(1)}s`));

    const pages = listPages(scan);
    print(ok("Collecting route data"));
    if (documents) print(ok(`Generating static console cells (${pages.filter((p) => !p.dynamic).length}/${pages.length})`));

    let bytes = 0;
    let gzip = 0;
    for (const f of clientFiles(outDir)) {
      const buf = readFileSync(f);
      bytes += buf.length;
      gzip += gzipSync(buf).length;
    }
    // Partial Prerendering shells + server-rendered routes (after measuring the client bundle).
    let live: Awaited<ReturnType<typeof buildLiveRoutes>>;
    try {
      // Static hosts can't answer terminal clients differently, so the static adapter gets no ANSI frames.
      live = await buildLiveRoutes({ root: opts.root, config, outDir, scan, plugins: [textjsVitePlugin({ ...config, root: opts.root })], ansi: adapterName !== "static", documents });
    } catch (error) {
      print(fail(color.red("Failed to prerender.")));
      print();
      print(errorText(error));
      printed = true;
      throw error;
    }
    if (live) {
      const player = live.player ? `, frame player ${formatBytes(live.player.bytes)} (${formatBytes(live.player.gzip)} gzip)` : "";
      if (documents && (live.staticRoutes > 0 || live.manifest.serverRoutes.length > 0)) {
        print(ok(`Prerendering console shells (${live.shells}/${live.staticRoutes})${live.manifest.serverRoutes.length > 0 ? ` · ${live.manifest.serverRoutes.length} server-rendered` : ""}${player}`));
      }
      for (const s of live.skipped) print(color.gray(`   ${s.pattern} streams without a shell: ${s.reason.split("\n")[0]}`));
      if (live.ansi && live.ansi.routes > 0) {
        print(ok(`Prerendering curl frames (${live.ansi.frames}/${live.ansi.routes})`));
        for (const s of live.ansi.skipped) print(color.gray(`   ${s.pattern} has no prerendered curl frame: ${s.reason.split("\n")[0]}`));
      }
    }
    let embed: EmbedBuildResult | undefined;
    if (embedSettings) {
      try {
        embed = await buildEmbed({ root: opts.root, config, outDir, scan, settings: embedSettings });
      } catch (error) {
        print(fail(color.red("Failed to build embed.js.")));
        print();
        print(errorText(error));
        printed = true;
        throw error;
      }
      print(ok(`Building embed.js${embed.runtime === "server" ? " (server-rendered)" : ""}`));
      if (embed.shellError) print(color.gray(`   embed.js has no first frame: ${embed.shellError.split("\n")[0]}`));
    }
    const routes = summarize(pages, api, new Set(listServerPages(scan).map((p) => p.pattern)));
    const manifest: BuildManifest = {
      version: VERSION,
      engine: ENGINE_NAME,
      basePath: normalizeBasePath(config.basePath),
      routes: pages.map((p) => ({ pattern: p.pattern, type: p.dynamic ? "dynamic" : "static", file: p.file })),
      api: api.map((a) => ({ pattern: a.pattern })),
      firstLoad: { bytes, gzip },
    };
    mkdirSync(join(outDir, META_DIR), { recursive: true });
    writeFileSync(join(outDir, META_DIR, "routes-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    print(ok("Finalizing console optimization"));
    print();
    const total = (label: string, s: { bytes: number; gzip: number }): void => print(`+ ${label.padEnd(40)}${formatBytes(s.bytes)} ${color.gray(`(${formatBytes(s.gzip)} gzip)`)}`);
    if (documents) {
      print(routeTable(routes));
      total("First Load JS shared by all", { bytes, gzip });
    }
    if (embed) {
      total("embed.js", embed.entry);
      for (const f of embed.lazyFiles) total(f, fileSize(join(outDir, f)));
      print(color.gray(`  ${embed.hashedEntry} is embed.js under a hashed name. The rest loads on console intent.`));
    }
    if (hasMiddleware) print(`ƒ Middleware`);
    print();
    if (documents) {
      print(routes.some((r) => r.server) ? `${LEGEND}\n${SERVER_LEGEND}` : LEGEND);
      print();
    }
    let adapter: AdapterResult | undefined;
    if (adapterName) {
      try {
        adapter = await runBuildAdapter({ root: opts.root, config, outDir, scan, api, adapter: adapterName, print });
      } catch (error) {
        print(fail(color.red(`Adapter ${adapterName} failed.`)));
        print();
        print(error instanceof Error ? error.message : String(error));
        printed = true;
        throw error;
      }
      print(ok(`Adapter ${color.bold(adapter.adapter)} → ${relative(opts.root, adapter.output) || "."}`));
      for (const note of adapter.notes) print(color.gray(`   ${note}`));
      print();
    }
    return { outDir, routes, manifest, output: lines.join("\n"), durationMs: performance.now() - started, adapter, ...(embed ? { embed } : {}) };
  }
}
