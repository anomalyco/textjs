import { canPrefetchConsole } from "@textjs/core/experimental";
import { useEffect, useState, type ReactNode } from "react";
import { siteStore } from "../console-companion/store";
import { prefetchFailed, recoverFromChunkFailure } from "../telemetry/capture";

export type SearchEngine = {
  searchDocsMeta: typeof import("../docs/search").searchDocsMeta;
  aliasResults: typeof import("./search-aliases").aliasResults;
};
type DialogModule = typeof import("./SearchDialog");

const openListeners = new Set<(open: boolean) => void>();
let dialogCache: DialogModule | null = null;
let dialogPromise: Promise<DialogModule> | null = null;
let engineCache: SearchEngine | null = null;
let enginePromise: Promise<SearchEngine> | null = null;

function preloadSearchEngine(): Promise<SearchEngine> {
  if (engineCache) return Promise.resolve(engineCache);
  if (!enginePromise) {
    const promise = Promise.all([import("../docs/search"), import("./search-aliases")]).then(([idx, al]) => {
      engineCache = { searchDocsMeta: idx.searchDocsMeta, aliasResults: al.aliasResults };
      return engineCache;
    });
    enginePromise = promise;
    // A failed download is tried again next time; callers decide whether it's worth a report or a reload.
    promise.catch(() => {
      if (enginePromise === promise) enginePromise = null;
    });
  }
  return enginePromise;
}

/** Download the search dialog without its index (⌘ or Ctrl going down, before the K). */
export function preloadSearchDialog(): Promise<DialogModule> {
  if (dialogCache) return Promise.resolve(dialogCache);
  if (!dialogPromise) {
    const promise = import("./SearchDialog").then((m) => {
      dialogCache = m;
      return m;
    });
    dialogPromise = promise;
    promise.catch(() => {
      if (dialogPromise === promise) dialogPromise = null;
    });
  }
  return dialogPromise;
}

/** Download the search dialog, then its index (a search button pressed, hovered or focused). */
export function preloadSearch(): void {
  preloadSearchDialog().then(preloadSearchEngine).catch(prefetchFailed);
}

export function openSearch(): void {
  for (const l of openListeners) l(true);
}

/** ⌘K and the search buttons open the dialog; its code loads the first time it's wanted. */
export function SearchModal(): ReactNode {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogModule | null>(() => dialogCache);
  const [engine, setEngine] = useState<SearchEngine | null>(() => engineCache);

  useEffect(() => {
    // The dialog first, so the index doesn't share its bandwidth: until the index loads, the dialog matches titles.
    // Without the dialog there's nothing to show; like a page chunk, a stale one reloads the page once.
    const load = (): void => {
      preloadSearchDialog().then(
        (m) => {
          setDialog(m);
          preloadSearchEngine().then(setEngine, prefetchFailed);
        },
        (error: unknown) => {
          setOpen(false);
          recoverFromChunkFailure(error);
        },
      );
    };
    const l = (v: boolean): void => {
      if (v) load();
      setOpen(v);
    };
    openListeners.add(l);
    const onKey = (e: KeyboardEvent): void => {
      // ⌘ or Ctrl comes down before the K: fetch the dialog in that gap.
      if (e.key === "Meta" || e.key === "Control") {
        if (!e.repeat && !e.altKey && !e.shiftKey && canPrefetchConsole()) preloadSearchDialog().catch(prefetchFailed);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        // An example running in the console keeps the Ctrl+K it received (its command palette); ⌘K still searches.
        if (e.defaultPrevented && siteStore.getSnapshot().example !== null) return;
        e.preventDefault();
        setOpen((v) => {
          const next = !v;
          if (next) load();
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      openListeners.delete(l);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!open || !dialog) return null;
  return <dialog.SearchDialog engine={engine} onClose={() => setOpen(false)} />;
}
