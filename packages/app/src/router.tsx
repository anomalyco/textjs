/**
 * The Text.js App Router: nested layouts, dynamic segments, `loading.tsx`
 * Suspense boundaries, `error.tsx` error boundaries and `not-found.tsx`,
 * synced with `window.location` (or an in-memory history).
 */

import {
  Component,
  Fragment,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ErrorInfo,
  type LazyExoticComponent,
  type ReactNode,
} from "react";
import { Box, resolveTheme, Text, themes, ThemeProvider, useApp, useRuntime, useTheme, type TextTheme, type ThemeName } from "@textjs/react";
import { txError } from "@textjs/core";
import { AppShellContext, RouterContext, type AppRouterInstance, type AppShellState, type RouterState } from "./context";
import { devErrors, type DevErrorStore } from "./dev-errors";
import { TextDevOverlay } from "./devtools";
import { createBrowserHistory, createMemoryHistory, isExternalHref, parseHref, type RouterHistory } from "./history";
import { getRedirectTarget, isNavigationError, isNotFoundError, isRedirectError } from "./navigation-errors";
import {
  isLazyModule,
  loadModule,
  matchAppRoutes,
  parseSegment,
  resolveMetadata,
  resolveRoute,
  searchParamsToRecord,
  type RouteMatch,
  type RouteModule,
  type RouteModuleRef,
  type RouteParams,
  type RouteSegmentNode,
  type SearchParamsRecord,
} from "./routing";

// Types only, so apps without @types/node typecheck. Bundlers replace `process.env.NODE_ENV`.
declare const process: { env: { NODE_ENV?: string } };

export * from "./routing";
export * from "./history";
export { useAppTheme, type AppRouterInstance, type AppShellState, type RouterState, type NavigateOptions } from "./context";

// ---------------------------------------------------------------------------
// Module components
// ---------------------------------------------------------------------------

const lazyComponents = new WeakMap<() => Promise<RouteModule>, LazyExoticComponent<ComponentType<any>>>();

function missingDefault(kind: string, file: string | undefined): ComponentType<any> {
  const Missing = (): ReactNode => {
    throw txError("TX015", file ?? kind);
  };
  return Missing;
}

function moduleComponent(ref: RouteModuleRef, kind: string, file: string | undefined, onLoad?: () => void): ComponentType<any> {
  if (!isLazyModule(ref)) return ref.default ?? missingDefault(kind, file);
  let comp = lazyComponents.get(ref);
  if (!comp) {
    comp = lazy(() =>
      loadModule(ref).then((m) => {
        onLoad?.();
        return { default: m.default ?? missingDefault(kind, file) };
      }),
    );
    lazyComponents.set(ref, comp);
  }
  return comp;
}

// ---------------------------------------------------------------------------
// Default UI
// ---------------------------------------------------------------------------

/** Next.js-style default 404. */
export function DefaultNotFound(): ReactNode {
  const theme = useTheme();
  return (
    <Box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="row">
      <Text color={theme.fg} bold>
        404
      </Text>
      <Text color={theme.border}>{"  │  "}</Text>
      <Text color={theme.muted}>This page could not be found.</Text>
    </Box>
  );
}

/** Production fallback for uncaught render errors. */
export function DefaultAppError(): ReactNode {
  const theme = useTheme();
  return (
    <Box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column" paddingX={2}>
      <Text color={theme.fg} bold align="center">
        Application error: a client-side exception has occurred
      </Text>
      <Text color={theme.muted} align="center">
        (see the browser console for more information)
      </Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Boundaries
// ---------------------------------------------------------------------------

export interface ErrorComponentProps {
  error: Error & { digest?: string };
  /** Re-render the segment. */
  reset: () => void;
}

interface BoundaryProps {
  resetKey: string;
  children?: ReactNode;
}

interface ErrorBoundaryProps extends BoundaryProps {
  fallback: ComponentType<ErrorComponentProps>;
  onError?: (error: unknown, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: unknown;
  resetKey: string;
}

/** `error.tsx` boundary. `notFound()` / `redirect()` pass through to their own boundaries. */
export class RouteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): Partial<ErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (!isNavigationError(error)) this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error !== null) {
      if (isNavigationError(error)) throw error;
      const Fallback = this.props.fallback;
      const err = error instanceof Error ? error : new Error(String(error));
      return <Fallback error={err} reset={this.reset} />;
    }
    return this.props.children;
  }
}

