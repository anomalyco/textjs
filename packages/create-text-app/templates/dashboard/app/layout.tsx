import type { ReactNode } from "react";
import { Box, KeyHint, Text, useTheme, type Metadata } from "@textjs/next";
import Link from "@textjs/next/link";

export const metadata: Metadata = { title: { default: "{{name}}", template: "%s · {{name}}" } };

export default function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-2 gap-3 shrink-0 mt-1">
        <Text bold color={theme.fg} wrap="nowrap">
          ▼ {"{{name}}"}
        </Text>
        <Link href="/" shortcut="1" className="text-muted no-underline" activeClassName="text-fg bold">
          Metrics
        </Link>
        <Link href="/deployments/dpl_a1" shortcut="2" className="text-muted no-underline" activeClassName="text-fg bold">
          Latest deploy
        </Link>
      </Box>
      <Box className="grow flex-col px-2 pt-1">{children}</Box>
      <Box className="flex-row h-1 gap-3 px-2 shrink-0">
        <KeyHint keys="1 2" label="pages" />
        <KeyHint keys="tab" label="focus" />
      </Box>
    </Box>
  );
}
