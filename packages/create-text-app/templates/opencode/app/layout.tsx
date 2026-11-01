import type { ReactNode } from "react";
import { Box, KeyHint, Text, useTheme, type Metadata } from "@textjs/next";

export const metadata: Metadata = { title: { default: "{{name}}", template: "%s · {{name}}" } };

export default function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-2 shrink-0 mt-1">
        <Text bold color={theme.fg} wrap="nowrap">
          ▼ opencode
        </Text>
      </Box>
      <Box className="grow flex-col px-2 pt-1">{children}</Box>
      <Box className="flex-row h-1 gap-3 px-2 mb-1 shrink-0">
        <KeyHint keys="enter" label="send" />
        <KeyHint keys="Esc" label="back" />
      </Box>
    </Box>
  );
}
