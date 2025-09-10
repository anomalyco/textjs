import { memo, type ReactNode } from "react";
import { Box, Markdown, ScrollBox, Text, useTheme } from "textjs";
import { duration, modelLabel } from "../lib/format";
import { useStoreState } from "../lib/store";
import type { AssistantMessage, AssistantPart, ReasoningPart, SessionMessage, ShellMessage, UserMessage } from "../lib/types";
import { agentColor, capitalize } from "./Composer";
import { ToolCard } from "./ToolCard";

export interface TimelineOptions {
  toolDetails: boolean;
  thinking: boolean;
  directory?: string;
}

const UserBubble = memo(function UserBubble({ msg, agent }: { msg: UserMessage; agent: string }): ReactNode {
  const theme = useTheme();
  return (
    <Box flexDirection="column" flexShrink={0} border="heavy" borderTop={false} borderRight={false} borderBottom={false} borderColor={msg.pending ? theme.border : agentColor(theme, agent)}>
      <Box flexDirection="column" flexShrink={0} bg={theme.panel} paddingX={1} paddingY={1}>
        <Text color={theme.fg} wrap="wrap">
          {msg.text}
        </Text>
      </Box>
    </Box>
  );
});

function Thinking({ part, expanded, live }: { part: ReasoningPart; expanded: boolean; live: boolean }): ReactNode {
  const theme = useTheme();
  const text = part.text.trim();
  const done = !live || part.time?.completed !== undefined;
  const label = !done ? "Thinking" : part.time?.completed && part.time.created ? `Thought for ${duration(part.time.completed - part.time.created)}` : "Thought";
  if (!expanded) {
    const preview = text.split("\n").filter(Boolean).pop() ?? "";
    return (
      <Box flexDirection="row" height={1} flexShrink={0} paddingLeft={3}>
        <Text color={theme.muted} italic wrap="nowrap" flexShrink={0}>
          {label}
        </Text>
        <Text color={theme.subtle} italic wrap="truncate-end" flexShrink={1}>
          {preview ? `  ${preview}` : ""}
        </Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" flexShrink={0} paddingLeft={3}>
      <Box flexDirection="column" flexShrink={0} border="heavy" borderTop={false} borderRight={false} borderBottom={false} borderColor={theme.border} paddingLeft={1}>
        <Text color={theme.muted} italic wrap="nowrap">
          {label}
        </Text>
        <Text color={theme.subtle} italic wrap="wrap">
          {text || "…"}
        </Text>
      </Box>
    </Box>
  );
}

function Part({ part, prev, options, live }: { part: AssistantPart; prev: AssistantPart | undefined; options: TimelineOptions; live: boolean }): ReactNode {
  const gap = prev === undefined || (prev.type === "tool" && part.type === "tool") ? 0 : 1;
  let body: ReactNode;
  if (part.type === "text") body = <Markdown content={part.text} paddingLeft={3} codeMaxHeight={options.toolDetails ? undefined : 24} />;
  else if (part.type === "reasoning") body = <Thinking part={part} expanded={options.thinking} live={live} />;
  else body = <ToolCard part={part} expanded={options.toolDetails} directory={options.directory} />;
  return (
    <Box flexDirection="column" flexShrink={0} marginTop={gap}>
      {body}
    </Box>
  );
}

function Assistant({ msg, options, live }: { msg: AssistantMessage; options: TimelineOptions; live: boolean }): ReactNode {
  const theme = useTheme();
  const models = useStoreState((s) => s.models);
  const took = msg.time.completed ? duration(msg.time.completed - msg.time.created) : "";
  const model = models.find((m) => m.id === msg.model.id && m.providerID === msg.model.providerID)?.name ?? modelLabel(msg.model);
  const parts = msg.content.filter((p) => (p.type === "text" ? p.text.trim().length > 0 : p.type === "reasoning" ? p.text.trim().length > 0 || live : true));
  return (
    <Box flexDirection="column" flexShrink={0}>
      {parts.map((p, i) => (
        <Part key={p.type === "tool" ? p.id || i : i} part={p} prev={parts[i - 1]} options={options} live={live} />
      ))}
      {live && parts.length === 0 ? (
        <Text color={theme.muted} italic paddingLeft={3}>
          Thinking
        </Text>
      ) : null}
      {msg.error ? (
        <Text color={theme.danger} wrap="wrap" paddingLeft={3} marginTop={1}>
          {msg.error.message}
        </Text>
      ) : null}
      {msg.time.completed && !live ? (
        <Box flexDirection="row" height={1} paddingLeft={3} marginTop={1}>
          <Text color={agentColor(theme, msg.agent)} wrap="nowrap">
            ▣{" "}
          </Text>
          <Text color={theme.subtle} wrap="truncate-end">
            {[capitalize(msg.agent), model, took].filter(Boolean).join(" · ")}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

function Shell({ msg }: { msg: ShellMessage }): ReactNode {
  const theme = useTheme();
  return (
    <Box flexDirection="column" flexShrink={0} paddingLeft={3}>
      <Text wrap="truncate-end">
        <Text color={theme.muted}>$ </Text>
        <Text color={theme.fg}>{msg.command}</Text>
        <Text color={theme.subtle}>{`  ${msg.status}`}</Text>
      </Text>
      {msg.output ? (
        <Text color={theme.subtle} wrap="wrap" paddingLeft={2}>
          {msg.output.split("\n").slice(-6).join("\n")}
        </Text>
      ) : null}
    </Box>
  );
}

function Message({ msg, next, options, live }: { msg: SessionMessage; next: SessionMessage | undefined; options: TimelineOptions; live: boolean }): ReactNode {
  const theme = useTheme();
  const agent = useStoreState((s) => s.agent);
  switch (msg.type) {
    case "user":
      return <UserBubble msg={msg} agent={next?.type === "assistant" ? next.agent : agent} />;
    case "assistant":
      return <Assistant msg={msg} options={options} live={live} />;
    case "shell":
      return <Shell msg={msg} />;
    case "note": {
      const color = msg.tone === "danger" ? theme.danger : msg.tone === "warning" ? theme.warning : msg.tone === "info" ? theme.info : theme.subtle;
      return (
        <Text color={color} italic wrap="truncate-end" paddingLeft={3}>
          {msg.text}
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
    <ScrollBox stickyScroll showScrollbar={false} flexGrow={1} paddingTop={1} gap={1} focused>
      {loading ? (
        <Text color={theme.muted} italic paddingLeft={3}>
          Loading…
        </Text>
      ) : null}
      {!loading && messages.length === 0 ? (
        <Text color={theme.subtle} paddingLeft={3}>
          No messages yet.
        </Text>
      ) : null}
      {messages.map((m, i) => (
        <Message key={m.id} msg={m} next={messages[i + 1]} options={options} live={busy && m.id === lastAssistant && m.type === "assistant" && !m.time.completed} />
      ))}
    </ScrollBox>
  );
}
