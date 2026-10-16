import type { ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { PaymentScreen } from "../../components/screens/Checkout";

export const metadata: Metadata = { title: "Payment" };

export default function Page(): ReactNode {
  return <PaymentScreen />;
}
