import { parseKeys } from "@textjs/app";
import { keyDefaults as defaults } from "@textjs/opencode/key-defaults";
import type { KeySettings } from "./types";
export { defaults };
export function binding(id: string, settings: KeySettings) {
  const value = settings.keybinds[id] ?? defaults[id]?.[0],
    leader = settings.keybinds.leader === "none" ? false : (settings.keybinds.leader ?? "ctrl+x");
  if (!value || value === "none" || typeof value !== "string") return "";
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v && (!v.includes("<leader>") || !!leader))
    .map((v) => v.replaceAll("<leader>", String(leader).split(",")[0] + " ").replace(/^gg$/, "g g"))
    .join(", ");
}
export function validBinding(value: string) {
  if (value === "none") return true;
  if (!value.trim() || value.length > 256) return false;
  try {
    return !!parseKeys(
      value
        .replaceAll("<leader>", "ctrl+x ")
        .split(",")
        .map((k) => (k.trim() === "gg" ? "g g" : k))
        .join(","),
    ).length;
  } catch {
    return false;
  }
}
