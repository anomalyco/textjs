import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box, Input, Text, fuzzyFilter, useAppTheme, useFocus, useInput, useTheme, useViewport } from "@textjs/next";
import { useRouter } from "@textjs/next/navigation";
import { DispatchAction, type Picker } from "../lib/commands";
import { nativeTheme, nativeThemes, rememberTheme, themeNames, useTokens, type NativeTheme } from "../lib/native-theme";
import { useStore, useStoreState } from "../lib/store";
import { useActiveSessionId } from "./Shell";
import { PickerPanel } from "./PickerPanel";

export type PaletteKind = Picker;
interface Props {
  kind: Picker;
  onKind: (kind: Picker) => void;
  onClose: () => void;
}
interface Option {
  value: string;
  label: string;
  group?: string;
  hint?: string;
  description?: string;
  current?: boolean;
}
const titles = {
  commands: "Commands",
  models: "Select model",
  agents: "Select agent",
  variants: "Select variant",
  themes: "Themes",
  sessions: "Sessions",
  settings: "Settings",
  integrations: "Connect an integration",
  workspaces: "Manage workspaces",
};

export function Palette(props: Props) {
  return (
    <PickerPanel width={props.kind === "sessions" ? 88 : 60}>
      <Content key={props.kind} {...props} />
    </PickerPanel>
  );
}

