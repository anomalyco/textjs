import { useCallback, useRef, useState, type ReactNode } from "react";
import { segmentGraphemes, sliceColumns } from "@textjs/core";
import { Box, diffTexts, Spinner, Text, ThemeProvider, useApp, useClipboard, useKeymap, useTheme, useViewport } from "@textjs/app";
import { usePathname, useRouter } from "@textjs/app/navigation";
import { savedTheme, useTokens } from "../lib/native-theme";
import { useStore, useStoreState, type ConnectionState } from "../lib/store";
import type { SessionMessage, ToolPart } from "../lib/types";
import { patchFiles } from "../lib/tool-data";
import { DispatchAction, type Action } from "../lib/commands";
import { HelpDialog, Palette, type PaletteKind } from "./Palette";
import { ContextSidebar } from "./ContextSidebar";
import { Review } from "./Review";
import { tint } from "./Logo";

export function useActiveSessionId(): string | null {
  const m = /^\/session\/([^/]+)/.exec(usePathname());
  return m ? decodeURIComponent(m[1]!) : null;
}
export function Shell({ children }: { children?: ReactNode }) {
  const theme = useTheme(),
    [initial] = useState(savedTheme);
  return (
    <ThemeProvider theme={theme.id.startsWith("tui:") ? theme : initial}>
      <SessionShell>{children}</SessionShell>
    </ThemeProvider>
  );
}
function SessionShell({ children }: { children?: ReactNode }) {
  const theme = useTheme(),
    store = useStore(),
    router = useRouter(),
    active = useActiveSessionId(),
    wide = useViewport().cols > 120;
  const sidebar = useStoreState((s) => s.ui.sidebar),
    parent = useStoreState((s) => active && s.parents[active]);
  const open = useStoreState(() => store.tabs.list());
  const answer = useStoreState((s) => (s.answer?.sessionID === active ? s.answer : undefined));
  const v1 = useStoreState((s) => s.connection.kind === "v1");
  const [palette, setPalette] = useState<PaletteKind | null>(null),
    [help, setHelp] = useState(false);
  const { copy } = useClipboard();
  const app = useApp();
  const dispatch = useCallback(
    (action: Action) => {
      if (action === "exit") {
        if (!store.exitToHost()) app.exit();
      } else if (action === "new" || action === "clear") {
        if (action === "clear" && active) store.tabs.close(active);
        router.push("/");
      } else if (action === "editor") store.notify("External editor requires the native CLI.", "warning");
      else if (action === "reload") {
        const dir = active ? store.session(active)?.directory : store.getSnapshot().connection.directory;
        void (async () => {
          await store.api?.reload?.(dir);
          await Promise.all([store.refreshSessions(), store.refreshCommands(dir)]);
          store.notify("Reloaded");
        })().catch((e) => store.notify(String(e), "danger"));
      } else if (
        ["undo", "redo", "timeline", "export", "copy", "details", "share", "unshare", "compact", "fork"].includes(action) &&
        !active
      )
        store.notify("Open a session first", "warning");
      else if (action === "undo" || action === "redo") void store.revert(active!, action === "redo");
      else if (action === "details") store.toggle("toolDetails");
      else if (action === "reasoning") store.toggle("thinking");
      else if (action === "compact") void store.send(active, "/compact");
      else if (action === "share" && !store.api?.share) store.notify("This server does not support session sharing.", "warning");
      else if (action === "unshare") {
        if (!store.api?.unshare) store.notify("This server does not support session sharing.", "warning");
        else
          void store.api.unshare(active!).then(
            () => store.notify("Session unshared"),
            (e) => store.notify(String(e), "danger"),
          );
      } else if (action === "help") setHelp(true);
      else if (action === "copy") {
        const msg =
          active &&
          store
            .getSnapshot()
            .messages[active]?.slice()
            .reverse()
            .find((m) => m.type === "assistant");
        const text =
          msg && msg.type === "assistant"
            ? msg.content
                .flatMap((p) => (p.type === "text" ? [p.text] : []))
                .join("\n")
                .trim()
            : "";
        if (!text) store.notify("No text content found in last assistant message", "warning");
        else
          void copy(text).then((ok) =>
            store.notify(ok ? "Message copied to clipboard!" : "Clipboard unavailable", ok ? "success" : "warning"),
          );
      } else if (action === "variants" && !store.variants().length) store.notify("The current model does not support any variants.");
      else setPalette(action);
    },
    [active, store, copy, router, app],
  );
  const select = (id: string | undefined) => {
    if (id) router.push(`/session/${encodeURIComponent(id)}`);
  };
  useKeymap(
    {
      "ctrl+p": () => dispatch("commands"),
      "ctrl+x l, ctrl+o": () => dispatch("sessions"),
      "ctrl+x n": () => dispatch("new"),
      "ctrl+x m": () => dispatch("models"),
      "ctrl+x a": () => dispatch("agents"),
      "ctrl+x y": () => dispatch("copy"),
      "ctrl+x g": () => dispatch("timeline"),
      "ctrl+x x": () => dispatch("export"),
      "ctrl+x u": () => dispatch("undo"),
      "ctrl+x r": () => dispatch("redo"),
      "ctrl+x c": () => dispatch("compact"),
      "ctrl+x e": () => dispatch("editor"),
      "ctrl+x s": () => dispatch("status"),
      "ctrl+x return": () => store.composer?.("queue"),
      "ctrl+x q": () => (active && store.api?.inbox ? setPalette("queued") : dispatch("exit")),
      "ctrl+tab, alt+down": () => select(store.tabs.cycle(active, 1)),
      "ctrl+shift+tab, alt+up": () => select(store.tabs.cycle(active, -1)),
      "ctrl+shift+t": () => select(store.tabs.reopen()),
      "ctrl+x w": () => {
        if (!active) return;
        const id = store.tabs.close(active);
        if (id) select(id);
        else router.push("/");
      },
      ...Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [`ctrl+x ${(i + 1) % 10}, ctrl+${(i + 1) % 10}`, () => select(store.tabs.at(i))]),
      ),
      "ctrl+x b": () => {
        if (active && !parent) store.toggle("sidebar", wide);
      },
      ...(v1 ? { tab: () => store.cycleAgent(active) } : {}),
      "shift+tab": () => store.cycleAgent(active, v1 ? -1 : 1),
      "ctrl+t": () => store.cycleVariant(active),
      f2: () => store.cycleRecentModel(1, active),
      "shift+f2": () => store.cycleRecentModel(-1, active),
    },
    { priority: 20, sequenceTimeout: 2000 },
  );
  return (
    <DispatchAction value={dispatch}>
      <Box flexDirection="column" width="100%" height="100%" bg={theme.bg}>
        {(active || open.length > 0) && <SessionTabs active={active} ids={open} />}
        <Box flexDirection="row" flexGrow={1} flexShrink={1} minHeight={0}>
          <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
            {children}
          </Box>
          {active && !parent && (sidebar ?? wide) && <ContextSidebar id={active} overlay={!wide} />}
        </Box>
        {palette === "diff" ? (
          <Review id={active ?? undefined} onClose={() => setPalette(null)} />
        ) : (
          palette && <Palette kind={palette} onKind={setPalette} onClose={() => setPalette(null)} />
        )}
        {answer && <Review answer={answer.text} onClose={() => store.dismissAnswer()} />}
        {help && <HelpDialog onClose={() => setHelp(false)} />}
      </Box>
    </DispatchAction>
  );
}
export function ConnectionBadge({ connection: c }: { connection: ConnectionState }) {
  const t = useTokens();
  if (c.status === "connecting") return <Spinner variant="line" label="connecting" color={t.muted} />;
  if (c.kind === "demo") return <Text color={t.warning}>● demo</Text>;
  return (
    <Text color={c.live ? t.success : t.warning}>
      {c.live ? "● connected" : "○ reconnecting"}
      <Text color={t.muted}>{` · ${c.label}`}</Text>
    </Text>
  );
}
const diffCache = new WeakMap<ToolPart, { additions: number; deletions: number }>();
export function sessionDiffStat(messages: readonly SessionMessage[]) {
  let additions = 0,
    deletions = 0,
    tokens = 0;
  for (const m of messages) {
    if (m.type !== "assistant") continue;
    tokens += (m.tokens?.input ?? 0) + (m.tokens?.output ?? 0);
    for (const p of m.content) {
      if (p.type !== "tool" || p.state.status === "streaming") continue;
      let f = diffCache.get(p);
      if (!f) {
        const files = patchFiles(p),
          { oldString, newString } = p.state.input;
        if (files.length)
          f = files.reduce((a, b) => ({ additions: a.additions + b.additions, deletions: a.deletions + b.deletions }), {
            additions: 0,
            deletions: 0,
          });
        else if (typeof oldString === "string" || typeof newString === "string") {
          const d = diffTexts(typeof oldString === "string" ? oldString : "", typeof newString === "string" ? newString : "", "", 0);
          f = { additions: d.additions, deletions: d.deletions };
        } else f = { additions: 0, deletions: 0 };
        diffCache.set(p, f);
      }
      additions += f.additions;
      deletions += f.deletions;
    }
  }
  return { additions, deletions, tokens };
}

