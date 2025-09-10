import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Box,
  Diff,
  Markdown,
  Modal,
  ScrollBox,
  Select,
  Text,
  Textarea,
  useFocusManager,
  useInput,
  useTheme,
  useViewport,
  type ScrollBoxHandle,
  type SelectOption,
  type TextTheme,
} from "@textjs/react";
import { siteStore } from "../../console-companion/store";
import { diffStat, OpenCodeClient } from "./live";
import { initialSessions, MODELS, nextId, scriptFor, type Agent, type Message, type Part, type Session, type ToolPart } from "./model";
import { OpenCodeLogo } from "./OpenCodeLogo";

const PROMPT_ID = "opencode-prompt";
const PLACEHOLDER = 'Ask anything... "Fix broken tests"';
const SANDBOX_DIR = "~/code/textjs";

const TOOL_ICON: Record<string, string> = { read: "→", edit: "←", write: "←", patch: "←", shell: "$", bash: "$", grep: "*", glob: "*", list: "→", webfetch: "%", task: "●", todo: "•" };

const capitalize = (s: string): string => (s ? s[0]?.toUpperCase() + s.slice(1) : s);

export function agentColor(theme: TextTheme, agent: string): string {
  return agent === "plan" ? theme.info : theme.accent;
}

function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function modelInfo(id: string | undefined): { label: string; provider: string } {
  const known = MODELS.find((m) => m.id === id);
  if (known) return known;
  if (!id) return { label: "opencode", provider: "" };
  const [provider, ...rest] = id.split("/");
  return { label: rest.join("/") || id, provider: provider ?? "" };
}

