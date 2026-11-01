import { createContext } from "react";
import type { CommandOption } from "./types";

export type Picker =
  | "commands"
  | "sessions"
  | "models"
  | "agents"
  | "variants"
  | "themes"
  | "settings"
  | "integrations"
  | "workspaces"
  | "timeline"
  | "fork"
  | "status"
  | "mcps"
  | "export"
  | "share"
  | "queued" | "stashes"
  | "skills";
export type InfoPicker = "plugins" | "stats" | "usage" | "diff";
export type Action =
  | Picker
  | InfoPicker
  | "new"
  | "clear"
  | "help"
  | "copy"
  | "exit"
  | "undo"
  | "redo"
  | "details"
  | "reasoning"
  | "editor"
  | "compact"
  | "unshare"
  | "reload";
export type SlashCommand = CommandOption & { action?: Action; key?: string; args?: boolean; session?: boolean; aliases?: string[] };
const builtins: SlashCommand[] = [
  { name: "new", description: "New session", action: "new", key: "ctrl+x n" },
  { name: "clear", description: "Clear session", action: "clear" },
  { name: "sessions", aliases: ["resume", "continue"], description: "Switch session", action: "sessions", key: "ctrl+x l" },
  { name: "open", aliases: ["project", "projects"], description: "Open session or project", action: "sessions", key: "ctrl+o" },
  { name: "models", description: "Switch model", action: "models", key: "ctrl+x m" },
  { name: "agents", description: "Switch agent", action: "agents", key: "ctrl+x a" },
  { name: "variants", aliases: ["thinking", "effort"], description: "Switch model variant", action: "variants" },
  { name: "themes", description: "Switch theme", action: "themes" },
  { name: "connect", description: "Connect an integration", action: "integrations" },
  { name: "settings", description: "Open settings", action: "settings" },
  { name: "worktrees", description: "Manage workspaces", action: "workspaces" },
  { name: "mcps", description: "MCP servers", action: "mcps" },
  { name: "skills", description: "Select skill", action: "skills" },
  { name: "plugins", description: "Manage plugins", action: "plugins" },
  { name: "stats", description: "View session statistics", action: "stats" },
  { name: "usage", description: "View usage", action: "usage" },
  { name: "diff", description: "Open diff viewer", action: "diff" },
  { name: "btw", description: "Ask a side question", args: true, session: true },
  { name: "status", description: "View status", action: "status", key: "ctrl+x s" },
  { name: "reload", description: "Reload configuration", action: "reload" },
  { name: "editor", description: "Open editor", action: "editor", key: "ctrl+x e" },
  { name: "help", description: "Help", action: "help" },
  { name: "exit", aliases: ["quit", "q"], description: "Exit the app", action: "exit" },
  { name: "rename", description: "Rename session", session: true, args: true },
  { name: "copy", description: "Copy last assistant message", session: true, action: "copy", key: "ctrl+x y" },
  { name: "undo", description: "Undo previous message", session: true, action: "undo", key: "ctrl+x u" },
  { name: "redo", description: "Redo", session: true, action: "redo", key: "ctrl+x r" },
  { name: "compact", description: "Compact session", session: true, action: "compact", key: "ctrl+x c" },
  { name: "timeline", description: "Jump to message", session: true, action: "timeline", key: "ctrl+x g" },
  { name: "fork", description: "Fork session", session: true, action: "fork" },
  { name: "export", description: "Export session transcript", session: true, action: "export", key: "ctrl+x x" },
  { name: "details", description: "Toggle tool details", session: true, action: "details" },
  { name: "share", description: "Share session", session: true, action: "share" },
  { name: "unshare", description: "Unshare session", session: true, action: "unshare" },
];
const all = builtins.flatMap((c) => [c, ...(c.aliases ?? []).map((name) => ({ ...c, name }))]);
const byName = new Map(all.map((c) => [c.name, c]));
export function slashCommands(server: readonly CommandOption[], session: boolean, canShare: boolean, v1=false) {
  return [
    ...all
      .filter((c) => (!c.session || session) && (canShare || !["share", "unshare"].includes(c.name)))
      .map((c) =>
        v1 && c.name === "thinking"
          ? { ...c, action: "reasoning" as const, description: "Toggle thinking blocks visibility" }
          : c,
      ),
    ...server.filter((c) => !byName.has(c.name)).map((c) => ({ ...c, args: true })),
  ].sort((a, b) => a.name.localeCompare(b.name)) as SlashCommand[];
}
export function slashAction(value: string, v1 = false): Action | undefined {
  const v = value.trim();
  if (v1 && v === "/thinking") return "reasoning";
  return ["exit", "quit", ":q"].includes(v) ? "exit" : v[0] === "/" ? byName.get(v.slice(1))?.action : undefined;
}
export const DispatchAction = createContext<(action: Action) => void>(() => {});
