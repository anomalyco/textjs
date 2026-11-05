import { useEffect, useState, type ReactNode } from "react";
import { siteStore } from "../console-companion/store";

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
    enginePromise = Promise.all([import("../docs/search"), import("./search-aliases")]).then(([idx, al]) => {
      engineCache = { searchDocsMeta: idx.searchDocsMeta, aliasResults: al.aliasResults };
      return engineCache;
    });
    // A failed download (a chunk gone after a deploy, say) is tried again next time.
    enginePromise.catch(() => (enginePromise = null));
  }
  return enginePromise;
}

/** Download the search dialog, then its index (a search button hovered or focused, ⌘ or Ctrl pressed). */
export function preloadSearchDialog(): Promise<DialogModule> {
  if (dialogCache) return Promise.resolve(dialogCache);
  if (!dialogPromise) {
    // The dialog first, so the index doesn't share its bandwidth: until the index loads, the dialog matches titles.
    dialogPromise = import("./SearchDialog").then((m) => {
      dialogCache = m;
      void preloadSearchEngine();
      return m;
    });
    dialogPromise.catch(() => (dialogPromise = null));
  }
  return dialogPromise;
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
    const load = (): void => {
      void preloadSearchDialog()
        .then((m) => {
          setDialog(m);
          return preloadSearchEngine();
        })
        .then(setEngine);
    };
    const l = (v: boolean): void => {
      if (v) load();
      setOpen(v);
    };
    openListeners.add(l);
    const onKey = (e: KeyboardEvent): void => {
      // ⌘ or Ctrl comes down before the K: fetch the dialog in that gap.
      if (e.key === "Meta" || e.key === "Control") return void preloadSearchDialog();
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
