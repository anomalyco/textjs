import type { ReactNode } from "react";
import { Box, Text, useInput, useTheme } from "@textjs/next";
import type { ErrorComponentProps } from "@textjs/next";

export default function DeploymentsError({ error, reset }: ErrorComponentProps): ReactNode {
  const theme = useTheme();
  useInput((e) => {
    if (e.key === "r") reset();
  });
  return (
    <Box className="flex-col grow items-center justify-center gap-1">
      <Text bold color={theme.danger}>
        Something went wrong loading deployments.
      </Text>
      <Text color={theme.muted}>{error.message}</Text>
      <Text color={theme.subtle}>press r to retry</Text>
    </Box>
  );
}
