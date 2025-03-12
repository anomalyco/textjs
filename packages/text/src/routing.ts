/**
 * Pure App Router matching: route manifests, segment ranking, params,
 * not-found resolution and metadata. Shared by the browser router, the Vite
 * plugin and the `text build` route summary.
 */

import type { ComponentType } from "react";
import type { Metadata } from "./config";

export type RouteParams = Record<string, string | string[]>;
export type SearchParamsRecord = Record<string, string | string[]>;

export interface RouteModule {
  default?: ComponentType<any>;
  metadata?: Metadata;
  generateMetadata?: (props: { params: RouteParams; searchParams: SearchParamsRecord }) => Metadata;
  /** `"force-dynamic"` marks a route `ƒ Dynamic` even without dynamic segments. */
  dynamic?: "auto" | "force-static" | "force-dynamic";
  [key: string]: unknown;
}

export type LazyRouteModule = () => Promise<RouteModule>;
export type RouteModuleRef = RouteModule | LazyRouteModule;

export const ROUTE_FILE_KINDS = ["layout", "page", "loading", "error", "not-found"] as const;
export type RouteFileKind = (typeof ROUTE_FILE_KINDS)[number];

/** One directory of the `app/` tree. */
export interface RouteSegmentNode {
  /** Directory name: `""` (root), `"logs"`, `"[id]"`, `"[...slug]"`, `"[[...slug]]"`, `"(group)"`. */
  segment: string;
  layout?: RouteModuleRef;
  page?: RouteModuleRef;
  loading?: RouteModuleRef;
  error?: RouteModuleRef;
  notFound?: RouteModuleRef;
  /** Source files (project-relative) for DevTools and the build summary. */
  files?: Partial<Record<RouteFileKind, string>>;
  children?: RouteSegmentNode[];
}

export type RouteManifest = RouteSegmentNode;

export type SegmentKind = "static" | "dynamic" | "catchAll" | "optionalCatchAll" | "group";

export interface ParsedSegment {
  kind: SegmentKind;
  /** Literal value for static segments, param name for dynamic ones. */
  name: string;
}

export function parseSegment(segment: string): ParsedSegment {
  let m = /^\[\[\.\.\.([^\]]+)\]\]$/.exec(segment);
  if (m) return { kind: "optionalCatchAll", name: m[1] as string };
  m = /^\[\.\.\.([^\]]+)\]$/.exec(segment);
  if (m) return { kind: "catchAll", name: m[1] as string };
  m = /^\[([^\]]+)\]$/.exec(segment);
  if (m) return { kind: "dynamic", name: m[1] as string };
  if (/^\(.+\)$/.test(segment)) return { kind: "group", name: segment };
  return { kind: "static", name: segment };
}

const RANK: Record<SegmentKind, number> = { static: 0, group: 1, dynamic: 2, catchAll: 3, optionalCatchAll: 4 };

/** Children ordered by match priority: static > group > [param] > [...slug] > [[...slug]]. */
export function rankedChildren(node: RouteSegmentNode): RouteSegmentNode[] {
  const list = node.children ? node.children.slice() : [];
  return list.sort((a, b) => {
    const r = RANK[parseSegment(a.segment).kind] - RANK[parseSegment(b.segment).kind];
    return r !== 0 ? r : a.segment.localeCompare(b.segment);
  });
}

export interface RouteMatch {
  /** Normalized pathname that was matched. */
  pathname: string;
  /** Route pattern, e.g. `/deployments/[id]` (`/_not-found` for unmatched paths). */
  pattern: string;
  params: RouteParams;
  /** Segment nodes from the root to the matched leaf. */
  chain: RouteSegmentNode[];
  /** `true` when the path did not match a page and the chain ends at the nearest `not-found`. */
  notFound: boolean;
  /** `true` for routes with dynamic segments or `dynamic = "force-dynamic"`. */
  dynamic: boolean;
}

export function splitPath(pathname: string): string[] {
  const parts: string[] = [];
  for (const raw of pathname.split("/")) {
    if (raw.length === 0) continue;
    let p = raw;
    try {
      p = decodeURIComponent(raw);
    } catch {
      // keep the raw segment
    }
    parts.push(p);
  }
  return parts;
}

