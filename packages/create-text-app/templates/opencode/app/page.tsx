import { useEffect, useState, type ReactNode } from "react";
import { Box, Input, Select, Spinner, Text, useTheme, type SelectOption } from "textjs";
import { useRouter } from "textjs/navigation";
import { opencode, timeAgo, type Session } from "../lib/opencode";

export default function Sessions(): ReactNode {
  const theme = useTheme();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    opencode
      .listSessions()
      .then((list) => setSessions([...list].sort((a, b) => b.time.updated - a.time.updated)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const start = async (text: string): Promise<void> => {
    if (!text.trim()) return;
    const session = await opencode.createSession(text.slice(0, 48));
    void opencode.prompt(session.id, text);
    router.push(`/session/${session.id}`);
  };

  const options: SelectOption<string>[] = (sessions ?? []).map((s) => ({ value: s.id, label: s.title || s.id, hint: timeAgo(s.time.updated) }));

  return (
    <Box className="flex-col gap-1 grow">
      <Box className="flex-row h-3 border rounded px-1 shrink-0" borderColor={theme.border}>
        <Text color={theme.accent} wrap="nowrap">
          {"› "}
        </Text>
        <Input value={draft} onChange={setDraft} onSubmit={(v) => void start(v).catch((e: unknown) => setError(String(e)))} placeholder="Ask OpenCode anything… (enter starts a new session)" autoFocus />
      </Box>
      <Text bold color={theme.fg}>
        Sessions
      </Text>
      {error ? (
        <Box className="flex-col">
          <Text color={theme.warning}>Could not reach the OpenCode server: {error}</Text>
          <Text color={theme.subtle}>Start one with `opencode serve --port 4096`, or set OPENCODE_URL, then reload.</Text>
        </Box>
      ) : sessions === null ? (
        <Spinner label="Connecting to OpenCode…" />
      ) : sessions.length === 0 ? (
        <Text color={theme.subtle}>No sessions yet — type a prompt above.</Text>
      ) : (
        <Select options={options} limit={14} onChange={(id) => router.push(`/session/${id}`)} />
      )}
    </Box>
  );
}
