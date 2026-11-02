import { relative } from "node:path";
import { createServer, mergeConfig, type InlineConfig, type ViteDevServer } from "vite";
import { textjsVitePlugin, type TextLogger } from "../vite-plugin";
import { loadTextConfig } from "./config";
import { banner, color, devtoolsHint, ok } from "./ui";
import { resolveRoot } from "../server/paths";

export interface DevOptions {
  root: string;
  port?: number;
  host?: string | boolean;
  /** Print logs (default `true`). */
  log?: boolean;
}

export function cliLogger(enabled = true): TextLogger {
  return {
    info: (m) => {
      if (enabled) console.log(color.gray(m));
    },
    error: (m) => {
      if (enabled) console.error(color.red(m));
    },
  };
}

export async function startDevServer(options: DevOptions): Promise<ViteDevServer> {
  const started = performance.now();
  const opts = { ...options, root: resolveRoot(options.root) };
  const { config, file } = await loadTextConfig(opts.root, "serve");
  const log = opts.log ?? true;
  const inline: InlineConfig = {
    configFile: false,
    root: opts.root,
    mode: "development",
    logLevel: log ? "warn" : "silent",
    clearScreen: false,
    server: { port: opts.port ?? 3000, host: opts.host, strictPort: false },
    plugins: [textjsVitePlugin({ ...config, root: opts.root, logger: cliLogger(log) })],
  };
  const server = await createServer(config.vite ? mergeConfig(inline, config.vite) : inline);
  await server.listen();
  if (log) {
    const urls = server.resolvedUrls;
    const lines: Array<[string, string]> = [["Local", color.cyan(urls?.local[0] ?? `http://localhost:${opts.port ?? 3000}`)]];
    if (urls?.network[0]) lines.push(["Network", color.cyan(urls.network[0])]);
    if (file) lines.push(["Config", relative(opts.root, file)]);
    console.log(`\n${banner(lines)}\n`);
    console.log(ok("Starting..."));
    console.log(ok(`Ready in ${Math.round(performance.now() - started)}ms`));
    console.log("");
    console.log(devtoolsHint());
    console.log("");
  }
  return server;
}
