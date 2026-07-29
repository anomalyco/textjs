import type { ReactNode } from "react";
import { Box, Text, useTheme } from "@textjs/next";
import Link from "@textjs/next/link";

export default function NotFound(): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col grow items-center justify-center gap-1">
      <Text color={theme.muted}>404 │ This page could not be found.</Text>
      <Link href="/" autoFocus>
        Back to metrics
      </Link>
    </Box>
  );
}
