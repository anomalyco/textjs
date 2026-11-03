import { useSyncExternalStore, type AnchorHTMLAttributes, type FocusEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { getPostMeta } from "./blog/meta";
import { PRESETS, presetForPath, siteStore, type PresetId } from "./console-companion/store";
import { getDocMeta } from "./docs/meta";
import { learnRoute, learnTitle } from "./learn/routes";
import { merchRoute, merchTitle } from "./merch/routes";
import { LOCALE, localePath, SOURCE_LOCALE, splitLocale } from "./i18n/locales";
import { t } from "./i18n/t";
import { getErrorPageDoc } from "./pages/tx000";
import { safeDecode } from "./url";

export type Route =
  | { name: "home" }
  | { name: "docs"; slug: string }
  | { name: "playground"; preset: PresetId }
  | { name: "opencode" }
  | { name: "coffee" }
  | { name: "learn"; slug: string }
  | { name: "errors" }
  | { name: "error"; code: string }
  | { name: "changelog" }
  | { name: "blog" }
  | { name: "blog-post"; slug: string }
  | { name: "enterprise" }
  | { name: "status" }
  | { name: "merch"; slug: string }
  | { name: "not-found" };

export function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/{2,}/g, "/");
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

/** The route path without its locale prefix: `/ja/docs` → `/docs`. */
export function routePath(pathname: string): string {
  return splitLocale(normalizePath(pathname)).path;
}

export function matchRoute(pathname: string): Route {
  const p = routePath(pathname);
  if (p === "/" || p === "/index.html") return { name: "home" };
  if (p === "/docs") return { name: "docs", slug: "introduction" };
  const docs = /^\/docs\/([^/]+)$/.exec(p);
  if (docs) {
    const slug = safeDecode(docs[1] as string);
    return getDocMeta(slug) ? { name: "docs", slug } : { name: "not-found" };
  }
  const preset = presetForPath(p);
  if (preset) return { name: "playground", preset };
  if (p === "/opencode") return { name: "opencode" };
  if (p === "/coffee") return { name: "coffee" };
  const learn = learnRoute(p);
  if (learn) return learn;
  if (p === "/errors") return { name: "errors" };
  const tx = /^\/errors\/([^/]+)$/.exec(p);
  if (tx) {
    const code = safeDecode(tx[1] as string).toUpperCase();
    return getErrorPageDoc(code) ? { name: "error", code } : { name: "not-found" };
  }
  if (p === "/changelog") return { name: "changelog" };
  if (p === "/blog") return { name: "blog" };
  const post = /^\/blog\/([^/]+)$/.exec(p);
  if (post) {
    const slug = safeDecode(post[1] as string);
    return getPostMeta(slug) ? { name: "blog-post", slug } : { name: "not-found" };
  }
  if (p === "/enterprise") return { name: "enterprise" };
  if (p === "/status") return { name: "status" };
  const merch = merchRoute(p);
  if (merch) return merch;
  return { name: "not-found" };
}

export function titleFor(route: Route): string {
  const suffix = "Text.js";
  switch (route.name) {
    case "home":
      return "Text.js | The Console Framework";
    case "docs": {
      const doc = getDocMeta(route.slug);
      return t("{title} | Text.js Docs", { title: doc?.title ?? t("Docs") });
    }
    case "playground": {
      const preset = route.preset === PRESETS[0]?.id ? undefined : PRESETS.find((p) => p.id === route.preset);
      return preset ? `${preset.label} | Text.js Playground` : `Playground | ${suffix}`;
    }
    case "opencode":
      return `OpenCode in the Console | ${suffix}`;
    case "coffee":
      return `terminal.shop in the Console | ${suffix}`;
    case "learn":
      return learnTitle(route.slug);
    case "errors":
      return `Error Codes | ${suffix}`;
    case "error":
      return `${route.code}: ${getErrorPageDoc(route.code)?.title ?? "Error"} | ${suffix}`;
    case "changelog":
      return `Changelog | ${suffix}`;
    case "blog":
      return `Blog | ${suffix}`;
    case "blog-post":
      return `${getPostMeta(route.slug)?.title ?? "Blog"} | ${suffix}`;
    case "enterprise":
      return `Enterprise | ${suffix}`;
    case "status":
      return `Status | ${suffix}`;
    case "merch":
      return merchTitle(route.slug);
    case "not-found":
      return t("404: This page could not be found | Text.js");
  }
}

