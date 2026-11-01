import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Box, Button, Dialog, diffTexts, Spinner, Text, ThemeProvider, useClipboard, useKeymap, useTheme, useViewport } from "@textjs/next";
import { savedTheme } from "../lib/native-theme";
import { usePathname, useRouter } from "@textjs/next/navigation";
import { compactNumber, relativeTime } from "../lib/format";
import { useStore, useStoreState, type ConnectionState, type StoreState } from "../lib/store";
import type { SessionInfo, SessionMessage, ToolPart } from "../lib/types";
import { patchFiles } from "../lib/tool-data";
import { HelpDialog, Palette, type PaletteKind } from "./Palette";
import { DispatchAction, type Action } from "../lib/commands";

export const SIDEBAR_WIDTH = 28;
/** Below this width the sidebar steps aside so the conversation keeps room. */
export const SIDEBAR_MIN_COLS = 96;

/** The active session id, derived from `/session/[id]`. */
export function useActiveSessionId(): string | null {
  const pathname = usePathname();
  const m = /^\/session\/([^/]+)/.exec(pathname);
  return m ? decodeURIComponent(m[1] as string) : null;
}

/** Re-render every `ms` so relative timestamps stay fresh (only while visible). */
function useNow(ms: number): number {
  const vp = useViewport();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (vp.paused) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms, vp.paused]);
  return now;
}

export function Shell({ children }: { children?: ReactNode }): ReactNode {
  const theme = useTheme();
  const [initial] = useState(savedTheme);
  return <ThemeProvider theme={theme.id.startsWith("tui:") ? theme : initial}><SessionShell>{children}</SessionShell></ThemeProvider>;
}

function SessionShell({ children }: { children?: ReactNode }): ReactNode {
  const theme = useTheme();
  const store = useStore();
  const router = useRouter();
  const sidebar = useStoreState((s) => s.ui.sidebar);
  const active = useActiveSessionId();
  const open = useStoreState(() => store.tabs.list());
  const [palette, setPalette] = useState<PaletteKind | null>(null);
  const [help, setHelp] = useState(false);
  const { copy } = useClipboard();
  const vp = useViewport();

  const dispatch = useCallback((action: Action): void => {
    if (action === "new") router.push("/");
    else if (action === "help") setHelp(true);
    else if (action === "copy") {
      const message = active && store.getSnapshot().messages[active]?.slice().reverse().find((m) => m.type === "assistant");
      const text = message && message.type === "assistant" ? message.content.flatMap((p) => p.type === "text" ? [p.text] : []).join("\n").trim() : "";
      if (!text) store.notify("No text content found in last assistant message", "warning");
      else void copy(text).then((ok) => store.notify(ok ? "Message copied to clipboard!" : "Clipboard unavailable", ok ? "success" : "warning"));
    } else if (action === "variants" && !store.variants().length) store.notify("The current model does not support any variants.");
    else setPalette(action);
  }, [active, store, copy, router]);
  const select = (id: string | undefined) => { if (id) router.push(`/session/${encodeURIComponent(id)}`); };
  useKeymap({
    "ctrl+p": () => dispatch("commands"),
    "ctrl+x l": () => dispatch("sessions"),
    "ctrl+o": () => dispatch("sessions"),
    "ctrl+x n": () => dispatch("new"),
    "ctrl+x m": () => dispatch("models"),
    "ctrl+x a": () => dispatch("agents"),
    "ctrl+x y": () => dispatch("copy"),
    "ctrl+tab, alt+down": () => select(store.tabs.cycle(active, 1)),
    "ctrl+shift+tab, alt+up": () => select(store.tabs.cycle(active, -1)),
    "ctrl+shift+t": () => select(store.tabs.reopen()),
    "ctrl+x w": () => {
      if (!active) return;
      const id = store.tabs.close(active);
      if (id) select(id); else router.push("/");
    },
    ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`ctrl+x ${(i+1)%10}, ctrl+${(i+1)%10}`, () => select(store.tabs.at(i))])),
    "ctrl+x b": () => store.toggle("sidebar"),
    "shift+tab": () => store.cycleAgent(active),
    "ctrl+t": () => store.cycleVariant(active),
    "f2": () => store.cycleRecentModel(1, active),
    "shift+f2": () => store.cycleRecentModel(-1, active),
  }, { priority: 20, sequenceTimeout: 2000 });

  return (
    <Box flexDirection="column" width="100%" height="100%" bg={theme.bg}>
      {(active || open.length > 0) && <SessionTabs active={active} ids={open} />}
      <Box flexDirection="row" flexGrow={1} flexShrink={1} minHeight={0}>
        {sidebar && vp.cols >= SIDEBAR_MIN_COLS ? <Sidebar active={active} /> : null}
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
          <DispatchAction value={dispatch}>{children}</DispatchAction>
        </Box>
      </Box>
      {palette ? <DispatchAction value={dispatch}><Palette kind={palette} onKind={setPalette} onClose={() => setPalette(null)} /></DispatchAction> : null}
      {help && <HelpDialog onClose={()=>setHelp(false)}/>}
    </Box>
  );
}