export function normalizePathname(pathname: string): string {
  const parts = pathname.split("/").filter((p) => p.length > 0);
  return `/${parts.join("/")}`;
}

/** Route pattern for a chain of segments (route groups are omitted). */
export function chainPattern(chain: readonly RouteSegmentNode[]): string {
  const parts: string[] = [];
  for (const n of chain) {
    if (n.segment === "") continue;
    if (parseSegment(n.segment).kind === "group") continue;
    parts.push(n.segment);
  }
  return `/${parts.join("/")}`;
}

function matchFrom(node: RouteSegmentNode, parts: readonly string[], i: number, params: RouteParams, chain: RouteSegmentNode[]): RouteSegmentNode[] | null {
  if (i === parts.length && node.page) return chain;
  for (const child of rankedChildren(node)) {
    const seg = parseSegment(child.segment);
    let next: RouteSegmentNode[] | null = null;
    switch (seg.kind) {
      case "static":
        if (i < parts.length && parts[i] === seg.name) next = matchFrom(child, parts, i + 1, params, [...chain, child]);
        break;
      case "group":
        next = matchFrom(child, parts, i, params, [...chain, child]);
        break;
      case "dynamic":
        if (i < parts.length) {
          const p = { ...params, [seg.name]: parts[i] as string };
          next = matchFrom(child, parts, i + 1, p, [...chain, child]);
          if (next) Object.assign(params, p);
        }
        break;
      case "catchAll":
      case "optionalCatchAll": {
        const rest = parts.slice(i);
        if ((rest.length > 0 || seg.kind === "optionalCatchAll") && child.page) {
          if (rest.length > 0) params[seg.name] = rest;
          next = [...chain, child];
        }
        break;
      }
    }
    if (next) return next;
  }
  return null;
}

function isForceDynamic(chain: readonly RouteSegmentNode[]): boolean {
  for (const n of chain) {
    for (const ref of [n.layout, n.page]) {
      const mod = peekModule(ref);
      if (mod?.dynamic === "force-dynamic") return true;
    }
  }
  return false;
}

export function isDynamicPattern(pattern: string): boolean {
  return pattern.includes("[");
}

/** Match a pathname against the manifest. Returns `null` when no page matches. */
export function matchAppRoutes(manifest: RouteManifest, pathname: string): RouteMatch | null {
  const parts = splitPath(pathname);
  const params: RouteParams = {};
  const chain = matchFrom(manifest, parts, 0, params, [manifest]);
  if (!chain) return null;
  const pattern = chainPattern(chain);
  return {
    pathname: normalizePathname(pathname),
    pattern,
    params,
    chain,
    notFound: false,
    dynamic: isDynamicPattern(pattern) || isForceDynamic(chain),
  };
}

/**
 * Longest chain of segment directories matching a prefix of `pathname`,
 * truncated at the deepest directory with a `not-found` file (or the root).
 */
export function resolveNotFoundChain(manifest: RouteManifest, pathname: string): { chain: RouteSegmentNode[]; params: RouteParams } {
  const parts = splitPath(pathname);
  const params: RouteParams = {};
  let chain: RouteSegmentNode[] = [manifest];
  let node = manifest;
  let i = 0;
  outer: while (i < parts.length) {
    for (const child of rankedChildren(node)) {
      const seg = parseSegment(child.segment);
      if (seg.kind === "static" && parts[i] === seg.name) {
        chain = [...chain, child];
        node = child;
        i++;
        continue outer;
      }
      if (seg.kind === "dynamic") {
        params[seg.name] = parts[i] as string;
        chain = [...chain, child];
        node = child;
        i++;
        continue outer;
      }
    }
    break;
  }
  let end = 0;
  for (let k = 0; k < chain.length; k++) if ((chain[k] as RouteSegmentNode).notFound) end = k;
  return { chain: chain.slice(0, end + 1), params };
}

/** Match a pathname, falling back to the nearest `not-found` boundary. */
export function resolveRoute(manifest: RouteManifest, pathname: string): RouteMatch {
  const match = matchAppRoutes(manifest, pathname);
  if (match) return match;
  const { chain, params } = resolveNotFoundChain(manifest, pathname);
  return {
    pathname: normalizePathname(pathname),
    pattern: "/_not-found",
    params,
    chain,
    notFound: true,
    dynamic: false,
  };
}

