import type { ReactNode } from "react";
import { Box, Text, useTheme, type Metadata } from "@textjs/next";
import { useRouter } from "@textjs/next/navigation";
import { Composer, Hints } from "../components/Composer";
import { Logo } from "../components/Logo";
import { ConnectionBadge } from "../components/Shell";
import { shortPath } from "../lib/format";
import { useStore, useStoreState } from "../lib/store";

export const metadata: Metadata = { title: "Home" };

export default function HomePage(): ReactNode {
  const theme = useTheme();
  const store = useStore();
  const router = useRouter();
  const state = useStoreState((s) => s);

  const submit = (text: string): void => {
    void store.send(null, text).then((id) => {
      if (id) router.push(`/session/${encodeURIComponent(id)}`);
    });
  };

  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box flexDirection="column" flexGrow={1} flexShrink={1} alignItems="center" overflow="hidden" paddingX={2}>
        <Box flexGrow={1} minHeight={0} />
        <Logo />
        <Box height={1} flexShrink={0} />
        <Box flexDirection="column" width="100%" maxWidth={72} paddingTop={1} flexShrink={0}>
          <Composer onSubmit={submit} />
        </Box>
        <Box flexGrow={1} minHeight={0} />
      </Box>
      <Box flexDirection="row" height={1} flexShrink={0} paddingX={2} gap={2}>
        <Text color={theme.muted} wrap="truncate-start" flexShrink={1}>
          {shortPath(state.connection.directory) || "~"}
        </Text>
        <Box flexGrow={1} />
        <ConnectionBadge state={state} />
        <Hints items={[["ctrl+p", "sessions"]]} />
      </Box>
    </Box>
  );
}
