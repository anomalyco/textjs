import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { BlogPage } from "./pages/Blog";
import { BlogPostPage } from "./pages/BlogPost";
import { ChangelogPage } from "./pages/Changelog";
import { DocsPage } from "./pages/Docs";
import { EnterprisePage } from "./pages/Enterprise";
import { ErrorPage, ErrorsIndexPage } from "./pages/Errors";
import { HomePage } from "./pages/Home";
import { LearnPage } from "./pages/Learn";
import { MerchPage } from "./merch/Merch";
import { PlaygroundPage } from "./pages/Playground";
import { StatusPage } from "./pages/Status";
import { A, matchRoute, titleFor, useLocation, type Route } from "./router";
import { ConsolePill, Footer, Header } from "./site/Chrome";
import { SearchModal } from "./site/SearchModal";
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

export function RouteView({ route }: { route: Route }): ReactNode {
  switch (route.name) {
    case "home":
      return <HomePage />;
    case "docs":
      return <DocsPage slug={route.slug} />;
    // OpenCode and terminal.shop are the last two Playground demos, at their own URLs.
    case "playground":
      return <PlaygroundPage demo={route.preset} />;
    case "opencode":
    case "coffee":
      return <PlaygroundPage demo={route.name} />;
    case "learn":
      return <LearnPage slug={route.slug} />;
    case "errors":
      return <ErrorsIndexPage />;
    case "error":
      return <ErrorPage code={route.code} />;
    case "changelog":
      return <ChangelogPage />;
    case "blog":
      return <BlogPage />;
    case "blog-post":
      return <BlogPostPage slug={route.slug} />;
    case "enterprise":
      return <EnterprisePage />;
    case "status":
      return <StatusPage />;
    case "merch":
      return <MerchPage slug={route.slug} />;
    case "not-found":
      return <NotFoundPage />;
  }
}

export function App(): ReactNode {
  const location = useLocation();
  const route = matchRoute(location.pathname);
  const first = useRef(true);

  useEffect(() => {
    document.title = titleFor(route);
  }, [location.pathname]);

  useLayoutEffect(() => {
    const initial = first.current;
    first.current = false;
    if (location.hash) {
      const id = safeDecode(location.hash.slice(1));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    } else if (!initial) window.scrollTo(0, 0);
  }, [location.key]);

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
