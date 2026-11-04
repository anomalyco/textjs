/**
 * `text.config.ts` and route `metadata` types.
 *
 * This module is imported by browser code, so Vite / Node types are referenced
 * structurally and never imported at runtime.
 */

import { encodePathText } from "./path-text";
import type { ThemeName } from "@textjs/react";

export interface ViewportConfig {
  /** Grid width in cells when fixed, or when docked DevTools can't be measured (default `120`). */
  width?: number;
  /** Grid height in cells when fixed, or when docked DevTools can't be measured (default `36`). */
  height?: number;
  /** Follow the docked DevTools console size (default `true`); `false` pins `width × height`. */
  responsive?: boolean;
  /** Initial theme preset (default `"geistDark"`). */
  theme?: ThemeName;
}

export interface Rewrite {
  /** Path pattern: `/docs/:slug`, `/blog/:path*`. */
  source: string;
  /** Internal path or absolute URL (proxied). */
  destination: string;
}

export interface ProxyTarget {
  target: string;
  changeOrigin?: boolean;
  ws?: boolean;
  rewrite?: (path: string) => string;
  secure?: boolean;
  headers?: Record<string, string>;
}

/** The subset of Vite's dev server the `configureServer` hook relies on. */
export interface TextDevServer {
  middlewares: { use(...args: unknown[]): unknown };
  config: { root: string; server: { port?: number } };
  [key: string]: unknown;
}

export interface TextConfig {
  /** Console grid defaults. */
  viewport?: ViewportConfig;
  /** Mount the in-console Dev Overlay (the `[▼]` pill, its inspector and the Redbox) in development (default `true`). */
  devIndicators?: boolean;
  /** Open the FocusPad's inline console preview by default (default `false`). */
  showMirrorDefault?: boolean;
  /**
   * "Click the page to use the keyboard" over the console frame's last row while the page doesn't
   * have focus and the app has an input handler or focus target (default `true`).
   */
  focusHint?: boolean;
  /** Build output directory (default `"dist"`). */
  outDir?: string;
  /** App Router directory relative to the project root (default `"app"`). */
  appDir?: string;
  /** Mount the app under a sub-path, e.g. `"/console"`. */
  basePath?: string;
  /** Title shown in the FocusPad and as the default `document.title`. */
  title?: string;
  /** The two or three keys worth pressing, shown on the page's FocusPad, e.g. `[{ keys: "↑ ↓", label: "count" }]`. */
  hints?: Array<{ keys: string; label: string }>;
  /** What to do first, shown as "Then click here and …" (default: `press <first hint>`). */
  action?: string;
  /** Dev / start server proxy rules, keyed by path prefix. */
  proxy?: Record<string, string | ProxyTarget>;
  /** Rewrites applied before routing. External destinations are proxied. */
  rewrites?: Rewrite[] | (() => Rewrite[] | Promise<Rewrite[]>);
  /** Extend the Vite dev server (custom middleware, local service discovery, …). */
  configureServer?: (server: TextDevServer) => void | (() => void) | Promise<void | (() => void)>;
  /** Module (relative to the root) default-exporting a `CacheStore` for `@textjs/app/cache`. */
  cacheHandler?: string;
  /** Escape hatch merged into the generated Vite config. */
  vite?: Record<string, unknown>;
  /**
   * Partial Prerendering: `text build` renders each static route's first frame
   * (with `<Suspense>` fallbacks for dynamic holes) into its HTML so the console
   * paints before JavaScript loads (default `true`).
   */
  ppr?: boolean;
  /** Server-rendered routes (`export const runtime = "server"`). */
  live?: LiveConfig;
  /** `text start` request handling: public origin, reverse proxies and allowed hosts. */
  server?: ServerConfig;
  /**
   * Answer curl, Wget, HTTPie and xh with the page's first frame as truecolor
   * ANSI instead of HTML (default on, 80×24). `false` turns it off for the
   * whole app; a page can opt out or change its size with `export const ansi`.
   */
  ansi?: false | AnsiConfig;
  /**
   * @experimental Add the app to another site with one `<script type="module">`
   * tag: `text build` writes `embed.js` and `assets/` (and no `index.html`
   * unless `standalone` is set), the same as `text build --embed`. `embed.js`
   * and `/assets/*` are served with `Access-Control-Allow-Origin: *` and
   * `Cross-Origin-Resource-Policy: cross-origin`.
   */
  embed?: boolean | EmbedConfig;
}

