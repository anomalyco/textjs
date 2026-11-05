import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

type LogoMenuModule = typeof import("./LogoMenu");
let menuCache: LogoMenuModule | null = null;
let menuPromise: Promise<LogoMenuModule> | null = null;

/** Download the logo menu, before the right-click that opens it (the pointer or focus reaching the logo). */
export function preloadLogoMenu(): Promise<LogoMenuModule> {
  if (menuCache) return Promise.resolve(menuCache);
  if (!menuPromise) {
    menuPromise = import("./LogoMenu").then((m) => {
      menuCache = m;
      return m;
    });
    // A failed download (a chunk gone after a deploy, say) is tried again next time.
    menuPromise.catch(() => (menuPromise = null));
  }
  return menuPromise;
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
  return [state, open, () => setState(null)];
}

/** The logo menu, once its code has loaded. */
export function LogoMenu(props: { state: LogoMenuState; onClose: () => void }): ReactNode {
  const [menu, setMenu] = useState<LogoMenuModule | null>(() => menuCache);
  useEffect(() => {
    if (!menu) void preloadLogoMenu().then(setMenu);
  }, [menu]);
  return menu ? <menu.LogoMenu {...props} /> : null;
}
