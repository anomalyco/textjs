import type { ReactNode } from "react";
import type { Metadata } from "@textjs/app";
import { SubscribeScreen } from "../../components/screens/Checkout";

export const metadata: Metadata = { title: "Subscribe" };

export default function Page(): ReactNode {
  return <SubscribeScreen />;
}
