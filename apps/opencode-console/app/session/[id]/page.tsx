import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Box, Text, useInput, useTheme, useViewport, type Metadata } from "@textjs/next";
import { useRouter } from "@textjs/next/navigation";
import { Composer } from "../../../components/Composer";
import { Timeline } from "../../../components/Timeline";
import { pendingForms, pendingPermissions, useStore, useStoreState } from "../../../lib/store";
import { FormPrompt, PermissionPrompt } from "../../../components/Requests";
import type { SessionMessage } from "../../../lib/types";

export const metadata: Metadata = { title: "Session" };

const EMPTY: SessionMessage[] = [];

export default function SessionPage({ params }: { params: Record<string, string | string[]> }): ReactNode {
  const id = String(params.id);
  const vp=useViewport();
  const theme = useTheme();
  const store = useStore();
  const router = useRouter();
  const ready = useStoreState((s) => s.connection.status === "ready");
  const messages = useStoreState((s) => s.messages[id] ?? EMPTY);
  const loaded = useStoreState((s) => s.loaded[id] === true);
  const missing = useStoreState((s) => s.missing[id] === true);
  const busy = useStoreState((s) => s.busy[id] === true);
  const permission = useStoreState((s) => pendingPermissions(s, id)[0]);
  const form = useStoreState((s) => pendingForms(s, id)[0]);
  const ui = useStoreState((s) => s.ui);
  const directory = useStoreState((s) => s.sessions.find((x) => x.id === id)?.directory);
  const options = useMemo(() => ({ ...ui, directory }), [ui, directory]);
  const [armed, setArmed] = useState(false);
  const [away, setAway] = useState(false);
  useEffect(() => {
    if (!armed) return;
    if (!busy) { setArmed(false); return; }
    const timer = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(timer);
  }, [armed, busy]);

  useEffect(() => {
    if (ready) void store.openSession(id);
  }, [store, id, ready]);

  useInput((e) => {
    if (!busy || permission || form || e.key !== "escape" || e.repeat) return;
    e.stopPropagation();
    setArmed(!armed);
    if (armed) void store.interrupt(id);
  });

  if (missing) {
    return (
      <Box flexDirection="column" flexGrow={1} minHeight={0} paddingX={2}>
        <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" gap={1}>
          <Text color={theme.danger} bold>{`Session ${id} not found`}</Text>
          <Text color={theme.subtle}>ctrl+x n new session · ctrl+x l switch session</Text>
        </Box>
        <Composer onSubmit={(text, mode) => void store.send(null, text, mode).then((nid) => nid && router.replace(`/session/${encodeURIComponent(nid)}`))} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0} paddingX={vp.cols<44 ? 1 : 2} paddingBottom={1}>
      <Timeline interactive={!permission && !form} messages={messages} options={options} busy={busy} loading={!loaded && messages.length === 0} onAway={setAway} />
      <Box height={1} flexShrink={0} flexDirection="row" justifyContent="flex-end">{away && <Text color={theme.muted}>Jump to latest ↓</Text>}</Box>
      <Box display={permission || form ? "none" : "flex"} flexDirection="column" flexShrink={0}><Composer sessionID={id} disabled={!!permission || !!form} busy={busy} interruptArmed={armed} placeholder="" onSubmit={(text, mode) => void store.send(id, text, mode)} /></Box>
      {permission ? <PermissionPrompt key={permission.id} request={permission} child={permission.sessionID !== id} /> : form ? <FormPrompt key={form.id} form={form} /> : null}
    </Box>
  );
}
