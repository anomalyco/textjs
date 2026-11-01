import { useMemo, useRef, useState, type ReactNode } from "react";
import { Box, Input, ScrollBox, Text, useFocusManager, useInput, useInterval, useTheme, type Metadata } from "@textjs/app";
import { createLogGenerator, type LogLevel, type LogLine } from "../../lib/data";

export const metadata: Metadata = { title: "Logs" };

const MAX_LINES = 400;
const LEVELS: ReadonlyArray<LogLevel | "all"> = ["all", "info", "warn", "error"];

export default function LogsPage(): ReactNode {
  const theme = useTheme();
  const focus = useFocusManager();
  const next = useRef(createLogGenerator());
  const [logs, setLogs] = useState<LogLine[]>(() => Array.from({ length: 40 }, () => next.current()));
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [live, setLive] = useState(true);

  useInterval(
    () => {
      setLogs((prev) => {
        const out = [...prev, next.current()];
        return out.length > MAX_LINES ? out.slice(out.length - MAX_LINES) : out;
      });
    },
    live ? 450 : null,
  );

  useInput((e) => {
    if (e.ctrl || e.meta) return;
    if (e.key === "escape" && focus.activeId === "log-filter") {
      e.stopPropagation();
      focus.blur();
    } else if (e.input === "/") {
      e.stopPropagation();
      focus.focus("log-filter");
    } else if (e.input === "l") {
      setLevel((l) => LEVELS[(LEVELS.indexOf(l) + 1) % LEVELS.length] as LogLevel | "all");
    } else if (e.key === "space") {
      setLive((v) => !v);
    }
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => (level === "all" || l.level === level) && (q === "" || `${l.method} ${l.path} ${l.status} ${l.message}`.toLowerCase().includes(q)));
  }, [logs, query, level]);

  const levelColor = (l: LogLevel): string => (l === "error" ? theme.danger : l === "warn" ? theme.warning : theme.info);

  return (
    <Box className="flex-col gap-1 pt-1 grow">
      <Box className="flex-row h-1 shrink-0 gap-2">
        <Text bold color={theme.fg} wrap="nowrap">
          Runtime Logs
        </Text>
        <Text color={theme.subtle} italic wrap="nowrap">
          viewing logs inside console.log. yes, really.
        </Text>
        <Box className="grow" />
        <Text color={live ? theme.success : theme.subtle} wrap="nowrap">
          {live ? "● live" : "❚❚ paused"}
        </Text>
      </Box>
      <Box className="flex-row h-3 shrink-0 border rounded px-1 gap-2" borderColor={theme.border}>
        <Text color={theme.subtle} wrap="nowrap">
          /
        </Text>
        <Input id="log-filter" value={query} onChange={setQuery} placeholder="Filter by path, status or message…" onSubmit={() => focus.blur()} />
        <Text color={theme.subtle} wrap="nowrap">
          level
        </Text>
        <Text color={level === "all" ? theme.fg : levelColor(level)} bold wrap="nowrap">
          {level}
        </Text>
      </Box>
      <ScrollBox className="grow border rounded px-1" borderColor={theme.border} stickyScroll focusable bottomTitle={` ${filtered.length}/${logs.length} lines · / filter · l level · space pause `} bottomTitleColor={theme.subtle} bottomTitleAlign="right">
        {filtered.map((l) => (
          <Box key={l.id} className="flex-row h-1 gap-1 shrink-0">
            <Text color={theme.subtle} wrap="nowrap" flexShrink={0}>
              {l.time}
            </Text>
            <Text color={levelColor(l.level)} wrap="nowrap" width={5} flexShrink={0}>
              {l.level.toUpperCase()}
            </Text>
            <Text color={theme.muted} wrap="nowrap" width={6} flexShrink={0}>
              {l.method}
            </Text>
            <Text color={l.status >= 500 ? theme.danger : l.status >= 400 ? theme.warning : theme.success} wrap="nowrap" width={3} flexShrink={0}>
              {String(l.status)}
            </Text>
            <Text color={theme.fg} wrap="truncate-end" width={24} flexShrink={0}>
              {l.path}
            </Text>
            <Text color={theme.subtle} wrap="nowrap" width={6} align="right" flexShrink={0}>
              {`${l.ms}ms`}
            </Text>
            <Text color={theme.muted} wrap="truncate-end" flexGrow={1} flexShrink={1}>
              {l.message}
            </Text>
          </Box>
        ))}
        {filtered.length === 0 ? (
          <Text color={theme.subtle} italic>
            No log lines match your filter.
          </Text>
        ) : null}
      </ScrollBox>
    </Box>
  );
}
