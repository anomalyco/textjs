import type { ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { FinalScreen } from "../../../components/screens/Checkout";

export const metadata: Metadata = { title: "Thank you" };

export default function Page(): ReactNode {
  return <FinalScreen />;
}
