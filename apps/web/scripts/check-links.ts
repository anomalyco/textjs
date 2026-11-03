#!/usr/bin/env bun
/**
 * Crawls the built site in dist/ and reports broken internal links, anchors and assets.
 * With --external it also probes external URLs and media.textjs.org videos.
 *
 *   bun run check:links                 internal links, anchors, assets
 *   bun run check:links -- --external   also probe external URLs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { captionsPath, learnVideo, PUBLISHED } from "../src/learn/video";

const SITE_HOST = "textjs.org";
const MEDIA_HOST = "media.textjs.org";
const DEFAULT_DIST = join(import.meta.dirname, "..", "dist");
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 4;
const USER_AGENT = "textjs-link-checker/1.0 (+https://textjs.org)";
const BOT_BLOCKING_HOSTS = ["x.com", "twitter.com", "linkedin.com", "npmjs.com", "npmjs.org"];
const REPO_PATH = /^\/(adamdotdevin|anomalyco)\/textjs(\/|$)/i;

/** Problems fail the run; the rest are reported for review. */
export type Group = "internal" | "anchor" | "asset" | "external" | "media" | "unverified" | "redirect" | "repo";
const FAILING: ReadonlySet<Group> = new Set<Group>(["internal", "anchor", "asset", "external", "media"]);

export interface Issue {
  group: Group;
  url: string;
  detail: string;
  sources: string[];
}

export interface Report {
  issues: Issue[];
  broken: number;
  pages: number;
  internalRefs: number;
  externalUrls: number;
  externalChecked: boolean;
}

export interface CheckOptions {
  distDir?: string;
  external?: boolean;
  fetch?: typeof fetch;
}

interface Redirect {
  src: string;
  dst: string;
}

interface Site {
  dist: string;
  redirects: Redirect[];
  functionRoutes: string[];
  idCache: Map<string, Set<string>>;
}

interface Ref {
  page: string;
  tag: string;
  attr: string;
  raw: string;
  kind: "link" | "asset";
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const ATTR = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ASSET_ATTRS = new Set(["src", "srcset", "poster"]);
const ASSET_META = new Set(["og:image", "og:image:secure_url", "og:video", "twitter:image", "twitter:image:src"]);
const ASSET_REL = new Set(["stylesheet", "icon", "shortcut", "apple-touch-icon", "preload", "modulepreload", "manifest", "prefetch"]);
const SKIPPED_SCHEMES = /^(mailto|tel|sms|javascript|data|blob):/i;

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return ENTITIES[name.toLowerCase()] ?? match;
  });
}

interface Tag {
  name: string;
  attrs: Record<string, string>;
}

function parseTags(html: string): Tag[] {
  const stripped = html.replace(/<!--[\s\S]*?-->/g, "").replace(/(<(script|style)\b[^>]*>)[\s\S]*?(<\/\2>)/gi, "$1$3");
  const tags: Tag[] = [];
  for (const match of stripped.matchAll(/<([a-zA-Z][\w:-]*)(\s[^>]*?)?\/?>/g)) {
    const attrs: Record<string, string> = {};
    for (const attr of (match[2] ?? "").matchAll(ATTR)) {
      const name = attr[1]!.toLowerCase();
      if (!(name in attrs)) attrs[name] = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? "");
    }
    tags.push({ name: match[1]!.toLowerCase(), attrs });
  }
  return tags;
}

/** Every URL-bearing attribute in a document, with whether it navigates (link) or loads a resource (asset). */
export function extractRefs(html: string, page: string): Ref[] {
  const refs: Ref[] = [];
  const push = (tag: string, attr: string, raw: string, kind: Ref["kind"]) => refs.push({ page, tag, attr, raw, kind });
  for (const { name, attrs } of parseTags(html)) {
    if (name === "meta") {
      const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
      if (key === "og:url") push(name, "content", attrs.content ?? "", "link");
      else if (ASSET_META.has(key) && attrs.content) push(name, "content", attrs.content, "asset");
      continue;
    }
    if (name === "link" && attrs.href !== undefined) {
      const rel = (attrs.rel ?? "").toLowerCase().split(/\s+/);
      if (rel.includes("preconnect") || rel.includes("dns-prefetch")) continue;
      push(name, "href", attrs.href, rel.some((r) => ASSET_REL.has(r)) ? "asset" : "link");
      continue;
    }
    if ((name === "a" || name === "area") && attrs.href !== undefined) push(name, "href", attrs.href, "link");
    if ((name === "use" || name === "image") && attrs.href !== undefined) push(name, "href", attrs.href, "asset");
    if (name === "object" && attrs.data !== undefined) push(name, "data", attrs.data, "asset");
    for (const attr of ASSET_ATTRS) {
      const value = attrs[attr];
      if (value === undefined) continue;
      if (attr === "srcset") {
        for (const candidate of value.split(",")) {
          const url = candidate.trim().split(/\s+/)[0];
          if (url) push(name, attr, url, "asset");
        }
      } else {
        push(name, attr, value, "asset");
      }
    }
  }
  return refs;
}

