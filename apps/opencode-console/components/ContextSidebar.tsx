import { useEffect, useMemo, useState } from "react";
import { Box, Text, ScrollBox, useFocus, useKeymap, useViewport } from "@textjs/next";
import { InputTrap } from "./PickerPanel";
import { useStore, useStoreState } from "../lib/store";
import { useTokens } from "../lib/native-theme";
import { usage, dollars } from "../lib/usage";
import { todoLines } from "../lib/tool-data";
import { shortPath } from "../lib/format";

/** The 42-cell inspector from routes/session/sidebar.tsx and feature-plugins/sidebar. */
export function ContextSidebar({ id, overlay }: { id: string; overlay: boolean }) {
  return overlay ? (
    <Box
      position="absolute"
      top={0}
      right={0}
      left={0}
      bottom={0}
      alignItems="flex-end"
      flexDirection="column"
      zIndex={3}
      backdropDim={70 / 255}
    >
      <InputTrap>
        <SidebarBody id={id} overlay />
      </InputTrap>
    </Box>
  ) : (
    <SidebarBody id={id} overlay={false} />
  );
}
function SidebarBody({ id, overlay }: { id: string; overlay: boolean }) {
  const t = useTokens(),
    vp = useViewport(),
    store = useStore();
  const session = useStoreState((s) => s.sessions.find((v) => v.id === id)),
    messages = useStoreState((s) => s.messages[id]),
    models = useStoreState((s) => s.models);
  const measured = useMemo(() => usage(messages ?? [], models), [messages, models]),
    dir = session?.directory;
  const todos = useMemo(() => {
    for (let i = (messages?.length ?? 0) - 1; i >= 0; i--) {
      const m = messages?.[i];
      if (m?.type !== "assistant") continue;
      for (let j = m.content.length - 1; j >= 0; j--) {
        const p = m.content[j];
        if (p?.type === "tool" && p.name === "todowrite" && p.state.status === "completed") return todoLines(p.state.input);
      }
    }
    return [];
  }, [messages]);
  const [branch, setBranch] = useState<string | null>(null),
    [onboard, show] = useState(false),
    [mcps, servers] = useState<{ name: string; status: string }[]>([]);
  const client = store.api;
  useEffect(() => {
    let alive = true;
    if (client && dir) {
      void client.branch?.(dir).then(
        (b) => {
          if (alive) setBranch(b);
        },
        () => {},
      );
      void client.integrations?.().then(
        (i) => {
          if (alive) show(!i.some((v) => v.connected));
        },
        () => {},
      );
      void client.mcpServers?.(dir).then(
        (items) => {
          if (alive) servers(items);
        },
        () => {},
      );
    }
    return () => {
      alive = false;
    };
  }, [client, dir]);
  useFocus({ id: "session-sidebar", autoFocus: true, isActive: overlay });
  useKeymap(
    { "escape, ctrl+c, ctrl+x b": () => store.toggle("sidebar", false) },
    { isActive: overlay, priority: 30, sequenceTimeout: 2000 },
  );
  const body = (
    <Box width={Math.min(42, vp.cols)} height="100%" bg={t.raised} flexDirection="column" paddingX={2} paddingY={1} flexShrink={0}>
      <Text bold color={t.text} paddingRight={2} marginBottom={1}>
        {session?.title || "New session"}
      </Text>
      <ScrollBox flexGrow={1} showScrollbar={false} minHeight={0} gap={1} paddingRight={1}>
        {(measured || !!session?.cost) && (
          <Box flexDirection="column">
            <Text bold>Context</Text>
            {measured && (
              <Text
                color={t.muted}
              >{`${measured.tokens.toLocaleString("en-US")} tokens${measured.percent === undefined ? "" : `\n${measured.percent}% used`}`}</Text>
            )}
            {!!session?.cost && <Text color={t.muted}>{dollars.format(session.cost)} spent</Text>}
          </Box>
        )}
        {mcps.length > 0 && (
          <Box flexDirection="column">
            <Text bold>{mcps.length > 2 ? "▼ " : ""}MCP</Text>
            {mcps.map((m) => (
              <Text key={m.name}>
                <Text color={m.status === "connected" ? t.success : m.status === "failed" ? t.error : t.muted}>● </Text>
                {m.name}
              </Text>
            ))}
          </Box>
        )}
        {todos.length > 0 && (
          <Box flexDirection="column">
            <Text bold>{todos.length > 2 ? "▼ " : ""}Todo</Text>
            {todos.map((l, i) => (
              <Text key={i} color={l.startsWith("[•]") ? t.warning : t.muted} strikethrough={l.startsWith("[-]")}>
                {l}
              </Text>
            ))}
          </Box>
        )}
      </ScrollBox>
      {onboard && vp.rows >= 22 && (
        <Box bg={t.high} marginTop={1} paddingX={2} paddingY={1} gap={1} flexDirection="row">
          <Text flexShrink={0}>⬖</Text>
          <Box flexDirection="column" flexShrink={1} gap={1}>
            <Box flexDirection="row" justifyContent="space-between">
              <Text bold>Getting started</Text>
              <Text color={t.muted}>✕</Text>
            </Box>
            <Text color={t.muted}>OpenCode includes free models so you can start immediately.</Text>
            <Text color={t.muted}>Connect from 75+ providers to use other models, including Claude, GPT, Gemini etc</Text>
            <Box flexDirection="row" justifyContent="space-between">
              <Text>Connect provider</Text>
              <Text color={t.muted}>/connect</Text>
            </Box>
          </Box>
        </Box>
      )}
      <Text marginTop={1} wrap="truncate-start" color={t.muted}>{`${shortPath(dir)}${branch ? `:${branch}` : ""}`}</Text>
    </Box>
  );
  return body;
}
