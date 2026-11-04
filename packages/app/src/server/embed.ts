/**
 * @experimental Embeds (`text build --embed`, `embed` in `text.config.ts`):
 * the settings, the runtime entries `embed.js` loads on console intent, and
 * the `embed.js` source itself, shared by `text build` and `text dev`.
 */

import { existsSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import type { TextConfig } from "../config";
import { LIVE_STUB_MODULE } from "./live-routes";
import { toPosix } from "./scan";
import type { EmbedClientConfig } from "../embed/boot-client";
import type { EmbedPlayerConfig } from "../embed/boot-player";

export const EMBED_FILE = "embed.js";
/** `.text/embed-manifest.json`: `text start` serves an embed build's files to other sites. */
export const EMBED_MANIFEST = "embed-manifest.json";
export const VIRTUAL_EMBED_CLIENT = "virtual:textjs/embed-client";
export const VIRTUAL_EMBED_PLAYER = "virtual:textjs/embed-player";
/** Their URLs in `text dev`. */
export const EMBED_CLIENT_URL = "/@textjs/embed-client";
export const EMBED_PLAYER_URL = "/@textjs/embed-player";
/** `startEmbed` in `text dev`. */
export const EMBED_LOADER_URL = "/@textjs/embed-loader";

const here = dirname(realpathSync(fileURLToPath(import.meta.url)));

/**
 * A module of `src/embed/` next to this one (`src/` or `dist/`), so it shares
 * the router and React contexts the app's own `@textjs/app` imports resolve to.
 */
export function embedModule(name: string): string {
  for (const ext of [".tsx", ".ts", ".js"]) {
    const file = join(here, "..", "embed", `${name}${ext}`);
    if (existsSync(file)) return toPosix(file);
  }
  throw new Error(`▼ Text.js: could not locate the framework module embed/${name}.`);
}

export interface EmbedSettings {
  initialPath: string;
  globalName: string | false;
  initialClear: boolean;
  standalone: boolean;
  credentials: boolean;
}

/** `embed` from `text.config.ts`, or `null` when the app isn't an embed. */
export function resolveEmbedSettings(config: Pick<TextConfig, "embed">): EmbedSettings | null {
  const e = config.embed;
  if (!e) return null;
  const o = e === true ? {} : e;
  const path = o.initialPath ?? "/";
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) throw new Error(`▼ Text.js: embed.initialPath must be an app path starting with "/", got ${JSON.stringify(path)}.`);
  if (o.globalName !== undefined && o.globalName !== false && !/^[A-Za-z_$][\w$]*$/.test(o.globalName)) throw new Error(`▼ Text.js: embed.globalName must be a JavaScript identifier or false, got ${JSON.stringify(o.globalName)}.`);
  return { initialPath: path, globalName: o.globalName ?? "text", initialClear: o.initialClear === true, standalone: o.standalone === true, credentials: o.credentials === true };
}

/** `config` with `embed` turned on (`--embed`), unless it already is. */
export function withEmbed(config: TextConfig, on: boolean | undefined): TextConfig {
  return on && !config.embed ? { ...config, embed: true } : config;
}

export function embedClientConfig(config: TextConfig, s: EmbedSettings): EmbedClientConfig {
  return {
    viewport: { ...config.viewport },
    ...(config.focusHint === false ? { focusHint: false } : {}),
    initialPath: s.initialPath,
    globalName: s.globalName,
    initialClear: s.initialClear,
  };
}

export function embedPlayerConfig(config: TextConfig, s: EmbedSettings): EmbedPlayerConfig {
  const { theme: _, ...viewport } = config.viewport ?? {};
  return { viewport, initialPath: s.initialPath, globalName: s.globalName, initialClear: s.initialClear, credentials: s.credentials };
}

const RESOLVED_CLIENT = `\0${VIRTUAL_EMBED_CLIENT}`;
const RESOLVED_PLAYER = `\0${VIRTUAL_EMBED_PLAYER}`;
const RESOLVED_LOADER = "\0virtual:textjs/embed-loader";

