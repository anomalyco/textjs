import type { ReactNode } from "react";
import type { Metadata } from "@textjs/app";
import { MenuScreen } from "../../components/screens/Menu";

export const metadata: Metadata = { title: "Menu" };

export default function Page(): ReactNode {
  return <MenuScreen />;
}
