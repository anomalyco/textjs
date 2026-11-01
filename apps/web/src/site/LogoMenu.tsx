import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M2 4h20L12 21.5z" fill="#000"/></svg>\n';
export const WORDMARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="24" viewBox="0 0 100 24"><path d="M2 4h20L12 21.5z" fill="#000"/><text x="32" y="18" font-family="Geist, Inter, Helvetica, Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="-0.72" fill="#000">Text.js</text></svg>\n';

interface Item {
  label: string;
  copy: () => Promise<string>;
}

const ITEMS: readonly Item[] = [
  { label: "Copy Logo as SVG", copy: async () => LOGO_SVG },
  { label: "Copy Wordmark as SVG", copy: async () => WORDMARK_SVG },
  { label: "Copy Logo as console.log", copy: async () => (await import("./logo-console")).LOGO_CONSOLE_LOG },
];

const MENU_WIDTH = 232;

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

export function LogoMenu({ state, onClose }: { state: LogoMenuState; onClose: () => void }): ReactNode {
  const menu = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [pos, setPos] = useState({ left: state.x, top: state.y });

  const close = (): void => {
    onClose();
    state.opener.focus();
  };

  useLayoutEffect(() => {
    const el = menu.current;
    if (!el) return;
    const h = el.offsetHeight;
    setPos({ left: Math.max(8, Math.min(state.x, window.innerWidth - MENU_WIDTH - 8)), top: Math.max(8, Math.min(state.y, window.innerHeight - h - 8)) });
    el.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [state]);

  useEffect(() => {
    const outside = (e: Event): void => {
      if (!menu.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("blur", onClose);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  useEffect(() => {
    if (copied === null) return;
    const id = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number): void => items[(to + items.length) % items.length]?.focus();
    if (e.key === "ArrowDown") move(i + 1);
    else if (e.key === "ArrowUp") move(i - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(items.length - 1);
    else if (e.key === "Escape" || e.key === "Tab") close();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return createPortal(
    <div ref={menu} className="logo-menu" role="menu" aria-label="Logo" style={pos} onKeyDown={onKeyDown} onContextMenu={(e) => e.preventDefault()} data-console-bypass="">
      {ITEMS.map((item, i) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => {
            void item
              .copy()
              .then((text) => navigator.clipboard?.writeText(text))
              .then(() => setCopied(i))
              .catch(() => undefined);
          }}
        >
          {copied === i ? "Copied" : item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
