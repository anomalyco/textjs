import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { prefetchFailed } from "../telemetry/capture";

type LogoMenuModule = typeof import("./LogoMenu");
let menuCache: LogoMenuModule | null = null;
let menuPromise: Promise<LogoMenuModule> | null = null;

function loadLogoMenu(): Promise<LogoMenuModule> {
  if (menuCache) return Promise.resolve(menuCache);
  if (!menuPromise) {
    const promise = import("./LogoMenu").then((m) => {
      menuCache = m;
      return m;
    });
    menuPromise = promise;
    // A failed download (a chunk gone after a deploy, say) is reported, and tried again next time.
    promise.catch((error: unknown) => {
      if (menuPromise === promise) menuPromise = null;
      prefetchFailed(error);
    });
  }
  return menuPromise;
}

/** Download the logo menu, before the right-click that opens it (the pointer or focus reaching the logo). */
export function preloadLogoMenu(): void {
  loadLogoMenu().catch(() => undefined);
}

export interface LogoMenuState {
  x: number;
  y: number;
  /** Element that opened the menu; focus returns to it on close. */
  opener: HTMLElement;
}

/**
 * Vercel-style logo menu. Opens on right-click with a fine pointer (Shift+right-click keeps the
 * native menu, touch keeps long-press link behaviour) and on the context-menu key.
 */
export function useLogoMenu(): [LogoMenuState | null, (e: MouseEvent<HTMLElement>) => void, () => void] {
  const [state, setState] = useState<LogoMenuState | null>(null);
  const open = (e: MouseEvent<HTMLElement>): void => {
    if (e.shiftKey) return;
    const keyboard = e.clientX === 0 && e.clientY === 0;
    if (!keyboard && !matchMedia("(pointer: fine)").matches) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setState({ x: keyboard ? r.left : e.clientX, y: keyboard ? r.bottom + 4 : e.clientY, opener: e.currentTarget });
  };
  const close = useCallback(() => setState(null), []);
  return [state, open, close];
}

/** The logo menu, once its code has loaded. Until then, anything the visitor does next closes it. */
export function LogoMenu(props: { state: LogoMenuState; onClose: () => void }): ReactNode {
  const [menu, setMenu] = useState<LogoMenuModule | null>(() => menuCache);
  const { onClose } = props;
  useEffect(() => {
    if (menu) return;
    let alive = true;
    loadLogoMenu().then(
      (m) => alive && setMenu(m),
      () => alive && onClose(),
    );
    // A slow download never pops the menu up later, at a stale spot.
    const close = (): void => onClose();
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", close, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("blur", close);
    return () => {
      alive = false;
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", close, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("blur", close);
    };
  }, [menu, onClose]);
  return menu ? <menu.LogoMenu {...props} /> : null;
}
