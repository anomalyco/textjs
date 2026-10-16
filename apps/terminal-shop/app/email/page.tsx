import type { ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { EmailGateScreen } from "../../components/screens/Checkout";

export const metadata: Metadata = { title: "Email" };

export default function Page(): ReactNode {
  return <EmailGateScreen />;
}
