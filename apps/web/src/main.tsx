import "./console-baseline";
import { createRoot, hydrateRoot } from "react-dom/client";
import { setBootingCompanion } from "./console-companion/bridge";
import { tabForPath } from "./console-companion/store";
import { Root } from "./Root";
import { preloadRoute } from "./route-loader";
import { getLocation, matchRoute, normalizePath, registerHrefPrefetcher } from "./router";
import "./styles.css";

/** Whether the prerendered markup (`data-route`) was rendered for the route we're on now. */
function prerenderedFor(container: HTMLElement): boolean {
  const pre = container.dataset.route;
  if (pre === undefined || container.firstElementChild === null) return false;
  const here = getLocation().pathname;
  if (normalizePath(pre) === here) return true;
  return matchRoute(pre).name === "not-found" && matchRoute(here).name === "not-found";
}

// Register link prefetching for both DOM route chunks and console companion tabs.
let preloadCompanionForPath: ((pathname: string) => void) | null = null;
registerHrefPrefetcher((pathname) => {
  void preloadRoute(matchRoute(pathname).name);
  preloadCompanionForPath?.(pathname);
});

// Start booting the console companion in parallel without blocking DOM hydration or first paint.
const companionPromise = import("./console-companion/boot").then(async (m) => {
  const tabs = await import("./console-companion/tabs-loader");
  preloadCompanionForPath = (pathname) => {
    void tabs.preloadCompanionTab(tabForPath(pathname));
  };
  return m.bootCompanion();
});
setBootingCompanion(companionPromise);
companionPromise.catch((error: unknown) => console.error("▼ Text.js companion failed to boot", error));

// Preload the matched route chunk (modulepreloaded in HTML, so it resolves in a microtask) before hydrating.
const initialRoute = matchRoute(getLocation().pathname);
void preloadRoute(initialRoute.name).then(() => {
  const container = document.getElementById("root");
  if (!container) return;
  if (prerenderedFor(container)) hydrateRoot(container, <Root />);
  else {
    container.textContent = "";
    createRoot(container).render(<Root />);
  }
});
