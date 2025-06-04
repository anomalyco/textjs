import type { ReactNode } from "react";
import { AsciiFont, Box, Spinner, Text, useTheme, type Metadata } from "textjs";
import Link from "textjs/link";
import { useRouter } from "textjs/navigation";
import { Composer } from "../components/Composer";
import { relativeTime } from "../lib/format";
import { useStore, useStoreState } from "../lib/store";

export const metadata: Metadata = { title: "Home" };

const HINTS: Array<[string, string]> = [
  ["enter", "send prompt"],
  ["ctrl+p", "command palette"],
  ["ctrl+n", "new session"],
  ["tab", "switch agent build / plan"],
  ["ctrl+m", "switch model"],
  ["ctrl+b", "toggle sidebar"],
];

export default function HomePage(): ReactNode {
  const theme = useTheme();
  const store = useStore();
  const router = useRouter();
  const sessions = useStoreState((s) => s.sessions);
  const loaded = useStoreState((s) => s.sessionsLoaded);
  const connection = useStoreState((s) => s.connection);

  const submit = (text: string): void => {
    void store.send(null, text).then((id) => {
      if (id) router.push(`/session/${encodeURIComponent(id)}`);
    });
  };

  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Box flexDirection="column" flexGrow={1} flexShrink={1} alignItems="center" justifyContent="center" overflow="hidden" paddingX={2}>
        <AsciiFont text="▼ OPENCODE" font="compact" color={theme.fg} />
        <Text color={theme.subtle} wrap="nowrap" marginTop={1}>
          ▼ OPENCODE Lite · rendered in console.log by Text.js
        </Text>
        {connection.kind === "demo" ? (
          <Text color={theme.warning} wrap="truncate-end">
            {`◆ Interactive demo${connection.reason ? ` — ${connection.reason}` : ""} · ctrl+p → Connect to server`}
          </Text>
        ) : null}
        <Box flexDirection="row" marginTop={1} gap={4} flexShrink={0}>
          {[HINTS.slice(0, 3), HINTS.slice(3)].map((col, ci) => (
            <Box key={ci} flexDirection="column" flexShrink={0}>
              {col.map(([k, label]) => (
                <Text key={k} wrap="nowrap">
                  <Text color={theme.fg} bold>
                    {k.padEnd(8)}
                  </Text>
                  <Text color={theme.subtle}>{label}</Text>
                </Text>
              ))}
            </Box>
          ))}
        </Box>
        <Box flexDirection="column" marginTop={1} width={60} maxWidth="100%" flexShrink={0}>
          <Text color={theme.muted} bold wrap="nowrap">
            Recent sessions
          </Text>
          {!loaded ? <Spinner variant="dots" label="loading…" /> : null}
          {loaded && sessions.length === 0 ? (
            <Text color={theme.subtle} italic>
              Nothing yet — your first prompt starts one.
            </Text>
          ) : null}
          {sessions.slice(0, 4).map((s) => (
            <Box key={s.id} flexDirection="row" height={1}>
              <Text color={theme.accent} wrap="nowrap" flexShrink={0}>
                {"› "}
              </Text>
              <Link href={`/session/${encodeURIComponent(s.id)}`} focusable={false} color={theme.fg} underline={false} wrap="truncate-end" flexShrink={1}>
                {s.title || "Untitled session"}
              </Link>
              <Box flexGrow={1} />
              <Text color={theme.subtle} wrap="nowrap" flexShrink={0}>
                {` ${relativeTime(s.time.updated)}`}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
      <Composer onSubmit={submit} placeholder='Ask anything…  "Explain how routing works in this repo"' />
    </Box>
  );
}