/** A four-dot scanner: plain `•` / `·`, so no row ever falls back to a symbol font. */
function Dots({ color }: { color: string }): ReactNode {
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

function ToolRow({ part }: { part: ToolPart }): ReactNode {
  const theme = useTheme();
  const running = part.status === "running" || part.status === "pending";
  const failed = part.status === "error";
  const color = failed ? theme.danger : theme.muted;
  return (
    <Box className="flex-col shrink-0" paddingLeft={3}>
      <Box className="flex-row h-1">
        <Text color={color} width={2} wrap="nowrap" flexShrink={0}>
          {TOOL_ICON[part.tool] ?? "⚙"}
        </Text>
        <Text color={color} wrap="truncate-end" flexShrink={1}>
          {part.tool === "shell" || part.tool === "bash" ? part.title : `${capitalize(part.tool)} ${part.title === part.tool ? "" : part.title}`}
        </Text>
        {running ? (
          <Box className="shrink-0" marginLeft={1}>
            <Dots color={theme.subtle} />
          </Box>
        ) : null}
      </Box>
      {running ? null : part.diff ? (
        <Box className="flex-col shrink-0" paddingLeft={2}>
          <Diff patch={part.diff} context={1} maxHeight={8} />
        </Box>
      ) : part.output && (part.tool === "shell" || part.tool === "bash" || failed) ? (
        <Box className="flex-col shrink-0" paddingLeft={2}>
          <Text color={failed ? theme.danger : theme.subtle} wrap="truncate-end">
            {part.output}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

function Reasoning({ text, ms, live }: { text: string; ms?: number; live: boolean }): ReactNode {
  const theme = useTheme();
  const label = live ? "Thinking" : ms ? `Thought for ${(ms / 1000).toFixed(1)}s` : "Thought";
  const preview = text.trim().split("\n").filter(Boolean).pop() ?? "";
  return (
    <Box className="flex-row h-1 shrink-0" paddingLeft={3}>
      <Text color={theme.muted} italic wrap="nowrap" flexShrink={0}>
        {label}
      </Text>
      <Text color={theme.subtle} italic wrap="truncate-end" flexShrink={1}>
        {preview ? `  ${preview}` : ""}
      </Text>
    </Box>
  );
}

function PartView({ part, prev, live }: { part: Part; prev: Part | undefined; live: boolean }): ReactNode {
  const gap = prev === undefined || (prev.type === "tool" && part.type === "tool") ? 0 : 1;
  return (
    <Box className="flex-col shrink-0" marginTop={gap}>
      {part.type === "reasoning" ? (
        <Reasoning text={part.text} ms={part.ms} live={live} />
      ) : part.type === "tool" ? (
        <ToolRow part={part} />
      ) : (
        <Box className="flex-col shrink-0" paddingLeft={3}>
          <Markdown>{part.text}</Markdown>
        </Box>
      )}
    </Box>
  );
}

function UserMessage({ message, agent }: { message: Message; agent: Agent }): ReactNode {
  const theme = useTheme();
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n");
  return (
    <Box className="flex-col shrink-0" border="heavy" borderTop={false} borderRight={false} borderBottom={false} borderColor={agentColor(theme, agent)}>
      <Box className="flex-col shrink-0" bg={theme.panel} paddingX={1} paddingY={1}>
        <Text color="fg">{text}</Text>
      </Box>
    </Box>
  );
}

function AssistantMessage({ message, streaming }: { message: Message; streaming: boolean }): ReactNode {
  const theme = useTheme();
  const agent = message.agent ?? "build";
  const model = modelInfo(message.model);
  const parts = message.parts.filter((p) => p.type !== "text" || p.text.trim().length > 0 || streaming);
  return (
    <Box className="flex-col shrink-0">
      {parts.map((p, i) => (
        <PartView key={i} part={p} prev={parts[i - 1]} live={streaming && i === parts.length - 1} />
      ))}
      {streaming && parts.length === 0 ? <Reasoning text="" live /> : null}
      {streaming ? null : (
        <Box className="flex-row h-1 shrink-0" paddingLeft={3} marginTop={1}>
          <Text color={agentColor(theme, agent)} wrap="nowrap">
            ▣{" "}
          </Text>
          <Text color={theme.subtle} wrap="truncate-end" flexShrink={1}>
            {[capitalize(agent), model.label, message.durationMs ? `${(message.durationMs / 1000).toFixed(1)}s` : ""].filter(Boolean).join(" · ")}
          </Text>
        </Box>
      )}
    </Box>
  );
}

interface PromptBoxProps {
  agent: Agent;
  modelId: string | undefined;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  right: ReactNode;
}

/** The TUI's split-border prompt: `┃` in the agent color, a raised panel and a half-block cap. */
function PromptBox({ agent, modelId, value, onChange, onSubmit, right }: PromptBoxProps): ReactNode {
  const theme = useTheme();
  const color = agentColor(theme, agent);
  const model = modelInfo(modelId);
  return (
    <Box className="flex-col shrink-0" width="100%">
      <Box className="flex-col shrink-0" border="heavy" borderTop={false} borderRight={false} borderBottom={false} borderColor={color}>
        <Box className="flex-col shrink-0" bg={theme.panel} paddingX={2} paddingTop={1}>
          <Textarea id={PROMPT_ID} value={value} onChange={onChange} onSubmit={onSubmit} placeholder={PLACEHOLDER} minRows={2} maxRows={2} />
          <Box className="flex-row h-1 shrink-0 gap-1" marginTop={1}>
            <Text color={color} wrap="nowrap" flexShrink={0}>
              {capitalize(agent)}
            </Text>
            <Text color={theme.muted} wrap="nowrap" flexShrink={0}>
              ·
            </Text>
            <Text color={theme.fg} wrap="truncate-end" flexShrink={1}>
              {model.label}
            </Text>
            {model.provider ? (
              <Text color={theme.muted} wrap="nowrap" flexShrink={0}>
                {model.provider}
              </Text>
            ) : null}
            <Box className="grow" />
            {right}
          </Box>
        </Box>
      </Box>
      <Box className="flex-row h-1 shrink-0" overflow="hidden">
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

function Hints({ items }: { items: Array<[string, string]> }): ReactNode {
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

export interface OpenCodeLiteProps {
  /** Whether this instance is visible (pauses autofocus when hidden). */
  active?: boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function OpenCodeLite({ active = true }: OpenCodeLiteProps): ReactNode {
  const theme = useTheme();
  const focus = useFocusManager();
  const site = useSyncExternalStore(siteStore.subscribe, siteStore.getSnapshot, siteStore.getSnapshot);
  const connection = site.opencode;
  const live = connection.mode === "live" ? connection : null;
  const client = useMemo(() => (live ? new OpenCodeClient(live.url, { protocol: live.protocol, bridge: live.bridge }) : null), [live?.url, live?.protocol, live?.bridge]);

  const [sandboxSessions, setSandboxSessions] = useState<Session[]>(initialSessions);
  const [liveSessions, setLiveSessions] = useState<Session[]>([]);
  const sessions = live ? liveSessions : sandboxSessions;
  const setSessions = live ? setLiveSessions : setSandboxSessions;
  const [activeId, setActiveId] = useState<string | null>("ses_fix_sse");
  const [agent, setAgent] = useState<Agent>("build");
  const [modelIdx, setModelIdx] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const runToken = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const scroll = useRef<ScrollBoxHandle | null>(null);

  const session = activeId === null ? undefined : sessions.find((s) => s.id === activeId);
  const model = MODELS[modelIdx] ?? MODELS[0];

  // Live mode: load the server's sessions and open the most recent one.
  useEffect(() => {
    if (!client || !live) return;
    let alive = true;
    client
      .listSessions()
      .then((list) => {
        if (!alive) return;
        setLiveSessions(list);
        setActiveId(list[0]?.id ?? null);
      })
      .catch((err: unknown) => siteStore.set({ opencode: { mode: "error", url: live.url, message: String((err as Error).message ?? err) } }));
    return () => {
      alive = false;
    };
  }, [client]);

  // Live mode: lazily load a session's history.
  useEffect(() => {
    if (!client || !session || session.messages.length > 0 || !session.live) return;
    let alive = true;
    client
      .loadMessages(session.id)
      .then((messages) => {
        if (alive) setLiveSessions((list) => list.map((s) => (s.id === session.id ? { ...s, messages } : s)));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [client, session?.id]);

  useEffect(() => {
    if (active && !palette) focus.focus(PROMPT_ID);
  }, [active, palette, activeId === null]);

  const updateSession = useCallback(
    (id: string, fn: (s: Session) => Session) => setSessions((list) => list.map((s) => (s.id === id ? fn(s) : s))),
    [setSessions],
  );

  const updateLastAssistant = useCallback(
    (sessionId: string, fn: (m: Message) => Message) =>
      updateSession(sessionId, (s) => {
        const msgs = s.messages.slice();
        const last = msgs[msgs.length - 1];
        if (last && last.role === "assistant") msgs[msgs.length - 1] = fn(last);
        return { ...s, messages: msgs };
      }),
    [updateSession],
  );

  const runSandbox = async (sessionId: string, text: string, token: number): Promise<void> => {
    const steps = scriptFor(text, agent);
    const started = Date.now();
    const alive = (): boolean => runToken.current === token;
    for (const step of steps) {
      if (!alive()) return;
      if (step.kind === "think") {
        updateLastAssistant(sessionId, (m) => ({ ...m, parts: [...m.parts, { type: "reasoning", text: step.text }] }));
        await sleep(step.ms);
        if (!alive()) return;
        updateLastAssistant(sessionId, (m) => ({ ...m, parts: m.parts.map((p, i) => (i === m.parts.length - 1 ? { type: "reasoning", text: step.text, ms: step.ms } : p)) }));
      } else if (step.kind === "tool") {
        updateLastAssistant(sessionId, (m) => ({ ...m, parts: [...m.parts, { ...step.part, status: "running" }] }));
        await sleep(step.ms);
        if (!alive()) return;
        updateLastAssistant(sessionId, (m) => ({ ...m, parts: m.parts.map((p, i) => (i === m.parts.length - 1 ? { ...step.part, status: "completed" } : p)) }));
        await sleep(120);
      } else {
        updateLastAssistant(sessionId, (m) => ({ ...m, parts: [...m.parts, { type: "text", text: "" }] }));
        let n = 0;
        while (n < step.text.length) {
          if (!alive()) return;
          n = Math.min(step.text.length, n + 3 + Math.floor(Math.random() * 6));
          const shown = step.text.slice(0, n);
          updateLastAssistant(sessionId, (m) => ({ ...m, parts: m.parts.map((p, i) => (i === m.parts.length - 1 ? { type: "text", text: shown } : p)) }));
          await sleep(28);
        }
        await sleep(160);
      }
    }
    if (!alive()) return;
    const durationMs = Date.now() - started;
    updateLastAssistant(sessionId, (m) => ({ ...m, durationMs, tokens: 2000 + text.length * 37 }));
  };

  const submit = (value: string): void => {
    const text = value.trim();
    if (text.length === 0 || busy) return;
    setPrompt("");
    const token = ++runToken.current;
    const send = async (): Promise<void> => {
      let target = session;
      if (!target || target.demo || (client && !target.live)) {
        const created = client ? await client.createSession() : { id: nextId("ses"), title: text.slice(0, 48), updated: "just now", messages: [] };
        setSessions((list) => [created, ...list]);
        setActiveId(created.id);
        target = created;
      }
      const sessionId = target.id;
      setBusy(sessionId);
      updateSession(sessionId, (s) => ({
        ...s,
        title: s.messages.length === 0 && (!s.title || s.title === "New session") ? text.slice(0, 48) : s.title || text.slice(0, 48),
        updated: "just now",
        messages: [...s.messages, { id: nextId("msg"), role: "user", parts: [{ type: "text", text }] }, { id: nextId("msg"), role: "assistant", agent, model: model?.id, parts: [] }],
      }));
      scroll.current?.scrollToBottom();
      if (client) {
        const started = Date.now();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
          await client.prompt(
            sessionId,
            text,
            agent,
            (parts) => {
              if (runToken.current === token) updateLastAssistant(sessionId, (m) => ({ ...m, parts }));
            },
            ctrl.signal,
          );
          if (runToken.current === token) {
            const messages = await client.loadMessages(sessionId).catch(() => null);
            if (messages && messages.length > 0) updateSession(sessionId, (s) => ({ ...s, messages }));
            else updateLastAssistant(sessionId, (m) => ({ ...m, durationMs: Date.now() - started }));
          }
        } catch (err) {
          updateLastAssistant(sessionId, (m) => ({ ...m, parts: [...m.parts, { type: "tool", tool: "error", title: String((err as Error).message ?? err), status: "error" }], durationMs: Date.now() - started }));
        }
      } else {
        await runSandbox(sessionId, text, token);
      }
    };
    send()
      .catch(() => undefined)
      .finally(() => {
        if (runToken.current === token) setBusy(null);
      });
  };

  const interrupt = (): void => {
    if (!busy) return;
    runToken.current++;
    const id = busy;
    if (client) {
      abortRef.current?.abort();
      void client.interrupt(id).catch(() => undefined);
    }
    updateLastAssistant(id, (m) => ({ ...m, parts: [...m.parts, { type: "text", text: "_Interrupted._" }], durationMs: 0 }));
    setBusy(null);
  };

  const goHome = (): void => {
    setActiveId(null);
    setPrompt("");
  };

  useInput(
    (e) => {
      if (e.ctrl && e.key === "p") {
        e.stopPropagation();
        setPalette((v) => !v);
      } else if (e.ctrl && e.key === "n") {
        e.stopPropagation();
        goHome();
      } else if (e.ctrl && e.key === "x") {
        e.stopPropagation();
        setModelIdx((i) => (i + 1) % MODELS.length);
      }
    },
    { isActive: active, priority: 20 },
  );

  useInput(
    (e) => {
      if (e.key === "tab" && !e.ctrl && !e.meta) {
        e.stopPropagation();
        setAgent((a) => (a === "build" ? "plan" : "build"));
      } else if (e.key === "escape" && busy) {
        e.stopPropagation();
        interrupt();
      } else if (e.key === "pageup" || e.key === "pagedown") {
        e.stopPropagation();
        scroll.current?.scrollBy(e.key === "pageup" ? -10 : 10);
      } else if ((e.key === "return" || e.input === "i") && focus.activeId !== PROMPT_ID) {
        e.stopPropagation();
        focus.focus(PROMPT_ID);
      }
    },
    { isActive: active, priority: 2 },
  );

  const options = useMemo<SelectOption[]>(() => {
    const out: SelectOption[] = [
      { value: "cmd:new", label: "New session", hint: "ctrl+n" },
      { value: "cmd:agent", label: `Switch to ${agent === "build" ? "Plan" : "Build"}`, hint: "tab" },
      { value: "cmd:theme", label: "Cycle theme", hint: "T" },
    ];
    for (const s of sessions) out.push({ value: `ses:${s.id}`, label: s.title, hint: s.updated, description: "session" });
    MODELS.forEach((m, i) => out.push({ value: `model:${i}`, label: m.label, hint: m.provider }));
    return out;
  }, [sessions, agent]);

  const choose = (value: string): void => {
    setPalette(false);
    if (value === "cmd:new") goHome();
    else if (value === "cmd:agent") setAgent((a) => (a === "build" ? "plan" : "build"));
    else if (value === "cmd:theme") siteStore.cycleTheme();
    else if (value.startsWith("ses:")) setActiveId(value.slice(4));
    else if (value.startsWith("model:")) setModelIdx(Number(value.slice(6)));
  };

  const dot =
    connection.mode === "live" ? (
      <Text color={theme.success} wrap="nowrap" flexShrink={0}>
        ● connected
      </Text>
    ) : connection.mode === "connecting" ? (
      <Text color={theme.warning} wrap="nowrap" flexShrink={0}>
        ○ connecting
      </Text>
    ) : (
      <Text color={theme.subtle} wrap="nowrap" flexShrink={0}>
        ● sandbox
      </Text>
    );

  const isBusy = busy !== null && busy === session?.id;
  const right = isBusy ? (
    <Box className="flex-row h-1 shrink-0 gap-1">
      <Dots color={agentColor(theme, agent)} />
      <Hints items={[["esc", "interrupt"]]} />
    </Box>
  ) : (
    <Hints
      items={[
        ["tab", agent === "build" ? "plan" : "build"],
        ["ctrl+p", "commands"],
      ]}
    />
  );
  const prompt$ = <PromptBox agent={agent} modelId={model?.id} value={prompt} onChange={setPrompt} onSubmit={submit} right={right} />;

  const modal = (
    <Modal open={palette} title=" Commands " onClose={() => setPalette(false)} width={64} maxHeight={20}>
      <Select options={options} searchable autoFocus limit={12} onChange={(v) => choose(v)} showDescriptions={false} searchPlaceholder="Search sessions, models and commands…" />
    </Modal>
  );

  if (!session) {
    const dir = live ? (sessions[0]?.directory?.replace(/^\/(Users|home)\/[^/]+/, "~") ?? "") : SANDBOX_DIR;
    return (
      <Box className="flex-col grow">
        <Box className="flex-col grow items-center px-2">
          <Box className="grow" minHeight={0} />
          <OpenCodeLogo />
          <Box height={1} flexShrink={0} />
          <Box className="flex-col shrink-0" width="100%" maxWidth={72} paddingTop={1}>
            {prompt$}
          </Box>
          <Box className="grow" minHeight={0} />
        </Box>
        <Box className="flex-row h-1 shrink-0 px-2 gap-2">
          <Text color={theme.muted} wrap="truncate-end" flexShrink={1}>
            {dir}
          </Text>
          <Box className="grow" />
          {dot}
          <Hints items={[["ctrl+p", "sessions"]]} />
        </Box>
        {modal}
      </Box>
    );
  }

  const stat = diffStat(session.messages);
  const tokens = session.messages.reduce((n, m) => n + (m.tokens ?? 0), 0);
  return (
    <Box className="flex-col grow">
      <Box className="flex-row h-1 shrink-0 px-2 gap-2">
        <Text bold color="fg" wrap="truncate-end" flexShrink={1}>
          {session.title || "New session"}
        </Text>
        <Box className="grow" />
        {stat.additions + stat.deletions + tokens > 0 ? (
          <Text wrap="nowrap" flexShrink={0}>
            {stat.additions + stat.deletions > 0 ? (
              <>
                <Text color={theme.success}>{`+${stat.additions}`}</Text>
                <Text color={theme.danger}>{` -${stat.deletions}`}</Text>
              </>
            ) : null}
            {tokens > 0 ? <Text color={theme.subtle}>{`${stat.additions + stat.deletions > 0 ? " · " : ""}${compact(tokens)}`}</Text> : null}
          </Text>
        ) : null}
        {dot}
      </Box>
      <Box className="flex-col grow px-2">
        <ScrollBox ref={scroll} stickyScroll showScrollbar={false} className="grow" paddingTop={1} gap={1}>
          {session.messages.length > 0 ? (
            session.messages.map((m, i) =>
              m.role === "user" ? (
                <UserMessage key={m.id} message={m} agent={(session.messages[i + 1]?.agent as Agent | undefined) ?? agent} />
              ) : (
                <AssistantMessage key={m.id} message={m} streaming={busy === session.id && i === session.messages.length - 1} />
              ),
            )
          ) : (
            <Text color={theme.subtle} paddingLeft={3}>
              {session.live ? "Loading…" : "No messages yet."}
            </Text>
          )}
        </ScrollBox>
        <Box height={1} flexShrink={0} />
        {prompt$}
      </Box>
      {modal}
    </Box>
  );
}