interface NotFoundBoundaryProps extends BoundaryProps {
  fallback: ReactNode;
}

interface CaughtState {
  error: unknown;
  resetKey: string;
}

/** Renders the segment's `not-found.tsx` when `notFound()` is thrown below it. */
class NotFoundBoundary extends Component<NotFoundBoundaryProps, CaughtState> {
  override state: CaughtState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<CaughtState> {
    return { error };
  }

  static getDerivedStateFromProps(props: NotFoundBoundaryProps, state: CaughtState): Partial<CaughtState> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;
    if (isNotFoundError(error)) return this.props.fallback;
    throw error;
  }
}

interface RedirectBoundaryProps extends BoundaryProps {
  router: AppRouterInstance;
}

/** Performs `redirect()` navigations thrown while rendering. */
class RedirectBoundary extends Component<RedirectBoundaryProps, CaughtState> {
  override state: CaughtState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<CaughtState> {
    return { error };
  }

  static getDerivedStateFromProps(props: RedirectBoundaryProps, state: CaughtState): Partial<CaughtState> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  override componentDidMount(): void {
    this.componentDidUpdate();
  }

  override componentDidUpdate(): void {
    const { error } = this.state;
    if (!isRedirectError(error)) return;
    const t = getRedirectTarget(error);
    queueMicrotask(() => {
      if (t.type === "push") this.props.router.push(t.href);
      else this.props.router.replace(t.href);
    });
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;
    if (isRedirectError(error)) return null;
    throw error;
  }
}

interface RootErrorBoundaryProps extends BoundaryProps {
  store: DevErrorStore | null;
  fallback: ReactNode;
}

/** Catches errors no `error.tsx` handled; reports them to the dev Redbox. */
class RootErrorBoundary extends Component<RootErrorBoundaryProps, { error: unknown; resetKey: string }> {
  override state = { error: null as unknown, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): { error: unknown } {
    return { error };
  }

