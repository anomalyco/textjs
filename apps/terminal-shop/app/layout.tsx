import { useState, type ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { Shell } from "../components/Shell";
import { getShopStore, ShopProvider } from "../lib/store";

export const metadata: Metadata = {
  title: { default: "terminal", template: "%s · terminal" },
  description: "The terminal.shop ssh storefront, in console.log.",
};

export default function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  const [store] = useState(getShopStore);
  return (
    <ShopProvider store={store}>
      <Shell>{children}</Shell>
    </ShopProvider>
  );
}
