import "./console-baseline";
import { createRoot, hydrateRoot } from "react-dom/client";
import { bootCompanion } from "./console-companion/boot";
import { Root } from "./Root";
import { getLocation, matchRoute, normalizePath } from "./router";
import "./styles.css";
import "./pages/resources.css";

/** Whether the prerendered markup (`data-route`) was rendered for the route we're on now. */
function prerenderedFor(container: HTMLElement): boolean {
  const pre = container.dataset.route;
  if (pre === undefined || container.firstElementChild === null) return false;
  const here = getLocation().pathname;
  if (normalizePath(pre) === here) return true;
  return matchRoute(pre).name === "not-found" && matchRoute(here).name === "not-found";
}

const container = document.getElementById("root");
if (container) {
  if (prerenderedFor(container)) hydrateRoot(container, <Root />);
  else {
    container.textContent = "";
    createRoot(container).render(<Root />);
  }
}

// The second React root: a real Text.js app rendering into your DevTools console.
bootCompanion().catch((error: unknown) => console.error("▼ Text.js companion failed to boot", error));
