import { useEffect, useState, type ReactNode } from "react";
import { Box, diffTexts, Spinner, Text, useKeymap, useTheme, useViewport } from "@textjs/next";
import { usePathname, useRouter } from "@textjs/next/navigation";
import { compactNumber, relativeTime } from "../lib/format";
import { useStore, useStoreState, type StoreState } from "../lib/store";
import type { SessionInfo, SessionMessage } from "../lib/types";
import { Palette, type PaletteKind } from "./Palette";
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
  const store = useStore();
  const router = useRouter();
  const state = useStoreState((s) => s);
  const active = useActiveSessionId();
  const [palette, setPalette] = useState<PaletteKind | null>(null);
  const vp = useViewport();

  const dispatch = (action: Action): void => {
    if (action === "new") router.push("/");
    else if (action === "variants" && !store.variants().length) store.notify("The current model does not support any variants.");
    else setPalette(action);
  };
  useKeymap({
    "ctrl+p": () => dispatch("commands"),
    "ctrl+x l": () => dispatch("sessions"),
    "ctrl+x n": () => dispatch("new"),
    "ctrl+x m": () => dispatch("models"),
    "ctrl+x a": () => dispatch("agents"),
    "ctrl+x b": () => store.toggle("sidebar"),
    "shift+tab": () => store.cycleAgent(active),
    "ctrl+t": () => store.cycleVariant(active),
    "f2": () => store.cycleRecentModel(1, active),
    "shift+f2": () => store.cycleRecentModel(-1, active),
  }, { priority: 20, sequenceTimeout: 2000 });

  return (
    <Box flexDirection="column" width="100%" height="100%" bg={theme.bg}>
      {active ? <Header state={state} active={active} /> : null}
      <Box flexDirection="row" flexGrow={1} flexShrink={1} minHeight={0}>
        {state.ui.sidebar && vp.cols >= SIDEBAR_MIN_COLS ? <Sidebar state={state} active={active} /> : null}
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
          <DispatchAction value={dispatch}>{children}</DispatchAction>
        </Box>
      </Box>
      {palette ? <Palette kind={palette} onKind={setPalette} onClose={() => setPalette(null)} /> : null}
    </Box>
  );
}

export function ConnectionBadge({ state }: { state: StoreState }): ReactNode {
  const theme = useTheme();
  const c = state.connection;
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
      if (typeof input.oldString !== "string" && typeof input.newString !== "string") continue;
      const f = diffTexts(typeof input.oldString === "string" ? input.oldString : "", typeof input.newString === "string" ? input.newString : "", "", 0);
      additions += f.additions;
      deletions += f.deletions;
    }
  }
  return { additions, deletions, tokens };
}

function Header({ state, active }: { state: StoreState; active: string }): ReactNode {
  const theme = useTheme();
  const session = state.sessions.find((s) => s.id === active);
  const stat = sessionDiffStat(state.messages[active] ?? []);
  const changed = stat.additions + stat.deletions > 0;
  return (
    <Box flexDirection="row" height={1} flexShrink={0} paddingX={2} gap={2}>
      <Text bold color={theme.fg} wrap="truncate-end" flexShrink={1}>
        {session?.title || "New session"}
      </Text>
      <Box flexGrow={1} />
      {changed || stat.tokens > 0 ? (
        <Text wrap="nowrap" flexShrink={0}>
          {changed ? (
            <>
              <Text color={theme.success}>{`+${stat.additions}`}</Text>
              <Text color={theme.danger}>{` -${stat.deletions}`}</Text>
            </>
          ) : null}
          {stat.tokens > 0 ? <Text color={theme.subtle}>{`${changed ? " · " : ""}${compactNumber(stat.tokens)}`}</Text> : null}
        </Text>
      ) : null}
      <ConnectionBadge state={state} />
    </Box>
  );
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

function Sidebar({ state, active }: { state: StoreState; active: string | null }): ReactNode {
  const theme = useTheme();
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
