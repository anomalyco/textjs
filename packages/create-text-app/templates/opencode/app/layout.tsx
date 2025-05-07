import type { ReactNode } from "react";
import { Box, KeyHint, Text, useTheme, type Metadata } from "textjs";

export const metadata: Metadata = { title: { default: "{{name}}", template: "%s · {{name}}" } };

export default function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-1 bg-surface shrink-0">
        <Text bold color={theme.fg} wrap="nowrap">
          ▼ opencode
        </Text>
        <Text color={theme.subtle} wrap="nowrap">
          {"  in console.log  ·  localhost:4096"}
        </Text>
      </Box>
      <Box className="grow flex-col px-2 pt-1">{children}</Box>
      <Box className="flex-row h-1 gap-2 pl-6 shrink-0 bg-surface">
        <KeyHint keys="tab" label="focus" />
        <KeyHint keys="enter" label="open / send" />
        <KeyHint keys="esc" label="back" />
        <KeyHint keys="F2" label="devtools" />
      </Box>
    </Box>
  );
}