  static getDerivedStateFromProps(props: RootErrorBoundaryProps, state: { resetKey: string }): { error: null; resetKey: string } | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.store?.reportRuntime(error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error !== null) return this.props.fallback;
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Route tree
// ---------------------------------------------------------------------------

export interface PageProps<P extends RouteParams = RouteParams> {
  params: P;
  searchParams: SearchParamsRecord;
}

export interface LayoutProps<P extends RouteParams = RouteParams> {
  params: P;
  children?: ReactNode;
}

function segmentKey(node: RouteSegmentNode, params: RouteParams): string {
  const seg = parseSegment(node.segment);
  if (seg.kind === "static" || seg.kind === "group") return node.segment;
  const v = params[seg.name];
  return `${node.segment}=${Array.isArray(v) ? v.join("/") : (v ?? "")}`;
}

interface RouteTreeProps {
  match: RouteMatch;
  searchParams: SearchParamsRecord;
  resetKey: string;
  onModuleLoad: () => void;
  onRouteError?: (error: unknown, info: ErrorInfo) => void;
}

function RouteTree({ match, searchParams, resetKey, onModuleLoad, onRouteError }: RouteTreeProps): ReactNode {
  const { chain, params } = match;
  const leaf = chain[chain.length - 1] as RouteSegmentNode;

  let element: ReactNode;
  if (match.notFound) {
    const NF = leaf.notFound ? moduleComponent(leaf.notFound, "not-found", leaf.files?.["not-found"], onModuleLoad) : DefaultNotFound;
    element = <NF />;
  } else {
    const Page = moduleComponent(leaf.page as RouteModuleRef, "page", leaf.files?.page, onModuleLoad);
    element = <Page params={params} searchParams={searchParams} />;
  }

  for (let i = chain.length - 1; i >= 0; i--) {
    const node = chain[i] as RouteSegmentNode;
    const key = chain
      .slice(0, i + 1)
      .map((n) => segmentKey(n, params))
      .join("/");
    if (node.notFound || i === 0) {
      const NF = node.notFound ? moduleComponent(node.notFound, "not-found", node.files?.["not-found"], onModuleLoad) : DefaultNotFound;
      element = (
        <NotFoundBoundary resetKey={resetKey} fallback={<NF />}>
          {element}
        </NotFoundBoundary>
      );
    }
    if (node.loading) {
      const Loading = moduleComponent(node.loading, "loading", node.files?.loading, onModuleLoad);
      element = <Suspense fallback={<Loading />}>{element}</Suspense>;
    }
    if (node.error) {
      const ErrorComp = moduleComponent(node.error, "error", node.files?.error, onModuleLoad) as ComponentType<ErrorComponentProps>;
      element = (
        <RouteErrorBoundary resetKey={resetKey} fallback={ErrorComp} onError={onRouteError}>
          {element}
        </RouteErrorBoundary>
      );
    }
    if (node.layout) {
      const Layout = moduleComponent(node.layout, "layout", node.files?.layout, onModuleLoad);
      element = <Layout params={params}>{element}</Layout>;
    }
    element = <Fragment key={key}>{element}</Fragment>;
  }
  return element;
}

// ---------------------------------------------------------------------------
// <AppRouter>
// ---------------------------------------------------------------------------

export interface AppRouterProps {
  /** The `app/` route manifest (generated by `text dev` / `text build`). */
  routes: RouteSegmentNode;
  /** Browser history by default; pass `createMemoryHistory("/")` for tests and embedded previews. */
  history?: RouterHistory;
  /** Render `<TextDevOverlay />` (or a custom overlay node). `true` renders nothing in production builds. */
  devOverlay?: ReactNode | boolean;
  /** Initial theme preset. */
  theme?: TextTheme | ThemeName;
  /** Write route `metadata.title` to `document.title` (default `true`). */
  documentTitle?: boolean;
  /** Fallback `document.title` when no route defines one. */
  defaultTitle?: string;
  /** Report errors to the dev Redbox store (default: the global store, or `null` in production builds; `null` disables). */
  errorStore?: DevErrorStore | null;
  /** Called after every navigation. */
  onNavigate?: (match: RouteMatch) => void;
  /**
   * Opens a URL on another origin (`router.push("https://…")`, `<Link>`).
   * Default: `window.location.assign`, which leaves the page. An app embedded
   * in another site passes one that opens a new tab instead.
   */
  openExternal?: (href: string) => void;
  /** Extra overlays rendered above the routes. */
  children?: ReactNode;
}

function defaultHistory(): RouterHistory {
  return typeof window !== "undefined" && typeof window.history !== "undefined" ? createBrowserHistory() : createMemoryHistory("/");
}

function themeKey(theme: TextTheme): string {
  for (const [name, t] of Object.entries(themes)) if (t === theme) return name;
  return theme.id;
}

export function AppRouter({
  routes,
  history: historyProp,
  devOverlay,
  theme: themeProp,
  documentTitle = true,
  defaultTitle,
  errorStore = process.env.NODE_ENV !== "production" ? devErrors : null,
  onNavigate,
  openExternal,
  children,
}: AppRouterProps): ReactNode {
  const [ownHistory] = useState(() => historyProp ?? defaultHistory());
  const history = historyProp ?? ownHistory;
  const location = useSyncExternalStore(history.listen, history.getLocation, history.getLocation);
  const [refreshKey, setRefreshKey] = useState(0);
  const [, setLoadTick] = useState(0);
  const onModuleLoad = useCallback(() => setLoadTick((n) => n + 1), []);

  // The root's theme store is the one source of truth, so the root shell and its focus hint follow theme changes.
  const rt = useRuntime();
  const rootTheme = useSyncExternalStore(rt.theme.subscribe, rt.theme.get, rt.theme.get);
  const [initialTheme] = useState(() => (themeProp === undefined ? null : resolveTheme(themeProp)));
  const themeApplied = useRef(initialTheme === null);
  useLayoutEffect(() => {
    if (initialTheme !== null) rt.theme.set(initialTheme);
    themeApplied.current = true;
  }, [rt, initialTheme]);
  const theme = !themeApplied.current && initialTheme !== null ? initialTheme : rootTheme;
  const [wireframe, setWireframeState] = useState(false);
  const app = useApp();

  const store = errorStore;
  const errors = useSyncExternalStore(store ? store.subscribe : noopSubscribe, store ? store.getSnapshot : nullSnapshot, store ? store.getSnapshot : nullSnapshot);
  const generation = errors ? errors.generation : 0;

  const match = useMemo(() => resolveRoute(routes, location.pathname), [routes, location.pathname]);
  const searchParams = useMemo(() => searchParamsToRecord(location.search), [location.search]);
  const metadata = resolveMetadata(match, searchParams);

  const latest = useRef(location);
  latest.current = location;

  const router = useMemo<AppRouterInstance>(() => {
    const navigate = (href: string, kind: "push" | "replace"): void => {
      if (isExternalHref(href, typeof window !== "undefined" ? window.location.origin : undefined)) {
        if (openExternal) openExternal(href);
        else if (typeof window !== "undefined") window.location.assign(href);
        return;
      }
      const next = parseHref(href, latest.current.pathname);
      if (kind === "push" && next.href === latest.current.href) return;
      if (kind === "push") history.push(next.href);
      else history.replace(next.href);
    };
    return {
      push: (href) => navigate(href, "push"),
      replace: (href) => navigate(href, "replace"),
      back: () => history.back(),
      forward: () => history.forward(),
      refresh: () => setRefreshKey((k) => k + 1),
      prefetch: (href) => {
        const m = matchAppRoutes(routes, parseHref(href, latest.current.pathname).pathname);
        if (!m) return;
        for (const n of m.chain) for (const ref of [n.layout, n.page, n.loading]) if (ref && isLazyModule(ref)) void loadModule(ref).catch(() => undefined);
      },
    };
  }, [history, routes, openExternal]);

  useEffect(() => {
    onNavigate?.(match);
  }, [match, onNavigate]);

  const title = metadata.title ?? defaultTitle;
  useEffect(() => {
    if (!documentTitle || title === undefined || typeof document === "undefined") return;
    document.title = title;
  }, [documentTitle, title]);

  const setTheme = useCallback((t: TextTheme | ThemeName) => rt.theme.set(resolveTheme(t)), [rt]);
  const cycleTheme = useCallback(() => {
    const names = Object.keys(themes) as ThemeName[];
    const idx = names.indexOf(themeKey(rt.theme.get()) as ThemeName);
    rt.theme.set(themes[names[(idx + 1) % names.length] as ThemeName]);
  }, [rt]);
  const setWireframe = useCallback(
    (enabled: boolean) => {
      app.renderer.setWireframe(enabled);
      setWireframeState(enabled);
    },
    [app],
  );

  const shell = useMemo<AppShellState>(
    () => ({ theme, themeName: themeKey(theme), setTheme, cycleTheme, wireframe, setWireframe }),
    [theme, setTheme, cycleTheme, wireframe, setWireframe],
  );

  const state = useMemo<RouterState>(
    () => ({ location, match, metadata, router, history, manifest: routes, refreshKey }),
    // metadata is derived from match / search / module loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location, match, metadata.title, metadata.description, router, history, routes, refreshKey],
  );

  const resetKey = `${location.key}:${refreshKey}:${generation}`;

  return (
    <AppShellContext value={shell}>
      <ThemeProvider theme={theme}>
        <RouterContext value={state}>
          <Box width="100%" height="100%" flexDirection="column" bg={theme.bg} fg={theme.fg} wireframeLabel="app-router">
            <RootErrorBoundary resetKey={resetKey} store={store} fallback={<DefaultAppError />}>
              <RedirectBoundary resetKey={resetKey} router={router}>
                <RouteTree match={match} searchParams={searchParams} resetKey={resetKey} onModuleLoad={onModuleLoad} />
              </RedirectBoundary>
            </RootErrorBoundary>
            {children}
            {devOverlay === true ? process.env.NODE_ENV !== "production" && <TextDevOverlay /> : devOverlay}
          </Box>
        </RouterContext>
      </ThemeProvider>
    </AppShellContext>
  );
}

const noopSubscribe = (): (() => void) => () => undefined;
const nullSnapshot = (): null => null;

export { useRouteInfo } from "./devtools";
