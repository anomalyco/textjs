import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Badge,
  Box,
  Code,
  Diff,
  KeyHint,
  Markdown,
  Modal,
  ScrollBox,
  Select,
  Spinner,
  Text,
  Textarea,
  useFocusManager,
  useInput,
  useTheme,
  useViewport,
  type ScrollBoxHandle,
  type SelectOption,
} from "@textjs/react";
import { siteStore } from "../../console-companion/store";
import { OpenCodeClient } from "./live";
import { EXAMPLE_PROMPTS, initialSessions, MODELS, nextId, scriptFor, type Agent, type Message, type Part, type Session, type ToolPart } from "./model";

const PROMPT_ID = "opencode-prompt";

const TOOL_ICON: Record<string, string> = { read: "→", edit: "✎", write: "✎", shell: "$", grep: "✱", glob: "✱", todo: "☐" };

function ToolCard({ part, width }: { part: ToolPart; width: number }): ReactNode {
  const theme = useTheme();
  const running = part.status === "running" || part.status === "pending";
  const failed = part.status === "error";
  const icon = TOOL_ICON[part.tool] ?? "⚙";
  return (
    <Box className="flex-col shrink-0" marginTop={1}>
      <Box className="flex-row h-1 gap-1">
        {running ? <Spinner variant="dots" /> : <Text color={failed ? "danger" : "subtle"}>{icon}</Text>}
        <Text color={failed ? "danger" : "muted"} bold wrap="nowrap">
          {part.tool[0]?.toUpperCase() + part.tool.slice(1)}
        </Text>
        <Text color="fg" wrap="truncate-start" flexShrink={1}>
          {part.title}
        </Text>
      </Box>
      {running ? null : part.diff ? (
        <Box className="flex-col border rounded shrink-0" borderColor={theme.border} marginLeft={2}>
          <Diff patch={part.diff} maxHeight={14} />
        </Box>
      ) : part.code ? (
        <Box className="flex-col border rounded shrink-0" borderColor={theme.border} marginLeft={2} bg={theme.codeBg}>
          <Code code={part.code} language={part.language} showLineNumbers maxHeight={9} />
        </Box>
      ) : part.output ? (
        <Box className="flex-col border-l shrink-0 pl-1" borderColor={theme.border} marginLeft={2} maxWidth={Math.max(20, width - 4)}>
          <Code code={part.output} language={part.tool === "shell" ? "bash" : undefined} maxHeight={12} wrap="truncate-end" />
        </Box>
      ) : null}
    </Box>
  );
}

function PartView({ part, width }: { part: Part; width: number }): ReactNode {
  if (part.type === "reasoning") {
    return (
      <Text color="subtle" italic>
        {`Thinking: ${part.text}`}
      </Text>
    );
  }
  if (part.type === "tool") return <ToolCard part={part} width={width} />;
  return <Markdown marginTop={1}>{part.text}</Markdown>;
}

function MessageView({ message, streaming, width }: { message: Message; streaming: boolean; width: number }): ReactNode {
  const theme = useTheme();
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n");
    return (
      <Box className="flex-col shrink-0" border="heavy" borderTop={false} borderRight={false} borderBottom={false} borderColor={theme.accent} bg={theme.panel} paddingX={1} marginTop={1}>
        <Text color="fg">{text}</Text>
      </Box>
    );
  }
  const model = MODELS.find((m) => m.id === message.model);
  return (
    <Box className="flex-col shrink-0 pl-1">
      {message.parts.map((p, i) => (
        <PartView key={i} part={p} width={width} />
      ))}
      {streaming && message.parts.length === 0 ? <Spinner variant="dots" label="Thinking…" /> : null}
      {streaming ? null : (
        <Box className="flex-row h-1 gap-1" marginTop={1}>
          <Text color={message.agent === "plan" ? "info" : "accent"}>▣</Text>
          <Text color="muted">{message.agent ?? "build"}</Text>
          <Text color="subtle">{`· ${model?.label ?? message.model ?? "opencode"}`}</Text>
          {message.durationMs ? <Text color="subtle">{`· ${(message.durationMs / 1000).toFixed(1)}s`}</Text> : null}
        </Box>
      )}
    </Box>
  );
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface OpenCodeLiteProps {
  /** Whether this instance is visible (pauses autofocus when hidden). */
  active?: boolean;
}