export interface FlatRoute {
  pattern: string;
  dynamic: boolean;
  /** Project-relative page file, when known. */
  file?: string;
  /** Layout files wrapping the page, root first. */
  layouts: string[];
}

/** Every page in the manifest, `/` first, then alphabetical. */
export function flattenRoutes(manifest: RouteManifest): FlatRoute[] {
  const out: FlatRoute[] = [];
  const walk = (node: RouteSegmentNode, chain: RouteSegmentNode[]): void => {
    const next = [...chain, node];
    if (node.page) {
      const pattern = chainPattern(next);
      out.push({
        pattern,
        dynamic: isDynamicPattern(pattern) || isForceDynamic(next),
        file: node.files?.page,
        layouts: next.map((n) => n.files?.layout).filter((f): f is string => typeof f === "string"),
      });
    }
    for (const c of node.children ?? []) walk(c, next);
  };
  walk(manifest, []);
  return out.sort((a, b) => (a.pattern === "/" ? -1 : b.pattern === "/" ? 1 : a.pattern.localeCompare(b.pattern)));
}

// ---------------------------------------------------------------------------
// Modules & metadata
// ---------------------------------------------------------------------------

const loaded = new WeakMap<LazyRouteModule, RouteModule>();

export function isLazyModule(ref: RouteModuleRef): ref is LazyRouteModule {
  return typeof ref === "function";
}

/** The module for `ref` if it is eager or has already loaded. */
export function peekModule(ref: RouteModuleRef | undefined): RouteModule | undefined {
  if (ref === undefined) return undefined;
  return isLazyModule(ref) ? loaded.get(ref) : ref;
}

export async function loadModule(ref: RouteModuleRef): Promise<RouteModule> {
  if (!isLazyModule(ref)) return ref;
  const cached = loaded.get(ref);
  if (cached) return cached;
  const mod = await ref();
  loaded.set(ref, mod);
  return mod;
}

export interface ResolvedMetadata {
  title?: string;
  description?: string;
}

function readMetadata(mod: RouteModule | undefined, params: RouteParams, searchParams: SearchParamsRecord): Metadata | undefined {
  if (!mod) return undefined;
  if (typeof mod.generateMetadata === "function") {
    try {
      return mod.generateMetadata({ params, searchParams });
    } catch {
      return mod.metadata;
    }
  }
  return mod.metadata;
}

/** Merge `metadata` from layouts (root first) and the page, applying `title.template`. */
export function resolveMetadata(match: RouteMatch, searchParams: SearchParamsRecord = {}): ResolvedMetadata {
  const out: ResolvedMetadata = {};
  let template: string | undefined;
  const leaf = match.chain[match.chain.length - 1];
  const refs: Array<RouteModuleRef | undefined> = [];
  for (const n of match.chain) refs.push(n.layout);
  refs.push(match.notFound ? leaf?.notFound : leaf?.page);
  for (const ref of refs) {
    const meta = readMetadata(peekModule(ref), match.params, searchParams);
    if (!meta) continue;
    if (typeof meta.description === "string") out.description = meta.description;
    const t = meta.title;
    if (t === undefined) continue;
    if (typeof t === "string") out.title = template ? template.replace("%s", t) : t;
    else {
      if (typeof t.absolute === "string") out.title = t.absolute;
      else if (typeof t.default === "string") out.title = t.default;
      if (typeof t.template === "string") template = t.template;
    }
  }
  return out;
}

export function searchParamsToRecord(search: string | URLSearchParams): SearchParamsRecord {
  const sp = typeof search === "string" ? new URLSearchParams(search) : search;
  const out: SearchParamsRecord = {};
  for (const [k, v] of sp) {
    const prev = out[k];
    if (prev === undefined) out[k] = v;
    else out[k] = Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

/** Format params for display: `{ id: "dpl_1" }`. */
export function formatParams(params: RouteParams): string {
  const keys = Object.keys(params);
  if (keys.length === 0) return "{}";
  return `{ ${keys.map((k) => `${k}: ${JSON.stringify(params[k])}`).join(", ")} }`;
}
