import type { ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { CallbackScreen } from "../../../components/screens/Callback";

export const metadata: Metadata = { title: "Signing in" };

export default function Page(): ReactNode {
  return <CallbackScreen />;
}
