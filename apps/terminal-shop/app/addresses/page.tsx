import type { ReactNode } from "react";
import type { Metadata } from "@textjs/app";
import { AddressesScreen } from "../../components/screens/Addresses";

export const metadata: Metadata = { title: "Addresses" };

export default function Page(): ReactNode {
  return <AddressesScreen />;
}
