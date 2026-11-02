import { useState } from "react";
import { binding, defaults, validBinding } from "../lib/bindings";
import { useStore, useStoreState } from "../lib/store";
import { Choices, PromptDialog } from "./Choices";
export function KeySettingsDialog({ ids, close }: { ids: string[]; close: () => void }) {
  const cfg = useStoreState((s) => s.keys),
    store = useStore(),
    [id, select] = useState(""),
    [error, fail] = useState("");
  if (id)
    return (
      <PromptDialog
        title={id}
        initial={cfg.keybinds[id] === false ? "none" : String(cfg.keybinds[id] ?? defaults[id]?.[0] ?? "")}
        close={() => select("")}
        note={error || "Use none to disable a binding."}
        submit={(v) => {
          if (!validBinding(v) || (id === "leader" && /<leader>|,|\s/.test(v))) {
            fail("Invalid key sequence");
            return;
          }
          store.bind(id, v === "none" ? false : v.trim());
          select("");
        }}
      />
    );
  return (
    <Choices
      title="Keybinds"
      items={[
        ...new Set([
          "leader",
          ...ids,
          ...Object.keys(defaults).filter((k) =>
            [
              "input.",
              "which-key.",
              "diff.",
              "dialog.",
              "model.dialog.",
              "composer.",
              "queued_prompt.",
              "stash.delete",
              "session.rename",
              "session.delete",
              "session.pin.toggle",
              "prompt.autocomplete.",
            ].some((prefix) => k.startsWith(prefix)),
          ),
        ]),
      ].map((id) => ({ id, label: id, detail: defaults[id]?.[1], hint: binding(id, cfg) || "none" }))}
      choose={(v) => {
        select(v);
        fail("");
      }}
      close={close}
      note="Overrides apply to this connection."
      wide
    />
  );
}
