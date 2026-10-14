import { useEffect, useMemo, type ReactNode } from "react";
import { Box, Text, useInput, useTheme, type Metadata } from "@textjs/next";
import { useRouter } from "@textjs/next/navigation";
import { Composer } from "../../../components/Composer";
import { Timeline } from "../../../components/Timeline";
import { useStore, useStoreState } from "../../../lib/store";
import type { SessionMessage } from "../../../lib/types";

export const metadata: Metadata = { title: "Session" };

const EMPTY: SessionMessage[] = [];

export default function SessionPage({ params }: { params: Record<string, string | string[]> }): ReactNode {
  const id = String(params.id);
  const theme = useTheme();
  const store = useStore();
  const router = useRouter();
  const ready = useStoreState((s) => s.connection.status === "ready");
  const messages = useStoreState((s) => s.messages[id] ?? EMPTY);
  const loaded = useStoreState((s) => s.loaded[id] === true);
  const missing = useStoreState((s) => s.missing[id] === true);
  const busy = useStoreState((s) => s.busy[id] === true);
  const ui = useStoreState((s) => s.ui);
  const directory = useStoreState((s) => s.sessions.find((x) => x.id === id)?.directory);
  const options = useMemo(() => ({ ...ui, directory }), [ui, directory]);

  useEffect(() => {
    if (ready) void store.openSession(id);
  }, [store, id, ready]);

  useInput((e) => {
    if (e.key !== "escape") return;
    e.stopPropagation();
    if (busy) void store.interrupt(id);
  });

  if (missing) {
    return (
      <Box flexDirection="column" flexGrow={1} minHeight={0} paddingX={2}>
        <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" gap={1}>
          <Text color={theme.danger} bold>{`Session ${id} not found`}</Text>
          <Text color={theme.subtle}>ctrl+n new session · ctrl+g switch session</Text>
        </Box>
        <Composer onSubmit={(text) => void store.send(null, text).then((nid) => nid && router.replace(`/session/${encodeURIComponent(nid)}`))} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0} paddingX={2}>
      <Timeline messages={messages} options={options} busy={busy} loading={!loaded && messages.length === 0} />
      <Box height={1} flexShrink={0} />
      <Composer busy={busy} onSubmit={(text) => void store.send(id, text)} />
    </Box>
  );
}
