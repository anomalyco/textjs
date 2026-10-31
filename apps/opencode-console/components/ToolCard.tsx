import { memo, type ReactNode } from "react";
import { Box, Code, Diff, Spinner, Text, useTheme } from "@textjs/next";
import { shortPath } from "../lib/format";
import { capitalize, Dots } from "./Composer";
import type { JsonRecord, ToolPart } from "../lib/types";
import { finite, metadata, patchFiles, questionLines, string as s, todoLines } from "../lib/tool-data";

/** Inline tool icons, as in the OpenCode TUI. */
const ICONS: Record<string, string> = {
  read: "→",
  edit: "←",
  write: "←",
  patch: "←",
  apply_patch: "←",
  grep: "✱",
  glob: "✱",
  list: "→",
  shell: "$",
  bash: "$",
  webfetch: "%",
  websearch: "◈",
  task: "◉",
  subagent: "◉",
  skill: "→",
};

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
    case "glob":
      return `"${s(input.pattern) ?? ""}"${path ? ` in ${path}` : ""}`;
    case "webfetch":
      return s(input.url) ?? "";
    case "websearch":
      return `"${s(input.query) ?? ""}"`;
    case "task":
    case "subagent":
      return `${s(input.agent) ?? ""} ${s(input.description) ?? ""}`.trim();
    case "skill":
      return `"${s(input.id) ?? s(input.name) ?? ""}"`;
    case "read": {
      const offset = finite(input.offset) || 1;
      return (path ?? "") + (input.offset !== undefined || input.limit !== undefined ? `:${offset}-${input.limit ? offset + (finite(input.limit) ?? 0) - 1 : ""}` : "");
    }
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

/** One inline tool row (`→ Read src/a.ts`), with a compact diff or output underneath. */
export const ToolCard = memo(function ToolCard({ part, expanded, directory }: { part: ToolPart; expanded: boolean; directory?: string }): ReactNode {
  const theme = useTheme();
  const input = inputOf(part);
  const status = part.state.status;
  const name = part.name;
  const target = relativeTo(toolTarget(name, input), directory);
  const running = status === "streaming" || status === "running";
  const failed = status === "error";
  const path = s(input.path) ?? s(input.filePath);
  const out = outputText(part);
  const meta = metadata(part);
  const shell = name === "shell" || name === "bash";

  let body: ReactNode = null;
  const files = patchFiles(part);
  let title = shell ? target || name : `${name === "webfetch" ? "WebFetch" : name === "websearch" ? "Web Search" : capitalize(name)}${target ? ` ${target}` : ""}`;
  if (files.length && ["edit", "write", "patch", "apply_patch"].includes(name)) {
    body = files.map((file, i) => <Box key={`${file.path}:${i}`} flexDirection="column" flexShrink={0}>
      <Text wrap="truncate-end">{`${file.kind === "added" || file.kind === "add" ? "# Created" : file.kind === "deleted" || file.kind === "delete" ? "# Deleted" : "← Patched"} ${file.path}`}</Text>
      {file.patch && <Diff patch={file.patch} maxHeight={expanded ? 60 : 10} />}
    </Box>);
  } else if (name === "todowrite") {
    const todos = todoLines(input);
    title = failed ? "Todo update failed" : running ? "Updating todos…" : todos.length ? "# Todos" : "Cleared todos";
    if (!running && !failed && todos.length) body = <Text>{todos.join("\n")}</Text>;
  } else if (name === "question") {
    const lines = questionLines(input, meta);
    title = lines.length ? "# Questions" : "Asking questions…";
    if (lines.length) body = <Text>{lines.join("\n")}</Text>;
  } else if ((name === "edit" || name === "patch" || name === "apply_patch") && (typeof input.oldString === "string" || typeof input.newString === "string" || typeof input.patch === "string")) {
    const patch = typeof input.patch === "string" ? input.patch : { before: s(input.oldString) ?? "", after: s(input.newString) ?? "", filename: relativeTo(path ?? "file", directory) };
    body = <Diff patch={patch} context={expanded ? 3 : 1} maxHeight={expanded ? 60 : 10} marginTop={0} />;
  } else if (name === "write" && typeof input.content === "string") {
    body = <Code code={input.content} language={languageOf(path)} maxHeight={expanded ? 40 : 6} showLineNumbers />;
  } else if (shell && out) {
    const t = expanded ? { text: out, hidden: 0 } : tail(out, 3);
    body = (
      <Box flexDirection="column" flexShrink={0}>
        {t.hidden > 0 ? <Text color={theme.subtle}>{`… ${t.hidden} earlier lines`}</Text> : null}
        <Text color={theme.subtle} wrap="wrap">
          {t.text}
        </Text>
      </Box>
    );
  } else if (expanded && out && status === "completed") {
    body = <Code code={out} language={name === "read" ? languageOf(path) : undefined} maxHeight={24} />;
  }

  const count = name === "grep" ? finite(meta.matches) : name === "glob" ? finite(meta.count) : undefined;
  const summary = count ? ` (${count} ${count === 1 ? "match" : "matches"})` : "";
  const color = failed ? theme.danger : theme.muted;

  return (
    <Box flexDirection="column" flexShrink={0} paddingLeft={3}>
      <Box flexDirection="row" height={1}>
        <Text color={color} width={2} wrap="nowrap" flexShrink={0}>
          {ICONS[name] ?? "⚙"}
        </Text>
        <Text color={color} wrap="truncate-end" flexShrink={1}>
          {title}
        </Text>
        {summary ? (
          <Text color={theme.subtle} wrap="nowrap" flexShrink={0}>
            {summary}
          </Text>
        ) : null}
        {running ? (
          <Box flexShrink={0} marginLeft={1}>
            <Dots color={theme.subtle} />
          </Box>
        ) : null}
      </Box>
      {part.state.status === "error" ? (
        <Text color={theme.danger} wrap="wrap" paddingLeft={2}>
          {part.state.error.message}
        </Text>
      ) : null}
      {body ? (
        <Box flexDirection="column" flexShrink={0} paddingLeft={2}>
          {body}
        </Box>
      ) : null}
      {name === "read" && Array.isArray(meta.loaded) && meta.loaded.filter((s): s is string => typeof s === "string").map((file, i) => <Text key={i} paddingLeft={3} color={theme.muted} wrap="truncate-end">{`↳ Loaded ${relativeTo(file, directory)}`}</Text>)}
    </Box>
  );
});
