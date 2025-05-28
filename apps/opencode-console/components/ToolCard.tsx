import type { ReactNode } from "react";
import { Box, Code, Diff, Spinner, Text, useTheme } from "textjs";
import { duration, shortPath } from "../lib/format";
import type { JsonRecord, ToolPart } from "../lib/types";

const ICONS: Record<string, string> = {
  read: "→",
  edit: "✎",
  write: "✚",
  patch: "✎",
  apply_patch: "✎",
  grep: "✱",
  glob: "✱",
  list: "☰",
  shell: "$",
  bash: "$",
  webfetch: "⇣",
  websearch: "◎",
  task: "◉",
  subagent: "◉",
  todowrite: "☐",
  skill: "✦",
  execute: "λ",
};

const s = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

function inputOf(part: ToolPart): JsonRecord {
  if (part.state.status !== "streaming") return part.state.input;
  try {
    const parsed: unknown = JSON.parse(part.state.input);
    return typeof parsed === "object" && parsed !== null ? (parsed as JsonRecord) : {};
  } catch {
    return {};
  }
}

/** The headline target of a tool call: path, command, pattern, URL… */
export function toolTarget(name: string, input: JsonRecord): string {
  const path = s(input.path) ?? s(input.filePath) ?? s(input.file);
  switch (name) {
    case "shell":
    case "bash":
      return s(input.command) ?? "";
    case "grep":
      return `${s(input.pattern) ?? ""}${path ? `  in ${path}` : ""}`;
    case "glob":
      return `${s(input.pattern) ?? ""}${path ? `  in ${path}` : ""}`;
    case "webfetch":
      return s(input.url) ?? "";
    case "websearch":
      return s(input.query) ?? "";
    case "task":
    case "subagent":
      return `${s(input.agent) ?? ""} ${s(input.description) ?? ""}`.trim();
    case "skill":
      return s(input.id) ?? s(input.name) ?? "";
    default:
      return path ?? s(input.pattern) ?? s(input.command) ?? s(input.description) ?? "";
  }
}

/** Show paths relative to the session directory (`/repo/src/a.ts` → `src/a.ts`), else `~`-shortened. */
function relativeTo(text: string, directory: string | undefined): string {
  const out = directory && directory.length > 1 ? text.split(`${directory.replace(/\/+$/, "")}/`).join("") : text;
  return shortPath(out);
}

function outputText(part: ToolPart): string {
  if (part.state.status === "completed" || part.state.status === "error") {
    return (part.state.content ?? [])
      .map((c) => (c.type === "text" ? c.text : `[${c.name ?? c.uri}]`))
      .join("\n")
      .replace(/\s+$/, "");
  }
  return "";
}

function tail(text: string, n: number): { text: string; hidden: number } {
  const lines = text.split("\n");
  if (lines.length <= n) return { text, hidden: 0 };
  return { text: lines.slice(lines.length - n).join("\n"), hidden: lines.length - n };
}

function languageOf(path: string | undefined): string | undefined {
  const m = path ? /\.([A-Za-z0-9]+)$/.exec(path) : null;
  return m ? m[1] : undefined;
}

export function ToolCard({ part, expanded, directory }: { part: ToolPart; expanded: boolean; directory?: string }): ReactNode {
  const theme = useTheme();
  const input = inputOf(part);
  const status = part.state.status;
  const name = part.name;
  const target = relativeTo(toolTarget(name, input), directory);
  const running = status === "streaming" || status === "running";
  const elapsed = part.time?.completed && part.time.created ? duration(part.time.completed - part.time.created) : "";
  const path = s(input.path) ?? s(input.filePath);
  const out = outputText(part);
  const lineCount = out ? out.split("\n").length : 0;

  let body: ReactNode = null;
  if ((name === "edit" || name === "patch" || name === "apply_patch") && (typeof input.oldString === "string" || typeof input.newString === "string" || typeof input.patch === "string")) {
    const patch = typeof input.patch === "string" ? input.patch : { before: s(input.oldString) ?? "", after: s(input.newString) ?? "", filename: relativeTo(path ?? "file", directory) };
    body = <Diff patch={patch} maxHeight={expanded ? 60 : 14} marginTop={0} />;
  } else if (name === "write" && typeof input.content === "string") {
    body = <Code code={input.content} language={languageOf(path)} maxHeight={expanded ? 40 : 8} showLineNumbers />;
  } else if ((name === "shell" || name === "bash") && out) {
    const t = expanded ? { text: out, hidden: 0 } : tail(out, 5);
    body = (
      <Box flexDirection="column" flexShrink={0}>
        {t.hidden > 0 ? <Text color={theme.subtle} italic>{`… ${t.hidden} earlier lines`}</Text> : null}
        <Text color={theme.muted} wrap="wrap">
          {t.text}
        </Text>
      </Box>
    );
  } else if (expanded && out && status === "completed") {
    body = <Code code={out} language={name === "read" ? languageOf(path) : undefined} maxHeight={24} />;
  }

  const exit = part.state.status === "completed" ? part.state.metadata?.exit : undefined;
  const summary =
    status === "completed"
      ? name === "read"
        ? `${lineCount} lines`
        : name === "grep"
          ? `${typeof part.state.metadata?.matches === "number" ? part.state.metadata.matches : lineCount} matches`
          : name === "glob"
            ? `${typeof part.state.metadata?.count === "number" ? part.state.metadata.count : lineCount} files`
            : typeof exit === "number"
              ? `exit ${exit}`
              : ""
      : "";

  return (
    <Box flexDirection="column" flexShrink={0} bg={theme.panel} border="single" borderTop={false} borderRight={false} borderBottom={false} borderColor={status === "error" ? theme.danger : running ? theme.accent : theme.border} paddingX={1}>
      <Box flexDirection="row" height={1} gap={1}>
        <Text color={theme.accent} wrap="nowrap" flexShrink={0}>
          {ICONS[name] ?? "⚙"}
        </Text>
        <Text bold color={theme.fg} wrap="nowrap" flexShrink={0}>
          {name}
        </Text>
        <Text color={theme.muted} wrap="truncate-end" flexShrink={1}>
          {target}
        </Text>
        <Box flexGrow={1} />
        {summary ? (
          <Text color={theme.subtle} wrap="nowrap" flexShrink={0}>
            {summary}
          </Text>
        ) : null}
        {running ? (
          <Spinner variant="dots" label={status === "streaming" ? "preparing" : "running"} color={theme.accent} />
        ) : status === "error" ? (
          <Text color={theme.danger} wrap="nowrap" flexShrink={0}>
            ✗ error
          </Text>
        ) : (
          <Text color={theme.success} wrap="nowrap" flexShrink={0}>
            {`✓ ${elapsed || "done"}`}
          </Text>
        )}
      </Box>
      {part.state.status === "error" ? (
        <Text color={theme.danger} wrap="wrap">
          {part.state.error.message}
        </Text>
      ) : null}
      {body ? (
        <Box flexDirection="column" flexShrink={0} marginBottom={0}>
          {body}
        </Box>
      ) : null}
    </Box>
  );
}
