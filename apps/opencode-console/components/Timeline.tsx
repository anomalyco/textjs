import { memo, useRef, type ReactNode } from "react";
import { Box, ScrollBox, Text, useKeymap, useTheme, type ScrollBoxHandle } from "@textjs/next";
import { duration, modelLabel } from "../lib/format";
import { useStoreState } from "../lib/store";
import type { AssistantMessage, AssistantPart, ReasoningPart, SessionMessage, ShellMessage, ToolPart, UserMessage } from "../lib/types";
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
    <Box flexDirection="column" flexShrink={0} bg={theme.surface} border="heavy" borderTop={false} borderRight={false} borderBottom={false} borderColor={useAgentColor(theme, agent)}>
      <Box flexDirection="column" flexShrink={0} paddingX={2} paddingY={1}>
        <Text color={theme.fg} wrap="wrap">
          {msg.text}
        </Text>
        {msg.files?.map((file, i) => <Text key={i} color={theme.muted}>{`${file.mime.startsWith("image/") ? "image" : file.mime === "application/x-directory" ? "dir" : "file"} ${file.name}`}</Text>)}
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
        <Text color={done ? tint(theme.bg,theme.warning,0.6) : theme.fg} wrap="nowrap" flexShrink={0}>
          {done ? "+ " : ""}{label}
        </Text>
        <Text color={done ? tint(theme.bg,theme.warning,0.6) : theme.fg} wrap="truncate-end" flexShrink={1}>
          {title ? `: ${title.trim()}` : ""}{done && elapsed ? ` · ${elapsed}` : ""}
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

const Part = memo(function Part({ part, prev, options, live }: { part: AssistantPart; prev: AssistantPart | undefined; options: TimelineOptions; live: boolean }): ReactNode {
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

function Assistant({ msg, options, live, turnStart }: { msg: AssistantMessage; options: TimelineOptions; live: boolean; turnStart?: number }): ReactNode {
  const theme = useTheme();
  const models = useStoreState((s) => s.models);
  const took = msg.time.completed ? duration(Math.max(0, msg.time.completed - (turnStart ?? msg.time.created))) : "";
  const color = useAgentColor(theme, msg.agent);
  const model = models.find((m) => m.id === msg.model.id && m.providerID === msg.model.providerID)?.name ?? modelLabel(msg.model);
  const parts = msg.content.filter((p) => (p.type === "text" ? p.text.trim().length > 0 : p.type === "reasoning" ? p.text.trim().length > 0 || live : true));
  const rows: ReactNode[] = [];
  const grouped = (p: AssistantPart | undefined): p is ToolPart => !!p && p.type === "tool" && p.state.status !== "error" && exploration(p.name) !== undefined;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (options.groupExploration && grouped(p)) {
      const group = [p];
      while (grouped(parts[i + 1])) group.push(parts[++i] as ToolPart);
      rows.push(<Text key={`explore:${p.id}`} color={theme.muted} paddingLeft={3} marginTop={rows.length ? 1 : 0} wrap="truncate-end">{explorationLabel(group)}</Text>);
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
            <Text color={color}>{capitalize(msg.agent)}</Text>{` · ${model}${took ? ` · ${took}` : ""}`}
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

const Message = memo(function Message({ msg, next, options, live, turnStart }: { msg: SessionMessage; next: SessionMessage | undefined; options: TimelineOptions; live: boolean; turnStart?: number }): ReactNode {
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
      const color = msg.tone === "danger" ? theme.danger : msg.tone === "warning" ? theme.warning : msg.tone === "info" ? theme.info : theme.subtle;
      return (
        <Text color={color} italic wrap="truncate-end" paddingLeft={3}>
          {msg.text}
        </Text>
      );
    }
  }
});

export function Timeline({ messages, options, busy, loading, onAway, interactive=true }: { messages: readonly SessionMessage[]; options: TimelineOptions; busy: boolean; loading: boolean; onAway?: (away:boolean)=>void;interactive?:boolean }): ReactNode {
  const theme = useTheme();
  const scroll = useRef<ScrollBoxHandle>(null);
  const page = () => Math.max(1, (scroll.current?.node?.layout.contentHeight ?? 1) - 1);
  useKeymap({
    "pageup, ctrl+alt+b": () => scroll.current?.scrollBy(-page()),
    "pagedown, ctrl+alt+f": () => scroll.current?.scrollBy(page()),
    "ctrl+alt+u": () => scroll.current?.scrollBy(-Math.ceil(page()/2)),
    "ctrl+alt+d": () => scroll.current?.scrollBy(Math.ceil(page()/2)),
    "ctrl+alt+y": () => scroll.current?.scrollBy(-1),
    "ctrl+alt+e": () => scroll.current?.scrollBy(1),
    "ctrl+g, alt+home, home": () => scroll.current?.scrollToTop(),
    "ctrl+alt+g, end": () => {scroll.current?.scrollToBottom();onAway?.(false);},
  }, { priority: 11,isActive:interactive });
  const lastAssistant = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if ((messages[i] as SessionMessage).type === "assistant") return (messages[i] as SessionMessage).id;
    return null;
  })();
  let turnStart: number | undefined;
  return (
    <ScrollBox ref={scroll} isActive={interactive} stickyScroll showScrollbar={false} flexGrow={1} paddingTop={1} gap={1} onScroll={()=>onAway?.(!scroll.current?.isSticky())}>
      {loading ? (
        <Text color={theme.muted} italic paddingLeft={3}>
          Loading…
        </Text>
      ) : null}
      {messages.map((m, i) => {
        if (m.type === "user") turnStart = m.time.created;
        return <Message key={m.id} msg={m} next={messages[i + 1]} options={options} turnStart={turnStart} live={busy && m.id === lastAssistant && m.type === "assistant" && !m.time.completed} />;
      })}
    </ScrollBox>
  );
}
