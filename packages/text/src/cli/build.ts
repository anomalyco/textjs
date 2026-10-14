import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build, mergeConfig, type InlineConfig } from "vite";
import { ENGINE_NAME, VERSION } from "@textjs/core";
import { normalizeBasePath } from "../config";
import { listApiRoutes, listPages, scanApp } from "../server/scan";
import { textjsVitePlugin, VIRTUAL_API } from "../vite-plugin";
import { loadTextConfig } from "./config";
import { brand, color, fail, formatBytes, LEGEND, ok, routeTable, summarize, type SummaryRoute } from "./ui";

export interface BuildOptions {
  root: string;
  /** Print the summary (default `true`). */
  log?: boolean;
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
}

/** `.text/` inside the output directory holds build metadata and the API server bundle. */
export const META_DIR = ".text";

function jsFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (name === META_DIR) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".js")) out.push(p);
    }
  };
  walk(dir);
  return out;
}

export async function buildApp(opts: BuildOptions): Promise<BuildResult> {
  const log = opts.log ?? true;
  const lines: string[] = [];
  const print = (s = ""): void => {
    lines.push(s);
    if (log) console.log(s);
  };
  const started = performance.now();
  const { config } = await loadTextConfig(opts.root, "build");
  const outDir = resolve(opts.root, config.outDir ?? "dist");

  print(`   ${brand()} — Creating an optimized console production build...`);
  print();

  const base: InlineConfig = {
    configFile: false,
    root: opts.root,
    mode: "production",
    logLevel: "warn",
    clearScreen: false,
    build: { outDir, emptyOutDir: true },
    plugins: [textjsVitePlugin({ ...config, root: opts.root })],
  };
  const scan = scanApp(opts.root, config.appDir ?? "app");
  const api = listApiRoutes(scan);
  try {
    await build(config.vite ? mergeConfig(base, config.vite) : base);
    if (api.length > 0) await buildApiServer();
  } catch (error) {
    print(fail(color.red("Failed to compile.")));
    print();
    print(error instanceof Error ? (error.stack ?? error.message) : String(error));
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
        ssr: VIRTUAL_API,
        outDir: join(outDir, META_DIR, "server"),
        emptyOutDir: true,
        target: "node18",
        rollupOptions: { output: { entryFileNames: "api.mjs", format: "es" } },
      },
      // Bundle the framework into api.mjs so `text start` runs on plain Node.
      ssr: { noExternal: ["@textjs/next", /^@textjs\//] },
      plugins: [textjsVitePlugin({ ...config, root: opts.root })],
    };
    await build(config.vite ? mergeConfig(serverBuild, config.vite) : serverBuild);
  }

  const compiledMs = performance.now() - started;
  print(ok(`Compiled successfully in ${(compiledMs / 1000).toFixed(1)}s`));

  const pages = listPages(scan);
  print(ok("Collecting route data"));
  print(ok(`Generating static console cells (${pages.filter((p) => !p.dynamic).length}/${pages.length})`));

  let bytes = 0;
  let gzip = 0;
  for (const f of jsFiles(outDir)) {
    const buf = readFileSync(f);
    bytes += buf.length;
    gzip += gzipSync(buf).length;
  }
  const routes = summarize(pages, api);
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
  print(routeTable(routes));
  print(`+ First Load JS shared by all${" ".repeat(13)}${formatBytes(bytes)} ${color.gray(`(${formatBytes(gzip)} gzip)`)}`);
  print();
  print(LEGEND);
  print();
  return { outDir, routes, manifest, output: lines.join("\n"), durationMs: performance.now() - started };
}