export function ConnectionBadge({ connection: c }: { connection: ConnectionState }): ReactNode {
  const theme = useTheme();
  if (c.status === "connecting") return <Spinner variant="line" label="connecting" color={theme.muted} />;
  if (c.kind === "demo") {
    return (
      <Text color={theme.warning} wrap="nowrap" flexShrink={0}>
        ● demo
      </Text>
    );
  }
  return (
    <Text color={c.live ? theme.success : theme.warning} wrap="nowrap" flexShrink={0}>
      {c.live ? "● connected" : "○ reconnecting"}
      <Text color={theme.subtle}>{` · ${c.label}${c.kind === "v1" ? " (v1)" : ""}`}</Text>
    </Text>
  );
}

/** `+3 -1` across a session's edits. */
const diffCache = new WeakMap<ToolPart, { additions: number; deletions: number }>();

export function sessionDiffStat(messages: readonly SessionMessage[]): { additions: number; deletions: number; tokens: number } {
  let additions = 0;
  let deletions = 0;
  let tokens = 0;
  for (const m of messages) {
    if (m.type !== "assistant") continue;
    tokens += (m.tokens?.input ?? 0) + (m.tokens?.output ?? 0);
    for (const p of m.content) {
      if (p.type !== "tool" || p.state.status === "streaming") continue;
      const input = p.state.input;
      let f = diffCache.get(p);
      if (!f) {
        const files = patchFiles(p);
        if (files.length) f = files.reduce((s, next) => ({ additions: s.additions + next.additions, deletions: s.deletions + next.deletions }), { additions: 0, deletions: 0 });
        else if (typeof input.oldString === "string" || typeof input.newString === "string") f = diffTexts(typeof input.oldString === "string" ? input.oldString : "", typeof input.newString === "string" ? input.newString : "", "", 0);
        else f = { additions: 0, deletions: 0 };
        diffCache.set(p, f);
      }
      additions += f.additions;
      deletions += f.deletions;
    }
  }
  return { additions, deletions, tokens };
}

function SessionTabs({ active, ids }: {active: string | null; ids: readonly string[]}) {
  const theme = useTheme(), vp = useViewport();
  const sessions = useStoreState(s=>s.sessions), permissions=useStoreState(s=>s.permissions), forms=useStoreState(s=>s.forms);
  const tabs: readonly (string | null)[] = active ? ids.includes(active) ? ids : [...ids,active] : [...ids,null];
  const available = vp.cols - (active ? 3 : 0), count = Math.max(1,Math.floor(available / 8));
  const start = Math.max(0,tabs.indexOf(active) - count + 1), visible = tabs.slice(start,start+count);
  const size = Math.min(32,Math.floor(available / visible.length));
  return <Box flexDirection="row" height={1} flexShrink={0}>{visible.map((id) => {
    const selected = active === id, marker = id === null ? "+" : permissions[id]?.length ? "!" : forms[id]?.length ? "?" : " ";
    return <Box key={id ?? "+"} width={size} paddingLeft={1} paddingRight={1} height={1} bg={selected ? theme.elevated : undefined}>
      <Text bold={selected} color={selected ? theme.fg : theme.muted} wrap="truncate-end">{marker} {id ? sessions.find(s=>s.id===id)?.title || "New session" : "New session"}</Text>
    </Box>;
  })}{active && <Text color={theme.muted}> + </Text>}</Box>;
}

