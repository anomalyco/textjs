import type { ReactNode } from "react";
import { Box, Spacer, Text, useApp, useInput } from "@textjs/app";
import Link from "@textjs/app/link";
import { usePathname, useRouter } from "@textjs/app/navigation";

export const metadata = { title: { default: "Acme Deploys", template: "%s · Acme" } };

export default function RootLayout({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const app = useApp();

  useInput((e) => {
    if (e.key === "backspace") router.back();
    if (e.input === "q") app.exit();
  });

  return (
    <Box className="flex-col grow">
      <Box className="flex-row h-1 px-1 gap-2">
        <Text bold>▼ Acme</Text>
        <Text color="subtle">{`acme.local${pathname === "/" ? "" : pathname}`}</Text>
        <Spacer />
      </Box>
      <Box className="flex-row h-1 px-1 gap-3">
        <Link href="/" shortcut="1">Overview</Link>
        <Link href="/deployments" shortcut="2">Deployments</Link>
        <Link href="/settings" shortcut="3">Settings</Link>
      </Box>
      <Box className="flex-col grow p-1">{children}</Box>
    </Box>
  );
}