export interface EmbedPluginOptions {
  config: TextConfig;
  /**
   * Swap the server-route stub for one that never reloads the page (default
   * `false`). Build only: in `text dev` the app's own pages share the graph.
   */
  embeddedStubs?: boolean;
}

/** The runtime entries: `boot(state)` starts the app with what `embed.js` hands over. */
export function textjsEmbedPlugin(options: EmbedPluginOptions): Plugin {
  const settings = (): EmbedSettings => resolveEmbedSettings(options.config) ?? (resolveEmbedSettings({ embed: true }) as EmbedSettings);
  return {
    name: "@textjs/app:embed",
    enforce: "pre",
    resolveId(id) {
      if (id === VIRTUAL_EMBED_CLIENT || id.endsWith(EMBED_CLIENT_URL)) return RESOLVED_CLIENT;
      if (id === VIRTUAL_EMBED_PLAYER || id.endsWith(EMBED_PLAYER_URL)) return RESOLVED_PLAYER;
      if (id.endsWith(EMBED_LOADER_URL)) return RESOLVED_LOADER;
      if (options.embeddedStubs && id === LIVE_STUB_MODULE) return embedModule("server-stub");
      return null;
    },
    load(id) {
      // A re-export, so Vite serves the framework file even where `server.fs.allow` doesn't list it (a linked package).
      if (id === RESOLVED_LOADER) return `export { startEmbed } from ${JSON.stringify(embedModule("loader"))};\n`;
      if (id === RESOLVED_CLIENT) {
        return `import { bootEmbedClient } from ${JSON.stringify(embedModule("boot-client"))};
import routes from "virtual:textjs/routes";
export function boot(state) { return bootEmbedClient({ ...state, routes, config: ${JSON.stringify(embedClientConfig(options.config, settings()))} }); }
`;
      }
      if (id === RESOLVED_PLAYER) {
        return `import { bootEmbedPlayer } from ${JSON.stringify(embedModule("boot-player"))};
export function boot(state) { return bootEmbedPlayer({ ...state, config: ${JSON.stringify(embedPlayerConfig(options.config, settings()))} }); }
`;
      }
      return null;
    },
  };
}

export interface EmbedEntryOptions {
  /** The shell replay expression (`createShellReplayCode`), or `null` for none. */
  shell: string | null;
  /** Module specifier of the runtime entry, relative to `embed.js` (or a root-relative dev URL). */
  runtime: string;
  /** Yoga's `.wasm`, relative to `embed.js`, fetched alongside a client runtime. */
  wasm?: string;
  /** The live endpoint relative to `embed.js`, for a server runtime. */
  endpoint?: string;
  /** Specifier of the `startEmbed` module (default: the framework's own file). */
  loader?: string;
  /** Code to run first (`text dev`'s React Refresh preamble). */
  prelude?: string;
}

/** The source of `embed.js`. */
export function createEmbedEntry(o: EmbedEntryOptions): string {
  const url = (rel: string): string => `new URL(${JSON.stringify(rel)}, import.meta.url)`;
  const extra = [o.wasm ? `wasm: fetch(${url(o.wasm)})` : "", o.endpoint ? `endpoint: ${url(o.endpoint)}.href` : ""].filter(Boolean);
  // The `.wasm` request starts with the runtime's: host pages have no preload for it.
  const boot = `(s) => { const o = { ...s${extra.map((e) => `, ${e}`).join("")} }; return import(${JSON.stringify(o.runtime)}).then((m) => m.boot(o)); }`;
  return `${o.prelude ?? ""}import { startEmbed } from ${JSON.stringify(o.loader ?? embedModule("loader"))};
startEmbed(${o.shell ? `() => ${o.shell}` : "null"}, ${boot}, import.meta.url);
`;
}
