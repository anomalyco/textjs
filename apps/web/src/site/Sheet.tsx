import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

let locks = 0;

/** Locks page scrolling while any overlay is open (nesting-safe). */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    // `scrollbar-gutter: stable` on <html> keeps the scrollbar's space reserved, so nothing shifts.
    if (locks++ === 0) root.style.overflow = "hidden";
    return () => {
      if (--locks === 0) root.style.overflow = "";
    };
  }, [active]);
}

/** Closes when the viewport grows past `query` (e.g. a mobile-only sheet on rotate/resize). */
export function useCloseOnMedia(open: boolean, query: string, close: () => void): void {
  useEffect(() => {
    if (!open || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const onChange = (): void => {
      if (mq.matches) close();
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open, query]);
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  id?: string;
  label: string;
  /** `top` drops below the site header; `left` slides over from the left edge. */
  side: "top" | "left";
  className?: string;
  children: ReactNode;
}

/**
 * A modal sheet portaled to <body>, so it always paints above page content
 * (outside the header's backdrop-filter stacking context). Scrim click and
 * Escape close it; page scrolling is locked while open; focus is restored.
 * A `top` sheet leaves the header (and its toggle button) usable, so it is not
 * marked aria-modal.
 */
export function Sheet({ open, onClose, id, label, side, className, children }: SheetProps): ReactNode {
  const panel = useRef<HTMLDivElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
      const el = panel.current;
      if (!el) return;
      const current = el.querySelector<HTMLElement>("[aria-current='page']");
      current?.scrollIntoView({ block: "center" });
      el.focus({ preventScroll: true });
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={`sheet-layer sheet-${side}`} data-console-bypass="">
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={panel} id={id} className={`sheet-panel ${className ?? ""}`} role="dialog" aria-modal={side === "top" ? undefined : true} aria-label={label} tabIndex={-1}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