/** @experimental `text.config.ts` `embed`. */
export interface EmbedConfig {
  /** The app path the embedded console opens at (default `"/"`). Navigation stays inside the console. */
  initialPath?: string;
  /** The console API's global, `window.text` by default. `false` installs none. */
  globalName?: string | false;
  /**
   * Clear the host page's console before the first frame (default `false`:
   * what the page logged earlier stays above the app).
   */
  initialClear?: boolean;
  /** Also build the app's own pages (`index.html`), as `text build` does without `embed` (default `false`). */
  standalone?: boolean;
  /**
   * Origins of other sites whose pages may run server-rendered routes
   * (`runtime = "server"`) from this server, such as `"https://www.example.com"`,
   * `"https://*.example.com"` or `"http://localhost:*"`. `"*"` allows any site.
   * Default: none, so only the app's own pages can open live sessions.
   */
  allowOrigins?: string[];
  /**
   * Let pages on `allowOrigins` send cookies and `Authorization` with live
   * session requests (default `false`: those requests are anonymous). Needs
   * exact origins: wildcards are rejected.
   */
  credentials?: boolean;
}

/** Frame size for terminal clients (`text.config.ts` `ansi`, or a page's `export const ansi`). */
export interface AnsiConfig {
  /** Columns (default `80`, or `viewport.width` when the viewport is fixed). */
  cols?: number;
  /** Rows (default `24`, or `viewport.height` when the viewport is fixed). */
  rows?: number;
}

/** Largest ANSI frame side, in cells. */
export const MAX_ANSI_CELLS = 500;

function clampCells(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.max(1, Math.min(MAX_ANSI_CELLS, Math.floor(n))) : fallback;
}

/**
 * The app's ANSI frame size, or `null` when `ansi: false`. A fixed viewport
 * (`responsive: false`) is the app's own grid, so it's the default there.
 */
export function resolveAnsiSize(config: Pick<TextConfig, "ansi" | "viewport">): { cols: number; rows: number } | null {
  if (config.ansi === false) return null;
  const fixed = config.viewport?.responsive === false;
  const cols = clampCells(fixed ? (config.viewport?.width ?? 120) : 80, 80);
  const rows = clampCells(fixed ? (config.viewport?.height ?? 36) : 24, 24);
  return { cols: clampCells(config.ansi?.cols, cols), rows: clampCells(config.ansi?.rows, rows) };
}

/** A page's `export const ansi` applied to the app's size: `null` when the page opts out. */
export function pageAnsiSize(size: { cols: number; rows: number }, page: unknown): { cols: number; rows: number } | null {
  if (page === false) return null;
  if (typeof page !== "object" || page === null) return size;
  const p = page as AnsiConfig;
  return { cols: clampCells(p.cols, size.cols), rows: clampCells(p.rows, size.rows) };
}

export interface ServerConfig {
  /**
   * The public origin (`https://console.example.com`). When set, `request.url`
   * always uses it instead of the `Host` header. `TEXTJS_ORIGIN` when not set here.
   */
  origin?: string;
  /**
   * Trust `X-Forwarded-Host` / `X-Forwarded-Proto` from a reverse proxy in
   * front of `text start` or the bun adapter (default `false`; `TRUST_PROXY=1`
   * when not set here).
   */
  trustProxy?: boolean;
  /**
   * Extra `Host` names `text start` answers when bound to loopback (default:
   * `localhost`, `*.localhost` and IP addresses). `true` disables the check.
   * A leading `.` allows subdomains.
   */
  allowedHosts?: string[] | true;
}

export interface LiveConfig {
  /** Concurrent sessions per server process (default `256`). */
  maxSessions?: number;
  /** How long a disconnected tab's session waits to be resumed, in ms (default `30000`). */
  reconnectGraceMs?: number;
}

/** Type-safe `text.config.ts` helper. */
export function defineConfig(config: TextConfig): TextConfig {
  return config;
}

export interface MetadataTitleTemplate {
  default: string;
  template?: string;
  absolute?: string;
}

export interface Metadata {
  title?: string | MetadataTitleTemplate | { absolute: string; default?: string; template?: string };
  description?: string;
  [key: string]: unknown;
}

/** Client-safe configuration serialized into the browser bundle. */
export interface ClientConfig {
  viewport: ViewportConfig;
  devIndicators: boolean;
  showMirrorDefault: boolean;
  focusHint: boolean;
  basePath: string;
  title: string;
  hints?: Array<{ keys: string; label: string }>;
  action?: string;
}

export function toClientConfig(config: TextConfig): ClientConfig {
  return {
    viewport: { ...config.viewport },
    devIndicators: config.devIndicators ?? true,
    showMirrorDefault: config.showMirrorDefault ?? false,
    focusHint: config.focusHint ?? true,
    basePath: normalizeBasePath(config.basePath),
    title: config.title ?? "",
    ...(config.hints ? { hints: config.hints.map((h) => ({ keys: h.keys, label: h.label })) } : {}),
    ...(config.action ? { action: config.action } : {}),
  };
}

export function normalizeBasePath(basePath: string | undefined): string {
  if (!basePath || basePath === "/") return "";
  const withSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  // Compared with canonical request paths, which are percent-encoded.
  return encodePathText(withSlash.replace(/\/+$/, ""));
}
