import { useState, type ReactNode } from "react";
import { Box, KeyHint, Spinner, Text, Textarea, useTheme, useViewport } from "textjs";
import { modelLabel } from "../lib/format";
import { useStoreState } from "../lib/store";
import { SIDEBAR_WIDTH } from "./Shell";

export interface ComposerProps {
  onSubmit: (text: string) => void;
  busy?: boolean;
  placeholder?: string;
}

/** Activity row + prompt composer + key legend, pinned to the bottom of the main column. */
export function Composer({ onSubmit, busy = false, placeholder }: ComposerProps): ReactNode {
  const theme = useTheme();
  const [value, setValue] = useState("");
  const agent = useStoreState((s) => s.agent);
  const model = useStoreState((s) => s.model);
  const toast = useStoreState((s) => s.toast);
  const ui = useStoreState((s) => s.ui);
  const vp = useViewport();
  const accent = agent === "plan" ? theme.info : theme.accent;

  const submit = (text: string): void => {
    if (text.trim().length === 0) return;
    setValue("");
    onSubmit(text);
  };

  return (
    <Box flexDirection="column" flexShrink={0} paddingX={1}>
      <Box flexDirection="row" height={1} paddingX={1}>
        {busy ? (
          <Spinner variant="matrix" label="Generating… (Esc to interrupt)" color={accent} />
        ) : toast ? (
          <Text color={toast.tone === "danger" ? theme.danger : toast.tone === "warning" ? theme.warning : toast.tone === "success" ? theme.success : theme.info} wrap="truncate-end">
            {toast.text}
          </Text>
        ) : (
          <Text color={theme.subtle} wrap="truncate-end">
            {`tools ${ui.toolDetails ? "expanded" : "compact"} · thinking ${ui.thinking ? "expanded" : "collapsed"}`}
          </Text>
        )}
        <Box flexGrow={1} />
        {busy && toast ? (
          <Text color={theme.warning} wrap="nowrap">
            {toast.text}
          </Text>
        ) : null}
      </Box>
      <Box
        flexDirection="row"
        flexShrink={0}
        border="rounded"
        borderColor={accent}
        bg={theme.panel}
        paddingX={1}
        bottomTitle={` ${agent} · ${modelLabel(model)} `}
        bottomTitleColor={accent}
        bottomTitleAlign="right"
      >
        <Text color={accent} bold wrap="nowrap" flexShrink={0}>
          {"❯ "}
        </Text>
        <Textarea value={value} onChange={setValue} onSubmit={submit} focused placeholder={placeholder ?? "Ask anything…  \"Fix the flaky checkout test\""} minRows={1} maxRows={6} />
      </Box>
      <Box flexDirection="row" height={1} paddingX={1} gap={2} overflow="hidden">
        {fitHints(busy ? [["esc", "interrupt"], ...hints(agent)] : hints(agent), vp.cols - (ui.sidebar ? SIDEBAR_WIDTH : 0) - 4).map(([k, label]) => (
          <KeyHint key={k} keys={k} label={label} />
        ))}
      </Box>
    </Box>
  );
}

function hints(agent: string): Array<[string, string]> {
  return [
    ["enter", "send"],
    ["tab", agent === "plan" ? "→ build" : "→ plan"],
    ["ctrl+p", "commands"],
    ["ctrl+m", "model"],
    ["⇧enter", "newline"],
    ["ctrl+b", "sidebar"],
    ["ctrl+o", "tools"],
    ["ctrl+t", "thinking"],
  ];
}

/** Keep only the hints that fit on one row (each hint is `keys label` plus a 2-cell gap). */
function fitHints(list: Array<[string, string]>, width: number): Array<[string, string]> {
  let used = 0;
  return list.filter(([k, label]) => {
    const w = k.length + 1 + label.length + (used > 0 ? 2 : 0);
    if (used + w > width) return false;
    used += w;
    return true;
  });
}
