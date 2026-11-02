import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { keyDefaults } from "./key-defaults";

const stroke =
  /^(?:<leader>)?(?:(?:ctrl|alt|shift|super|meta|cmd)\+)*(?:[!-~]|return|enter|tab|space|escape|backspace|delete|up|down|left|right|pageup|pagedown|home|end|insert|f\d{1,2}|gg)$/i;
/** Only key chords cross the bridge. Never serve the config document, plugin options, or arbitrary paths. */
export async function readCliKeys(
  dir = process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
  inline = process.env.OPENCODE_CLI_CONFIG_CONTENT,
) {
  const keybinds: Record<string, string | false> = Object.create(null);
  let timeout = 2000;
  function merge(raw: string) {
    if (raw.length > 512_000) return;
    try {
      const c = JSON.parse(raw);
      if (Number.isSafeInteger(c?.leader?.timeout) && c.leader.timeout > 0) timeout = Math.min(c.leader.timeout, 60000);
      for (const [id, value] of Object.entries(c?.keybinds ?? {}).slice(0, 500)) {
        if (!Object.hasOwn(keyDefaults, id)) continue;
        if (value === false || value === "none") {
          keybinds[id] = false;
          continue;
        }
        const items = Array.isArray(value) ? value : [value];
        const keys = items
          .flatMap((v) =>
            typeof v === "string" ? [v] : typeof v?.key === "string" && (!v.event || v.event === "press") ? [v.key] : [],
          )
          .join(",");
        if (
          keys &&
          keys.length <= 256 &&
          keys.split(",").every((k) =>
            k
              .trim()
              .split(/\s+/)
              .every((s) => stroke.test(s)),
          )
        )
          keybinds[id] = keys;
      }
    } catch {
      /* Missing or malformed preferences use native defaults. */
    }
  }
  merge(await readFile(join(dir, "opencode", "cli.json"), "utf8").catch(() => ""));
  if (inline) merge(inline);
  return { keybinds, timeout };
}
