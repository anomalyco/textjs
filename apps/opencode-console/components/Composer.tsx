import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { SceneNode } from "@textjs/core";
import { Autocomplete } from "./Autocomplete";
import { rebaseMarks, trigger } from "../lib/mentions";
import type { Attachment, PromptOptions } from "../lib/types";
import {
  Box,
  Text,
  Textarea,
  useFocusManager,
  useInput,
  usePaste,
  useInterval,
  useTheme,
  useViewport,
  type TextTheme,
} from "@textjs/app";
import { useStore, useStoreState } from "../lib/store";
import { shortPath } from "../lib/format";
import { usage as contextUsage, dollars } from "../lib/usage";
import { DispatchAction, slashAction } from "../lib/commands";
import { tokens } from "../lib/native-theme";

export interface ComposerProps {
  onSubmit: (text: string, mode: "prompt" | "shell", options?: PromptOptions) => void;
  busy?: boolean;
  disabled?: boolean;
  interruptArmed?: boolean;
  placeholder?: string;
  sessionID?: string;
}

const PLACEHOLDER = 'Ask anything… "Fix broken tests"';

export const capitalize = (s: string): string => (s ? s[0]?.toUpperCase() + s.slice(1) : s);

export function useAgentColor(theme: TextTheme, agent: string): string {
  const agents = useStoreState((s) => s.agents),
    palette = tokens(theme).agents;
  const index = agents.findIndex((a) => a.id === agent),
    a = agents[index];
  return a?.color || palette[(a?.colorIndex ?? Math.max(0, index)) % palette.length] || theme.accent;
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
export function Composer({
  onSubmit,
  busy = false,
  disabled = false,
  interruptArmed,
  placeholder,
  sessionID,
}: ComposerProps): ReactNode {
  const theme = useTheme();
  const [value, setValue] = useState("");
  const [shell, setShell] = useState(false);
  const [caret, setCaret] = useState(0),
    [dismissed, dismiss] = useState(false);
  const [marks, setMarks] = useState<readonly Attachment[]>([]);
  const editor = useRef<{ replace: (value: string, cursor: number) => void }>(null),
    anchor = useRef<SceneNode>(null);
  const change = (next: string) => {
    setMarks((prev) => rebaseMarks(prev, value, next, caret));
    setValue(next);
    dismiss(false);
  };
  const token =
    !shell && !disabled && !dismissed && !marks.some((a) => caret > a.mention.start && caret <= a.mention.end)
      ? trigger(value, caret)
      : undefined;
  const agent = useStoreState((s) => s.agent);
  const model = useStoreState((s) => s.model);
  const models = useStoreState((s) => s.models);
  const toast = useStoreState((s) => s.toast);
  const store = useStore(),
    vp = useViewport();
  const restore = useStoreState((s) => s.restore);
  useEffect(() => {
    if (!restore || restore.sessionID !== (sessionID ?? "")) return;
    const prefix = value && !/\s$/.test(value) ? value + " " : value;
    const next = prefix + restore.text;
    editor.current?.replace(next, next.length);
    dismiss(true);
    if (restore.marks)
      setMarks((prev) => [
        ...prev,
        ...restore.marks!.map((a) => ({
          ...a,
          mention: { ...a.mention, start: prefix.length + a.mention.start, end: prefix.length + a.mention.end },
        })),
      ]);
    if (restore.skill)
      setMarks((prev) => [
        ...prev,
        {
          kind: "skill",
          name: restore.skill!,
          mention: { start: prefix.length, end: next.trimEnd().length, text: "@" + restore.skill },
        },
      ]);
    store.takeRestore(restore);
  }, [restore, sessionID, store]);
  const directory = useStoreState(
    (s) => (sessionID && s.sessions.find((v) => v.id === sessionID)?.directory) || s.connection.directory,
  );
  const [branch, setBranch] = useState<string | null>(null);
  const client = store.api;
  useEffect(() => {
    if (client) void store.refreshCommands(directory);
  }, [store, client, directory]);
  useEffect(() => {
    let alive = true;
    setBranch(null);
    if (directory)
      void client?.branch?.(directory).then(
        (b) => {
          if (alive) setBranch(b);
        },
        () => {},
      );
    return () => {
      alive = false;
    };
  }, [client, directory]);
  const usage = useStoreState((s) => {
    if (!sessionID) return "";
    const measured = contextUsage(s.messages[sessionID] ?? [], s.models);
    const cost = s.sessions.find((v) => v.id === sessionID)?.cost ?? 0;
    return [
      measured && formatUsage.format(measured.tokens) + (measured.percent !== undefined ? ` (${measured.percent}%)` : ""),
      cost > 0 && dollars.format(cost),
    ]
      .filter(Boolean)
      .join(" · ");
  });
  const history = useStoreState((s) => s.history);
  const dispatch = useContext(DispatchAction);
  const focused = useFocusManager().activeId === "opencode-prompt";
  const clipboardVersion = useRef(0);
  useEffect(
    () => () => {
      clipboardVersion.current++;
    },
    [value, caret, disabled, sessionID, focused, client],
  );
  usePaste(
    (e) => {
      const images = e.files?.filter((f) => /^image\/(png|jpeg|webp|gif)$/.test(f.type));
      if (!images?.length) return;
      e.stopPropagation();
      if (images.reduce((n, f) => n + f.size, 0) > 20 * 1024 * 1024) {
        store.notify("Image attachments exceed 20 MiB", "warning");
        return;
      }
      const seq = ++clipboardVersion.current;
      void Promise.all(
        images.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(String(r.result));
              r.onerror = () => reject(Error("Could not read clipboard image"));
              r.readAsDataURL(file);
            }),
        ),
      ).then(
        (uris) => {
          if (seq !== clipboardVersion.current || !editor.current) return;
          let insert = "";
          const count = marks.filter((a) => a.kind === "file" && a.mime.startsWith("image/")).length;
          const attachments = images.map((file, i): Attachment => {
            const text = `[Image ${count + i + 1}]`,
              start = caret + insert.length;
            insert += text + " ";
            return {
              kind: "file",
              name: file.name || `image-${i + 1}`,
              mime: file.type,
              uri: uris[i]!,
              mention: { start, end: start + text.length, text },
            };
          });
          editor.current.replace(value.slice(0, caret) + insert + value.slice(caret), caret + insert.length);
          setMarks((prev) => [...prev, ...attachments]);
        },
        (e) => {
          if (seq === clipboardVersion.current) store.notify(String(e), "danger");
        },
      );
    },
    { priority: 15, isActive: focused && !disabled && !shell },
  );
  const agentColor = useAgentColor(theme, agent),
    color = shell ? tokens(theme).primaryTextSelected : agentColor;
  const selectedModel = models.find((m) => m.id === model?.id && m.providerID === model?.providerID);
  const name = selectedModel?.name ?? model?.id ?? "no model";
  useInput(
    (e) => {
      if (!shell && !value && !e.ctrl && !e.meta && !e.alt && e.input === "!") setShell(true);
      else if (shell && (e.key === "escape" || (!value && e.key === "backspace"))) setShell(false);
      else if (e.ctrl && e.key === "c" && value) change("");
      else if (!value && !shell && e.ctrl && ["c", "d"].includes(e.key)) {
        if (!e.repeat) dispatch("exit");
      } else return;
      e.stopPropagation();
    },
    { priority: 12, isActive: !disabled },
  );

  const submit = (text: string): void => {
    if (text.trim().length === 0) return;
    setValue("");
    setMarks([]);
    dismiss(false);
    if (shell) {
      setShell(false);
      onSubmit(text, "shell");
      return;
    }
    const action = slashAction(text, client?.kind === "v1");
    if (action) dispatch(action);
    else onSubmit(text, "prompt", { attachments: marks });
  };
  useEffect(() => {
    if (disabled) return;
    const run = (action: "queue" | "stash") => {
      if (!value.trim() || shell) return;
      if (action === "stash") {
        store.stash(value, marks);
        store.notify("Prompt stashed");
      } else {
        if (client?.kind === "v1" || slashAction(value) || /^\/(?:btw|rename|compact)\b/.test(value)) {
          store.notify("This prompt cannot be queued", "warning");
          return;
        }
        onSubmit(value, "prompt", { attachments: marks, delivery: "queue" });
      }
      change("");
    };
    store.composer = run;
    return () => {
      if (store.composer === run) store.composer = null;
    };
  }, [store, value, marks, shell, disabled, client, onSubmit]);

  const right = shell ? (
    <Hints items={[["esc", "exit shell mode"]]} />
  ) : busy ? (
    <Box flexDirection="row" height={1} flexShrink={0} gap={1}>
      <Dots color={color} />
      <Hints items={[["esc", interruptArmed ? "again to interrupt" : "interrupt"]]} />
    </Box>
  ) : toast ? (
    <Text
      color={
        toast.tone === "danger"
          ? theme.danger
          : toast.tone === "warning"
            ? theme.warning
            : toast.tone === "success"
              ? theme.success
              : theme.info
      }
      wrap="truncate-end"
      flexShrink={1}
    >
      {toast.text}
    </Text>
  ) : (
    <Text wrap="nowrap">
      {usage && (
        <Text color={theme.muted}>
          {usage}
          {vp.cols >= 44 ? "  " : ""}
        </Text>
      )}
      {vp.cols >= 44 && (
        <Hints
          items={
            usage
              ? [["ctrl+p", "commands"]]
              : [
                  ["shift+tab", "agents"],
                  ["ctrl+p", "commands"],
                ]
          }
        />
      )}
    </Text>
  );

  return (
    <Box ref={anchor} flexDirection="column" flexShrink={0} width="100%">
      {token && (
        <Autocomplete
          key={`${token.mode}:${token.start}:${token.query}:${directory}`}
          token={token}
          session={!!sessionID}
          directory={directory}
          space={anchor.current?.layout.y ?? 10}
          onHide={(clear) => {
            if (clear) editor.current?.replace(value.slice(caret), 0);
            dismiss(true);
          }}
          onSelect={(option, drill) => {
            if (option.command?.action && !option.command.args) {
              editor.current?.replace(value.slice(caret), 0);
              dispatch(option.command.action);
              return;
            }
            const label = option.command ? option.label : option.file ? "@" + option.label.replace(/\/$/u, "") : option.label;
            const insert = label + (drill ? "/" : value[caret] === " " ? "" : " ");
            const next = value.slice(0, token.start) + insert + value.slice(caret);
            editor.current?.replace(next, token.start + insert.length);
            if (!drill && !option.command) {
              const name = label.slice(1),
                mention = { text: label, start: token.start, end: token.start + label.length };
              const part: Attachment = option.file
                ? {
                    kind: "file",
                    uri: option.file.uri,
                    mime: option.file.directory ? "application/x-directory" : "text/plain",
                    name,
                    mention,
                  }
                : { kind: option.kind!, name, mention };
              setMarks((prev) => [...prev.filter((a) => a.kind !== part.kind || a.name !== part.name), part]);
            }
            dismiss(!drill);
          }}
        />
      )}
      <Box
        flexDirection="column"
        flexShrink={0}
        border="heavy"
        borderTop={false}
        borderRight={false}
        borderBottom={false}
        borderColor={color}
      >
        <Box flexDirection="column" flexShrink={0} bg={theme.panel} paddingX={vp.cols < 44 ? 1 : 2} paddingTop={1}>
          <Textarea
            id="opencode-prompt"
            advancedEditing
            highlights={marks.map((a) => ({
              ...a.mention,
              color: a.kind === "agent" ? tokens(theme).agents[1]! : tokens(theme).formfieldFocused,
            }))}
            editorRef={editor}
            onCursorChange={setCaret}
            value={value}
            onChange={change}
            onSubmit={submit}
            history={shell ? undefined : history}
            isActive={!disabled}
            autoFocus
            placeholderColor={theme.muted}
            placeholder={shell ? 'Run a command… "pwd"' : (placeholder ?? PLACEHOLDER)}
            minRows={1}
            maxRows={Math.max(6, Math.floor(vp.rows / 3))}
          />
          <Box flexDirection="row" height={1} flexShrink={0} gap={1} marginTop={1}>
            <Text color={color} wrap="nowrap" flexShrink={0}>
              {shell ? "Shell" : capitalize(agent)}
            </Text>
            {!shell && (
              <>
                <Text color={theme.muted} wrap="nowrap" flexShrink={0}>
                  ·
                </Text>
                <Text color={theme.fg} wrap="truncate-end" flexShrink={1}>
                  {name}
                </Text>
                {model && (
                  <Text color={theme.muted} wrap="nowrap" flexShrink={0}>
                    {selectedModel?.providerName ??
                      (model.providerID === "opencode"
                        ? "OpenCode"
                        : model.providerID === "openai"
                          ? "OpenAI"
                          : capitalize(model.providerID))}
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
      <Box flexDirection="row" justifyContent="space-between" gap={2} height={1} flexShrink={0}>
        <Text color={theme.muted} flexShrink={1} wrap="truncate-start">
          {busy ? "" : shortPath(directory) + (branch ? `:${branch}` : "")}
        </Text>
        {right}
      </Box>
    </Box>
  );
}

const formatUsage = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
