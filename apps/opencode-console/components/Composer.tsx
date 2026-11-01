import { useContext, useEffect, useState, type ReactNode } from "react";
import { Box, Text, Textarea, useInput, useInterval, useTheme, useViewport, type TextTheme } from "@textjs/next";
import { useStore, useStoreState } from "../lib/store";
import { shortPath } from "../lib/format";
import { usage as contextUsage, dollars } from "../lib/usage";
import { DispatchAction, slashAction } from "../lib/commands";
import { tokens } from "../lib/native-theme";

export interface ComposerProps {
  onSubmit: (text: string, mode: "prompt" | "shell") => void;
  busy?: boolean;
  disabled?: boolean;
  interruptArmed?: boolean;
  placeholder?: string;
  sessionID?: string;
}

const PLACEHOLDER = 'Ask anything… "Fix broken tests"';

export const capitalize = (s: string): string => (s ? s[0]?.toUpperCase() + s.slice(1) : s);

export function useAgentColor(theme: TextTheme, agent: string): string {
  const agents = useStoreState((s) => s.agents), palette = tokens(theme).agents;
  const index = agents.findIndex((a) => a.id === agent), a = agents[index];
  return a?.color || palette[(a?.colorIndex ?? Math.max(0,index)) % palette.length] || theme.accent;
}

/** A four-dot scanner: plain `•` / `·`, so no row ever falls back to a symbol font. */
export function Dots({ color }: { color: string }): ReactNode {
  const vp = useViewport();
  const [i, setI] = useState(0);
  useInterval(() => setI((n) => (n + 1) % 6), vp.paused ? null : 120);
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
          {i > 0 ? "  " : null}
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
export function Composer({ onSubmit, busy = false, disabled = false, interruptArmed, placeholder, sessionID }: ComposerProps): ReactNode {
  const theme = useTheme();
  const [value, setValue] = useState("");
  const [shell, setShell] = useState(false);
  const agent = useStoreState((s) => s.agent);
  const model = useStoreState((s) => s.model);
  const models = useStoreState((s) => s.models);
  const toast = useStoreState((s) => s.toast);
  const store = useStore(), vp = useViewport();
  const directory = useStoreState(s => (sessionID && s.sessions.find(v=>v.id===sessionID)?.directory) || s.connection.directory);
  const [branch, setBranch] = useState<string|null>(null);
  const client = store.api;
  useEffect(() => {
    let alive = true; setBranch(null);
    if (directory) void client?.branch?.(directory).then((b)=>{if(alive)setBranch(b);},()=>{});
    return () => {alive=false;};
  },[client,directory]);
  const usage = useStoreState(s => {
    if (!sessionID) return "";
    const measured=contextUsage(s.messages[sessionID] ?? [],s.models);
    const cost=s.sessions.find(v=>v.id===sessionID)?.cost ?? 0;
    return [measured && formatUsage.format(measured.tokens)+(measured.percent!==undefined?` (${measured.percent}%)`:""),cost>0 && dollars.format(cost)].filter(Boolean).join(" · ");
  });
  const history = useStoreState((s) => s.history);
  const dispatch = useContext(DispatchAction);
  const color = useAgentColor(theme, agent);
  const selectedModel = models.find((m) => m.id === model?.id && m.providerID === model?.providerID);
  const name = selectedModel?.name ?? model?.id ?? "no model";
  useInput((e) => {
    if (!shell && !value && !e.ctrl && !e.meta && !e.alt && e.input === "!") setShell(true);
    else if (shell && (e.key === "escape" || (!value && e.key === "backspace"))) setShell(false);
    else if (e.ctrl && e.key === "c" && value) setValue("");
    else return;
    e.stopPropagation();
  }, { priority: 12, isActive: !disabled });

  const submit = (text: string): void => {
    if (text.trim().length === 0) return;
    setValue("");
    if (shell) {
      setShell(false);
      onSubmit(text, "shell");
      return;
    }
    const action = slashAction(text);
    if (action) dispatch(action);
    else onSubmit(text, "prompt");
  };

  const right = shell ? <Hints items={[["esc", "exit shell mode"]]} /> : busy ? (
    <Box flexDirection="row" height={1} flexShrink={0} gap={1}>
      <Dots color={color} />
      <Hints items={[["esc", interruptArmed ? "again to interrupt" : "interrupt"]]} />
    </Box>
  ) : toast ? (
    <Text color={toast.tone === "danger" ? theme.danger : toast.tone === "warning" ? theme.warning : toast.tone === "success" ? theme.success : theme.info} wrap="truncate-end" flexShrink={1}>
      {toast.text}
    </Text>
  ) : (
    <Text wrap="nowrap">{usage && <Text color={theme.muted}>{usage}{vp.cols >= 44 ? "  " : ""}</Text>}{vp.cols >= 44 && <Hints items={usage ? [["ctrl+p","commands"]] : [["shift+tab","agents"],["ctrl+p","commands"]]} />}</Text>
  );

  return (
    <Box flexDirection="column" flexShrink={0} width="100%">
      <Box flexDirection="column" flexShrink={0} border="heavy" borderTop={false} borderRight={false} borderBottom={false} borderColor={color}>
        <Box flexDirection="column" flexShrink={0} bg={theme.panel} paddingX={vp.cols < 44 ? 1 : 2} paddingTop={1}>
          <Textarea id="opencode-prompt" value={value} onChange={setValue} onSubmit={submit} history={shell ? undefined : history} isActive={!disabled} autoFocus placeholderColor={theme.muted} placeholder={shell ? 'Run a command… "pwd"' : placeholder ?? PLACEHOLDER} minRows={1} maxRows={Math.max(6, Math.floor(vp.rows/3))} />
          <Box flexDirection="row" height={1} flexShrink={0} gap={1} marginTop={1}>
            <Text color={color} wrap="nowrap" flexShrink={0}>
              {shell ? "Shell" : capitalize(agent)}
            </Text>
            {!shell && (
              <>
                <Text color={theme.muted} wrap="nowrap" flexShrink={0}>·</Text>
                <Text color={theme.fg} wrap="truncate-end" flexShrink={1}>{name}</Text>
                {model && (
                  <Text color={theme.muted} wrap="nowrap" flexShrink={0}>
                    {selectedModel?.providerName ?? (model.providerID === "opencode" ? "OpenCode" : model.providerID === "openai" ? "OpenAI" : capitalize(model.providerID))}
                    {model.variant ? ` · ${model.variant}` : ""}
                  </Text>
                )}
              </>
            )}
            <Box flexGrow={1} />
          </Box>
        </Box>
      </Box>
      <Box flexDirection="row" height={1} flexShrink={0} overflow="hidden">
        <Text color={color} wrap="nowrap" flexShrink={0}>
          ╹
        </Text>
        <Text color={theme.panel} wrap="nowrap">
          {"▀".repeat(vp.cols)}
        </Text>
      </Box>
      <Box flexDirection="row" justifyContent="space-between" gap={2} height={1} flexShrink={0}><Text color={theme.muted} flexShrink={1} wrap="truncate-start">{busy ? "" : shortPath(directory) + (branch ? `:${branch}` : "")}</Text>{right}</Box>
    </Box>
  );
}

const formatUsage = new Intl.NumberFormat("en-US", {notation:"compact", maximumFractionDigits:1});
