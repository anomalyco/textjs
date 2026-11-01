import type { ReactNode } from "react";
import { Box, Text, useTheme } from "@textjs/app";
import Link from "@textjs/app/link";
import { usePathname } from "@textjs/app/navigation";

export default function NotFound(): ReactNode {
  const theme = useTheme();
  const pathname = usePathname();
  return (
    <Box className="flex-col grow items-center justify-center gap-1">
      <Box className="flex-row">
        <Text bold color={theme.fg}>
          404
        </Text>
        <Text color={theme.border}>{"  │  "}</Text>
        <Text color={theme.muted}>This page could not be found.</Text>
      </Box>
      <Text color={theme.subtle}>{pathname}</Text>
      <Link href="/" autoFocus>
        ← Back to Overview
      </Link>
    </Box>
  );
}