export function OpenCodeLite({ active = true }: OpenCodeLiteProps): ReactNode {
  const theme = useTheme();
  const vp = useViewport();
  const focus = useFocusManager();
  const site = useSyncExternalStore(siteStore.subscribe, siteStore.getSnapshot, siteStore.getSnapshot);
  const connection = site.opencode;
  const live = connection.mode === "live" ? connection : null;

  const [sandboxSessions, setSandboxSessions] = useState<Session[]>(initialSessions);
  const [liveSessions, setLiveSessions] = useState<Session[]>([]);
  const sessions = live ? liveSessions : sandboxSessions;
  const setSessions = live ? setLiveSessions : setSandboxSessions;
  const [activeId, setActiveId] = useState<string>("ses_fix_sse");
  const [agent, setAgent] = useState<Agent>("build");
  const [modelIdx, setModelIdx] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const runToken = useRef(0);
  const scroll = useRef<ScrollBoxHandle | null>(null);

  const session = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const model = MODELS[modelIdx] ?? MODELS[0];

  // Live mode: load the server's sessions.
  useEffect(() => {
    if (!live) return;
    let alive = true;
    const client = new OpenCodeClient(live.url);
    client
      .listSessions()
      .then((list) => {
        if (!alive) return;
        setLiveSessions(list);
        if (list[0]) setActiveId(list[0].id);
      })
      .catch((err: unknown) => siteStore.set({ opencode: { mode: "error", url: live.url, message: String((err as Error).message ?? err) } }));
    return () => {
      alive = false;
    };
  }, [live?.url]);

  // Live mode: lazily load a session's history.
  useEffect(() => {
    if (!live || !session || session.messages.length > 0 || !session.live) return;
    let alive = true;
    new OpenCodeClient(live.url)
      .loadMessages(session.id)
      .then((messages) => {
        if (alive) setLiveSessions((list) => list.map((s) => (s.id === session.id ? { ...s, messages } : s)));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [live?.url, session?.id]);

  useEffect(() => {
    if (active && !palette) focus.focus(PROMPT_ID);
  }, [active, palette]);

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
        await sleep(step.ms * 0.4);
        updateLastAssistant(sessionId, (m) => ({ ...m, parts: [...m.parts, { type: "reasoning", text: step.text }] }));
        await sleep(step.ms * 0.6);
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
      if (!target || target.demo || (live && !target.live)) {
        const created = live
          ? await new OpenCodeClient(live.url).createSession()
          : { id: nextId("ses"), title: text.slice(0, 48), updated: "just now", messages: [] };
        setSessions((list) => [created, ...list]);
        setActiveId(created.id);
        target = created;
      }
      const sessionId = target.id;
      setBusy(sessionId);
      updateSession(sessionId, (s) => ({
        ...s,
        title: s.messages.length === 0 ? text.slice(0, 48) : s.title,
        updated: "just now",
        messages: [...s.messages, { id: nextId("msg"), role: "user", parts: [{ type: "text", text }] }, { id: nextId("msg"), role: "assistant", agent, model: model?.id, parts: [] }],
      }));
      scroll.current?.scrollToBottom();
      if (live) {
        const started = Date.now();
        try {
          await new OpenCodeClient(live.url).prompt(sessionId, text, agent, (parts) => {
            if (runToken.current === token) updateLastAssistant(sessionId, (m) => ({ ...m, parts }));
          });
        } catch (err) {
          updateLastAssistant(sessionId, (m) => ({ ...m, parts: [...m.parts, { type: "tool", tool: "error", title: String((err as Error).message ?? err), status: "error" }] }));
        }
        updateLastAssistant(sessionId, (m) => ({ ...m, durationMs: Date.now() - started }));
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
    updateLastAssistant(id, (m) => ({ ...m, parts: [...m.parts, { type: "text", text: "_Interrupted._" }], durationMs: 0 }));
    setBusy(null);
  };

  const newSession = (): void => {
    if (live) {
      new OpenCodeClient(live.url)
        .createSession()
        .then((s) => {
          setLiveSessions((list) => [s, ...list]);
          setActiveId(s.id);
        })
        .catch(() => undefined);
      return;
    }
    const s: Session = { id: nextId("ses"), title: "New session", updated: "just now", messages: [] };
    setSandboxSessions((list) => [s, ...list]);
    setActiveId(s.id);
  };

  useInput(
    (e) => {
      if (e.ctrl && e.key === "p") {
        e.stopPropagation();
        setPalette((v) => !v);
      } else if (e.ctrl && e.key === "n") {
        e.stopPropagation();
        newSession();
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
      { value: "cmd:agent", label: `Switch agent → ${agent === "build" ? "plan" : "build"}`, hint: "tab" },
      { value: "cmd:theme", label: "Cycle console theme", hint: "T" },
    ];
    for (const s of sessions) out.push({ value: `ses:${s.id}`, label: s.title, hint: s.updated, description: "session" });
    MODELS.forEach((m, i) => out.push({ value: `model:${i}`, label: `Model: ${m.label}`, hint: m.provider }));
    return out;
  }, [sessions, agent]);

  const choose = (value: string): void => {
    setPalette(false);
    if (value === "cmd:new") newSession();
    else if (value === "cmd:agent") setAgent((a) => (a === "build" ? "plan" : "build"));
    else if (value === "cmd:theme") siteStore.cycleTheme();
    else if (value.startsWith("ses:")) setActiveId(value.slice(4));
    else if (value.startsWith("model:")) setModelIdx(Number(value.slice(6)));
  };

  const agentColor = agent === "plan" ? theme.info : theme.accent;
  const sidebar = vp.cols >= 90;
  const mainWidth = vp.cols - (sidebar ? 30 : 2);
  const tokens = session?.messages.reduce((n, m) => n + (m.tokens ?? 0), 0) ?? 0;
  const conn =
    connection.mode === "live" ? (
      <Text color="success" wrap="nowrap">{`● live ${connection.url.replace(/^https?:\/\//, "")}`}</Text>
    ) : connection.mode === "connecting" ? (
      <Text color="warning" wrap="nowrap">○ connecting…</Text>
    ) : (
      <Text color="subtle" wrap="nowrap">
        ● sandbox
      </Text>
    );

  return (
    <Box className="flex-col grow">
      <Box className="flex-row h-1 shrink-0 px-1 gap-1">
        <Text bold color="fg" wrap="nowrap">
          opencode
        </Text>
        <Text color="subtle" wrap="nowrap">
          lite
        </Text>
        <Text color="border">│</Text>
        <Text color="fg" wrap="truncate-end" flexShrink={1}>
          {session?.title ?? "New session"}
        </Text>
        <Box className="grow" />
        {conn}
        <Text color="border">│</Text>
        <Text color="muted" wrap="nowrap">
          {model?.label}
        </Text>
      </Box>
      <Box className="flex-row grow">
        {sidebar ? (
          <Box className="flex-col shrink-0 px-1" width={28} borderColor={theme.border} border borderTop={false} borderLeft={false} borderBottom={false}>
            <Text color="muted" bold>
              Sessions
            </Text>
            {sessions.slice(0, 8).map((s) => {
              const on = s.id === session?.id;
              return (
                <Box key={s.id} className="flex-col shrink-0" bg={on ? theme.panel : undefined}>
                  <Text color={on ? "fg" : "muted"} wrap="truncate-end" bold={on}>
                    {`${on ? "▸" : " "} ${s.title}`}
                  </Text>
                  <Text color="subtle" wrap="nowrap">
                    {`  ${s.id === busy ? "● working" : s.updated}`}
                  </Text>
                </Box>
              );
            })}
            <Box className="grow" />
            <Text color="muted" bold>
              Context
            </Text>
            <Text color="subtle">{`${(tokens / 1000).toFixed(1)}k tokens · 6% used`}</Text>
            <Text color="subtle">$0.00 spent (sandbox)</Text>
            <Text color="muted" bold marginTop={1}>
              LSP
            </Text>
            <Text color="subtle">
              <Text color="success">●</Text> typescript
            </Text>
          </Box>
        ) : null}
        <Box className="flex-col grow px-1">
          <ScrollBox ref={scroll} stickyScroll className="grow" paddingRight={1}>
            {session && session.messages.length > 0 ? (
              session.messages.map((m, i) => <MessageView key={m.id} message={m} streaming={busy === session.id && i === session.messages.length - 1} width={mainWidth} />)
            ) : (
              <Box className="flex-col pt-1 gap-1">
                <Text color="fg" bold>
                  ▼ opencode, rendered in console.log
                </Text>
                <Text color="muted">Type a prompt below and press enter. Try:</Text>
                {EXAMPLE_PROMPTS.map((p) => (
                  <Text key={p} color="subtle">{`  · ${p}`}</Text>
                ))}
              </Box>
            )}
          </ScrollBox>
          <Box className="flex-col shrink-0 border rounded px-1" borderColor={focus.activeId === PROMPT_ID ? agentColor : theme.border} title={` ${agent} `} titleColor={agentColor}>
            <Textarea
              id={PROMPT_ID}
              value={prompt}
              onChange={setPrompt}
              onSubmit={submit}
              placeholder={busy ? "Working… (esc to interrupt)" : `Ask anything… "${EXAMPLE_PROMPTS[0]}"`}
              minRows={1}
              maxRows={4}
            />
          </Box>
          <Box className="flex-row h-1 shrink-0 gap-2 px-1">
            {busy ? <Spinner variant="dots" label="working" /> : <Badge variant={agent === "plan" ? "info" : "accent"}>{agent.toUpperCase()}</Badge>}
            <KeyHint keys="enter" label="send" />
            <KeyHint keys="tab" label="agent" />
            <KeyHint keys="ctrl+p" label="commands" />
            {busy ? <KeyHint keys="esc" label="interrupt" /> : <KeyHint keys="esc" label="nav" />}
          </Box>
        </Box>
      </Box>
      <Modal open={palette} title=" Commands " onClose={() => setPalette(false)} width={64} maxHeight={20}>
        <Select options={options} searchable autoFocus limit={12} onChange={(v) => choose(v)} showDescriptions={false} searchPlaceholder="Search sessions, models and commands…" />
      </Modal>
    </Box>
  );
}
