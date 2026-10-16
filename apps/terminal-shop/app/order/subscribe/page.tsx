import type { ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { FinalSubScreen } from "../../../components/screens/Checkout";

export const metadata: Metadata = { title: "Order complete" };

export default function Page(): ReactNode {
  return <FinalSubScreen />;
}
