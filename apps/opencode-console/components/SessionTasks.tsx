import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { useRouter } from "@textjs/app/navigation";
import { Choices } from "./Choices";
import { Review } from "./Review";
export function SessionTasks({ id, shell, close }: { id: string; shell: boolean; close: () => void }) {
  const store = useStore(),
    api = store.api,
    dir = store.session(id)?.directory,
    router = useRouter(),
    [rows, set] = useState<{ id: string; label: string; hint?: string }[]>([]),
    [target, confirm] = useState(""),
    [output, show] = useState<string | null>(null),
    [note, report] = useState(""),
    [rev, refresh] = useState(0);
  useEffect(() => {
    let live = true;
    void (async () => {
      const rows = shell
        ? ((await api?.shells?.(id, dir)) ?? []).map((p) => ({ id: p.id, label: p.command, hint: p.status }))
        : ((await api?.children?.(id)) ?? []).map((p) => ({ id: p.id, label: p.title ?? p.id, hint: p.agent }));
      if (live) set(rows);
    })().catch((e) => {
      if (live) report(String(e));
    });
    return () => {
      live = false;
    };
  }, [id, api, shell, dir, rev]);
  if (output !== null) return <Review answer={output || "No output"} title="Shell output" plain onClose={() => show(null)} />;
  if (target)
    return (
      <Choices
        title={shell ? "Stop shell command" : "Interrupt subagent"}
        items={[
          { id: "cancel", label: "Cancel" },
          { id: "stop", label: rows.find((r) => r.id === target)?.label ?? target },
        ]}
        close={() => confirm("")}
        choose={(v) => {
          if (v === "stop")
            void (shell ? api?.killShell?.(target, dir) : api?.interrupt(target))?.then(
              () => refresh((v) => v + 1),
              (e) => report(String(e)),
            );
          confirm("");
        }}
      />
    );
  return (
    <Choices
      title={shell ? "Shell commands" : "Subagents"}
      mode={shell ? "shell" : "subagent"}
      items={rows}
      close={close}
      choose={(v) => {
        if (shell) void api?.shellOutput?.(v, dir).then(show, (e) => report(String(e)));
        else {
          close();
          router.push(`/session/${encodeURIComponent(v)}`);
        }
      }}
      commands={(v) => ({
        [shell ? "composer.shell.kill" : "composer.subagent.interrupt"]: () => {
          if (v && (!shell || rows.find((r) => r.id === v)?.hint === "running")) confirm(v);
        },
      })}
      note={note || "ctrl+d interrupt"}
    />
  );
}
