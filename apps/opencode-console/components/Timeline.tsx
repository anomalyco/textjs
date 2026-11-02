import { memo, useEffect, useRef, type ReactNode } from "react";
import { Box, ScrollBox, Text, useKeymap, useTheme, type ScrollBoxHandle } from "@textjs/app";
import { duration, modelLabel } from "../lib/format";
import { useStoreState } from "../lib/store";
import { useCommandKeys } from "../lib/bindings";
import type {
  AssistantMessage,
  AssistantPart,
  ReasoningPart,
  SessionMessage,
  ShellMessage,
  ToolPart,
  UserMessage,
} from "../lib/types";
import { exploration, explorationLabel } from "../lib/tool-data";
import { useAgentColor, capitalize } from "./Composer";
import { BlockTool, ToolCard } from "./ToolCard";
import { tint } from "./Logo";
import { TranscriptMarkdown } from "./TranscriptMarkdown";

export interface TimelineOptions {
  toolDetails: boolean;
  thinking: boolean;
  groupExploration: boolean;
  directory?: string;
}

const UserBubble = memo(function UserBubble({ msg, agent }: { msg: UserMessage; agent: string }): ReactNode {
  const theme = useTheme();
  return (
    <Box
      flexDirection="column"
      flexShrink={0}
      bg={theme.surface}
      border="heavy"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderColor={useAgentColor(theme, agent)}
    >
      <Box flexDirection="column" flexShrink={0} paddingX={2} paddingY={1}>
        <Text color={theme.fg} wrap="wrap">
          {msg.text}
        </Text>
        {msg.files?.map((file, i) => (
          <Text
            key={i}
            color={theme.muted}
          >{`${file.mime.startsWith("image/") ? "image" : file.mime === "application/x-directory" ? "dir" : "file"} ${file.name}`}</Text>
        ))}
      </Box>
    </Box>
  );
});

