import { useEffect, useState, type ReactNode } from "react";
import { Box, Spinner, Text, useInput, useTheme, useViewport } from "textjs";
import { usePathname, useRouter } from "textjs/navigation";
import { compactNumber, modelLabel, relativeTime, shortPath, truncate } from "../lib/format";
import { useStore, useStoreState, type StoreState } from "../lib/store";
import type { SessionInfo } from "../lib/types";
import { Palette, type PaletteKind } from "./Palette";

export const SIDEBAR_WIDTH = 28;

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

  useInput(
    (e) => {
      const plain = !e.ctrl && !e.meta && !e.alt;
      let handled = true;
      if (e.ctrl && (e.key === "p" || e.key === "k")) setPalette("commands");
      else if (e.ctrl && e.key === "n") router.push("/");
      else if (e.ctrl && e.key === "m") setPalette("models");
      else if (e.ctrl && e.key === "b") store.toggle("sidebar");
      else if (e.ctrl && e.key === "o") store.toggle("toolDetails");
      else if (e.ctrl && e.key === "t") store.toggle("thinking");
      else if (e.ctrl && e.key === "g") setPalette("sessions");
      else if (plain && e.key === "tab" && !e.shift) store.cycleAgent(active);
      else handled = false;
      if (handled) e.stopPropagation();
    },
    { priority: 20 },
  );

  return (
    <Box flexDirection="column" width="100%" height="100%" bg={theme.bg}>
      <Header state={state} active={active} />
      <Box flexDirection="row" flexGrow={1} flexShrink={1} minHeight={0}>
        {state.ui.sidebar ? <Sidebar state={state} active={active} /> : null}
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
          {children}
        </Box>
      </Box>
      {palette ? <Palette kind={palette} onKind={setPalette} onClose={() => setPalette(null)} /> : null}
    </Box>
  );
}

function ConnectionBadge({ state }: { state: StoreState }): ReactNode {
  const theme = useTheme();
  const c = state.connection;
  if (c.status === "connecting") return <Spinner variant="dots" label="connecting…" color={theme.muted} />;
  if (c.kind === "demo") {
    return (
      <Text color={theme.warning} wrap="nowrap" flexShrink={0}>
        ◆ demo
      </Text>
    );
  }
  return (
    <Text color={c.live ? theme.success : theme.warning} wrap="nowrap" flexShrink={0}>
      {c.live ? "● " : "○ "}
      {c.live ? "connected" : "reconnecting"}
      <Text color={theme.subtle}>{` · ${c.label}${c.kind === "v1" ? " (v1)" : ""}`}</Text>
    </Text>
  );
}

function Header({ state, active }: { state: StoreState; active: string | null }): ReactNode {
  const theme = useTheme();
  const session = active ? state.sessions.find((s) => s.id === active) : undefined;
  const title = active ? (session?.title ?? "New session") : "Home";
  const dir = shortPath(session?.directory ?? state.connection.directory);
  const agent = state.agent;
  const isPlan = agent === "plan";
  return (
    <Box flexDirection="row" height={1} flexShrink={0} bg={theme.surface} paddingX={1} gap={1}>
      <Text bold color={theme.accent} wrap="nowrap" flexShrink={0}>
        ▼ opencode
      </Text>
      <ConnectionBadge state={state} />
      <Text color={theme.border} wrap="nowrap" flexShrink={0}>
        │
      </Text>
      <Text bold color={theme.fg} wrap="truncate-end" flexShrink={1}>
        {title}
      </Text>
      {dir ? (
        <Text color={theme.subtle} wrap="truncate-start" flexShrink={2}>
          {dir}
        </Text>
      ) : null}
      <Box flexGrow={1} />
      <Text bg={isPlan ? theme.info : theme.accent} color={theme.accentFg} bold wrap="nowrap" flexShrink={0}>
        {` ${agent} `}
      </Text>
      <Text bg={theme.elevated} color={theme.muted} wrap="nowrap" flexShrink={0}>
        {` ${truncate(modelLabel(state.model), 26)} `}
      </Text>
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
      <Box flexDirection="row" height={1} paddingX={1} marginBottom={1}>
        <Text color={theme.fg} wrap="nowrap">
          ctrl+n
        </Text>
        <Text color={theme.subtle} wrap="nowrap">
          {" new  "}
        </Text>
        <Text color={theme.fg} wrap="nowrap">
          ctrl+g
        </Text>
        <Text color={theme.subtle} wrap="nowrap">
          {" switch"}
        </Text>
      </Box>
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
