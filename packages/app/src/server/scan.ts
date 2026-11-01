/**
 * File-system scanner for the `app/` directory (Node only).
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { flattenRoutes, matchAppRoutes, ROUTE_FILE_KINDS, type FlatRoute, type RouteFileKind, type RouteManifest, type RouteParams, type RouteSegmentNode } from "../routing";

export const ROUTE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"] as const;

export interface ScannedSegment {
  segment: string;
  dir: string;
  /** Absolute file paths. */
  files: Partial<Record<RouteFileKind, string>>;
  /** Absolute `route.ts` path (API handler). */
  route?: string;
  children: ScannedSegment[];
}

export interface AppScan {
  root: string;
  appDir: string;
  tree: ScannedSegment;
}

export function toPosix(p: string): string {
  return sep === "\\" ? p.split(sep).join("/") : p;
}

function findFile(dir: string, base: string, entries: Set<string>): string | undefined {
  for (const ext of ROUTE_EXTENSIONS) if (entries.has(base + ext)) return join(dir, base + ext);
  return undefined;
}

function scanDir(dir: string, segment: string): ScannedSegment {
  const entries = new Set(readdirSync(dir));
  const files: Partial<Record<RouteFileKind, string>> = {};
  for (const kind of ROUTE_FILE_KINDS) {
    const f = findFile(dir, kind, entries);
    if (f) files[kind] = f;
  }
  const node: ScannedSegment = { segment, dir, files, route: findFile(dir, "route", entries), children: [] };
  for (const name of [...entries].sort()) {
    if (name.startsWith(".") || name.startsWith("_") || name === "node_modules") continue;
    const full = join(dir, name);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (isDir) node.children.push(scanDir(full, name));
  }
  return node;
}

/** Scan `<root>/<appDir>` into a segment tree. */
export function scanApp(root: string, appDir = "app"): AppScan {
  const dir = join(root, appDir);
  if (!existsSync(dir)) return { root, appDir: dir, tree: { segment: "", dir, files: {}, children: [] } };
  return { root, appDir: dir, tree: scanDir(dir, "") };
}

/** `true` when `file` is a route file the manifest depends on. */
export function isRouteFile(file: string, appDir: string): boolean {
  const rel = toPosix(relative(appDir, file));
  if (rel.startsWith("..")) return false;
  const base = rel.split("/").pop() ?? "";
  const name = base.replace(/\.(tsx|ts|jsx|js)$/, "");
  if (name === base) return false;
  return (ROUTE_FILE_KINDS as readonly string[]).includes(name) || name === "route";
}

const FORCE_DYNAMIC = /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/;

function isForceDynamicFile(file: string | undefined): boolean {
  if (!file) return false;
  try {
    return FORCE_DYNAMIC.test(readFileSync(file, "utf8"));
  } catch {
    return false;
  }
}

/** A manifest with placeholder modules (for summaries and matching on the server). */
export function toStaticManifest(scan: AppScan): RouteManifest {
  const convert = (s: ScannedSegment): RouteSegmentNode => {
    const node: RouteSegmentNode = { segment: s.segment, files: {} };
    for (const kind of ROUTE_FILE_KINDS) {
      const f = s.files[kind];
      if (!f) continue;
      const key = kind === "not-found" ? "notFound" : kind;
      (node as unknown as Record<string, unknown>)[key] = isForceDynamicFile(f) ? { dynamic: "force-dynamic" } : {};
      (node.files as Record<string, string>)[kind] = toPosix(relative(scan.root, f));
    }
    const children = s.children.map(convert).filter((c) => hasContent(c));
    if (children.length > 0) node.children = children;
    return node;
  };
  return convert(scan.tree);
}

function hasContent(n: RouteSegmentNode): boolean {
  return Boolean(n.page || n.layout || n.loading || n.error || n.notFound || (n.children && n.children.length > 0));
}

export interface ApiRoute {
  pattern: string;
  file: string;
}

/** API route handlers as a manifest (route files stand in for pages). */
export function toApiManifest(scan: AppScan): RouteManifest {
  const convert = (s: ScannedSegment): RouteSegmentNode => {
    const node: RouteSegmentNode = { segment: s.segment };
    if (s.route) {
      node.page = {};
      node.files = { page: s.route };
    }
    const children = s.children.map(convert).filter((c) => c.page || (c.children && c.children.length > 0));
    if (children.length > 0) node.children = children;
    return node;
  };
  return convert(scan.tree);
}

export function listApiRoutes(scan: AppScan): ApiRoute[] {
  return flattenRoutes(toApiManifest(scan)).map((r) => ({ pattern: r.pattern, file: r.file as string }));
}

export function matchApiRoute(api: RouteManifest, pathname: string): { file: string; params: RouteParams; pattern: string } | null {
  const m = matchAppRoutes(api, pathname);
  if (!m) return null;
  const leaf = m.chain[m.chain.length - 1] as RouteSegmentNode;
  const file = leaf.files?.page;
  return file ? { file, params: m.params, pattern: m.pattern } : null;
}

export function listPages(scan: AppScan): FlatRoute[] {
  return flattenRoutes(toStaticManifest(scan));
}

export interface GenerateOptions {
  /** Emit `() => import()` for pages (code-split) instead of static imports. */
  lazyPages?: boolean;
  /** Add the self-accepting HMR footer. */
  hmr?: boolean;
}

/** Generate the `virtual:textjs/routes` module source. */
export function generateRoutesModule(scan: AppScan, options: GenerateOptions = {}): string {
  const imports: string[] = [];
  let n = 0;
  const ref = (file: string, lazy: boolean): string => {
    const spec = JSON.stringify(toPosix(file));
    if (lazy) return `() => import(${spec})`;
    const id = `m${n++}`;
    imports.push(`import * as ${id} from ${spec};`);
    return id;
  };
  const emit = (s: ScannedSegment, indent: string): string | null => {
    const props: string[] = [`segment: ${JSON.stringify(s.segment)}`];
    const files: string[] = [];
    for (const kind of ROUTE_FILE_KINDS) {
      const f = s.files[kind];
      if (!f) continue;
      const key = kind === "not-found" ? "notFound" : kind;
      props.push(`${key}: ${ref(f, kind === "page" && options.lazyPages === true)}`);
      files.push(`${JSON.stringify(kind)}: ${JSON.stringify(toPosix(relative(scan.root, f)))}`);
    }
    if (files.length > 0) props.push(`files: { ${files.join(", ")} }`);
    const kids = s.children.map((c) => emit(c, `${indent}  `)).filter((c): c is string => c !== null);
    if (kids.length > 0) props.push(`children: [\n${kids.map((k) => `${indent}  ${k}`).join(",\n")}\n${indent}]`);
    if (files.length === 0 && kids.length === 0 && s.segment !== "") return null;
    return `{ ${props.join(", ")} }`;
  };
  const body = emit(scan.tree, "") ?? `{ segment: "" }`;
  const lines = [...imports, "", `export const routes = ${body};`, "export default routes;"];
  if (options.hmr) {
    lines.push(
      "if (import.meta.hot) {",
      "  import.meta.hot.accept((mod) => {",
      "    if (mod && typeof window !== 'undefined' && window.__TEXTJS_APP__) window.__TEXTJS_APP__.updateRoutes(mod.routes);",
      "  });",
      "}",
    );
  }
  return lines.join("\n");
}
