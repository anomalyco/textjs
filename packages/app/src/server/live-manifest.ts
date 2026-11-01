/**
 * `.text/live-manifest.json`: what `text start` and the Bun server need to
 * serve prerendered shells and server-rendered routes (kept free of build-time
 * imports so server bundles can read it).
 */

import type { TextConfig } from "../config";

export const LIVE_MANIFEST = "live-manifest.json";

export interface LiveManifest {
  version: 1;
  basePath: string;
  title: string;
  viewport: TextConfig["viewport"];
  /** Player script URL (with `basePath`), when any route renders on the server. */
  player: string | null;
  /** Patterns of server-rendered pages. */
  serverRoutes: string[];
  /** Static HTML per path (relative to the output directory), shells included. */
  pages: Record<string, string>;
  /** Player document for dynamic server routes (relative to the output directory). */
  liveHtml: string | null;
  live?: TextConfig["live"];
}
