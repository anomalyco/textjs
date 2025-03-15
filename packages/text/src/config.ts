/**
 * `text.config.ts` and route `metadata` types.
 *
 * This module is imported by browser code, so Vite / Node types are referenced
 * structurally and never imported at runtime.
 */

import type { ThemeName } from "@textjs/react";

export interface ViewportConfig {
  /** Fixed grid width in cells (default `100`). */
  width?: number;
  /** Fixed grid height in cells (default `32`). */
  height?: number;
  /** Follow the docked DevTools size instead of a fixed grid. */
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
  /** Show the in-console `[▼]` DevTools pill in development (default `true`). */
  devIndicators?: boolean;
  /** Open the FocusPad's inline console preview by default (default `false`). */
  showMirrorDefault?: boolean;
  /** Build output directory (default `"dist"`). */
  outDir?: string;
  /** App Router directory relative to the project root (default `"app"`). */
  appDir?: string;
  /** Mount the app under a sub-path, e.g. `"/console"`. */
  basePath?: string;
  /** Title shown in the FocusPad and as the default `document.title`. */
  title?: string;
  /** Dev / start server proxy rules, keyed by path prefix. */
  proxy?: Record<string, string | ProxyTarget>;
  /** Rewrites applied before routing. External destinations are proxied. */
  rewrites?: Rewrite[] | (() => Rewrite[] | Promise<Rewrite[]>);
  /** Extend the Vite dev server (custom middleware, local service discovery, …). */
  configureServer?: (server: TextDevServer) => void | (() => void) | Promise<void | (() => void)>;
  /** Escape hatch merged into the generated Vite config. */
  vite?: Record<string, unknown>;
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
  basePath: string;
  title: string;
}

export function toClientConfig(config: TextConfig): ClientConfig {
  return {
    viewport: { ...config.viewport },
    devIndicators: config.devIndicators ?? true,
    showMirrorDefault: config.showMirrorDefault ?? false,
    basePath: normalizeBasePath(config.basePath),
    title: config.title ?? "",
  };
}

export function normalizeBasePath(basePath: string | undefined): string {
  if (!basePath || basePath === "/") return "";
  const withSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withSlash.replace(/\/+$/, "");
}
