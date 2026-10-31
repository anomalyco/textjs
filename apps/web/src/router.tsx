import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { getDoc } from "./docs/registry";
import { getPost } from "./blog";
import { siteStore } from "./console-companion/store";
import { learnRoute, learnTitle } from "./learn/routes";
import { safeDecode } from "./url";
import { getTxError } from "@textjs/core";

export type Route =
  | { name: "home" }
  | { name: "docs"; slug: string }
  | { name: "playground" }
  | { name: "opencode" }
  | { name: "terminal" }
  | { name: "learn"; slug: string }
  | { name: "errors" }
  | { name: "error"; code: string }
  | { name: "changelog" }
  | { name: "blog" }
  | { name: "blog-post"; slug: string }
  | { name: "enterprise" }
  | { name: "status" }
  | { name: "not-found" };

export function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/{2,}/g, "/");
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

export function matchRoute(pathname: string): Route {
  const p = normalizePath(pathname);
  if (p === "/" || p === "/index.html") return { name: "home" };
  if (p === "/docs") return { name: "docs", slug: "introduction" };
  const docs = /^\/docs\/([^/]+)$/.exec(p);
  if (docs) {
    const slug = safeDecode(docs[1] as string);
    return getDoc(slug) ? { name: "docs", slug } : { name: "not-found" };
  }
  if (p === "/playground") return { name: "playground" };
  if (p === "/opencode") return { name: "opencode" };
  if (p === "/terminal") return { name: "terminal" };
  const learn = learnRoute(p);
  if (learn) return learn;
  if (p === "/errors") return { name: "errors" };
  const tx = /^\/errors\/([^/]+)$/.exec(p);
  if (tx) {
    const code = safeDecode(tx[1] as string).toUpperCase();
    return getTxError(code) ? { name: "error", code } : { name: "not-found" };
  }
  if (p === "/changelog") return { name: "changelog" };
  if (p === "/blog") return { name: "blog" };
  const post = /^\/blog\/([^/]+)$/.exec(p);
  if (post) {
    const slug = safeDecode(post[1] as string);
    return getPost(slug) ? { name: "blog-post", slug } : { name: "not-found" };
  }
  if (p === "/enterprise") return { name: "enterprise" };
  if (p === "/status") return { name: "status" };
  // Showcase was folded into the Playground.
  if (p === "/showcase") return { name: "playground" };
  return { name: "not-found" };
}

export function titleFor(route: Route): string {
  const suffix = "Text.js";
  switch (route.name) {
    case "home":
      return "Text.js — The Console Framework";
    case "docs": {
      const doc = getDoc(route.slug);
      return `${doc?.title ?? "Docs"} | Text.js Docs`;
    }
    case "playground":
      return `Playground | ${suffix}`;
    case "opencode":
      return `OpenCode in the Console | ${suffix}`;
    case "terminal":
      return `terminal.shop in the Console | ${suffix}`;
    case "learn":
      return learnTitle(route.slug);
    case "errors":
      return `Error Codes | ${suffix}`;
    case "error":
      return `${route.code}: ${getTxError(route.code)?.title ?? "Error"} | ${suffix}`;
    case "changelog":
      return `Changelog | ${suffix}`;
    case "blog":
      return `Blog | ${suffix}`;
    case "blog-post":
      return `${getPost(route.slug)?.title ?? "Blog"} | ${suffix}`;
    case "enterprise":
      return `Enterprise | ${suffix}`;
    case "status":
      return `Status | ${suffix}`;
    case "not-found":
      return `404: This page could not be found | ${suffix}`;
  }
}

export interface LocationState {
  pathname: string;
  hash: string;
  /** Bumped on every navigation (also for same-path hash changes). */
  key: number;
}

const hasWindow = typeof window !== "undefined";
let current: LocationState = {
  pathname: hasWindow ? normalizePath(window.location.pathname) : "/",
  hash: hasWindow ? window.location.hash : "",
  key: 0,
};
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function setLocation(pathname: string, hash: string): void {
  let p = normalizePath(pathname);
  const to = REDIRECTS[p];
  if (to && hasWindow) {
    window.history.replaceState(null, "", `${to}${hash}`);
    p = to;
  }
  current = { pathname: p, hash, key: current.key + 1 };
  siteStore.syncRoute(current.pathname);
  emit();
}

/** Retired paths and where they live now. */
export const REDIRECTS: Readonly<Record<string, string>> = { "/showcase": "/playground" };

if (hasWindow) {
  const to = REDIRECTS[current.pathname];
  if (to) {
    window.history.replaceState(null, "", `${to}${window.location.search}${window.location.hash}`);
    current = { ...current, pathname: to };
  }
  siteStore.syncRoute(current.pathname);
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
  current = { pathname: normalizePath(pathname), hash: "", key: 0 };
  siteStore.syncRoute(current.pathname);
}

export function useLocation(): LocationState {
  return useSyncExternalStore(subscribeLocation, getLocation, getLocation);
}

export function navigate(href: string, options: { replace?: boolean } = {}): void {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) {
    window.location.assign(href);
    return;
  }
  const target = `${url.pathname}${url.search}${url.hash}`;
  if (options.replace) window.history.replaceState(null, "", target);
  else window.history.pushState(null, "", target);
  setLocation(url.pathname, url.hash);
}

export function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export interface AProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children?: ReactNode;
}

/** An `<a>` that performs client-side navigation for internal links. */
export function A({ href, onClick, children, ...rest }: AProps): ReactNode {
  const internal = isInternalHref(href);
  const handle = (e: MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(e);
    if (e.defaultPrevented || !internal) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(href);
  };
  return (
    <a href={href} onClick={handle} {...(internal ? {} : { target: "_blank", rel: "noreferrer" })} {...rest}>
      {children}
    </a>
  );
}
