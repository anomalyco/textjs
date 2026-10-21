import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { getDoc } from "./docs/registry";
import { siteStore } from "./console-companion/store";
import { safeDecode } from "./url";

export type Route =
  | { name: "home" }
  | { name: "docs"; slug: string }
  | { name: "playground" }
  | { name: "opencode" }
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
