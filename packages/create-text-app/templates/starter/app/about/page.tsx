import type { ReactNode } from "react";
import { Box, Text, useTheme, type Metadata } from "@textjs/next";
import Link from "@textjs/next/link";
import { useRouter } from "@textjs/next/navigation";
import { useInput } from "@textjs/next";

export const metadata: Metadata = { title: "About" };

const FACTS = [
  ["Renderer", "React 19 reconciler → Yoga flexbox → cell framebuffer"],
  ["Output", "one console.log per dirty frame, RLE %c spans"],
  ["Router", "app/ directory: layouts, [params], loading, error, not-found"],
  ["Tooling", "text dev · text build · text start (Vite + Fast Refresh)"],
] as const;

export default function About(): ReactNode {
  const theme = useTheme();
  const router = useRouter();
  useInput((e) => {
    if (e.key === "escape") router.back();
  });
  return (
    <Box className="flex-col gap-1">
      <Text bold color={theme.fg}>
        About
      </Text>
      {FACTS.map(([k, v]) => (
        <Box key={k} className="flex-row h-1">
          <Text color={theme.subtle} width={10} flexShrink={0}>
            {k}
          </Text>
          <Text color={theme.muted}>{v}</Text>
        </Box>
      ))}
      <Box className="flex-row gap-1 h-1 mt-1">
        <Link href="/" autoFocus>
          ← Back home
        </Link>
        <Text color={theme.subtle}>(or press Esc)</Text>
      </Box>
    </Box>
  );
}
