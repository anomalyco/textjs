import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { segmentGraphemes, sliceColumns } from "@textjs/core";
import {
  Box,
  diffTexts,
  Spinner,
  Text,
  ThemeProvider,
  useApp,
  useAppTheme,
  useClipboard,
  useKeymap,
  useTheme,
  useViewport,
} from "@textjs/app";
import { usePathname, useRouter } from "@textjs/app/navigation";
import { savedTheme, useTokens, nativeTheme, nativeThemes, rememberTheme, type NativeTheme } from "../lib/native-theme";
import { useStore, useStoreState, type ConnectionState } from "../lib/store";
import type { SessionMessage, ToolPart } from "../lib/types";
import { patchFiles } from "../lib/tool-data";
import { DispatchAction, type Action } from "../lib/commands";
import type { PaletteKind } from "./Palette";
import { DeferredDialog } from "./DeferredDialog";
import { ContextSidebar } from "./ContextSidebar";
import { Review } from "./Review";
import { Shortcuts } from "./KeyGuide";
import { exportMarkdown } from "../lib/transcript";
import { TerminalPane, type TerminalRequest } from "./TerminalPane";
import { NativeActions, type Commands } from "../lib/bindings";
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
    [diffFocused, focusDiff] = useState(true),
    [help, setHelp] = useState(false);
  const { copy } = useClipboard();
  const app = useApp();
  const [systemMode, follow] = useState(false),
    { setTheme } = useAppTheme();
  useEffect(() => {
    if (!systemMode || typeof window === "undefined" || !window.matchMedia || !Object.hasOwn(nativeThemes, theme.name)) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = nativeTheme(theme.name as NativeTheme, media.matches ? "dark" : "light");
      setTheme(next);
      rememberTheme(next);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [systemMode, theme.name, setTheme]);
  const [term, setTerm] = useState<TerminalRequest | null>(null),
    termOpen = term && term.scope === active;
  const noTabs = useStoreState((s) => s.ui.noTabs);
  const debug = useStoreState((s) => s.ui.debug),
    vp = useViewport();
  const parents = useStoreState((s) => s.parents),
    busy = useStoreState((s) => active && s.busy[active]);
  const siblings = Object.keys(parents).filter((k) => parents[k] === parent && !!parent);
  const dispatch = useCallback(
    (action: Action) => {
      if (action === "exit") {
        if (!store.exitToHost()) app.exit();
      } else if (action === "new" || action === "clear") {
        if (action === "clear" && active) store.tabs.close(active);
        router.push("/");
      } else if (action === "terminal") {
        if (active) setTerm({ scope: active, view: "new", focused: true, seq: Date.now() });
        else store.notify("Open a session first");
      } else if (action === "diff") {
        focusDiff(true);
        setTerm(null);
        setPalette("diff");
      } else if (action === "editor") setPalette("editorInfo");
      else if (action === "reload") {
        const dir = active ? store.session(active)?.directory : store.getSnapshot().connection.directory;
        void (async () => {
          await store.api?.reload?.(dir);
          await Promise.all([store.refreshSessions(), store.refreshCommands(dir), store.loadKeys()]);
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
  const commands: Commands = {
    "theme.mode.lock": () => {
      if (typeof window === "undefined" || !window.matchMedia) {
        store.notify("System appearance is unavailable in this host");
        return;
      }
      follow(!systemMode);
      store.notify(systemMode ? "Theme mode locked" : "Following system appearance");
    },
    "app.toggle.paste_summary": () => store.toggle("fullPaste"),
    "session.tab.next_unread": noTabs ? undefined : () => select(store.unread(active, 1)),
    "session.tab.previous_unread": noTabs ? undefined : () => select(store.unread(active, -1)),
    "session.verbosity.cycle": () => store.cycleVerbosity(),
    "app.toggle.animations": () => store.toggle("reducedMotion"),
    "app.toggle.diffwrap": () => store.toggle("noWrap"),
    "app.debug": () => store.toggle("debug"),
    "opencode.debug": () => setPalette("debug"),
    "server.pair": () => setPalette("pair"),
    "service.restart": () => setPalette("restart"),
    "session.child.first":
      active && Object.values(parents).includes(active)
        ? () => {
            if (!store.promptEmpty) return false;
            setPalette("children");
          }
        : undefined,
    "session.parent": parent
      ? () => {
          if (!store.promptEmpty) return false;
          select(parent);
        }
      : undefined,
    ...Object.fromEntries(
      [1, -1].map((d) => [
        d === 1 ? "session.child.next" : "session.child.previous",
        active && parent && siblings.length
          ? () => {
              if (!store.promptEmpty) return false;
              select(siblings[(siblings.indexOf(active) + d + siblings.length) % siblings.length]);
            }
          : undefined,
      ]),
    ),
    "session.background":
      active && busy && store.api?.background
        ? () => {
            if (!store.promptEmpty) return false;
            void store.api?.background?.(active).catch((e) => store.notify(String(e), "danger"));
          }
        : undefined,
    "session.move": () => setPalette("workspaces"),
    "session.cd": () => setPalette("workspaces"),
    "session.toggle.scrollbar": active ? () => store.toggle("scrollbar") : undefined,
    ...Object.fromEntries(
      ["session.message.next", "session.message.previous", "session.message.user.next", "session.message.user.previous"].map((id) => [
        id,
        active ? () => store.moveMessage(active, id.endsWith("next") ? 1 : -1, id.includes(".user.")) : undefined,
      ]),
    ),
    "session.copy.id": active
      ? () => void copy(active).then((ok) => store.notify(ok ? "Session ID copied to clipboard!" : "Clipboard unavailable"))
      : undefined,
    "session.copy": active
      ? () => {
          const s = store.session(active);
          if (s && store.api)
            void exportMarkdown(store.api, s).then(
              async (text) => store.notify((await copy(text)) ? "Session transcript copied to clipboard!" : "Clipboard unavailable"),
              (e) => store.notify(String(e), "danger"),
            );
        }
      : undefined,
    "model.cycle_favorite": () => store.cycleFavorite(1, active),
    "model.cycle_favorite_reverse": () => store.cycleFavorite(-1, active),
    "session.toggle.thinking": () => store.toggle("thinking"),
    "session.toggle.exploration_grouping": () => store.toggle("groupExploration"),
    "docs.open": () => {
      if (typeof window !== "undefined") window.open("https://opencode.ai/v2/docs/cli/tui/", "_blank", "noopener,noreferrer");
      else store.notify("https://opencode.ai/v2/docs/cli/tui/");
    },
    "terminal.toggle": active ? () => setTerm(termOpen ? null : { scope: active, view: "last", focused: true }) : undefined,
    "terminal.select": active ? () => setTerm({ scope: active, view: "select", focused: true }) : undefined,
    "terminal.close": termOpen ? () => setTerm(null) : undefined,
    "pane.focus.right": palette === "diff" ? () => focusDiff(true) : termOpen ? () => setTerm({ ...term!, focused: true }) : undefined,
    "command.palette.show": () => dispatch("commands"),
    "help.show": () => dispatch("help"),
    "theme.switch": () => dispatch("themes"),
    "open.menu": () => dispatch("open"),
    "session.list": () => dispatch("sessions"),
    "prompt.images.view": () => setPalette("images"),
    "prompt.submit": () => store.composer?.("submit"),
    "session.new": () => dispatch("new"),
    "model.list": () => dispatch("models"),
    "agent.list": () => dispatch("agents"),
    "messages.copy": active ? () => dispatch("copy") : undefined,
    "session.timeline": active ? () => dispatch("timeline") : undefined,
    "session.export": active ? () => dispatch("export") : undefined,
    "session.undo": active ? () => dispatch("undo") : undefined,
    "session.redo": active ? () => dispatch("redo") : undefined,
    "session.compact": active ? () => dispatch("compact") : undefined,
    "prompt.editor": () => dispatch("editor"),
    "opencode.status": () => dispatch("status"),
    "prompt.queue": () => store.composer?.("queue"),
    "session.queued_prompts": () => (active && store.api?.inbox ? setPalette("queued") : dispatch("exit")),
    "session.tab.next": () => select(store.tabs.cycle(active, 1)),
    "session.tab.previous": () => select(store.tabs.cycle(active, -1)),
    "session.tab.reopen": () => select(store.tabs.reopen()),
    "session.tab.history.forward": () => select(store.tabs.travel(1)),
    "session.tab.history.back": () => select(store.tabs.travel(-1)),
    "session.tab.close": () => {
      if (!active) return;
      const id = store.tabs.close(active);
      if (id) select(id);
      else router.push("/");
    },
    ...Object.fromEntries(
      Array.from({ length: noTabs ? 9 : 10 }, (_, i) =>
        noTabs
          ? [
              `session.quick_switch.${i + 1}`,
              () => select(store.getSnapshot().pins.filter((id) => store.session(id) && !store.session(id)?.parentID)[i]),
            ]
          : [`session.tab.select.${i + 1}`, () => select(store.tabs.at(i))],
      ),
    ),
    "session.sidebar.toggle": () => {
      if (active && !parent) store.toggle("sidebar", wide);
    },
    "agent.cycle": () => store.cycleAgent(active, v1 ? -1 : 1),
    "agent.cycle.reverse": () => store.cycleAgent(active, -1),
    "variant.cycle": () => store.cycleVariant(active),
    "model.cycle_recent": () => store.cycleRecentModel(1, active),
    "model.cycle_recent_reverse": () => store.cycleRecentModel(-1, active),
    "opencode.settings": () => dispatch("settings"),
    "diff.open": () => dispatch("diff"),
    "provider.connect": () => dispatch("integrations"),
    "plugins.list": () => dispatch("plugins"),
    "mcp.list": () => dispatch("mcps"),
    "usage.show": () => dispatch("usage"),
  };
  useKeymap({ tab: () => store.cycleAgent(active) }, { priority: 20, isActive: v1 });
  const dialog = (kind: PaletteKind | "help") => (
    <DeferredDialog
      kind={kind}
      id={active}
      ids={Object.keys(commands)}
      focused={diffFocused}
      focus={focusDiff}
      onKind={setPalette}
      close={() => (kind === "help" ? setHelp(false) : setPalette(null))}
    />
  );
  return (
    <DispatchAction value={dispatch}>
      <NativeActions value={commands}>
        <Box flexDirection="column" width="100%" height="100%" bg={theme.bg}>
          {debug && (
            <Text height={1} bg={theme.panel} color={theme.muted}>
              Debug {vp.cols}×{vp.rows} {store.getSnapshot().connection.kind} {active ?? "Home"}{" "}
              {store.getSnapshot().messages[active ?? ""]?.length ?? 0} messages
            </Text>
          )}
          {!noTabs && (active || open.length > 0) && <SessionTabs active={active} ids={open} />}
          <Box flexDirection="row" flexGrow={1} flexShrink={1} minHeight={0}>
            <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
              {children}
            </Box>
            {palette === "diff" ? (
              dialog("diff")
            ) : termOpen ? (
              <TerminalPane request={term!} close={() => setTerm(null)} focus={(focused) => setTerm((v) => v && { ...v, focused })} />
            ) : (
              active && !parent && (sidebar ?? wide) && <ContextSidebar id={active} overlay={!wide} />
            )}
          </Box>
          <Shortcuts commands={commands} />
          {palette && palette !== "diff" && dialog(palette)}
          {answer && <Review answer={answer.text} onClose={() => store.dismissAnswer()} />}
          {help && dialog("help")}
        </Box>
      </NativeActions>
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
