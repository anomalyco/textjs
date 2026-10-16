import type { ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { ConfirmScreen } from "../../components/screens/Checkout";

export const metadata: Metadata = { title: "Confirm" };

export default function Page(): ReactNode {
  return <ConfirmScreen />;
}
