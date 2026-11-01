import { createContext } from "react";

/** Built-in slash commands implemented by this client (not arbitrary server commands).
 * Keep their names/aliases identical to packages/tui/src/app.tsx. */
export type Picker = "commands" | "sessions" | "models" | "agents" | "variants" | "themes" | "settings" | "integrations" | "workspaces";
export type Action = Picker | "new" | "help" | "copy" | "exit";
const slash: ReadonlyMap<string, Action> = new Map([
  ["/new", "new"], ["/sessions", "sessions"], ["/resume", "sessions"], ["/continue", "sessions"],
  ["/models", "models"], ["/agents", "agents"], ["/variants", "variants"], ["/thinking", "variants"],
  ["/effort", "variants"], ["/themes", "themes"],
  ["/clear", "new"], ["/help", "help"], ["/copy", "copy"],
  ["/settings", "settings"], ["/open", "sessions"], ["/connect", "integrations"],
  ["/exit", "exit"], ["/quit", "exit"], ["/q", "exit"],
]);
/** Typed without a slash, these exit too (packages/tui/src/component/prompt/index.tsx). */
const exitWords: ReadonlySet<string> = new Set(["exit", "quit", ":q"]);
export function slashAction(value: string): Action | undefined {
  const v = value.trim();
  return exitWords.has(v) ? "exit" : slash.get(v);
}
export const DispatchAction = createContext<(action: Action) => void>(() => {});
