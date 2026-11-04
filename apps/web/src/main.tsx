import "./console-baseline";
import { canPrefetchConsole, CONSOLE_INTENT_KEY, onConsoleIntent, type ConsoleIntentHandle } from "@textjs/core/experimental";
import { installCapture, isChunkLoadError, prefetchFailed, recoverFromChunkFailure, report, startReporter } from "./telemetry/capture";
import { createRoot, hydrateRoot } from "react-dom/client";
import { activateCompanion, COMPANION_CONTROLS, configureCompanionLoader, engagesConsole, ensureCompanion } from "./console-companion/bridge";
import { isPadRoute, tabForPath } from "./console-companion/store";
import { Root } from "./Root";
import { preloadRoute } from "./route-loader";
import { getLocation, matchRoute, normalizePath, registerHrefPrefetcher, subscribeLocation } from "./router";
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

let warming: Promise<typeof import("./console-companion/boot")> | null = null;

/** Download the console companion's code without booting it. */
function warmCompanion(): Promise<typeof import("./console-companion/boot")> {
  if (warming) return warming;
  const promise = Promise.all([import("./console-companion/boot"), import("./console-companion/tabs-loader")]).then(([boot, tabs]) => {
    preloadCompanionForPath = (pathname) => {
      tabs.preloadCompanionTab(tabForPath(pathname)).catch(prefetchFailed);
    };
    return boot;
  });
  warming = promise;
  promise.catch(() => {
    if (warming === promise) warming = null;
  });
  return promise;
}

/** Warm the companion and the current page's console view, for a visitor likely to open the console (once). */
function prefetchCompanion(): void {
  if (warming) return;
  warmCompanion().then(() => preloadCompanionForPath?.(getLocation().pathname), prefetchFailed);
}

// The companion (React's console renderer, Yoga and the console app) loads only once the visitor
// shows they want the console; until then the hero mirrors a prerendered frame.
configureCompanionLoader(() => {
  // Started from a page control (the Console pill, "Run in console"): remember it for the tab, as an "engage" would be.
  if (intent && !intent.triggered) {
    intent.dispose();
    stopNotingPresses();
    try {
      sessionStorage.setItem(CONSOLE_INTENT_KEY, "1");
    } catch {
      // Storage may be blocked.
    }
  }
  const promise = warmCompanion().then((m) => m.bootCompanion());
  promise.catch((error: unknown) => {
    // A chunk from an older deploy: reload once. Intent is remembered for the tab, so the console boots after it.
    if (isChunkLoadError(error)) return recoverFromChunkFailure(error);
    console.error("▼ Text.js companion failed to boot", error);
    report(error, "console");
  });
  return promise;
});

/** Pads and courses: visitors there are about to use the console, so its code downloads on idle. */
function warmsOnIdle(pathname: string): boolean {
  return isPadRoute(pathname) || pathname === "/learn" || pathname.startsWith("/learn/");
}

// The press that signalled "engage", so a click on a console surface also gives it the keyboard
// (boot's own listener for that isn't attached yet). A size picked in a pad's menu doesn't count.
let press: Element | null = null;
const notePress = (e: Event): void => {
  press = e.target instanceof Element ? e.target : null;
};
const forgetPress = (): void => {
  press = null;
};
const pressEvents = [
  ["mousedown", notePress],
  ["click", notePress],
  ["textjs:engage", forgetPress],
] as const;
for (const [type, fn] of pressEvents) document.addEventListener(type, fn, true);
function stopNotingPresses(): void {
  for (const [type, fn] of pressEvents) document.removeEventListener(type, fn, true);
}

// Assigned after the call: a docked panel or a remembered tab fires before `onConsoleIntent` returns.
let intent: ConsoleIntentHandle | null = null;
intent = onConsoleIntent(
  ({ reason }) => {
    stopNotingPresses();
    const { pathname } = getLocation();
    if (reason === "engage" && press !== null && engagesConsole(press, false, pathname)) activateCompanion();
    else void ensureCompanion();
  },
  { prefetch: prefetchCompanion, idlePrefetch: warmsOnIdle(getLocation().pathname) },
);

// Controls that start the console on click (the Console pill, "Run in console") warm it on hover, like console surfaces do.
const warmOnHover = (e: Event): void => {
  if ((e.target as Element | null)?.closest?.(COMPANION_CONTROLS) && canPrefetchConsole()) prefetchCompanion();
};
document.addEventListener("pointerover", warmOnHover, { capture: true, passive: true });
document.addEventListener("focusin", warmOnHover, { capture: true, passive: true });

// Landing on a pad or course by client-side navigation warms the companion on idle too.
subscribeLocation(() => {
  if (warming || !warmsOnIdle(getLocation().pathname) || !canPrefetchConsole()) return;
  if (typeof requestIdleCallback === "function") requestIdleCallback(prefetchCompanion, { timeout: 5000 });
  else setTimeout(prefetchCompanion, 1);
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
