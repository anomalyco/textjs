import { useEffect, useState, useRef } from "react";
import { Box, Input, Text, useInput } from "@textjs/app";
import { useStore, useStoreState } from "../lib/store";
import { useCommandKeys } from "../lib/bindings";
import { Choices } from "./Choices";
import { PickerPanel } from "./PickerPanel";
export function Workspaces({ id, close }: { id: string | null; close: () => void }) {
  const store = useStore(),
    api = store.api?.workspace,
    dir = useStoreState((s) => (id && s.sessions.find((x) => x.id === id)?.directory) || s.connection.directory),
    [list, set] = useState<string[]>([]),
    [project, scope] = useState<{ id: string; directory: string }>(),
    [rev, reload] = useState(0),
    [stage, view] = useState(""),
    [target, to] = useState(""),
    [msg, note] = useState(""),
    lock = useRef(false);
  useEffect(() => {
    let live = true;
    if (!api) {
      note("Workspace management requires a V2 server");
      return;
    }
    void api
      .location(dir)
      .then(async (l) => {
        const items = await api.list(l.project.id);
        if (live) {
          scope(l.project);
          set([...new Set([l.project.directory, ...items.map((r) => r.directory)])]);
        }
      })
      .catch((e) => {
        if (live) note(String(e));
      });
    return () => {
      live = false;
    };
  }, [api, dir, rev]);
  const run = async (fn: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    try {
      await fn();
      view("");
      note("");
      reload((v) => v + 1);
    } catch (e) {
      note(String(e));
    } finally {
      lock.current = false;
    }
  };
  if (stage === "new")
    return (
      <PickerPanel>
        <Name
          close={() => view("")}
          submit={(name) => {
            if (api && project && dir) void run(() => api.create(project.id, dir, name));
          }}
          note={msg}
        />
      </PickerPanel>
    );
  if (stage === "delete")
    return (
      <Choices
        title="Delete workspace"
        items={[
          { id: "cancel", label: "Cancel" },
          { id: "delete", label: "Delete " + target },
        ]}
        close={() => view("")}
        choose={(v) => {
          if (v === "delete" && api && project) void run(() => api.remove(project.id, target));
          else view("");
        }}
        note={msg || "Modified worktrees will not be removed."}
      />
    );
  const move = (dest: string) => {
    if (dest)
      void run(async () => {
        await store.cd(id, dest);
        close();
      });
  };
  return (
    <Choices
      title="Manage workspaces"
      items={list.map((d) => ({ id: d, label: d, current: d === dir }))}
      close={close}
      choose={move}
      commands={(d) => ({
        "dialog.move_session.new": () => view("new"),
        "dialog.move_session.move": () => move(d),
        "dialog.move_session.refresh": () => {
          if (api && project) void run(() => api.refresh(project.id));
        },
        "dialog.move_session.delete": () => {
          if (!d || d === project?.directory || d === dir) {
            note("Cannot remove the current or primary workspace");
            return;
          }
          to(d);
          view("delete");
        },
      })}
      note={msg || "ctrl+a new  ctrl+m move  ctrl+d delete  ctrl+r refresh"}
      wide
    />
  );
}
function Name({ close, submit, note }: { close: () => void; submit: (name: string) => void; note: string }) {
  const [s, set] = useState("");
  const n = useRef(0);
  useCommandKeys({ "dialog.worktree.generate": () => set(`workspace-${++n.current}`) }, 30);
  useInput(
    (e) => {
      if (e.key === "escape") {
        e.stopPropagation();
        close();
      }
    },
    { priority: 30 },
  );
  return (
    <Box paddingX={3} flexDirection="column" gap={1}>
      <Text bold>New worktree</Text>
      <Input
        autoFocus
        value={s}
        onChange={set}
        onSubmit={(v) => {
          if (/^[\w.-]+$/.test(v) && !v.startsWith(".")) submit(v);
        }}
      />
      <Text>{note || "tab generate one"}</Text>
    </Box>
  );
}
