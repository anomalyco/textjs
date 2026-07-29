import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Box, Input, Markdown, ScrollBox, Spinner, Text, useInput, useTheme, type Metadata } from "@textjs/next";
import { useParams, useRouter } from "@textjs/next/navigation";
import { messageText, opencode, type Message } from "../../../lib/opencode";

export const metadata: Metadata = { title: "Session" };

export default function SessionPage(): ReactNode {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    opencode
      .messages(id)
      .then(setMessages)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 1500);
    return () => clearInterval(timer);
  }, [refresh]);

  useInput((e) => {
    if (e.key === "escape") router.push("/");
  });

  const send = (text: string): void => {
    if (!text.trim() || busy) return;
    setDraft("");
    setBusy(true);
    opencode
      .prompt(id, text)
      .then(refresh)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setBusy(false));
  };

  return (
    <Box className="flex-col gap-1 grow">
      <ScrollBox className="grow" stickyScroll>
        {messages.map((m) => (
          <Box key={m.info.id} className="flex-col shrink-0 mb-1">
            <Text bold color={m.info.role === "user" ? theme.accent : theme.success}>
              {m.info.role === "user" ? "you" : "opencode"}
            </Text>
            <Markdown>{messageText(m) || "…"}</Markdown>
          </Box>
        ))}
        {messages.length === 0 && !error ? <Text color={theme.subtle}>No messages yet.</Text> : null}
        {error ? <Text color={theme.warning}>{error}</Text> : null}
      </ScrollBox>
      <Box className="flex-row h-3 border rounded px-1 shrink-0" borderColor={theme.border}>
        {busy ? <Spinner /> : <Text color={theme.accent}>{"› "}</Text>}
        <Input value={draft} onChange={setDraft} onSubmit={send} placeholder="Reply…" autoFocus />
      </Box>
    </Box>
  );
}
