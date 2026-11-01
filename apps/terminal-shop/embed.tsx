/**
 * The shop as an embeddable component, for hosts that aren't `text dev` (textjs.org's
 * console companion). Same routes, screens and keys as the standalone app; the route
 * manifest is written out here because embeds don't run the `app/` scanner.
 * `test/unit.test.ts` keeps it in sync with `app/`.
 */

import type { ReactNode } from "react";
import { AppRouter, createMemoryHistory, type RouteManifest, type RouterHistory } from "@textjs/app/router";
import * as layout from "./app/layout";
import * as root from "./app/page";
import * as account from "./app/account/page";
import * as addresses from "./app/addresses/page";
import * as callback from "./app/auth/callback/page";
import * as cart from "./app/cart/page";
import * as confirm from "./app/confirm/page";
import * as email from "./app/email/page";
import * as login from "./app/login/page";
import * as menu from "./app/menu/page";
import * as complete from "./app/order/complete/page";
import * as subscribeAfterOrder from "./app/order/subscribe/page";
import * as payment from "./app/payment/page";
import * as shipping from "./app/shipping/page";
import * as shop from "./app/shop/page";
import * as subscribe from "./app/subscribe/page";
import { ShopProvider, ShopStore, type StoreOptions } from "./lib/store";

export { WIDTH, HEIGHT } from "./lib/frame";
export type { ShopStore, StoreOptions } from "./lib/store";

const page = (segment: string, mod: RouteManifest["page"]): RouteManifest => ({ segment, page: mod });

export const routes: RouteManifest = {
  segment: "",
  layout,
  page: root,
  children: [
    page("account", account),
    page("addresses", addresses),
    { segment: "auth", children: [page("callback", callback)] },
    page("cart", cart),
    page("confirm", confirm),
    page("email", email),
    page("login", login),
    page("menu", menu),
    { segment: "order", children: [page("complete", complete), page("subscribe", subscribeAfterOrder)] },
    page("payment", payment),
    page("shipping", shipping),
    page("shop", shop),
    page("subscribe", subscribe),
  ],
};

export interface EmbeddedShop {
  store: ShopStore;
  history: RouterHistory;
}

/** A fresh shop store (handed to the app through context) and an in-memory history. */
export function createEmbeddedShop(options: StoreOptions = {}): EmbeddedShop {
  const store = new ShopStore(options);
  return { store, history: createMemoryHistory("/") };
}

/** Renders the whole 80 × 30 shop. Keep `shop` across mounts to resume where you were. */
export function TerminalShop({ shop }: { shop: EmbeddedShop }): ReactNode {
  return (
    <ShopProvider store={shop.store}>
      <AppRouter routes={routes} history={shop.history} errorStore={null} documentTitle={false} theme="geistDark" />
    </ShopProvider>
  );
}
