import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useInterval, useViewport } from "@textjs/app";
import { useRouter } from "@textjs/app/navigation";
import { composeFrame, layoutFor, placeInViewport, type Command, type Layout, type PageId } from "../lib/frame";
import { useKeys } from "../lib/keys";
import { useShop, useShopState } from "../lib/store";
import { makeTheme, type Theme } from "../lib/theme";
import type { Line } from "../lib/ui";
import { Screen } from "./Screen";

/** What the active page tells the shell: whether `s` `a` `c` `m` `q` navigate (`HeaderNavigationEnabled`). */
export interface HeaderMode {
  enabled: boolean;
  /** Reserved keys this page handles itself (`pageHandlesReservedHeaderKey`). */
  claims: string[];
  page: PageId | "menu" | null;
}

export const HeaderModeContext = createContext<{ current: HeaderMode }>({ current: { enabled: true, claims: [], page: null } });

export function useHeaderMode(page: PageId | "menu", enabled = true, claims: string[] = []): void {
  const ref = useContext(HeaderModeContext);
  ref.current = { enabled, claims, page };
  useEffect(
    () => () => {
      if (ref.current.page === page) ref.current = { enabled: true, claims: [], page: null };
    },
    [ref, page],
  );
}

/** The SSH shop's 700 ms brand-colored cursor. */
export function useBlink(ms = 700): boolean {
  const vp = useViewport();
  const [on, setOn] = useState(true);
  useInterval(() => setOn((v) => !v), vp.paused ? null : ms);
  return on;
}

/** The SSH shop's size class and container for the current console size. */
export function useLayout(): Layout {
  const vp = useViewport();
  return useMemo(() => layoutFor(vp.cols, vp.rows), [vp.cols, vp.rows]);
}

export function useTheme(): Theme {
  const store = useShop();
  useShopState((s) => s.shopSelected + s.products.length);
  return makeTheme(store.highlight);
}

export function useNav(): (path: string) => void {
  const router = useRouter();
  return (path) => router.push(path);
}

/** Render a page inside the header / breadcrumbs / footer chrome. */
export function Page({
  page,
  commands,
  body,
  subscriptionPayment,
}: {
  page: PageId;
  commands: Command[];
  body: (height: number, theme: Theme, layout: Layout) => Line[];
  subscriptionPayment?: boolean;
}): ReactNode {
  const theme = useTheme();
  const layout = useLayout();
  const cart = useShopState((s) => s.cart);
  const error = useShopState((s) => s.error);
  const region = useShopState((s) => s.region);
  const subscribing = useShopState((s) => s.subscribing !== null);
  const frame = composeFrame({ page, cart, theme, subscribing, subscriptionPayment, commands, error, region, layout, body: (h) => body(h, theme, layout) });
  return <Screen lines={placeInViewport(frame, layout, layout.widthContainer)} />;
}

/** Stable submit-guard for async actions (`state.*.submitting`). */
export function useBusy(): [boolean, <T>(fn: () => Promise<T>) => Promise<T | undefined>] {
  const [busy, setBusy] = useState(false);
  const ref = useRef(false);
  const run = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (ref.current) return undefined;
    ref.current = true;
    setBusy(true);
    try {
      return await fn();
    } finally {
      ref.current = false;
      setBusy(false);
    }
  };
  return [busy, run];
}

export { useKeys };

/** Keys a confirmation code can be: none of the shop's own keys, and never y/n. */
export const CONFIRM_LETTERS = "bfgiloptuvwz";

export function confirmLetter(random: () => number = Math.random): string {
  return CONFIRM_LETTERS[Math.floor(random() * CONFIRM_LETTERS.length)] ?? "b";
}

/**
 * The extra step before money moves on textjs.org: press a letter shown only in the
 * console frame. It changes every time, so a script of keys ("press enter, then y")
 * can't place an order for someone who can't see the console.
 */
export function useRealMoneyConfirm(): { code: string | null; arm(): void; disarm(): void; answer(key: string): "confirm" | "cancel" | null } {
  const [code, setCode] = useState<string | null>(null);
  return {
    code,
    arm: () => setCode(confirmLetter()),
    disarm: () => setCode(null),
    answer: (key) => {
      if (code === null) return null;
      if (key === code) {
        setCode(null);
        return "confirm";
      }
      if (key === "n" || key === "esc") {
        setCode(null);
        return "cancel";
      }
      return null;
    },
  };
}