export function extractIds(html: string): Set<string> {
  const ids = new Set<string>();
  for (const { name, attrs } of parseTags(html)) {
    if (attrs.id !== undefined) ids.add(attrs.id);
    if (name === "a" && attrs.name !== undefined) ids.add(attrs.name);
  }
  return ids;
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

function listHtml(dist: string): string[] {
  return readdirSync(dist, { recursive: true })
    .map(String)
    .filter((path) => path.endsWith(".html"))
    .sort();
}

/** `docs/routing.html` → `/docs/routing`, `index.html` → `/`. */
function pathForFile(rel: string): string {
  return "/" + rel.replace(/\.html$/, "").replace(/(^|\/)index$/, "");
}

function loadSite(dist: string): Site {
  const redirects: Redirect[] = [];
  const redirectsFile = join(dist, "_redirects");
  if (existsSync(redirectsFile)) {
    for (const line of readFileSync(redirectsFile, "utf8").split("\n")) {
      const [src, dst] = line.trim().split(/\s+/);
      if (!src || src.startsWith("#") || !dst) continue;
      redirects.push({ src, dst });
    }
  }
  const functionRoutes: string[] = [];
  const routesFile = join(dist, "_routes.json");
  if (existsSync(routesFile)) {
    const routes = JSON.parse(readFileSync(routesFile, "utf8")) as { include?: string[] };
    functionRoutes.push(...(routes.include ?? []));
  }
  return { dist, redirects, functionRoutes, idCache: new Map() };
}

function resolveFile(dist: string, pathname: string): string | undefined {
  const clean = pathname.replace(/\/+$/, "").slice(1);
  const candidates = clean === "" ? ["index.html"] : [clean, `${clean}.html`, `${clean}/index.html`];
  for (const candidate of candidates) {
    const file = join(dist, candidate);
    if (isFile(file)) return file;
  }
  return undefined;
}

function matchRedirect(redirect: Redirect, pathname: string): string | undefined {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (redirect.src.endsWith("*")) {
    const prefix = redirect.src.slice(0, -1);
    if (!clean.startsWith(prefix)) return undefined;
    return redirect.dst.replace(/:splat/g, clean.slice(prefix.length));
  }
  return clean === (redirect.src.replace(/\/+$/, "") || "/") ? redirect.dst : undefined;
}

type Resolution = { kind: "file"; file: string } | { kind: "redirect"; to: string; broken: boolean };

function resolvePath(site: Site, pathname: string): Resolution | undefined {
  const file = resolveFile(site.dist, pathname);
  if (file) return { kind: "file", file };
  for (const redirect of site.redirects) {
    const to = matchRedirect(redirect, pathname);
    if (to === undefined) continue;
    const local = to.startsWith("/");
    const broken = local && !resolveFile(site.dist, to.split(/[?#]/)[0]!);
    return { kind: "redirect", to, broken };
  }
  return undefined;
}

function isFunctionRoute(site: Site, pathname: string): boolean {
  return site.functionRoutes.some((pattern) => (pattern.endsWith("/*") ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern));
}

function idsOf(site: Site, file: string): Set<string> {
  let ids = site.idCache.get(file);
  if (!ids) {
    ids = extractIds(readFileSync(file, "utf8"));
    site.idCache.set(file, ids);
  }
  return ids;
}

type Target = { kind: "internal" | "external" | "media" | "repo"; url: URL } | { kind: "invalid" } | undefined;

function classify(raw: string, page: string): Target {
  const value = raw.trim();
  if (!value || SKIPPED_SCHEMES.test(value)) return undefined;
  let url: URL;
  try {
    url = new URL(value, `https://${SITE_HOST}${page}`);
  } catch {
    return { kind: "invalid" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
  if (url.hostname === SITE_HOST) return { kind: "internal", url };
  if (url.hostname === MEDIA_HOST) return { kind: "media", url };
  if ((url.hostname === "github.com" || url.hostname === "www.github.com") && REPO_PATH.test(url.pathname)) return { kind: "repo", url };
  return { kind: "external", url };
}

interface Problem {
  group: Group;
  detail: string;
}

function checkInternal(site: Site, url: URL, kind: Ref["kind"]): Problem | undefined {
  let pathname: string;
  let hash: string;
  try {
    pathname = decodeURIComponent(url.pathname);
    hash = decodeURIComponent(url.hash.slice(1));
  } catch {
    return { group: "internal", detail: "malformed URL encoding" };
  }
  const group: Group = kind === "asset" ? "asset" : "internal";
  if (isFunctionRoute(site, pathname)) return undefined;
  const resolution = resolvePath(site, pathname);
  if (!resolution) return { group, detail: "no prerendered page or file" };
  if (resolution.kind === "redirect") {
    if (resolution.broken) return { group, detail: `redirects to missing ${resolution.to}` };
    return { group: "redirect", detail: `goes through _redirects to ${resolution.to}` };
  }
  if (hash && kind === "link" && resolution.file.endsWith(".html") && !idsOf(site, resolution.file).has(hash)) {
    return { group: "anchor", detail: `no element with id "${hash}" on ${pathname}` };
  }
  return undefined;
}

type ProbeResult = { status: number } | { error: string };

async function probe(fetchImpl: typeof fetch, url: string, method: "HEAD" | "GET"): Promise<ProbeResult> {
  try {
    const res = await fetchImpl(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT },
    });
    if (method === "GET") await res.body?.cancel().catch(() => {});
    return { status: res.status };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") return { error: `timed out after ${TIMEOUT_MS / 1000}s` };
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** HEAD first; GET only when HEAD is not a 2xx/3xx. Media videos are HEAD-only. */
async function checkExternal(fetchImpl: typeof fetch, url: string, media: boolean): Promise<Problem | undefined> {
  const host = new URL(url).hostname;
  let result = await probe(fetchImpl, url, "HEAD");
  if (!("status" in result) || result.status >= 400) {
    if (!media) result = await probe(fetchImpl, url, "GET");
  }
  if ("status" in result && result.status < 400) return undefined;
  const group: Group = media ? "media" : "external";
  if (!("status" in result)) return { group, detail: result.error };
  const blocked = BOT_BLOCKING_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (blocked && (result.status === 403 || result.status === 429)) {
    return { group: "unverified", detail: `HTTP ${result.status} from a bot-blocking host` };
  }
  return { group, detail: `HTTP ${result.status}` };
}

async function forEachLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]!);
    }),
  );
}

