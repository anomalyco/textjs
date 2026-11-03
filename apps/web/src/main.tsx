import "./console-baseline";
import { installCapture, prefetchFailed, recoverFromChunkFailure, report, startReporter } from "./telemetry/capture";
import { createRoot, hydrateRoot } from "react-dom/client";
import { setBootingCompanion } from "./console-companion/bridge";
import { tabForPath } from "./console-companion/store";
import { Root } from "./Root";
import { preloadRoute } from "./route-loader";
import { getLocation, matchRoute, normalizePath, registerHrefPrefetcher } from "./router";
import "./styles.css";

installCapture();

/** Whether the prerendered markup (`data-route`) was rendered for the route we're on now. */
function prerenderedFor(container: HTMLElement): boolean {
  const pre = container.dataset.route;
  if (pre === undefined || container.firstElementChild === null) return false;
  const here = getLocation().pathname;
  if (normalizePath(pre) === here) return true;
  return matchRoute(pre).name === "not-found" && matchRoute(here).name === "not-found";
}

// Register link prefetching for both DOM route chunks (with a docs page's Markdown) and console companion tabs.
let preloadCompanionForPath: ((pathname: string) => void) | null = null;
registerHrefPrefetcher((pathname) => {
  preloadRoute(matchRoute(pathname)).catch(prefetchFailed);
  preloadCompanionForPath?.(pathname);
});

// Start booting the console companion in parallel without blocking DOM hydration or first paint.
const companionPromise = import("./console-companion/boot").then(async (m) => {
  const tabs = await import("./console-companion/tabs-loader");
  preloadCompanionForPath = (pathname) => {
    tabs.preloadCompanionTab(tabForPath(pathname)).catch(prefetchFailed);
  };
  return m.bootCompanion();
});
setBootingCompanion(companionPromise);
companionPromise.catch((error: unknown) => {
  console.error("▼ Text.js companion failed to boot", error);
  report(error, "console");
});

// Preload the matched route's chunks (modulepreloaded in HTML, so they resolve in a microtask) before hydrating.
void preloadRoute(matchRoute(getLocation().pathname))
  .then(() => {
    const container = document.getElementById("root");
    if (!container) return;
    if (prerenderedFor(container)) hydrateRoot(container, <Root />);
    else {
      container.textContent = "";
      createRoot(container).render(<Root />);
    }
  }, recoverFromChunkFailure)
  .finally(startReporter);
