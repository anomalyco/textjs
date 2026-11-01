import { useContext } from "react";
import { sharedContext, type TextTheme, type ThemeName } from "@textjs/react";
import { txError } from "@textjs/core";
import type { RouterHistory, RouterLocation } from "./history";
import type { ResolvedMetadata, RouteManifest, RouteMatch } from "./routing";

export interface NavigateOptions {
  /** Accepted for Next.js parity; console frames have no document scroll. */
  scroll?: boolean;
}

export interface AppRouterInstance {
  push(href: string, options?: NavigateOptions): void;
  replace(href: string, options?: NavigateOptions): void;
  back(): void;
  forward(): void;
  /** Re-render the current route and reset its error boundaries. */
  refresh(): void;
  /** Preload a lazy route's modules. */
  prefetch(href: string): void;
}

export interface RouterState {
  location: RouterLocation;
  match: RouteMatch;
  metadata: ResolvedMetadata;
  router: AppRouterInstance;
  history: RouterHistory;
  manifest: RouteManifest;
  /** Bumped by `router.refresh()`. */
  refreshKey: number;
}

export const RouterContext = sharedContext<RouterState | null>("routerContext", null, "TextRouterContext");

export function useRouterState(): RouterState {
  const state = useContext(RouterContext);
  if (state === null) {
    throw txError("TX014", "Navigation hooks");
  }
  return state;
}

export function useOptionalRouterState(): RouterState | null {
  return useContext(RouterContext);
}

/** App-wide shell controls (theme presets, wireframe) shared by DevTools and user settings pages. */
export interface AppShellState {
  theme: TextTheme;
  themeName: ThemeName | string;
  setTheme(theme: TextTheme | ThemeName): void;
  cycleTheme(): void;
  wireframe: boolean;
  setWireframe(enabled: boolean): void;
}

export const AppShellContext = sharedContext<AppShellState | null>("appShellContext", null, "TextAppShellContext");

/** Theme preset controls for the running app. */
export function useAppTheme(): AppShellState {
  const state = useContext(AppShellContext);
  if (state === null) throw txError("TX014", "useAppTheme()");
  return state;
}

export function useOptionalAppShell(): AppShellState | null {
  return useContext(AppShellContext);
}
