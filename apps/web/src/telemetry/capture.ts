/**
 * The part of crash reporting that ships in the entry bundle: global listeners, a small buffer and
 * the stale-chunk reload. The reporter itself (`reporter.ts`) is a separate chunk loaded once the
 * page has hydrated and the browser is idle; until then errors wait in the buffer.
 *
 * Only `recoverFromChunkFailure` reloads, and only the callers loading the route the visitor is on
 * call it. A failed prefetch, companion or reporter import is reported and never navigates.
 */

import type { ReportKind } from "./shared";

/** `uncapped` reports don't count toward the per-page cap (still deduplicated). */
type Sink = (error: unknown, kind: ReportKind, uncapped?: boolean) => void;

const buffer: Array<[unknown, ReportKind, boolean]> = [];
let sink: Sink | null = null;
let reloading = false;
let prefetchReported = false;

/** Session keys: when the last automatic reload happened, and the failure that caused it. */
export const RELOAD_KEY = "textjs:chunk-reload";
export const RELOADED_KEY = "textjs:chunk-reloaded";
export const RELOAD_WINDOW_MS = 10 * 60_000;

const CHUNK_FAILURE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

/** A dynamic import that failed to load, usually a chunk from the previous deploy. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return CHUNK_FAILURE.test(message);
}

/**
 * At most one automatic reload per tab every 10 minutes, so a chunk that's really missing can't
 * cause a reload loop. Without sessionStorage there's no way to remember, so no reload.
 */
export function claimReload(storage: Pick<Storage, "getItem" | "setItem"> | null, now: number): boolean {
  if (!storage) return false;
  try {
    const last = Number(storage.getItem(RELOAD_KEY));
    if (last > 0 && now >= last && now - last < RELOAD_WINDOW_MS) return false;
    storage.setItem(RELOAD_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * For an import the current page can't render without (its route chunk): a chunk that failed to
 * load reloads the page once, so the visitor gets the new deploy. Anything else is reported.
 */
export function recoverFromChunkFailure(error: unknown): void {
  if (typeof window === "undefined" || reloading) return;
  if (!isChunkLoadError(error)) return report(error, "rejection");
  const storage = session();
  if (claimReload(storage, Date.now())) {
    reloading = true;
    try {
      // The next page load reports it (the reporter may not be loaded yet, and the page is going away).
      storage?.setItem(RELOADED_KEY, error instanceof Error ? error.message : String(error));
    } catch {
      // Reload anyway.
    }
    location.reload();
    return;
  }
  report(error, "chunk");
}

/** Report an error. Safe to call during prerendering (no-op) and before the reporter has loaded. */
export function report(error: unknown, kind: ReportKind, uncapped = false): void {
  if (typeof window === "undefined" || reloading) return;
  if (isChunkLoadError(error)) kind = "chunk";
  if (sink) sink(error, kind, uncapped);
  else if (buffer.length < 10) buffer.push([error, kind, uncapped]);
}

/**
 * `.catch` for speculative loads (link prefetches, warming the companion's tabs). Handling the
 * rejection keeps red `Uncaught (in promise)` rows out of DevTools, where the companion renders.
 * A stale chunk is reported once per page, outside the cap; a module that loaded but threw is a
 * real bug and is reported like any other. A click prefetches and navigates with the same import,
 * so the decision waits a task: if the navigation reloads the page, there's nothing to report.
 */
export function prefetchFailed(error: unknown): void {
  setTimeout(() => {
    if (reloading) return;
    if (!isChunkLoadError(error)) return report(error, "rejection");
    if (prefetchReported) return;
    prefetchReported = true;
    report(error, "chunk", true);
  }, 0);
}

function consoleRootError(error: unknown): void {
  console.error(error);
  report(error, "console");
}

/** Error handlers for `createConsoleRoot`: log like the defaults do, and report. */
export const consoleRootErrors = { onUncaughtError: consoleRootError, onCaughtError: consoleRootError } as const;

export function installCapture(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event) => {
    // Errors from browser extensions and other origins' scripts aren't ours to fix. Events without
    // an error value are cross-origin `Script error.` or browser notices such as `ResizeObserver loop`.
    if (event.error == null || (event.filename && !event.filename.startsWith(`${location.origin}/`))) return;
    report(event.error, "error");
  });
  window.addEventListener("unhandledrejection", (event) => report(event.reason, "rejection"));
}

/** Load the reporter after hydration, when the browser is idle. Production builds only. */
export function startReporter(): void {
  if (typeof window === "undefined" || !import.meta.env.PROD || sink) return;
  const load = (): void => {
    import("./reporter").then(
      (m) => {
        if (sink) return;
        sink = m.createSink();
        for (const [error, kind, uncapped] of buffer.splice(0)) sink(error, kind, uncapped);
      },
      () => undefined,
    );
  };
  const idle = (): void => {
    if (typeof requestIdleCallback === "function") requestIdleCallback(load, { timeout: 4000 });
    else setTimeout(load, 1000);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}
