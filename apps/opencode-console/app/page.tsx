import { useState, type ReactNode } from "react";
import { Box, Text, useTheme, useViewport, type Metadata } from "@textjs/app";
import { useRouter } from "@textjs/app/navigation";
import { Composer, Hints, type ComposerProps } from "../components/Composer";
import { Logo } from "../components/Logo";
import { ConnectionBadge } from "../components/Shell";
import { FormPrompt } from "../components/Requests";
import { useStore, useStoreState } from "../lib/store";

export const metadata: Metadata = { title: "Home" };

export default function HomePage(): ReactNode {
  const theme = useTheme();
  const store = useStore();
  const router = useRouter();
  const connection = useStoreState((s) => s.connection);
  const form = useStoreState((s) => s.forms.global?.[0]);
  const vp = useViewport();
  const [example] = useState(() => ["Fix a TODO in the codebase", "What is the tech stack of this project?", "Fix broken tests"][Math.floor(Math.random()*3)]);

  const submit: ComposerProps["onSubmit"] = (text, mode, options) => {
    void store.send(null, text, mode, options).then((id) => {
      if (id) router.push(`/session/${encodeURIComponent(id)}`);
    });
  };

  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box flexDirection="column" flexGrow={1} flexShrink={1} alignItems="center" overflow="hidden" paddingX={vp.cols < 44 ? 1 : 2}>
        <Box flexGrow={1} minHeight={0} />
        <Box height={3} minHeight={0} flexShrink={1} />
        <Logo />
        <Box height={1} flexShrink={0} />
        <Box flexDirection="column" width="100%" maxWidth={75} paddingTop={1} flexShrink={0}>
          <Composer onSubmit={submit} disabled={!!form} placeholder={connection.kind === "demo" ? undefined : `Ask anything… "${example}"`} />
        </Box>
        <Box flexGrow={1} minHeight={0} />
      </Box>
      {vp.rows >= 14 && vp.cols >= 44 && <Box flexDirection="row" flexShrink={0} paddingX={2} paddingY={vp.rows < 16 ? 0 : 1} gap={2}>
        {connection.kind === "demo" && <><ConnectionBadge connection={connection} /><Hints items={[["ctrl+x l", "sessions"]]} /></>}
        <Box flexGrow={1} />
        {vp.cols >= 64 && <Text color={theme.muted}>{connection.version || " "}</Text>}
      </Box>}
      {form && <Box position="absolute" bottom={1} left={2} right={2} zIndex={4} flexDirection="column"><FormPrompt key={form.id} form={form}/></Box>}
    </Box>
  );
}
