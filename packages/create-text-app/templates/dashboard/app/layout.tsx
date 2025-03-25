import type { ReactNode } from "react";
import { Box, KeyHint, Text, useTheme, type Metadata } from "textjs";
import Link from "textjs/link";

export const metadata: Metadata = { title: { default: "{{name}}", template: "%s · {{name}}" } };

export default function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-1 gap-3 bg-surface shrink-0">
        <Text bold color={theme.fg} wrap="nowrap">
          ▼ {"{{name}}"}
        </Text>
        <Link href="/" shortcut="1" className="text-muted no-underline" activeClassName="text-fg bold">
          1 Metrics
        </Link>
        <Link href="/deployments/dpl_a1" shortcut="2" className="text-muted no-underline" activeClassName="text-fg bold">
          2 Latest deploy
        </Link>
      </Box>
      <Box className="grow flex-col px-2 pt-1">{children}</Box>
      <Box className="flex-row h-1 gap-2 pl-6 shrink-0 bg-surface">
        <KeyHint keys="1-2" label="navigate" />
        <KeyHint keys="tab" label="focus" />
        <KeyHint keys="F2" label="devtools" />
      </Box>
    </Box>
  );
}