function SessionRow({ s, active, busy, now }: { s: SessionInfo; active: boolean; busy: boolean; now: number }): ReactNode {
  const theme = useTheme();
  return (
    <Box flexDirection="column" flexShrink={0} bg={active ? theme.selection : undefined} paddingX={1}>
      <Box flexDirection="row" height={1}>
        {busy ? (
          <Spinner variant="dots" color={theme.accent} />
        ) : (
          <Text color={active ? theme.accent : theme.subtle} wrap="nowrap" flexShrink={0}>
            {active ? "▸" : " "}
          </Text>
        )}
        <Text color={active ? theme.fg : theme.muted} bold={active} wrap="truncate-end" flexShrink={1}>
          {` ${s.title || "Untitled session"}`}
        </Text>
      </Box>
      <Text color={theme.subtle} wrap="truncate-end">
        {`  ${relativeTime(s.time.updated, now)}${s.agent ? ` · ${s.agent}` : ""}${s.outcome === "failed" ? " · failed" : ""}`}
      </Text>
    </Box>
  );
}

function Sidebar({ active }: { active: string | null }): ReactNode {
  const theme = useTheme();
  const state = useStoreState((s) => s);
  const now = useNow(30_000);
  const vp = useViewport();
  const rows = Math.max(1, Math.floor((vp.rows - 6) / 2));
  const activeIdx = state.sessions.findIndex((s) => s.id === active);
  const start = activeIdx >= rows ? activeIdx - rows + 1 : 0;
  const visible = state.sessions.slice(start, start + rows);
  const busyCount = state.sessions.filter((s) => state.busy[s.id]).length;
  return (
    <Box flexDirection="column" width={SIDEBAR_WIDTH} flexShrink={0} bg={theme.surface} border="single" borderTop={false} borderBottom={false} borderLeft={false} borderColor={theme.border}>
      <Box flexDirection="row" height={1} paddingX={1} marginTop={1}>
        <Text color={theme.muted} bold wrap="nowrap">
          SESSIONS
        </Text>
        <Text color={theme.subtle} wrap="nowrap">{` ${state.sessions.length}`}</Text>
        <Box flexGrow={1} />
        {busyCount > 0 ? <Text color={theme.accent} wrap="nowrap">{`${busyCount} running`}</Text> : null}
      </Box>
      <Box height={1} flexShrink={0} />
      {!state.sessionsLoaded && state.connection.status === "connecting" ? (
        <Box paddingX={1}>
          <Spinner variant="dots" label="loading…" />
        </Box>
      ) : state.sessions.length === 0 ? (
        <Text color={theme.subtle} italic wrap="wrap">
          {"  No sessions yet."}
        </Text>
      ) : (
        visible.map((s) => <SessionRow key={s.id} s={s} active={s.id === active} busy={state.busy[s.id] === true} now={now} />)
      )}
      <Box flexGrow={1} />
      <Box flexDirection="column" paddingX={1} flexShrink={0}>
        {state.connection.version ? (
          <Text color={theme.subtle} wrap="truncate-end">
            {state.connection.kind === "demo" ? "interactive demo" : `opencode ${state.connection.version}`}
          </Text>
        ) : null}
        <TokenSummary state={state} active={active} />
      </Box>
    </Box>
  );
}

function TokenSummary({ state, active }: { state: StoreState; active: string | null }): ReactNode {
  const theme = useTheme();
  if (!active) return null;
  let input = 0;
  let output = 0;
  let cost = 0;
  for (const m of state.messages[active] ?? []) {
    if (m.type !== "assistant") continue;
    input += m.tokens?.input ?? 0;
    output += m.tokens?.output ?? 0;
    cost += m.cost ?? 0;
  }
  if (input + output === 0) return null;
  return (
    <Text color={theme.subtle} wrap="truncate-end">
      {`${compactNumber(input)}↑ ${compactNumber(output)}↓ · $${cost.toFixed(2)}`}
    </Text>
  );
}
