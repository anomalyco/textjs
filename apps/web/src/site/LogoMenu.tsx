import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { t } from "../i18n/t";

export const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M2 4h20L12 21.5z" fill="#000"/></svg>\n';
// "Text.js" is Geist Bold (18px, -0.04em tracking) converted to outlines, so the file renders anywhere.
export const WORDMARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="89" height="24" viewBox="0 0 89 24"><path d="M2 4h20L12 21.5z" fill="#000"/><path d="M38.77 18L36.01 18L36.01 7.52L32.20 7.52L32.20 5.22L42.60 5.22L42.60 7.52L38.77 7.52M46.15 18.22Q44.67 18.22 43.58 17.59Q42.49 16.96 41.89 15.83Q41.29 14.71 41.29 13.18Q41.29 11.66 41.88 10.53Q42.48 9.40 43.56 8.77Q44.65 8.14 46.13 8.14Q47.57 8.14 48.63 8.77Q49.69 9.40 50.28 10.57Q50.86 11.74 50.86 13.36L50.86 13.90L44.08 13.90Q44.13 15.05 44.70 15.61Q45.27 16.16 46.20 16.16Q47.61 16.16 48 14.99L50.72 15.16Q50.32 16.60 49.11 17.41Q47.89 18.22 46.15 18.22M44.08 12.24L48.09 12.24Q48.04 11.18 47.51 10.66Q46.98 10.13 46.13 10.13Q45.28 10.13 44.73 10.68Q44.19 11.23 44.08 12.24M53.40 18L50.49 18L53.92 13.10L50.58 8.35L53.44 8.35L55.51 11.45L57.51 8.35L60.44 8.35L57.11 13.12L60.53 18L57.67 18L55.54 14.72M67.30 18L64.96 18Q63.46 18 62.76 17.31Q62.06 16.61 62.06 15.10L62.06 10.37L60.51 10.37L60.51 8.35L62.06 8.35L62.06 6.08L64.76 6.08L64.76 8.35L67.30 8.35L67.30 10.37L64.76 10.37L64.76 14.78Q64.76 15.48 65.06 15.73Q65.35 15.98 65.95 15.98L67.30 15.98M71.24 18L68.31 18L68.31 15.25L71.24 15.25M72.73 20.70L71.11 20.70L71.11 18.68L72.19 18.68Q72.72 18.68 72.99 18.47Q73.26 18.25 73.26 17.60L73.26 8.35L75.96 8.35L75.96 17.68Q75.96 19.30 75.23 20Q74.50 20.70 72.73 20.70M75.99 7.16L73.20 7.16L73.20 5L75.99 5M81.54 18.22Q79.20 18.22 78.10 17.30Q77 16.38 76.89 14.96L79.63 14.87Q79.75 15.55 80.19 15.93Q80.62 16.31 81.54 16.31Q83.03 16.31 83.03 15.34Q83.03 15.03 82.89 14.83Q82.74 14.63 82.33 14.48Q81.91 14.33 81.10 14.20Q79.59 13.93 78.74 13.56Q77.88 13.19 77.53 12.63Q77.18 12.06 77.18 11.23Q77.18 9.85 78.26 8.99Q79.34 8.14 81.48 8.14Q82.92 8.14 83.86 8.57Q84.79 9 85.27 9.76Q85.75 10.51 85.82 11.45L83.12 11.56Q83.08 10.89 82.68 10.47Q82.27 10.04 81.45 10.04Q80.73 10.04 80.35 10.34Q79.97 10.64 79.97 11.12Q79.97 11.65 80.34 11.91Q80.71 12.17 81.70 12.31Q83.23 12.55 84.13 12.92Q85.03 13.30 85.42 13.88Q85.80 14.45 85.80 15.30Q85.80 16.70 84.65 17.46Q83.50 18.22 81.54 18.22" fill="#000"/></svg>\n';

interface Item {
  label: string;
  copy: () => Promise<string>;
}

const ITEMS: readonly Item[] = [
  { label: t("Copy Logo as SVG"), copy: async () => LOGO_SVG },
  { label: t("Copy Wordmark as SVG"), copy: async () => WORDMARK_SVG },
  {
    label: t("Copy Logo as console.log"),
    copy: async () => {
      const [logo, { detectConsoleBrowser }] = await Promise.all([import("./logo-console"), import("./console-browser")]);
      const browser = detectConsoleBrowser();
      return browser === "firefox" || browser === "safari" ? logo.LOGO_CONSOLE_LOG_INLINE : logo.LOGO_CONSOLE_LOG;
    },
  },
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
  // physical: positioned at pointer coordinates
  const [pos, setPos] = useState({ left: state.x, top: state.y });

  const close = (): void => {
    onClose();
    state.opener.focus();
  };

  useLayoutEffect(() => {
    const el = menu.current;
    if (!el) return;
    const h = el.offsetHeight;
    // physical: clamped to the viewport in pointer coordinates
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
    <div ref={menu} className="logo-menu" role="menu" aria-label={t("Logo")} style={pos} onKeyDown={onKeyDown} onContextMenu={(e) => e.preventDefault()} data-console-bypass="">
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