function Content({ kind, onKind, onClose }: Props) {
  const store = useStore(),
    router = useRouter(),
    shell = useAppTheme(),
    theme = useTheme(),
    t = useTokens(),
    vp = useViewport(),
    active = useActiveSessionId();
  const dispatch = useContext(DispatchAction);
  const sessions = useStoreState((s) => s.sessions),
    agents = useStoreState((s) => s.agents),
    models = useStoreState((s) => s.models),
    model = useStoreState((s) => s.model),
    agent = useStoreState((s) => s.agent);
  const connection = useStoreState((s) => s.connection),
    ui = useStoreState((s) => s.ui);
  const [query, filter] = useState(""),
    [index, highlight] = useState<number | null>(null),
    [allProjects, showAll] = useState(false);
  const [deleting, setDeleting] = useState(""),
    [renaming, setRenaming] = useState(""),
    [titleDraft, setTitleDraft] = useState("");
  const [integrations, setIntegrations] = useState<{ id: string; name: string }[]>([]),
    [notice, setNotice] = useState("");
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  useEffect(() => {
    if (kind !== "workspaces") return;
    let alive = true;
    void store.api?.workspaces?.().then(
      (v) => {
        if (alive) setWorkspaces(v);
      },
      (e) => {
        if (alive) setNotice(String(e));
      },
    );
    return () => {
      alive = false;
    };
  }, [kind, store]);
  const initialTheme = useRef(theme),
    confirmed = useRef(false);
  useEffect(() => {
    if (kind !== "integrations") return;
    let alive = true;
    void store.api?.integrations?.().then(
      (v) => {
        if (alive) setIntegrations(v);
      },
      (e) => {
        if (alive) setNotice(String(e));
      },
    );
    return () => {
      alive = false;
    };
  }, [kind, store]);
  const dir = sessions.find((s) => s.id === active)?.directory ?? connection.directory;
  const proj = dir?.replace(/\/+$/u, "").split("/").pop() || "project";
  const options = useMemo((): Option[] => {
    const today = new Date().toDateString();
    const list: Option[] = sessions
      .filter((s) => !s.parentID && (kind !== "sessions" || allProjects || !dir || !s.directory || s.directory === dir))
      .map((s) => ({
        value: `session:${s.id}`,
        label: s.title || "Untitled session",
        group: new Date(s.time.updated).toDateString() === today ? "Today" : new Date(s.time.updated).toDateString(),
      }));
    if (kind === "sessions") return list;
    if (kind === "workspaces")
      return [...new Set([...(dir ? [dir] : []), ...workspaces])].map((d) => ({ label: d, value: `workspace:${d}`, current: d === dir }));
    if (kind === "themes") return themeNames.map((n) => ({ label: n, value: `theme:${n}`, current: n === initialTheme.current.name }));
    if (kind === "integrations") return integrations.map((v) => ({ label: v.name, value: `integration:${v.id}` }));
    if (kind === "models")
      return models.map((m) => ({
        value: `model:${m.providerID}/${m.id}`,
        label: m.name,
        hint: m.free ? "Free" : undefined,
        current: m.id === model?.id && m.providerID === model.providerID,
      }));
    if (kind === "agents")
      return agents.map((a) => ({ value: `agent:${a.id}`, label: a.id, description: a.description, current: a.id === agent }));
    if (kind === "variants")
      return ["default", ...store.variants()].map((v) => ({
        value: `variant:${v}`,
        label: v,
        current: v === (model?.variant ?? "default"),
      }));
    const settings: Option[] = [
      { value: "themes", label: "Switch theme", group: "Appearance" },
      { value: "mode", label: "Switch theme mode", group: "Appearance" },
      { value: "sidebar", label: ui.sidebar ? "Hide sidebar" : "Show sidebar", group: "Session", hint: "ctrl+x b" },
      { value: "tools", label: ui.toolDetails ? "Compact tool output" : "Expand tool output", group: "Session" },
      { value: "group", label: ui.groupExploration ? "Show tool calls individually" : "Group related tool calls", group: "Session" },
      { value: "thinking", label: ui.thinking ? "Collapse thinking" : "Expand thinking", group: "Session" },
    ];
    if (kind === "settings") return settings;
    const base: Option[] = [
      { value: "sessions", label: "Switch session", hint: "ctrl+x l", group: "Session" },
      { value: "new", label: "New session", hint: "ctrl+x n", group: "Session" },
      { value: "clear", label: "Clear session", group: "Session" },
      { value: "open", label: "Open session or project", hint: "ctrl+o", group: "Session" },
      { value: "close", label: "Close tab", hint: "ctrl+x w", group: "Session" },
      { value: "reopen", label: "Reopen closed tab", hint: "ctrl+shift+t", group: "Session" },
      { value: "editor", label: "Open editor", hint: "ctrl+x e", group: "Session" },
      { value: "workspaces", label: "Manage workspaces", group: "Session" },
      { value: "models", label: "Switch model", hint: "ctrl+x m", group: "Agent" },
      { value: "agents", label: "Switch agent", hint: "ctrl+x a", group: "Agent" },
      ...(store.variants().length ? [{ value: "variants", label: "Switch model variant", group: "Agent" }] : []),
      { value: "integrations", label: "Connect an integration", group: "System" },
      { value: "settings", label: "Open settings", group: "System" },
      { value: "help", label: "Help", group: "System" },
      { value: "reload", label: "Reload sessions", group: "System" },
      ...(!store.hostManagesConnection ? [{ value: "connect", label: "Connect to server…", group: "System" }] : []),
      ...(active ? [{ value: "copy", label: "Copy last assistant message", hint: "ctrl+x y", group: "Session" }] : []),
      ...settings,
    ];
    if (query) return [...base, ...list];
    const suggested = [
      ...(sessions.length && store.tabs.list().length ? ["sessions"] : []),
      ...(active ? ["new"] : []),
      "models",
      "integrations",
      "settings",
    ];
    return [...suggested.map((value) => ({ ...base.find((o) => o.value === value)!, group: "Suggested" })), ...base];
  }, [kind, query, sessions, allProjects, dir, agents, models, model, agent, ui, store, active, integrations, workspaces]);
  const filtered = useMemo(
    () => (query ? fuzzyFilter(query, options, (o) => `${o.label} ${o.description ?? ""} ${o.value}`).map((v) => v.item) : options),
    [options, query],
  );
  const selected = Math.max(
    0,
    Math.min(
      index ??
        Math.max(
          0,
          filtered.findIndex((o) => o.current),
        ),
      filtered.length - 1,
    ),
  );
  const item = filtered[selected];
  const rows: ({ heading: string } | { option: Option; i: number })[] = [];
  let group = "",
    activeRow = 0;
  filtered.forEach((o, i) => {
    if (!query && o.group && o.group !== group) {
      if (group) rows.push({ heading: "" });
      rows.push({ heading: o.group });
      group = o.group;
    }
    if (i === selected) activeRow = rows.length;
    rows.push({ option: o, i });
  });
  const limit = Math.max(1, Math.floor(vp.rows / 2) - 6);
  // DialogSelect.moveTo(index, center=true) centers the current selection,
  // including the first open with a pre-selected theme halfway down the list.
  const offset = Math.max(0, Math.min(rows.length - limit, activeRow - Math.floor(limit / 2)));
  const visible = rows.slice(offset, offset + limit);
  const preview = kind === "themes" && item ? (item.label as NativeTheme) : null;
  useEffect(() => {
    if (preview) shell.setTheme(nativeTheme(preview, initialTheme.current.appearance));
  }, [preview, shell.setTheme]);
  useEffect(
    () => () => {
      if (kind === "themes" && !confirmed.current) shell.setTheme(initialTheme.current);
    },
    [kind, shell.setTheme],
  );
  const goSession = (id: string | undefined) => {
    if (id) router.push(`/session/${encodeURIComponent(id)}`);
    else router.push("/");
  };
  const choose = (o: Option | undefined) => {
    if (!o) return;
    const v = o.value;
    if (["models", "agents", "sessions", "themes", "variants", "settings", "integrations", "workspaces"].includes(v)) {
      onKind(v as Picker);
      return;
    }
    if (v.startsWith("workspace:")) {
      const id = sessions.find((s) => s.directory === v.slice(10))?.id;
      if (id) {
        goSession(id);
        onClose();
      } else setNotice("No sessions in this workspace");
      return;
    }
    if (v === "open") {
      onKind("sessions");
      return;
    }
    if (v === "editor") {
      setNotice("External editor requires the native CLI.");
      return;
    }
    if (v.startsWith("integration:")) {
      setNotice(`Use the native CLI to connect ${o.label}.`);
      return;
    }
    if (v.startsWith("theme:")) {
      confirmed.current = true;
      const next = nativeTheme(o.label as NativeTheme, initialTheme.current.appearance);
      shell.setTheme(next);
      rememberTheme(next);
    } else if (v === "mode") {
      const mode = theme.appearance === "dark" ? "light" : "dark";
      const n = theme.name as NativeTheme;
      if (!nativeThemes[n]?.[mode]) {
        setNotice(`No ${mode} mode for ${n}`);
        return;
      }
      const next = nativeTheme(n, mode);
      shell.setTheme(next);
      rememberTheme(next);
    } else if (v === "new" || v === "clear") {
      if (v === "clear" && active) store.tabs.close(active);
      goSession(undefined);
    } else if (v === "close" && active) goSession(store.tabs.close(active));
    else if (v === "reopen") {
      const id = store.tabs.reopen();
      if (id) goSession(id);
    } else if (v === "sidebar" || v === "thinking" || v === "group" || v === "tools")
      store.toggle(v === "group" ? "groupExploration" : v === "tools" ? "toolDetails" : v);
    else if (v === "connect") router.push("/connect");
    else if (v === "reload") void store.refreshSessions();
    else if (v === "help" || v === "copy") dispatch(v);
    else if (v.startsWith("session:")) goSession(v.slice(8));
    else if (v.startsWith("agent:")) void store.setAgent(v.slice(6), active);
    else if (v.startsWith("variant:") && model)
      void store.setModel({ ...model, variant: v === "variant:default" ? undefined : v.slice(8) }, active);
    else if (v.startsWith("model:")) {
      const name = v.slice(6),
        i = name.indexOf("/");
      void store.setModel({ providerID: name.slice(0, i), id: name.slice(i + 1) }, active);
    }
    onClose();
  };
  const update = (s: string) => {
    filter(s);
    highlight(0);
    setDeleting("");
    setNotice("");
  };
  useInput(
    (e) => {
      const k = e.key;
      if (renaming) {
        if (k !== "escape") return;
        setRenaming("");
      } else if (k === "escape") {
        onClose();
      } else if (k === "up" || k === "down" || (e.ctrl && ["n", "p"].includes(k)))
        highlight((selected + (["up", "p"].includes(k) ? -1 : 1) + filtered.length) % Math.max(1, filtered.length));
      else if (k === "pageup" || k === "pagedown")
        highlight(Math.max(0, Math.min(filtered.length - 1, selected + (k === "pageup" ? -limit : limit))));
      else if (k === "home" || k === "end") highlight(k === "home" ? 0 : Math.max(0, filtered.length - 1));
      else if (e.ctrl && k === "a" && kind === "models") onKind("integrations");
      else if (e.ctrl && k === "a" && kind === "sessions") {
        showAll(!allProjects);
        highlight(0);
      } else if (e.ctrl && ["r", "d"].includes(k) && kind === "sessions" && item) {
        const id = item.value.slice(8);
        if (k === "r") {
          setRenaming(id);
          setTitleDraft(item.label);
        } else if (!e.repeat && deleting === id && store.api?.removeSession) {
          setDeleting("");
          void store.api.removeSession(id).then(
            async () => {
              store.tabs.close(id);
              await store.refreshSessions();
              if (active === id) goSession(undefined);
            },
            (e) => setNotice(String(e)),
          );
        } else if (!e.repeat) setDeleting(id);
      } else return;
      if (k !== "d") setDeleting("");
      e.stopPropagation();
    },
    { priority: 30 },
  );
  const edit = (v: string) => {
    if (!v.trim() || !store.api?.rename) return;
    void store.api.rename(renaming, v.trim()).then(
      async () => {
        await store.refreshSessions();
        setRenaming("");
      },
      (e) => setNotice(String(e)),
    );
  };
  const title = renaming
    ? "Rename session"
    : connection.kind === "demo" && kind === "sessions"
      ? "Switch session"
      : connection.kind === "demo" && kind === "models"
        ? "Switch model"
        : titles[kind];
  const filterInput = (
    <Input
      key={renaming || kind}
      id={`opencode-picker-${kind}`}
      value={renaming ? titleDraft : query}
      onChange={renaming ? setTitleDraft : update}
      autoFocus
      placeholder="Search"
      placeholderColor={t.muted}
      onSubmit={renaming ? edit : () => choose(item)}
    />
  );
  const foot = kind === "models" || kind === "sessions";
  return (
    <>
      <Box flexDirection="column" paddingX={4} gap={1}>
        <Box flexDirection="row" justifyContent="space-between" height={1}>
          <Text bold>
            {title}
            {kind === "sessions" && connection.kind !== "demo" && !renaming && (
              <Text bold={false} color={t.muted}>
                {allProjects ? " from all projects" : ` for ${proj}`}
              </Text>
            )}
          </Text>
          <Text color={t.muted}>esc</Text>
        </Box>
        {filterInput}
      </Box>
      {!renaming && (
        <Box flexDirection="column" paddingX={1} marginTop={1} flexShrink={0}>
          {visible.length === 0 && (
            <Text paddingLeft={3} color={t.muted}>
              {query ? "No results found" : "No items available"}
            </Text>
          )}
          {visible.map((r, i) => {
            if ("heading" in r)
              return (
                <Text key={i} height={1} paddingLeft={3} bold color={t.accent}>
                  {r.heading}
                </Text>
              );
            const o = r.option,
              hi = r.i === selected,
              fg = hi ? t.primaryTextFocused : t.text,
              muted = hi ? fg : t.muted;
            return (
              <Box key={i} flexDirection="row" height={1} paddingLeft={1} paddingRight={3} bg={hi ? t.primaryBgFocused : undefined}>
                <Text width={2} flexShrink={0} color={fg} wrap="nowrap">
                  {o.current ? "● " : "  "}
                </Text>
                <Box flexGrow={1} flexBasis={0} minWidth={0} overflow="hidden">
                  <Text color={fg} bold={hi} wrap="nowrap">
                    {deleting && o.value === `session:${deleting}` ? "Press ctrl+d again to confirm" : o.label}
                    {o.description && <Text color={muted}> {o.description}</Text>}
                  </Text>
                </Box>
                {o.hint && (
                  <Text color={muted} flexShrink={0}>
                    {o.hint}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}
      {foot && !renaming && (
        <Box flexDirection="row" marginTop={1} paddingX={4} justifyContent="space-between">
          {kind === "models" ? (
            <Text>
              View all integrations<Text color={t.muted}> ctrl+a</Text>
            </Text>
          ) : (
            <>
              <Text>
                delete<Text color={t.muted}> ctrl+d </Text>rename<Text color={t.muted}> ctrl+r</Text>
              </Text>
              <Text>
                {allProjects ? "current directory" : "all projects"}
                <Text color={t.muted}> ctrl+a</Text>
              </Text>
            </>
          )}
        </Box>
      )}
      {notice && (
        <Text marginTop={1} paddingX={4} color={t.warning}>
          {notice}
        </Text>
      )}
      <Box height={foot ? 1 : 2} />
    </>
  );
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <PickerPanel>
      <HelpContent onClose={onClose} />
    </PickerPanel>
  );
}
function HelpContent({ onClose }: { onClose: () => void }): ReactNode {
  useFocus({ id: "opencode-help", autoFocus: true });
  const t = useTokens();
  useInput((e) => {
    if (e.key === "escape" || e.key === "return") {
      e.stopPropagation();
      onClose();
    }
  });
  return (
    <Box flexDirection="column" paddingX={3} paddingBottom={1} gap={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold>Help</Text>
        <Text color={t.muted}>esc/enter</Text>
      </Box>
      <Text color={t.muted}>Press ctrl+p to see all available actions and commands in any context.</Text>
      <Box flexDirection="row" justifyContent="flex-end">
        <Text color={t.primaryTextFocused} bg={t.primaryBgFocused}>
          {" "}
          ok{" "}
        </Text>
      </Box>
    </Box>
  );
}
