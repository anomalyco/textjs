import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { getLoadedRoutes, isRouteLoaded, preloadRoute } from "./route-loader";
import { A, matchRoute, titleFor, useLocation, type LocationState, type Route } from "./router";
import { ConsolePill, Footer, Header } from "./site/Chrome";
import { SearchModal } from "./site/SearchModal";
import { recoverFromChunkFailure, report } from "./telemetry/capture";
import { safeDecode } from "./url";

export function NotFoundPage(): ReactNode {
  return (
    <div className="container notfound">
      <h1>
        <b>404</b>This page could not be found.
      </h1>
      <A href="/" className="btn btn-secondary btn-sm">
        ← Back home
      </A>
    </div>
  );
}

/** Test-only (`scripts/e2e-reports.mjs`): throws after hydration on any host but textjs.org. */
export const THROW_TEST_PATH = "/__textjs/throw";

function isThrowTest(): boolean {
  return typeof window !== "undefined" && location.pathname === THROW_TEST_PATH && !/(^|\.)textjs\.org$/.test(location.hostname);
}

function ThrowTest(): ReactNode {
  const [thrown, setThrown] = useState(false);
  useEffect(() => setThrown(true), []);
  if (thrown) throw new Error("Text.js test route threw on purpose");
  return <NotFoundPage />;
}

export function RouteView({ route }: { route: Route }): ReactNode {
  const r = getLoadedRoutes();
  switch (route.name) {
    case "home":
      return r.HomePage ? <r.HomePage /> : null;
    case "docs":
      return r.DocsPage ? <r.DocsPage slug={route.slug} /> : null;
    // OpenCode and terminal.shop are the last two Playground demos, at their own URLs.
    case "playground":
      return r.PlaygroundPage ? <r.PlaygroundPage demo={route.preset} /> : null;
    case "opencode":
    case "coffee":
      return r.PlaygroundPage ? <r.PlaygroundPage demo={route.name} /> : null;
    case "learn":
      return r.LearnPage ? <r.LearnPage slug={route.slug} /> : null;
    case "errors":
      return r.ErrorsIndexPage ? <r.ErrorsIndexPage /> : null;
    case "error":
      return r.ErrorPage ? <r.ErrorPage code={route.code} /> : null;
    case "changelog":
      return r.ChangelogPage ? <r.ChangelogPage /> : null;
    case "blog":
      return r.BlogPage ? <r.BlogPage /> : null;
    case "blog-post":
      return r.BlogPostPage ? <r.BlogPostPage slug={route.slug} /> : null;
    case "enterprise":
      return r.EnterprisePage ? <r.EnterprisePage /> : null;
    case "status":
      return r.StatusPage ? <r.StatusPage /> : null;
    case "merch":
      return r.MerchPage ? <r.MerchPage slug={route.slug} /> : null;
    case "not-found":
      return isThrowTest() ? <ThrowTest /> : <NotFoundPage />;
  }
}

export function App(): ReactNode {
  const location = useLocation();
  const targetRoute = matchRoute(location.pathname);
  const [displayed, setDisplayed] = useState<LocationState>(location);

  // If the target route module is already loaded, transition synchronously in the same render;
  // otherwise keep the previous view mounted until the chunk (and its CSS) finishes loading so
  // <main> never collapses to 0px and causes a layout shift.
  const readyNow = isRouteLoaded(targetRoute.name);
  const activeLocation = readyNow ? location : displayed;
  if (readyNow && displayed !== location) {
    setDisplayed(location);
  }

  useEffect(() => {
    if (readyNow) return;
    let alive = true;
    preloadRoute(targetRoute.name).then(
      () => {
        if (alive) setDisplayed(location);
      },
      // Only the page the visitor is still waiting for may reload; an abandoned navigation just reports.
      (error: unknown) => (alive ? recoverFromChunkFailure(error) : report(error, "rejection")),
    );
    return () => {
      alive = false;
    };
  }, [readyNow, targetRoute.name, location]);

  const route = matchRoute(activeLocation.pathname);
  const first = useRef(true);

  useEffect(() => {
    document.title = titleFor(targetRoute);
  }, [location.pathname]);

  useLayoutEffect(() => {
    const initial = first.current;
    first.current = false;
    if (activeLocation.hash) {
      const id = safeDecode(activeLocation.hash.slice(1));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    } else if (!initial) window.scrollTo(0, 0);
  }, [activeLocation.key]);

  return (
    <>
      <Header />
      <main>
        <RouteView route={route} />
      </main>
      {/* Docs and learn chapters render the footer inside their content column, so their sticky sidebars stay pinned to the bottom. */}
      {route.name === "docs" || (route.name === "learn" && route.slug !== "") ? null : <Footer />}
      <ConsolePill />
      <SearchModal />
    </>
  );
}
