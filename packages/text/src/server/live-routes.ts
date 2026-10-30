/**
 * Build-time knowledge of server-rendered routes: which pages opt in with
 * `export const runtime = "server"`, the virtual modules that render them, and
 * the HTML document that boots the frame player.
 */

import { readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { parseAst } from "vite";
import { BRAND_MARK, ENGINE_NAME, VERSION } from "@textjs/core";
import { matchAppRoutes, type RouteManifest } from "../routing";
import { generateRoutesModule, listPages, toStaticManifest, type AppScan, type ScannedSegment } from "./scan";

export const VIRTUAL_LIVE = "virtual:textjs/live";
export const VIRTUAL_PLAYER = "virtual:textjs/player";
/** Script `src` of the frame player in `text dev`. */
export const PLAYER_URL = "/@textjs/player";


/**
 * Framework modules are imported by package specifier (not file path) so the
 * virtual modules resolve them exactly like user code does, sharing one
 * instance of the router context in the SSR graph.
 */
export const LIVE_APP_MODULE = "@textjs/next/live-app";
export const LIVE_PLAYER_MODULE = "@textjs/next/live-player";
export const LIVE_STUB_MODULE = "@textjs/next/live-stub";
/** Suffix marking a server page import in the client manifest; the plugin loads the stub instead. */
export const SERVER_STUB_QUERY = "?textjs-server-stub";
/**
 * Suffix for layouts / loading / error / not-found files of segments that only
 * contain server pages: the browser never renders them, so they (and what they
 * import) stay out of the client bundle.
 */
export const SERVER_ONLY_QUERY = "?textjs-server-only";
export const JSX_RUNTIME_MODULE = "@textjs/next/server/jsx-runtime";
export const JSX_DEV_RUNTIME_MODULE = "@textjs/next/server/jsx-dev-runtime";

type EsbuildTransformSync = (code: string, options: { loader: string; format: string; jsx: string; sourcefile: string }) => { code: string };
let transformSync: EsbuildTransformSync | null = null;

/** esbuild's `transformSync` (a dependency of Vite, which Text.js depends on). */
function esbuild(): EsbuildTransformSync {
  if (transformSync === null) {
    const require = createRequire(import.meta.url);
    const fromVite = createRequire(require.resolve("vite/package.json"));
    transformSync = (fromVite("esbuild") as { transformSync: EsbuildTransformSync }).transformSync;
  }
  return transformSync;
}

const LOADERS: Record<string, string> = { ".ts": "ts", ".mts": "ts", ".cts": "ts", ".tsx": "tsx", ".js": "jsx", ".mjs": "js", ".cjs": "js", ".jsx": "jsx" };

interface AstNode {
  type: string;
  [key: string]: unknown;
}

function stringValue(node: unknown): string | undefined {
  const n = node as AstNode | null;
  if (!n) return undefined;
  if (n.type === "Literal" && typeof n.value === "string") return n.value;
  if (n.type === "TemplateLiteral" && (n.expressions as unknown[]).length === 0) return ((n.quasis as AstNode[])[0]?.value as { cooked?: string })?.cooked;
  return undefined;
}

function exportName(node: unknown): string | undefined {
  const n = node as AstNode;
  return n.type === "Identifier" ? (n.name as string) : stringValue(n);
}

const runtimeCache = new Map<string, { mtime: number; value: string | undefined }>();

/**
 * The value of a module's `runtime` export when it is a static string, read
 * with a real parser: `export const runtime = "server"`, with a type
 * annotation or `as const`, a template literal, `export { runtime }`,
 * `export { x as runtime }` and re-exports (`export { runtime } from "./x"`).
 * Comments and strings never match.
 */
export function readRuntimeExport(file: string, depth = 0): string | undefined {
  let mtime: number;
  let code: string;
  try {
    mtime = statSync(file).mtimeMs;
    const hit = runtimeCache.get(file);
    if (hit && hit.mtime === mtime) return hit.value;
    code = readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
  let value: string | undefined;
  if (/\bruntime\b/.test(code)) {
    try {
      const ext = /\.[^.\\/]+$/.exec(file)?.[0] ?? ".ts";
      const js = esbuild()(code, { loader: LOADERS[ext] ?? "tsx", format: "esm", jsx: "automatic", sourcefile: file }).code;
      value = exportedString(parseAst(js) as unknown as AstNode, file, "runtime", depth);
    } catch {
      value = undefined;
    }
  }
  runtimeCache.set(file, { mtime, value });
  return value;
}

/** The static string value of export `name` in a (transpiled) module, following relative re-exports. */
function exportedString(program: AstNode, file: string, name: string, depth: number): string | undefined {
  const body = program.body as AstNode[];
  const constants = new Map<string, string | undefined>();
  // esbuild turns `export { runtime } from "./x"` into an import plus a local export.
  const imports = new Map<string, { source: string; name: string }>();
  for (const node of body) {
    if (node.type !== "ImportDeclaration") continue;
    for (const spec of node.specifiers as AstNode[]) {
      if (spec.type === "ImportSpecifier") imports.set((spec.local as AstNode).name as string, { source: stringValue(node.source) as string, name: exportName(spec.imported) as string });
    }
  }
  const follow = (source: string, name: string): string | undefined => {
    if (depth >= 8 || !source.startsWith(".")) return undefined;
    const target = resolveRelative(dirname(file), source);
    return target ? readRuntimeExportNamed(target, name, depth + 1) : undefined;
  };
  for (const node of body) {
    const decl = (node.type === "ExportNamedDeclaration" ? node.declaration : node) as AstNode | null;
    if (decl?.type !== "VariableDeclaration") continue;
    for (const d of decl.declarations as AstNode[]) {
      const id = d.id as AstNode;
      if (id.type === "Identifier") constants.set(id.name as string, decl.kind === "const" ? stringValue(d.init) : undefined);
    }
  }
  for (const node of body) {
    if (node.type !== "ExportNamedDeclaration") continue;
    const decl = node.declaration as AstNode | null;
    if (decl?.type === "VariableDeclaration") {
      for (const d of decl.declarations as AstNode[]) if ((d.id as AstNode).type === "Identifier" && (d.id as AstNode).name === name) return constants.get(name);
      continue;
    }
    for (const spec of (node.specifiers as AstNode[] | undefined) ?? []) {
      if (exportName(spec.exported) !== name) continue;
      const local = exportName(spec.local) as string;
      const source = stringValue(node.source);
      if (source !== undefined) return follow(source, local);
      const imported = imports.get(local);
      return imported ? follow(imported.source, imported.name) : constants.get(local);
    }
  }
  return undefined;
}

function readRuntimeExportNamed(file: string, name: string, depth: number): string | undefined {
  if (name === "runtime") return readRuntimeExport(file, depth);
  try {
    const ext = /\.[^.\\/]+$/.exec(file)?.[0] ?? ".ts";
    const js = esbuild()(readFileSync(file, "utf8"), { loader: LOADERS[ext] ?? "tsx", format: "esm", jsx: "automatic", sourcefile: file }).code;
    return exportedString(parseAst(js) as unknown as AstNode, file, name, depth);
  } catch {
    return undefined;
  }
}

function resolveRelative(dir: string, spec: string): string | null {
  const base = resolve(dir, spec);
  for (const candidate of [base, ...Object.keys(LOADERS).map((e) => base + e), ...Object.keys(LOADERS).map((e) => join(base, `index${e}`))]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // try the next
    }
  }
  return null;
}

export function isServerRuntimeFile(file: string | undefined): boolean {
  return file ? readRuntimeExport(file) === "server" : false;
}

export interface ServerPage {
  pattern: string;
  /** Project-relative page file. */
  file: string;
  dynamic: boolean;
}

/** Pages that render on the server. */
export function listServerPages(scan: AppScan): ServerPage[] {
  return listPages(scan)
    .filter((p) => p.file !== undefined && isServerRuntimeFile(join(scan.root, p.file)))
    .map((p) => ({ pattern: p.pattern, file: p.file as string, dynamic: p.dynamic }));
}

/** Route matcher for HTML requests: does `pathname` resolve to a server page? */
export function createRuntimeMatcher(scan: AppScan): (pathname: string) => "server" | "client" {
  const manifest: RouteManifest = toStaticManifest(scan);
  const server = new Set(listServerPages(scan).map((p) => p.file));
  return (pathname) => {
    if (server.size === 0) return "client";
    const m = matchAppRoutes(manifest, pathname);
    const file = m?.chain[m.chain.length - 1]?.files?.page;
    return file !== undefined && server.has(file) ? "server" : "client";
  };
}

/**
 * The scan with every server page swapped for the client stub, so the browser
 * bundle never contains server route modules (or anything they import).
 */
export function withServerStubs(scan: AppScan): AppScan {
  const hasClientPage = (s: ScannedSegment): boolean => (s.files.page !== undefined && !isServerRuntimeFile(s.files.page)) || s.children.some(hasClientPage);
  const swap = (s: ScannedSegment): ScannedSegment => {
    const files: ScannedSegment["files"] = { ...s.files };
    const page = s.files.page;
    if (page && isServerRuntimeFile(page)) files.page = `${page}${SERVER_STUB_QUERY}`;
    // Nothing under this segment renders in the browser: keep its boundaries and layout out of the bundle too.
    if (!hasClientPage(s)) {
      for (const kind of ["layout", "loading", "error", "not-found"] as const) {
        const f = s.files[kind];
        if (f) files[kind] = `${f}${SERVER_ONLY_QUERY}`;
      }
    }
    return { ...s, files, children: s.children.map(swap) };
  };
  return { ...scan, tree: swap(scan.tree) };
}

/** `virtual:textjs/live`: the SSR entry rendering live sessions and PPR shells. */
export function generateLiveEntryModule(scan: AppScan): string {
  return `${generateRoutesModule(scan)}
export { createLiveApp, isServerPage, prerenderShell, routeRuntime } from ${JSON.stringify(LIVE_APP_MODULE)};
`;
}

export function generatePlayerEntryModule(): string {
  return `import { bootFramePlayer } from ${JSON.stringify(LIVE_PLAYER_MODULE)};
bootFramePlayer();
`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** JSON safe to inline in a `<script>` element. */
export function inlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

const FAVICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0a0a0a"/><path d="M7 10h18L16 25z" fill="#ededed"/></svg>`,
)}`;

export interface LiveHtmlOptions {
  title: string;
  playerSrc: string;
  basePath: string;
  viewport?: { width?: number; height?: number; responsive?: boolean };
  /** Inline PPR shell `<script>` (painted before the player loads). */
  shell?: string;
}

/** The document for a server-rendered route: a static page pad plus the frame player. */
export function createLiveHtml(o: LiveHtmlOptions): string {
  const config = { basePath: o.basePath, viewport: o.viewport ?? {}, title: o.title };
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content="Text.js ${VERSION} (${ENGINE_NAME})" />
    <meta name="color-scheme" content="dark" />
    <title>${escapeHtml(o.title)}</title>
    <link rel="icon" href="${FAVICON}" />
    <style>
      html, body { margin: 0; min-height: 100%; background: #0a0a0a; color: #ededed; }
      body { min-height: 100vh; display: flex; align-items: center; justify-content: center;
        font-family: Geist, Inter, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
      #__textjs { text-align: center; line-height: 1.6; padding: 24px; }
      #__textjs .mark { font-size: 28px; margin: 0 0 8px; }
      #__textjs .title { font-size: 18px; font-weight: 600; margin: 0; }
      #__textjs .hint { color: #a1a1a1; margin: 8px 0 0; }
      #__textjs kbd { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 12px; border: 1px solid #333; border-radius: 4px; padding: 1px 5px; color: #ededed; }
      #__textjs .status { color: #666; font-size: 12px; margin: 16px 0 0; font-family: "SF Mono", Menlo, Consolas, monospace; }
    </style>
  </head>
  <body>
    <div id="__textjs" data-textjs-runtime="server">
      <p class="mark">${BRAND_MARK}</p>
      <p class="title">${escapeHtml(o.title)}</p>
      <p class="hint">Open the console: <kbd>⌥⌘J</kbd> on macOS, <kbd>Ctrl+Shift+J</kbd> elsewhere. Then click here and type.</p>
      <p class="status">Rendered on the server · <span data-textjs-status>connecting</span></p>
    </div>
    <noscript>${BRAND_MARK} Text.js apps render into console.log, which requires JavaScript.</noscript>
    <script type="application/json" id="__textjs-live">${inlineJson(config)}</script>${o.shell ? `\n    ${o.shell}` : ""}
    <script type="module" src="${escapeHtml(o.playerSrc)}"></script>
  </body>
</html>
`;
}