export interface LocationState {
  /** The full URL path, locale prefix included. */
  pathname: string;
  /** `pathname` without the locale prefix, for route checks. */
  path: string;
  hash: string;
  /** Bumped on every navigation (also for same-path hash changes). */
  key: number;
}

const hasWindow = typeof window !== "undefined";
function locationState(pathname: string, hash: string, key: number): LocationState {
  const p = normalizePath(pathname);
  return { pathname: p, path: routePath(p), hash, key };
}

let current: LocationState = locationState(hasWindow ? window.location.pathname : "/", hasWindow ? window.location.hash : "", 0);
const listeners = new Set<() => void>();
let hrefPrefetcher: ((pathname: string) => void) | null = null;

/** Register a warm-up callback for internal `<A>` links (avoids router ↔ loader cycles). */
export function registerHrefPrefetcher(fn: (pathname: string) => void): void {
  hrefPrefetcher = fn;
}

function prefetchHref(href: string): void {
  if (!hrefPrefetcher || !isInternalHref(href)) return;
  const pathname = (href.split(/[?#]/)[0] ?? "/").trim() || "/";
  hrefPrefetcher(routePath(pathname));
}

function emit(): void {
  for (const l of listeners) l();
}

function setLocation(pathname: string, hash: string): void {
  current = locationState(pathname, hash, current.key + 1);
  siteStore.syncRoute(current.path);
  emit();
}

if (hasWindow) {
  siteStore.syncRoute(current.path);
  window.addEventListener("popstate", () => setLocation(window.location.pathname, window.location.hash));
}

export function subscribeLocation(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLocation(): LocationState {
  return current;
}

/** Point the router at `pathname` without touching history (build-time prerendering). */
export function resetLocation(pathname: string): void {
  current = locationState(pathname, "", 0);
  siteStore.syncRoute(current.path);
}

export function useLocation(): LocationState {
  return useSyncExternalStore(subscribeLocation, getLocation, getLocation);
}

export function navigate(href: string, options: { replace?: boolean } = {}): void {
  const url = new URL(localizeHref(href), window.location.href);
  // Another locale is another build: load it.
  if (url.origin !== window.location.origin || splitLocale(url.pathname).locale !== LOCALE) {
    window.location.assign(href);
    return;
  }
  prefetchHref(url.pathname);
  const target = `${url.pathname}${url.search}${url.hash}`;
  if (options.replace) window.history.replaceState(null, "", target);
  else window.history.pushState(null, "", target);
  setLocation(url.pathname, url.hash);
}

export function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

/** Adds this build's locale prefix to links to site pages (`/docs` → `/ja/docs`); assets and APIs keep their paths. */
export function localizeHref(href: string): string {
  if (!LOCALE.path || !isInternalHref(href)) return href;
  const at = href.search(/[?#]/);
  const path = at < 0 ? href : href.slice(0, at);
  if (splitLocale(path).locale !== SOURCE_LOCALE || matchRoute(path).name === "not-found") return href;
  const rest = at < 0 ? "" : href.slice(at);
  return `${localePath(LOCALE, normalizePath(path))}${rest}`;
}

export interface AProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children?: ReactNode;
}

/** An `<a>` that performs client-side navigation for internal links. */
export function A({ href: source, onClick, onMouseEnter, onFocus, onPointerDown, children, ...rest }: AProps): ReactNode {
  const href = localizeHref(source);
  const internal = isInternalHref(href);
  const handle = (e: MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(e);
    if (e.defaultPrevented || !internal) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };
  const handleEnter = (e: MouseEvent<HTMLAnchorElement>): void => {
    onMouseEnter?.(e);
    if (internal) prefetchHref(href);
  };
  const handleFocus = (e: FocusEvent<HTMLAnchorElement>): void => {
    onFocus?.(e);
    if (internal) prefetchHref(href);
  };
  const handleDown = (e: PointerEvent<HTMLAnchorElement>): void => {
    onPointerDown?.(e);
    if (internal) prefetchHref(href);
  };
  return (
    <a
      href={href}
      onClick={handle}
      onMouseEnter={internal ? handleEnter : onMouseEnter}
      onFocus={internal ? handleFocus : onFocus}
      onPointerDown={internal ? handleDown : onPointerDown}
      {...(internal ? {} : { target: "_blank", rel: "noreferrer" })}
      {...rest}
    >
      {children}
    </a>
  );
}
