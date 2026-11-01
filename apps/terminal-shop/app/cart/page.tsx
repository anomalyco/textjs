import type { ReactNode } from "react";
import type { Metadata } from "@textjs/app";
import { CartScreen } from "../../components/screens/Cart";

export const metadata: Metadata = { title: "Cart" };

export default function Page(): ReactNode {
  return <CartScreen />;
}