export async function checkSite(options: CheckOptions = {}): Promise<Report> {
  const dist = resolve(options.distDir ?? DEFAULT_DIST);
  if (!existsSync(join(dist, "index.html"))) throw new Error(`No built site at ${dist}. Run bun run build first.`);
  const fetchImpl = options.fetch ?? fetch;
  const site = loadSite(dist);
  const pages = listHtml(dist);

  const refs: Ref[] = [];
  for (const rel of pages) {
    refs.push(...extractRefs(readFileSync(join(dist, rel), "utf8"), pathForFile(rel)));
  }
  const sitemap = join(dist, "sitemap.xml");
  if (existsSync(sitemap)) {
    for (const match of readFileSync(sitemap, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
      refs.push({ page: "/sitemap.xml", tag: "urlset", attr: "loc", raw: decodeEntities(match[1]!.trim()), kind: "link" });
    }
  }

  const issues = new Map<string, Issue>();
  const report = (group: Group, url: string, detail: string, source: string) => {
    const key = `${group}\0${url}\0${detail}`;
    const issue = issues.get(key) ?? { group, url, detail, sources: [] };
    if (!issue.sources.includes(source)) issue.sources.push(source);
    issues.set(key, issue);
  };

  const externals = new Map<string, { media: boolean; sources: string[] }>();
  let internalRefs = 0;
  for (const ref of refs) {
    const target = classify(ref.raw, ref.page);
    if (!target) continue;
    const source = `${ref.page} <${ref.tag} ${ref.attr}>`;
    if (target.kind === "invalid") {
      report(ref.kind === "asset" ? "asset" : "internal", ref.raw, "invalid URL", source);
    } else if (target.kind === "internal") {
      internalRefs++;
      const problem = checkInternal(site, target.url, ref.kind);
      if (problem) report(problem.group, target.url.href, problem.detail, source);
    } else if (target.kind === "repo") {
      report("repo", target.url.href, "not checked", source);
    } else {
      const url = new URL(target.url);
      url.hash = "";
      const entry = externals.get(url.href) ?? { media: target.kind === "media", sources: [] };
      if (!entry.sources.includes(source)) entry.sources.push(source);
      externals.set(url.href, entry);
    }
  }

  // Learn caption tracks render on the client too, from this site.
  for (const slug of Object.keys(PUBLISHED)) {
    if (!isFile(join(dist, "learn", `${slug}.html`))) continue;
    internalRefs++;
    const path = captionsPath(slug, "en");
    if (!isFile(join(dist, path.slice(1)))) report("asset", path, "not found", `src/learn/video.ts PUBLISHED.${slug}`);
  }

  const externalChecked = options.external === true;
  if (externalChecked) {
    // Learn videos render on the client, so the player's files never reach the HTML. Probe what it would request.
    for (const slug of Object.keys(PUBLISHED)) {
      const video = learnVideo(slug);
      if (!video) continue;
      for (const url of [video.src, video.srcSmall, video.poster]) {
        const entry = externals.get(url) ?? { media: true, sources: [] };
        const source = `src/learn/video.ts PUBLISHED.${slug}`;
        if (!entry.sources.includes(source)) entry.sources.push(source);
        externals.set(url, entry);
      }
    }
    await forEachLimit([...externals], CONCURRENCY, async ([url, { media, sources }]) => {
      const problem = await checkExternal(fetchImpl, url, media);
      if (problem) for (const source of sources) report(problem.group, url, problem.detail, source);
    });
  }

  const list = [...issues.values()].sort((a, b) => a.group.localeCompare(b.group) || a.url.localeCompare(b.url));
  return {
    issues: list,
    broken: list.filter((issue) => FAILING.has(issue.group)).length,
    pages: pages.length,
    internalRefs,
    externalUrls: externals.size,
    externalChecked,
  };
}

const SECTIONS: Array<[Group, string]> = [
  ["internal", "Broken internal links"],
  ["anchor", "Broken anchors"],
  ["asset", "Broken assets (src, srcset, poster, og:image, link)"],
  ["external", "Broken external links"],
  ["media", "Broken media.textjs.org videos"],
  ["unverified", "Unverified external links (bot-blocked, not counted as broken)"],
  ["redirect", "Links that go through _redirects (they resolve; point at the destination)"],
  ["repo", "GitHub repo links (listed, not checked)"],
];
const MAX_SOURCES = 5;

export function formatReport(report: Report): string {
  const lines = [
    `Checked ${report.pages} pages and ${report.internalRefs} internal references.`,
    report.externalChecked
      ? `Checked ${report.externalUrls} external URLs.`
      : `External URLs not checked (${report.externalUrls} found). Pass --external to probe them.`,
  ];
  for (const [group, title] of SECTIONS) {
    const items = report.issues.filter((issue) => issue.group === group);
    if (items.length === 0) continue;
    lines.push("", `${FAILING.has(group) ? "✗" : "•"} ${title} (${items.length})`);
    for (const item of items) {
      lines.push(`  ${item.url}`, `    ${item.detail}`);
      for (const source of item.sources.slice(0, MAX_SOURCES)) lines.push(`    ← ${source}`);
      if (item.sources.length > MAX_SOURCES) lines.push(`    ← +${item.sources.length - MAX_SOURCES} more`);
    }
  }
  lines.push("", report.broken > 0 ? `${report.broken} broken link(s).` : "No broken links.");
  return lines.join("\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const distFlag = args.indexOf("--dist");
  const report = await checkSite({
    distDir: distFlag >= 0 ? args[distFlag + 1] : undefined,
    external: args.includes("--external"),
  });
  console.log(formatReport(report));
  process.exitCode = report.broken > 0 ? 1 : 0;
}
