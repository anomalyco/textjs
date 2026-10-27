/**
 * `text run` — render the `app/` directory in the terminal: same routes,
 * layouts, components and route handlers, drawn with truecolor ANSI instead
 * of `console.log`. Runs on Bun (route files are imported as TypeScript).
 */

import { existsSync } from "node:fs";
import { relative } from "node:path";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { txError } from "@textjs/core";
import { renderToTerminal, type TerminalInput, type TerminalOutput, type TerminalRoot } from "@textjs/react/terminal";
import type { ThemeName } from "@textjs/react";
import { createMemoryHistory } from "../history";
import { AppRouter } from "../router";
import { ROUTE_FILE_KINDS, type RouteManifest, type RouteModule, type RouteSegmentNode } from "../routing";
import { matchApiRoute, scanApp, toApiManifest, toPosix, type AppScan, type ScannedSegment } from "../server/scan";
import { runRouteHandler, type RouteHandlerModule } from "../server/http";
import { loadTextConfig } from "./config";

export interface RunOptions {
  root: string;
  /** Initial pathname (default `/`). */
  path?: string;
  theme?: ThemeName;
  stdin?: TerminalInput;
  stdout?: TerminalOutput;
  /** Skip `text.config.ts` (tests). */
  skipConfig?: boolean;
}

const importFile = (file: string): Promise<RouteModule> => import(pathToFileURL(file).href) as Promise<RouteModule>;

/** A route manifest whose modules are imported on demand from disk. */
export function toRuntimeManifest(scan: AppScan): RouteManifest {
  const convert = (s: ScannedSegment): RouteSegmentNode | null => {
    const node: RouteSegmentNode = { segment: s.segment, files: {} };
    let has = false;
    for (const kind of ROUTE_FILE_KINDS) {
      const f = s.files[kind];
      if (!f) continue;
      has = true;
      const key = kind === "not-found" ? "notFound" : kind;
      (node as unknown as Record<string, unknown>)[key] = () => importFile(f);
      (node.files as Record<string, string>)[kind] = toPosix(relative(scan.root, f));
    }
    const children = s.children.map(convert).filter((c): c is RouteSegmentNode => c !== null);
    if (children.length > 0) node.children = children;
    return has || children.length > 0 || s.segment === "" ? node : null;
  };
  return convert(scan.tree) as RouteManifest;
}

/** Import every route module up front (no Suspense flashes on the first frame). */
export async function loadRuntimeManifest(scan: AppScan): Promise<RouteManifest> {
  const manifest = toRuntimeManifest(scan);
  const tasks: Array<Promise<void>> = [];
  const walk = (node: RouteSegmentNode): void => {
    for (const key of ["layout", "page", "loading", "error", "notFound"] as const) {
      const ref = node[key];
      if (typeof ref === "function") tasks.push(ref().then((m) => void (node[key] = m)));
    }
    node.children?.forEach(walk);
  };
  walk(manifest);
  await Promise.all(tasks);
  return manifest;
}

/**
 * Wrap `fetch` so same-origin paths (`fetch("/api/health")`) run the app's
 * route handlers in-process, exactly as `text dev` would serve them.
 */
export function createLocalFetch(scan: AppScan, base: typeof fetch = fetch, origin = "http://localhost:3000"): typeof fetch {
  const api = toApiManifest(scan);
  const local = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!raw.startsWith("/") || raw.startsWith("//")) return base(input, init);
    const url = new URL(raw, origin);
    const hit = matchApiRoute(api, url.pathname);
    if (!hit) return new Response("Not Found", { status: 404 });
    const mod = (await import(pathToFileURL(hit.file).href)) as RouteHandlerModule;
    const request = input instanceof Request ? new Request(url, input) : new Request(url, init);
    return runRouteHandler(mod, request, hit.params);
  };
  return Object.assign(local, { preconnect: () => undefined }) as unknown as typeof fetch;
}

/** Render the app in the terminal. Resolves once it is mounted. */
export async function runInTerminal(opts: RunOptions): Promise<TerminalRoot> {
  const scan = scanApp(opts.root);
  if (!existsSync(scan.appDir)) throw txError("TX018", opts.root);
  let theme = opts.theme;
  if (!opts.skipConfig && theme === undefined) {
    const { config } = await loadTextConfig(opts.root, "serve");
    const t = (config as { viewport?: { theme?: unknown } }).viewport?.theme;
    if (typeof t === "string") theme = t as ThemeName;
  }
  const g = globalThis as { fetch: typeof fetch };
  const originalFetch = g.fetch;
  g.fetch = createLocalFetch(scan, originalFetch);
  const history = createMemoryHistory(opts.path ?? "/");
  const app = await renderToTerminal(
    createElement(AppRouter, { routes: await loadRuntimeManifest(scan), history, theme, documentTitle: false, errorStore: null }),
    {
      stdin: opts.stdin,
      stdout: opts.stdout,
      theme,
      onExit: () => {
        g.fetch = originalFetch;
      },
    },
  );
  void app.waitUntilExit().then(() => {
    g.fetch = originalFetch;
  });
  return app;
}
