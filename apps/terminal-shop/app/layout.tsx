import { useState, type ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { Shell } from "../components/Shell";
import { getShopStore, ShopProvider, useProvidedShop } from "../lib/store";

export const metadata: Metadata = {
  title: { default: "terminal", template: "%s · terminal" },
  description: "The terminal.shop ssh storefront, in console.log.",
};

export default function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  // Embeds (textjs.org) pass their own store; `text dev` uses the shared one.
  const provided = useProvidedShop();
  const [store] = useState(() => provided ?? getShopStore());
  return (
    <ShopProvider store={store}>
      <Shell>{children}</Shell>
    </ShopProvider>
  );
}
