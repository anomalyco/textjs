import { useEffect, useState, type ReactNode } from "react";
import type { Metadata } from "@textjs/next";
import { Shell } from "../components/Shell";
import { getOpenCodeStore, OpenCodeProvider } from "../lib/store";

export const metadata: Metadata = {
  title: { default: "OpenCode Lite", template: "%s · OpenCode Lite" },
  description: "The OpenCode TUI, connected to your local server, rendered in console.log.",
};

export default function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  const [store] = useState(getOpenCodeStore);
  useEffect(() => store.start(), [store]);
  return (
    <OpenCodeProvider store={store}>
      <Shell>{children}</Shell>
    </OpenCodeProvider>
  );
}
