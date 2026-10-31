import { useMemo, type ReactNode } from "react";
import { Box, Modal, Select, Text, themes, useAppTheme, useTheme, useViewport, type SelectOption, type ThemeName } from "@textjs/next";
import { useRouter } from "@textjs/next/navigation";
import { relativeTime } from "../lib/format";
import { useStore, useStoreState } from "../lib/store";
import { useActiveSessionId } from "./Shell";

import type { Picker } from "../lib/commands";
export type PaletteKind = Picker;

const TITLES: Record<PaletteKind, string> = {
  commands: " Commands ",
  models: " Switch model ",
  agents: " Switch agent ",
  sessions: " Switch session ",
  variants: " Switch model variant ",
  themes: " Switch theme ",
};

export function Palette({ kind, onKind, onClose }: { kind: PaletteKind; onKind: (k: PaletteKind) => void; onClose: () => void }): ReactNode {
  const theme = useTheme();
  const store = useStore();
  const state = useStoreState((s) => s);
  const router = useRouter();
  const shell = useAppTheme();
  const vp = useViewport();
  const active = useActiveSessionId();

  const options = useMemo((): SelectOption[] => {
    const sessions = state.sessions.map((s) => ({
      value: `session:${s.id}`,
      label: s.title || "Untitled session",
      hint: `${state.busy[s.id] ? "● " : ""}${relativeTime(s.time.updated)}`,
      badge: s.id === active ? "current" : undefined,
    }));
    switch (kind) {
      case "models":
        return state.models.map((m) => ({
          value: `model:${m.providerID}/${m.id}`,
          label: m.name,
          description: m.providerID,
          hint: m.context ? `${Math.round(m.context / 1000)}k` : undefined,
        }));
      case "agents":
        return state.agents.map((a) => ({ value: `agent:${a.id}`, label: a.name, description: a.description }));
      case "sessions":
        return sessions;
      case "variants":
        return ["default", ...store.variants()].map((v) => ({ value: `variant:${v}`, label: v }));
      case "themes":
        return Object.entries(themes).map(([id, t]) => ({ value: `theme:${id}`, label: t.name }));
      default: {
        return [
          { value: "models", label: "Switch model", hint: "ctrl+x m" },
          { value: "sessions", label: "Switch session", hint: "ctrl+x l" },
          { value: "new", label: "New session", hint: "ctrl+x n" },
          { value: "agents", label: "Switch agent", hint: "ctrl+x a" },
          ...(store.variants().length ? [{ value: "variants", label: "Switch model variant" }] : []),
          { value: "sidebar", label: state.ui.sidebar ? "Hide sidebar" : "Show sidebar", hint: "ctrl+x b" },
          { value: "tools", label: state.ui.toolDetails ? "Compact tool output" : "Expand tool output" },
          { value: "thinking", label: state.ui.thinking ? "Collapse thinking" : "Expand thinking" },
          { value: "themes", label: "Switch theme", description: shell.theme.name },
          { value: "viewport", label: vp.responsive ? `Viewport: fixed ${vp.cols}×${vp.rows}` : "Viewport: follow DevTools size" },
          ...(!store.hostManagesConnection ? [{ value: "connect", label: "Connect to server…", description: state.connection.label || undefined }] : []),
          { value: "reload", label: "Reload sessions" },
          ...sessions.slice(0, 12),
        ];
      }
    }
  }, [kind, state, active, shell.theme.name, vp.responsive, vp.cols, vp.rows]);

  const current =
    kind === "models" && state.model ? `model:${state.model.providerID}/${state.model.id}` : kind === "agents" ? `agent:${state.agent}` : kind === "themes" ? `theme:${shell.themeName}` : kind === "variants" ? `variant:${state.model?.variant ?? "default"}` : kind === "sessions" && active ? `session:${active}` : undefined;

  const choose = (value: string): void => {
    if (value === "sessions" || value === "models" || value === "agents" || value === "variants" || value === "themes") {
      onKind(value);
      return;
    }
    onClose();
    if (value === "new") router.push("/");
    else if (value === "sidebar") store.toggle("sidebar");
    else if (value === "tools") store.toggle("toolDetails");
    else if (value === "thinking") store.toggle("thinking");
    else if (value.startsWith("theme:")) shell.setTheme(value.slice(6) as ThemeName);
    else if (value.startsWith("variant:") && state.model) void store.setModel({ ...state.model, variant: value === "variant:default" ? undefined : value.slice(8) }, active);
    else if (value === "viewport") {
      if (vp.responsive) {
        vp.resize(vp.cols, vp.rows);
      } else vp.setResponsive(true);
    } else if (value === "connect") router.push("/connect");
    else if (value === "reload") void store.refreshSessions();
    else if (value.startsWith("session:")) router.push(`/session/${encodeURIComponent(value.slice(8))}`);
    else if (value.startsWith("agent:")) void store.setAgent(value.slice(6), active);
    else if (value.startsWith("model:")) {
      const rest = value.slice(6);
      const slash = rest.indexOf("/");
      void store.setModel({ providerID: rest.slice(0, slash), id: rest.slice(slash + 1) }, active);
    }
  };

  return (
    <Modal title={TITLES[kind]} onClose={onClose} width={68} maxWidth="94%" maxHeight="80%" footer=" ↑↓ select · enter run · esc close ">
      <Select
        key={kind}
        options={options}
        value={current}
        onChange={(v) => choose(v)}
        searchable
        focused
        limit={Math.max(6, Math.min(14, vp.rows - 14))}
        searchPlaceholder={kind === "models" ? "Search models…" : kind === "sessions" ? "Search sessions…" : "Type a command or session…"}
        emptyText={kind === "models" && state.models.length === 0 ? "No models reported by the server" : "No matches"}
      />
      {kind === "commands" ? (
        <Box marginTop={1} height={1}>
          <Text color={theme.subtle} wrap="truncate-end">
            {`${state.sessions.length} sessions · ${state.models.length} models · ${state.connection.kind ?? "…"} backend`}
          </Text>
        </Box>
      ) : null}
    </Modal>
  );
}