function Thinking({ part, expanded, live }: { part: ReasoningPart; expanded: boolean; live: boolean }): ReactNode {
  const theme = useTheme();
  const text = part.text.trim();
  const done = !live || part.time?.completed !== undefined;
  const label = done ? "Thought" : "Thinking";
  const elapsed = part.time?.completed !== undefined ? duration(part.time.completed - part.time.created) : "";
  if (!expanded) {
    const title = /^\*\*([^*\n]+)\*\*(?:\r?\n\r?\n|$)/.exec(text)?.[1];
    return (
      <Box flexDirection="row" height={1} flexShrink={0} paddingLeft={3}>
        <Text color={done ? tint(theme.bg, theme.warning, 0.6) : theme.fg} wrap="nowrap" flexShrink={0}>
          {done ? "+ " : ""}
          {label}
        </Text>
        <Text color={done ? tint(theme.bg, theme.warning, 0.6) : theme.fg} wrap="truncate-end" flexShrink={1}>
          {title ? `: ${title.trim()}` : ""}
          {done && elapsed ? ` · ${elapsed}` : ""}
        </Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" flexShrink={0} paddingLeft={3}>
      <Box
        flexDirection="column"
        flexShrink={0}
        border="heavy"
        borderTop={false}
        borderRight={false}
        borderBottom={false}
        borderColor={theme.border}
        paddingLeft={1}
      >
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

const Part = memo(function Part({
  part,
  prev,
  options,
  live,
}: {
  part: AssistantPart;
  prev: AssistantPart | undefined;
  options: TimelineOptions;
  live: boolean;
}): ReactNode {
  const gap = prev === undefined ? 0 : 1;
  let body: ReactNode;
  if (part.type === "text") body = <TranscriptMarkdown content={part.text} expanded={options.toolDetails} />;
  else if (part.type === "reasoning") body = <Thinking part={part} expanded={options.thinking} live={live} />;
  else body = <ToolCard part={part} expanded={options.toolDetails} directory={options.directory} />;
  return (
    <Box flexDirection="column" flexShrink={0} marginTop={gap}>
      {body}
    </Box>
  );
});

function Assistant({
  msg,
  options,
  live,
  turnStart,
}: {
  msg: AssistantMessage;
  options: TimelineOptions;
  live: boolean;
  turnStart?: number;
}): ReactNode {
  const theme = useTheme();
  const models = useStoreState((s) => s.models);
  const took = msg.time.completed ? duration(Math.max(0, msg.time.completed - (turnStart ?? msg.time.created))) : "";
  const color = useAgentColor(theme, msg.agent);
  const verbosity = useStoreState((s) => s.verbosity);
  const model = models.find((m) => m.id === msg.model.id && m.providerID === msg.model.providerID)?.name ?? modelLabel(msg.model);
  const parts = msg.content.filter((p) =>
    p.type === "text" ? p.text.trim().length > 0 : p.type === "reasoning" ? p.text.trim().length > 0 || live : true,
  );
  const rows: ReactNode[] = [];
  const grouped = (p: AssistantPart | undefined): p is ToolPart =>
    !!p && p.type === "tool" && p.state.status !== "error" && exploration(p.name) !== undefined;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (verbosity === "low" && p.type !== "text" && !(p.type === "tool" && (p.state.status === "error" || p.name === "question"))) {
      let n = 1;
      while (parts[i + 1] && parts[i + 1]!.type !== "text") {
        const next = parts[i + 1]!;
        if (next.type === "tool" && (next.state.status === "error" || next.name === "question")) break;
        i++;
        n++;
      }
      rows.push(
        <Text key={`activity:${i}`} color={theme.muted} paddingLeft={3} marginTop={rows.length ? 1 : 0}>
          + Activity · {n}
        </Text>,
      );
    } else if (verbosity !== "high" && options.groupExploration && grouped(p)) {
      const group = [p];
      while (grouped(parts[i + 1])) group.push(parts[++i] as ToolPart);
      rows.push(
        <Text key={`explore:${p.id}`} color={theme.muted} paddingLeft={3} marginTop={rows.length ? 1 : 0} wrap="truncate-end">
          {explorationLabel(group)}
        </Text>,
      );
    } else rows.push(<Part key={p.type === "tool" ? p.id || i : i} part={p} prev={parts[i - 1]} options={options} live={live} />);
  }
  return (
    <Box flexDirection="column" flexShrink={0}>
      {rows}
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
          <Text color={theme.subtle} wrap="truncate-end">
            <Text color={color}>{capitalize(msg.agent)}</Text>
            {` · ${model}${took ? ` · ${took}` : ""}`}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

function Shell({ msg }: { msg: ShellMessage }): ReactNode {
  const theme = useTheme();
  return (
    <BlockTool title={`$ ${msg.command}`} shell>
      {msg.output ? (
        <Text color={theme.muted} wrap="wrap">
          {msg.output.split("\n").slice(-6).join("\n")}
        </Text>
      ) : null}
    </BlockTool>
  );
}

const Message = memo(function Message({
  msg,
  next,
  options,
  live,
  turnStart,
}: {
  msg: SessionMessage;
  next: SessionMessage | undefined;
  options: TimelineOptions;
  live: boolean;
  turnStart?: number;
}): ReactNode {
  const theme = useTheme();
  const agent = useStoreState((s) => s.agent);
  switch (msg.type) {
    case "user":
      return <UserBubble msg={msg} agent={next?.type === "assistant" ? next.agent : agent} />;
    case "assistant":
      return <Assistant msg={msg} options={options} live={live} turnStart={turnStart} />;
    case "shell":
      return <Shell msg={msg} />;
    case "note": {
      const color =
        msg.tone === "danger"
          ? theme.danger
          : msg.tone === "warning"
            ? theme.warning
            : msg.tone === "info"
              ? theme.info
              : theme.subtle;
      return (
        <Text color={color} italic wrap="wrap" paddingLeft={3}>
          {msg.text}
        </Text>
      );
    }
  }
});

export function Timeline({
  messages,
  options,
  busy,
  loading,
  onAway,
  interactive = true,
  sessionID,
}: {
  messages: readonly SessionMessage[];
  options: TimelineOptions;
  busy: boolean;
  loading: boolean;
  onAway?: (away: boolean) => void;
  interactive?: boolean;
  sessionID?: string;
}): ReactNode {
  const theme = useTheme();
  const scroll = useRef<ScrollBoxHandle>(null);
  const scrollbar = useStoreState((s) => s.ui.scrollbar),
    motion = useStoreState((s) => s.motion),
    last = useRef<string | null>(null);
  const boundary = useStoreState((s) => s.sessions.find((v) => v.id === sessionID)?.revertedFrom),
    jump = useStoreState((s) => s.jump);
  const cut = boundary ? messages.findIndex((m) => m.id === boundary) : -1;
  const reverted = cut < 0 ? 0 : messages.slice(cut).filter((m) => m.type === "user").length;
  if (cut >= 0) messages = messages.slice(0, cut);
  const go = (id?: string) => {
    const node = scroll.current?.node,
      i = messages.findIndex((m) => m.id === id),
      row = i >= 0 ? node?.children[i] : null;
    if (row && node) scroll.current?.scrollTo(row.layout.y - node.layout.contentY);
  };
  useEffect(() => {
    if (jump && jump.sessionID === sessionID) go(jump.messageID);
  }, [jump, sessionID]);
  useEffect(() => {
    if (!motion || motion.id !== sessionID) return;
    const eligible = messages.filter((m) => !motion.users || m.type === "user");
    const i = eligible.findIndex((m) => m.id === last.current);
    const m =
      eligible[
        Math.min(eligible.length - 1, Math.max(0, i < 0 ? (motion.direction === 1 ? 0 : eligible.length - 1) : i + motion.direction))
      ];
    if (m) {
      last.current = m.id;
      go(m.id);
    }
  }, [motion, sessionID]);
  const page = () => Math.max(1, (scroll.current?.node?.layout.contentHeight ?? 1) - 1);
  useCommandKeys(
    {
      "session.page.up": () => scroll.current?.scrollBy(-page()),
      "session.page.down": () => scroll.current?.scrollBy(page()),
      "session.half.page.up": () => scroll.current?.scrollBy(-Math.ceil(page() / 2)),
      "session.half.page.down": () => scroll.current?.scrollBy(Math.ceil(page() / 2)),
      "session.line.up": () => scroll.current?.scrollBy(-1),
      "session.line.down": () => scroll.current?.scrollBy(1),
      "session.first": () => scroll.current?.scrollToTop(),
      "session.last": () => {
        scroll.current?.scrollToBottom();
        onAway?.(false);
      },
      "session.messages_last_user": () =>
        go(
          messages
            .slice()
            .reverse()
            .find((m) => m.type === "user")?.id,
        ),
    },
    11,
    undefined,
    interactive,
  );
  const lastAssistant = (() => {
    for (let i = messages.length - 1; i >= 0; i--)
      if ((messages[i] as SessionMessage).type === "assistant") return (messages[i] as SessionMessage).id;
    return null;
  })();
  let turnStart: number | undefined;
  return (
    <ScrollBox
      ref={scroll}
      isActive={interactive}
      stickyScroll
      showScrollbar={!!scrollbar}
      flexGrow={1}
      paddingTop={1}
      gap={1}
      onScroll={() => onAway?.(!scroll.current?.isSticky())}
    >
      {loading ? (
        <Text color={theme.muted} italic paddingLeft={3}>
          Loading…
        </Text>
      ) : null}
      {messages.map((m, i) => {
        if (m.type === "user") turnStart = m.time.created;
        return (
          <Message
            key={m.id}
            msg={m}
            next={messages[i + 1]}
            options={options}
            turnStart={turnStart}
            live={busy && m.id === lastAssistant && m.type === "assistant" && !m.time.completed}
          />
        );
      })}
      {reverted > 0 && (
        <Box bg={theme.surface} paddingX={3} paddingY={1} flexDirection="column">
          <Text color={theme.muted}>
            {reverted} message{reverted === 1 ? "" : "s"} reverted
          </Text>
          <Text color={theme.muted}>ctrl+x r to redo</Text>
        </Box>
      )}
    </ScrollBox>
  );
}
