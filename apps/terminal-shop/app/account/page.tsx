import type { ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { AccountScreen } from "../../components/screens/Account";

export const metadata: Metadata = { title: "Account" };

export default function Page(): ReactNode {
  return <AccountScreen />;
}
