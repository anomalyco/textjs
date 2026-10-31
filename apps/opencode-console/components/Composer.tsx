import { useContext, useEffect, useState, type ReactNode } from "react";
import { Box, Text, Textarea, useTheme, useViewport, type TextTheme } from "@textjs/next";
import { useStoreState } from "../lib/store";
import { DispatchAction, slashAction } from "../lib/commands";

export interface ComposerProps {
  onSubmit: (text: string) => void;
  busy?: boolean;
  interruptArmed?: boolean;
  placeholder?: string;
}

const PLACEHOLDER = 'Ask anything… "Fix broken tests"';

export const capitalize = (s: string): string => (s ? s[0]?.toUpperCase() + s.slice(1) : s);

export function agentColor(theme: TextTheme, agent: string): string {
  return agent === "plan" ? theme.info : theme.accent;
}

/** A four-dot scanner: plain `•` / `·`, so no row ever falls back to a symbol font. */
export function Dots({ color }: { color: string }): ReactNode {
  const vp = useViewport();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (vp.paused) return;
    const id = setInterval(() => setI((n) => (n + 1) % 6), 120);
    return () => clearInterval(id);
  }, [vp.paused]);
  const pos = i < 4 ? i : 6 - i;
  return (
    <Text color={color} wrap="nowrap" flexShrink={0}>
      {"····".slice(0, pos)}•{"····".slice(pos + 1)}
    </Text>
  );
}

export function Hints({ items }: { items: Array<[string, string]> }): ReactNode {
  const theme = useTheme();
  return (
    <Text wrap="nowrap" flexShrink={0}>
      {items.map(([k, label], i) => (
        <Text key={k}>
          {i > 0 ? <Text color={theme.subtle}> · </Text> : null}
          <Text color={theme.fg}>{k}</Text>
          <Text color={theme.muted}>{` ${label}`}</Text>
        </Text>
      ))}
    </Text>
  );
}

/**
 * The TUI's split-border prompt: `┃` in the agent color, a raised panel, a
 * growing multiline editor and the metadata row.
 */
export function Composer({ onSubmit, busy = false, interruptArmed, placeholder }: ComposerProps): ReactNode {
  const theme = useTheme();
  const [value, setValue] = useState("");
  const agent = useStoreState((s) => s.agent);
  const model = useStoreState((s) => s.model);
  const models = useStoreState((s) => s.models);
  const toast = useStoreState((s) => s.toast);
  const history = useStoreState((s) => s.history);
  const dispatch = useContext(DispatchAction);
  const color = agentColor(theme, agent);
  const name = models.find((m) => m.id === model?.id && m.providerID === model?.providerID)?.name ?? model?.id ?? "no model";

  const submit = (text: string): void => {
    if (text.trim().length === 0) return;
    setValue("");
    const action = slashAction(text);
    if (action) dispatch(action);
    else onSubmit(text);
  };

  const right = busy ? (
    <Box flexDirection="row" height={1} flexShrink={0} gap={1}>
      <Dots color={color} />
      <Hints items={[["esc", interruptArmed ? "again to interrupt" : "interrupt"]]} />
    </Box>
  ) : toast ? (
    <Text color={toast.tone === "danger" ? theme.danger : toast.tone === "warning" ? theme.warning : toast.tone === "success" ? theme.success : theme.info} wrap="truncate-end" flexShrink={1}>
      {toast.text}
    </Text>
  ) : (
    <Hints
      items={[
        ["shift+tab", "agents"],
        ["ctrl+p", "commands"],
      ]}
    />
  );

  return (
    <Box flexDirection="column" flexShrink={0} width="100%">
      <Box flexDirection="column" flexShrink={0} border="heavy" borderTop={false} borderRight={false} borderBottom={false} borderColor={color}>
        <Box flexDirection="column" flexShrink={0} bg={theme.panel} paddingX={2} paddingTop={1}>
          <Textarea id="opencode-prompt" value={value} onChange={setValue} onSubmit={submit} history={history} autoFocus placeholder={placeholder ?? PLACEHOLDER} minRows={1} maxRows={6} />
          <Box flexDirection="row" height={1} flexShrink={0} gap={1} marginTop={1}>
            <Text color={color} wrap="nowrap" flexShrink={0}>
              {capitalize(agent)}
            </Text>
            <Text color={theme.muted} wrap="nowrap" flexShrink={0}>
              ·
            </Text>
            <Text color={theme.fg} wrap="truncate-end" flexShrink={1}>
              {name}
            </Text>
            {model ? (
              <Text color={theme.muted} wrap="nowrap" flexShrink={0}>
                {model.providerID === "opencode" ? "OpenCode" : model.providerID === "openai" ? "OpenAI" : capitalize(model.providerID)}
                {model.variant ? ` · ${model.variant}` : ""}
              </Text>
            ) : null}
            <Box flexGrow={1} />
            {right}
          </Box>
        </Box>
      </Box>
      <Box flexDirection="row" height={1} flexShrink={0} overflow="hidden">
        <Text color={color} wrap="nowrap" flexShrink={0}>
          ╹
        </Text>
        <Text color={theme.panel} wrap="nowrap">
          {"▀".repeat(240)}
        </Text>
      </Box>
    </Box>
  );
}
