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
  /** Cover the console's bottom row with "Click the page to use the keyboard" while DevTools has focus (default `true`). */
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
}

export interface ServerConfig {
  /**
   * The public origin (`https://console.example.com`). When set, `request.url`
   * always uses it instead of the `Host` header. Also `TEXTJS_ORIGIN`.
   */
  origin?: string;
  /**
   * Trust `X-Forwarded-Host` / `X-Forwarded-Proto` from a reverse proxy in
   * front of `text start` (default `false`; also `TRUST_PROXY=1`).
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
