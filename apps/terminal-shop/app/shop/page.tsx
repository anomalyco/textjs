import type { ReactNode } from "react";
import type { Metadata } from "@textjs/app";
import { ShopScreen } from "../../components/screens/Shop";

export const metadata: Metadata = { title: "Shop" };

export default function Page(): ReactNode {
  return <ShopScreen />;
}