// The native adaptive strip reserves 22 cells for the active tab and at least 8 per neighbor.
function tabWindow(tabs: readonly (string | null)[], active: string | null, cols: number, previous: number) {
  const fit = (w: number) => Math.max(1, Math.min(tabs.length, 1 + Math.floor((w - 22) / 8)));
  const marker = (n: number) => (n ? String(n).length + 2 : 0);
  let count = fit(cols),
    start = previous;
  for (let i = 0; i < 4; i++) {
    start = Math.max(0, Math.min(start, tabs.indexOf(active), tabs.length - count));
    start = Math.max(start, tabs.indexOf(active) - count + 1);
    const next = fit(cols - marker(start) - marker(tabs.length - start - count));
    if (i === 3 || next === count) break;
    count = next;
  }
  const after = tabs.length - start - count,
    width = Math.max(1, Math.min(32 * count, cols - marker(start) - marker(after)));
  const visible = tabs.slice(start, start + count),
    roomy = width >= 22 * count;
  const other = count === 1 ? 0 : Math.max(8, Math.min(22, Math.floor((width - Math.min(22, width)) / (count - 1))));
  return {
    start,
    after,
    visible,
    widths: visible.map((id, i) =>
      roomy ? Math.floor(width / count) + Number(i < width % count) : id === active ? width - other * (count - 1) : other,
    ),
  };
}
function SessionTabs({ active, ids }: { active: string | null; ids: readonly string[] }) {
  const t = useTokens(),
    vp = useViewport(),
    previous = useRef(0);
  const sessions = useStoreState((s) => s.sessions),
    permissions = useStoreState((s) => s.permissions),
    forms = useStoreState((s) => s.forms);
  const tabs = active ? (ids.includes(active) ? ids : [...ids, active]) : [...ids, null];
  const view = tabWindow(tabs, active, vp.cols - (active ? 3 : 0), previous.current);
  previous.current = view.start;
  return (
    <Box flexDirection="row" height={1} flexShrink={0} zIndex={5} bg={t.bg}>
      {view.start > 0 && <Text color={t.muted}>{`‹${view.start} `}</Text>}
      {view.visible.map((id, i) => {
        const size = view.widths[i]!,
          selected = active === id,
          marker = id === null ? "+" : permissions[id]?.length ? "!" : forms[id]?.length ? "?" : " ";
        const title = id ? sessions.find((s) => s.id === id)?.title || "New session" : "New session";
        const bg = selected ? t.raisedDown : t.bg,
          fg = selected ? t.text : t.muted;
        if (marker === "!" || marker === "?") {
          const glow = tint(bg, t.accent, selected ? 0.7 : 1);
          let col = 0;
          const text = sliceColumns(` ${marker} ${title}`, 0, size).padEnd(size);
          return (
            <Box key={id} width={size} height={1} overflow="hidden" bg={bg}>
              <Text bold={selected} wrap="nowrap">
                {segmentGraphemes(text).map((g, j) => {
                  const x = col;
                  col += g.width;
                  const u = Math.max(0, 1 - Math.max(0, x - 1) / Math.max(1, Math.min(12, size - 2)));
                  const intensity = u * u * u * (u * (u * 6 - 15) + 10);
                  return (
                    <Text key={j} bg={tint(bg, glow, 0.16 * intensity)} color={x === 1 ? t.accent : tint(fg, glow, 0.12 * intensity)}>
                      {g.grapheme}
                    </Text>
                  );
                })}
              </Text>
            </Box>
          );
        }
        return (
          <Box key={id ?? "+"} width={size} paddingX={1} height={1} bg={bg}>
            <Text bold={selected} color={fg} wrap="truncate-end">
              <Text color={selected ? t.mutedDown : t.muted}>{marker}</Text> {title}
            </Text>
          </Box>
        );
      })}
      {view.after > 0 && <Text color={t.muted}>{` ${view.after}›`}</Text>}
      {active && <Text color={t.muted}>{" + "}</Text>}
    </Box>
  );
}
