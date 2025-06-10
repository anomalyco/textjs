import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { DocsPage } from "./pages/Docs";
import { HomePage } from "./pages/Home";
import { OpenCodePage } from "./pages/OpenCode";
import { PlaygroundPage } from "./pages/Playground";
import { ShowcasePage } from "./pages/Showcase";
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
      <p className="subtle" style={{ margin: 0 }}>
        It may have been rendered into a console that has since been cleared.
      </p>
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
    case "playground":
      return <PlaygroundPage />;
    case "opencode":
      return <OpenCodePage />;
    case "showcase":
      return <ShowcasePage />;
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
      <Footer />
      <ConsolePill />
      <SearchModal />
    </>
  );
}
