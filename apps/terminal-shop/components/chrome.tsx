import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useInterval, useViewport } from "@textjs/next";
import { useRouter } from "@textjs/next/navigation";
import { composeFrame, type Command, type PageId } from "../lib/frame";
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
  body: (height: number, theme: Theme) => Line[];
  subscriptionPayment?: boolean;
}): ReactNode {
  const theme = useTheme();
  const cart = useShopState((s) => s.cart);
  const error = useShopState((s) => s.error);
  const region = useShopState((s) => s.region);
  const subscribing = useShopState((s) => s.subscribing !== null);
  const lines = composeFrame({ page, cart, theme, subscribing, subscriptionPayment, commands, error, region, body: (h) => body(h, theme) });
  return <Screen lines={lines} />;
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
