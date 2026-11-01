import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { siteStore } from "../console-companion/store";

type DialogProps = { open: boolean; onClose: () => void };

const openListeners = new Set<(open: boolean) => void>();
let dialogComp: ComponentType<DialogProps> | null = null;
let dialogPromise: Promise<ComponentType<DialogProps>> | null = null;

export function preloadSearchDialog(): Promise<ComponentType<DialogProps>> {
  if (dialogComp) return Promise.resolve(dialogComp);
  if (!dialogPromise) {
    dialogPromise = import("./SearchDialog").then((m) => {
      dialogComp = m.SearchDialog;
      return m.SearchDialog;
    });
  }
  return dialogPromise;
}

export function openSearch(): void {
  void preloadSearchDialog();
  for (const l of openListeners) l(true);
}

export function SearchModal(): ReactNode {
  const [open, setOpen] = useState(false);
  const [Dialog, setDialog] = useState<ComponentType<DialogProps> | null>(() => dialogComp);

  useEffect(() => {
    const l = (v: boolean): void => {
      if (v) void preloadSearchDialog().then((c) => setDialog(() => c));
      setOpen(v);
    };
    openListeners.add(l);
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        // An example running in the console keeps the Ctrl+K it received (its command palette); ⌘K still searches.
        if (e.defaultPrevented && siteStore.getSnapshot().example !== null) return;
        e.preventDefault();
        setOpen((v) => {
          const next = !v;
          if (next) void preloadSearchDialog().then((c) => setDialog(() => c));
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

  if (!open || !Dialog) return null;
  return <Dialog open={open} onClose={() => setOpen(false)} />;
}
