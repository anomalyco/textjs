import type { ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { ShippingScreen } from "../../components/screens/Checkout";

export const metadata: Metadata = { title: "Shipping" };

export default function Page(): ReactNode {
  return <ShippingScreen />;
}
