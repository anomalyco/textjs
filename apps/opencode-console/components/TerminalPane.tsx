import { useState, useEffect, useRef } from "react";
import { Box, Text, Input, ScrollBox, useInput, useViewport, useFocusManager } from "@textjs/app";
import { useStore } from "../lib/store";
import { useTokens } from "../lib/native-theme";
import { useCommandKeys } from "../lib/bindings";
import type { Term } from "../lib/terminals";
import { InputTrap } from "./PickerPanel";
import { Choices } from "./Choices";
export type TerminalRequest = { scope: string; view: "select" | "new" | "last"; focused: boolean; seq?: number };
export function TerminalPane(props: { request: TerminalRequest; close: () => void; focus: (v: boolean) => void }) {
  const { request, close, focus } = props,
    store = useStore(),
    api = store.api?.terminals,
    vp = useViewport(),
    t = useTokens(),
    wide = vp.cols >= 108;
  const [list, load] = useState<Term[]>([]),
    [id, select] = useState(""),
    [picking, pick] = useState(false),
    [output, show] = useState(""),
    [line, edit] = useState(""),
    [note, report] = useState(""),
    [rev, refresh] = useState(0);
  useEffect(() => {
    let live = true;
    if (!api) {
      report("Terminal panes require a V2 server.");
      return;
    }
    void (async () => {
      let rows = await api.list(request.scope);
      if (!live) return;
      if (api.create && (request.view === "new" || (!rows.length && request.view === "last"))) {
        const term = await api.create(request.scope);
        rows = [...rows, term];
      }
      if (!live) return;
      load(rows);
      pick(request.view === "select");
      select(rows.at(-1)?.id ?? "");
      edit("");
      report(rows.length ? "" : "No terminals. Open a terminal in the native CLI.");
    })().catch((e) => {
      if (live) report(String(e));
    });
    return () => {
      live = false;
    };
  }, [api, request.scope, request.view, request.seq]);
  useEffect(() => {
    let live = true;
    show("");
    if (id)
      void api?.snapshot(id).then(
        (v) => {
          if (live) show(v);
        },
        (e) => {
          if (live) report(String(e));
        },
      );
    return () => {
      live = false;
    };
  }, [api, id, rev]);
  const term = list.find((t) => t.id === id),
    locked = useRef(false);
  const submit = async () => {
    if (!api?.input || !id || !line.trim() || locked.current) return;
    locked.current = true;
    try {
      const s = await api.input(id, line);
      show(s);
      edit("");
      load(await api.list(request.scope));
    } catch (e) {
      report(String(e));
    } finally {
      locked.current = false;
    }
  };
  const body = (
    <Box flexDirection="column" height="100%" paddingX={2} bg={t.raised}>
      <Text bold>
        {term?.title ?? "Terminal"} <Text color={t.muted}>{api?.input ? "scripted sandbox" : "read-only snapshot"}</Text>
      </Text>
      <ScrollBox stickyScroll minHeight={0} flexGrow={1} showScrollbar={false}>
        <Text>{output}</Text>
      </ScrollBox>
      {note && <Text color={t.muted}>{note}</Text>}
      {api?.input && term?.status === "running" && (
        <Box flexDirection="row">
          <Text color={t.accent}>$ </Text>
          <Input
            id="opencode-terminal-input"
            autoFocus
            isActive={request.focused && !picking}
            value={line}
            onChange={edit}
            onSubmit={() => void submit()}
          />
        </Box>
      )}
      <Text color={t.muted}>{api?.input ? "esc return to session" : "r refresh  esc close"}</Text>
      {request.focused && (
        <PaneKeys
          onClose={close}
          onSelect={() => pick(true)}
          onLeft={() => (wide ? focus(false) : close())}
          refresh={() => refresh((r) => r + 1)}
          readOnly={!api?.input}
        />
      )}
    </Box>
  );
  return (
    <>
      <Box
        flexDirection="column"
        width={wide ? Math.floor(vp.cols / 2) : "100%"}
        {...(!wide ? { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0, zIndex: 90 } : {})}
      >
        {request.focused ? <InputTrap>{body}</InputTrap> : body}
      </Box>
      {picking && (
        <Choices
          title="Select terminal"
          mode="terminal"
          close={() => pick(false)}
          items={list.map((p) => ({ id: p.id, label: p.title, hint: p.status, current: p.id === id }))}
          choose={(v) => {
            select(v);
            pick(false);
            focus(true);
          }}
        />
      )}
    </>
  );
}
function PaneKeys({
  onClose,
  onSelect,
  onLeft,
  refresh,
  readOnly,
}: {
  onClose: () => void;
  onSelect: () => void;
  onLeft: () => void;
  refresh: () => void;
  readOnly: boolean;
}) {
  const focus = useFocusManager();
  useEffect(() => {
    if (!readOnly) focus.focus("opencode-terminal-input");
  }, [readOnly]);
  useCommandKeys(
    { "terminal.close": onClose, "terminal.toggle": onClose, "terminal.select": onSelect, "pane.focus.left": onLeft },
    30,
  );
  useInput(
    (e) => {
      if (e.key === "escape") onClose();
      else if (readOnly && e.key === "r") refresh();
      else return;
      e.stopPropagation();
    },
    { priority: 30 },
  );
  return null;
}
