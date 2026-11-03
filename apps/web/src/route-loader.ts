import type { ReactNode } from "react";
import type { DemoId } from "./console-companion/store";
import { DOCS_META } from "./docs/meta";
import type { CheckoutProvider } from "./merch/config";
import type { Route } from "./router";

export interface LoadedRoutes {
  HomePage?: () => ReactNode;
  DocsPage?: (props: { slug: string }) => ReactNode;
  PlaygroundPage?: (props: { demo: DemoId }) => ReactNode;
  LearnPage?: (props: { slug: string }) => ReactNode;
  ErrorsIndexPage?: () => ReactNode;
  ErrorPage?: (props: { code: string }) => ReactNode;
  ChangelogPage?: () => ReactNode;
  BlogPage?: () => ReactNode;
  BlogPostPage?: (props: { slug: string }) => ReactNode;
  EnterprisePage?: () => ReactNode;
  StatusPage?: () => ReactNode;
  MerchPage?: (props: { slug: string; provider?: CheckoutProvider | null }) => ReactNode;
}

const loaded: LoadedRoutes = {};
const inflight = new Map<string, Promise<void>>();

/** Vite manifest source key for each route's dynamic import. */
const ROUTE_MANIFEST_SRC: Record<Exclude<Route["name"], "not-found">, string> = {
  home: "src/pages/Home.tsx",
  docs: "src/pages/Docs.tsx",
  playground: "src/pages/Playground.tsx",
  opencode: "src/pages/Playground.tsx",
  coffee: "src/pages/Playground.tsx",
  learn: "src/pages/Learn.tsx",
  errors: "src/pages/Errors.tsx",
  error: "src/pages/Errors.tsx",
  changelog: "src/pages/Changelog.tsx",
  blog: "src/pages/Blog.tsx",
  "blog-post": "src/pages/BlogPost.tsx",
  enterprise: "src/pages/Enterprise.tsx",
  status: "src/pages/Status.tsx",
  merch: "src/merch/Merch.tsx",
};

/** `docs/registry.ts` once it has loaded: it holds each docs page's Markdown. */
let docs: typeof import("./docs/registry") | undefined;

/** Vite manifest source keys of the chunks a route renders with: its page and, for a docs page, its Markdown (`postbuild-pages.ts`). */
export function routeManifestSources(route: Route): string[] {
  if (route.name === "not-found") return [];
  const page = ROUTE_MANIFEST_SRC[route.name];
  return route.name === "docs" ? [page, `src/docs/content/${route.slug}.md?raw`] : [page];
}

export function getLoadedRoutes(): LoadedRoutes {
  return loaded;
}

/** Whether a route can render now: its page module and the data it needs (a docs page's Markdown). */
export function isRouteLoaded(route: Route): boolean {
  switch (route.name) {
    case "home":
      return loaded.HomePage !== undefined;
    case "docs":
      return loaded.DocsPage !== undefined && docs?.getDoc(route.slug) !== undefined;
    case "playground":
    case "opencode":
    case "coffee":
      return loaded.PlaygroundPage !== undefined;
    case "learn":
      return loaded.LearnPage !== undefined;
    case "errors":
      return loaded.ErrorsIndexPage !== undefined;
    case "error":
      return loaded.ErrorPage !== undefined;
    case "changelog":
      return loaded.ChangelogPage !== undefined;
    case "blog":
      return loaded.BlogPage !== undefined;
    case "blog-post":
      return loaded.BlogPostPage !== undefined;
    case "enterprise":
      return loaded.EnterprisePage !== undefined;
    case "status":
      return loaded.StatusPage !== undefined;
    case "merch":
      return loaded.MerchPage !== undefined;
    case "not-found":
      return true;
  }
}

function loadOnce(key: string, fn: () => Promise<void>): Promise<void> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = fn().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

/** Loads what `isRouteLoaded` checks, once. Link hover and focus call it too, so a click renders at once. */
export function preloadRoute(route: Route): Promise<void> {
  if (isRouteLoaded(route)) return Promise.resolve();
  switch (route.name) {
    case "home":
      return loadOnce("home", () =>
        import("./pages/Home").then((m) => {
          loaded.HomePage = m.HomePage;
        }),
      );
    case "docs": {
      const { slug } = route;
      // The page and its Markdown load in parallel.
      return Promise.all([
        loadOnce("docs", () =>
          import("./pages/Docs").then((m) => {
            loaded.DocsPage = m.DocsPage;
          }),
        ),
        import("./docs/registry").then((m) => {
          docs = m;
          return m.preloadDoc(slug);
        }),
      ]).then(() => undefined);
    }
    case "playground":
    case "opencode":
    case "coffee":
      return loadOnce("playground", () =>
        import("./pages/Playground").then((m) => {
          loaded.PlaygroundPage = m.PlaygroundPage;
        }),
      );
    case "learn":
      return loadOnce("learn", () =>
        import("./pages/Learn").then((m) => {
          loaded.LearnPage = m.LearnPage;
        }),
      );
    case "errors":
    case "error":
      return loadOnce("errors", () =>
        import("./pages/Errors").then((m) => {
          loaded.ErrorsIndexPage = m.ErrorsIndexPage;
          loaded.ErrorPage = m.ErrorPage;
        }),
      );
    case "changelog":
      return loadOnce("changelog", () =>
        import("./pages/Changelog").then((m) => {
          loaded.ChangelogPage = m.ChangelogPage;
        }),
      );
    case "blog":
      return loadOnce("blog", () =>
        import("./pages/Blog").then((m) => {
          loaded.BlogPage = m.BlogPage;
        }),
      );
    case "blog-post":
      return loadOnce("blog-post", () =>
        import("./pages/BlogPost").then((m) => {
          loaded.BlogPostPage = m.BlogPostPage;
        }),
      );
    case "enterprise":
      return loadOnce("enterprise", () =>
        import("./pages/Enterprise").then((m) => {
          loaded.EnterprisePage = m.EnterprisePage;
        }),
      );
    case "status":
      return loadOnce("status", () =>
        import("./pages/Status").then((m) => {
          loaded.StatusPage = m.StatusPage;
        }),
      );
    case "merch":
      return loadOnce("merch", () =>
        import("./merch/Merch").then((m) => {
          loaded.MerchPage = m.MerchPage;
        }),
      );
    case "not-found":
      return Promise.resolve();
  }
}

/** Every page module and every docs page (the prerenderer and tests). */
export async function preloadAllRoutes(): Promise<void> {
  const routes: Route[] = [
    { name: "home" },
    ...DOCS_META.map((d): Route => ({ name: "docs", slug: d.slug })),
    { name: "playground", preset: "dashboard" },
    { name: "learn", slug: "" },
    { name: "errors" },
    { name: "changelog" },
    { name: "blog" },
    { name: "blog-post", slug: "" },
    { name: "enterprise" },
    { name: "status" },
    { name: "merch", slug: "" },
  ];
  await Promise.all(routes.map((r) => preloadRoute(r)));
}
