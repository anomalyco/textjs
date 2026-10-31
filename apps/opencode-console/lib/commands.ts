import { createContext } from "react";

/** Built-in slash commands implemented by this client (not arbitrary server commands).
 * Keep their names/aliases identical to packages/tui/src/app.tsx. */
export type Picker = "commands" | "sessions" | "models" | "agents" | "variants" | "themes";
export type Action = Picker | "new" | "help" | "copy";
const slash: ReadonlyMap<string, Action> = new Map([
  ["/new", "new"], ["/sessions", "sessions"], ["/resume", "sessions"], ["/continue", "sessions"],
  ["/models", "models"], ["/agents", "agents"], ["/variants", "variants"], ["/thinking", "variants"],
  ["/effort", "variants"], ["/themes", "themes"],
  ["/clear", "new"], ["/help", "help"], ["/copy", "copy"],
]);
export function slashAction(value: string): Action | undefined {
  return slash.get(value.trim());
}
export const DispatchAction = createContext<(action: Action) => void>(() => {});
