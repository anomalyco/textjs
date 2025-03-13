/**
 * `textjs/navigation` — App Router hooks with Next.js signatures.
 */

import { useMemo } from "react";
import { useRouterState, type AppRouterInstance } from "./context";
import type { RouteParams } from "./routing";

export { notFound, redirect, permanentRedirect, isNotFoundError, isRedirectError, isNavigationError, type RedirectType } from "./navigation-errors";
export type { AppRouterInstance, NavigateOptions } from "./context";

/** Programmatic navigation: `push`, `replace`, `back`, `forward`, `refresh`, `prefetch`. */
export function useRouter(): AppRouterInstance {
  return useRouterState().router;
}

/** The current pathname, e.g. `/deployments/dpl_8f2k`. */
export function usePathname(): string {
  return useRouterState().location.pathname;
}

/** Dynamic route params, e.g. `{ id: "dpl_8f2k" }` for `/deployments/[id]`. */
export function useParams<T extends RouteParams = RouteParams>(): T {
  return useRouterState().match.params as T;
}

export type ReadonlyURLSearchParams = Omit<URLSearchParams, "append" | "delete" | "set" | "sort">;

/** The current query string as read-only `URLSearchParams`. */
export function useSearchParams(): ReadonlyURLSearchParams {
  const search = useRouterState().location.search;
  return useMemo(() => new URLSearchParams(search), [search]);
}

/** Active segments below the root, e.g. `["deployments", "dpl_8f2k"]`. */
export function useSelectedLayoutSegments(): string[] {
  const pathname = usePathname();
  return useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
}

/** The first active segment below the root (`null` on `/`). */
export function useSelectedLayoutSegment(): string | null {
  return useSelectedLayoutSegments()[0] ?? null;
}
