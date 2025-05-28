import { memo, type ReactNode } from "react";
import { Box, Markdown, ScrollBox, Spinner, Text, useTheme } from "textjs";
import { clock, compactNumber, duration } from "../lib/format";
import type { AssistantMessage, ReasoningPart, SessionMessage, ShellMessage, UserMessage } from "../lib/types";
import { ToolCard } from "./ToolCard";

export interface TimelineOptions {
  toolDetails: boolean;
  thinking: boolean;
  directory?: string;
}

const UserBubble = memo(function UserBubble({ msg }: { msg: UserMessage }): ReactNode {
  const theme = useTheme();
  return (
    <Box flexDirection="column" flexShrink={0} bg={theme.surface} border="heavy" borderTop={false} borderRight={false} borderBottom={false} borderColor={msg.pending ? theme.subtle : theme.accent} paddingX={1}>
      <Text color={theme.fg} wrap="wrap">
        {msg.text}
      </Text>
      <Text color={theme.subtle} wrap="nowrap">
        {msg.pending ? "sending…" : clock(msg.time.created)}
      </Text>
    </Box>
  );
});

function Thinking({ part, expanded, live }: { part: ReasoningPart; expanded: boolean; live: boolean }): ReactNode {
  const theme = useTheme();
  const text = part.text.trim();
  const done = !live || part.time?.completed !== undefined;
  const took = part.time?.completed && part.time.created ? ` · ${duration(part.time.completed - part.time.created)}` : "";
  if (!expanded) {
    const preview = text.split("\n").filter(Boolean).pop() ?? "";
    return (
      <Box flexDirection="row" height={1} flexShrink={0} paddingLeft={1}>
        <Text color={theme.subtle} italic wrap="nowrap" flexShrink={0}>
          {done ? `⟡ Thought${took}` : "⟡ Thinking…"}
        </Text>
        <Text color={theme.subtle} dim italic wrap="truncate-end" flexShrink={1}>
          {preview ? `  ${preview}` : ""}
        </Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" flexShrink={0} border="single" borderTop={false} borderRight={false} borderBottom={false} borderColor={theme.subtle} paddingLeft={1}>
      <Text color={theme.subtle} italic wrap="nowrap">
        {done ? `⟡ Thought${took}` : "⟡ Thinking…"}
      </Text>
      <Text color={theme.muted} italic dim wrap="wrap">
        {text || "…"}
      </Text>
    </Box>
  );
}

function Assistant({ msg, options, live }: { msg: AssistantMessage; options: TimelineOptions; live: boolean }): ReactNode {
  const theme = useTheme();
  const took = msg.time.completed ? duration(msg.time.completed - msg.time.created) : "";
  const tokens = msg.tokens ? `${compactNumber(msg.tokens.input + msg.tokens.output)} tok` : "";
  return (
    <Box flexDirection="column" flexShrink={0} gap={1}>
      {msg.content.map((p, i) => {
        if (p.type === "text") return p.text.trim() ? <Markdown key={i} content={p.text} paddingLeft={1} codeMaxHeight={options.toolDetails ? undefined : 24} /> : null;
        if (p.type === "reasoning") return p.text.trim() || live ? <Thinking key={i} part={p} expanded={options.thinking} live={live} /> : null;
        return <ToolCard key={p.id || i} part={p} expanded={options.toolDetails} directory={options.directory} />;
      })}
      {msg.error ? (
        <Text color={theme.danger} wrap="wrap" paddingLeft={1}>
          {`✗ ${msg.error.message}`}
        </Text>
      ) : null}
      {msg.time.completed && !live ? (
        <Box flexDirection="row" height={1} paddingLeft={1}>
          <Text color={msg.agent === "plan" ? theme.info : theme.accent} wrap="nowrap">
            ▣{" "}
          </Text>
          <Text color={theme.subtle} wrap="truncate-end">
            {[msg.agent, msg.model.id, took, tokens].filter(Boolean).join(" · ")}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

function Shell({ msg }: { msg: ShellMessage }): ReactNode {
  const theme = useTheme();
  return (
    <Box flexDirection="column" flexShrink={0} bg={theme.panel} paddingX={1}>
      <Text wrap="truncate-end">
        <Text color={theme.accent}>$ </Text>
        <Text color={theme.fg}>{msg.command}</Text>
        <Text color={theme.subtle}>{`  ${msg.status}`}</Text>
      </Text>
      {msg.output ? (
        <Text color={theme.muted} wrap="wrap">
          {msg.output.split("\n").slice(-6).join("\n")}
        </Text>
      ) : null}
    </Box>
  );
}

function Message({ msg, options, live }: { msg: SessionMessage; options: TimelineOptions; live: boolean }): ReactNode {
  const theme = useTheme();
  switch (msg.type) {
    case "user":
      return <UserBubble msg={msg} />;
    case "assistant":
      return <Assistant msg={msg} options={options} live={live} />;
    case "shell":
      return <Shell msg={msg} />;
    case "note": {
      const color = msg.tone === "danger" ? theme.danger : msg.tone === "warning" ? theme.warning : msg.tone === "info" ? theme.info : theme.subtle;
      return (
        <Text color={color} italic wrap="truncate-end" paddingLeft={1}>
          {`── ${msg.text} ──`}
        </Text>
      );
    }
  }
}

export function Timeline({ messages, options, busy, loading }: { messages: readonly SessionMessage[]; options: TimelineOptions; busy: boolean; loading: boolean }): ReactNode {
  const theme = useTheme();
  const lastAssistant = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if ((messages[i] as SessionMessage).type === "assistant") return (messages[i] as SessionMessage).id;
    return null;
  })();
  return (
    <ScrollBox stickyScroll flexGrow={1} paddingX={2} paddingTop={1} gap={1} focused scrollbarColor={theme.subtle}>
      {loading ? <Spinner variant="dots" label="Loading session…" /> : null}
      {!loading && messages.length === 0 ? (
        <Text color={theme.subtle} italic>
          No messages yet — type a prompt below.
        </Text>
      ) : null}
      {messages.map((m) => (
        <Message key={m.id} msg={m} options={options} live={busy && m.id === lastAssistant && m.type === "assistant" && !m.time.completed} />
      ))}
      <Box height={1} flexShrink={0} />
    </ScrollBox>
  );
}
