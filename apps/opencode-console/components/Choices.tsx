import { useState } from "react";
import { Box, Input, Text, fuzzyFilter, useViewport } from "@textjs/app";
import { useCommandKeys } from "../lib/bindings";
import { useTokens } from "../lib/native-theme";
import { PickerPanel } from "./PickerPanel";

export interface Choice {
  id: string;
  label: string;
  detail?: string;
  hint?: string;
  current?: boolean;
  group?: string;
}
export function Choices(props: {
  title: string;
  items: Choice[];
  choose: (id: string) => void;
  close: () => void;
  note?: string;
  commands?: (id: string) => Record<string, () => void>;
  wide?: boolean;
  mode?: "terminal" | "subagent" | "shell";
}) {
  return (
    <PickerPanel width={props.wide ? 88 : 60}>
      <List key={props.title} {...props} />
    </PickerPanel>
  );
}
function List({ title, items, choose, close, note, commands, mode }: Parameters<typeof Choices>[0]) {
  const [query, set] = useState(""),
    [index, select] = useState<number | null>(null),
    t = useTokens(),
    vp = useViewport();
  const rows = query ? fuzzyFilter(query, items, (o) => o.label + " " + (o.detail ?? "")).map((r) => r.item) : items;
  const i = Math.max(0, Math.min(index ?? rows.findIndex((o) => o.current), rows.length - 1)),
    limit = Math.max(2, Math.floor(vp.rows / 2) - 6);
  let group = "",
    activeRow = 0;
  const display: (string | { o: Choice; j: number })[] = [];
  rows.forEach((o, j) => {
    if (!query && o.group && group !== o.group) {
      if (group) display.push("");
      group = o.group;
      display.push(group);
    }
    if (j === i) activeRow = display.length;
    display.push({ o, j });
  });
  const start = Math.max(0, Math.min(display.length - limit, activeRow - Math.floor(limit / 2)));
  useCommandKeys(
    {
      "dialog.select.prev": () => select((i + rows.length - 1) % Math.max(1, rows.length)),
      "dialog.select.next": () => select((i + 1) % Math.max(1, rows.length)),
      "dialog.select.home": () => select(0),
      "dialog.select.end": () => select(rows.length - 1),
      "dialog.select.page_up": () => select(Math.max(0, i - limit)),
      "dialog.select.page_down": () => select(Math.min(rows.length - 1, i + limit)),
      "dialog.select.submit": () => {
        if (rows[i]) choose(rows[i]!.id);
      },
      ...commands?.(rows[i]?.id ?? ""),
      ...(mode
        ? {
            [`composer.${mode}.up`]: () => select((i + rows.length - 1) % Math.max(1, rows.length)),
            [`composer.${mode}.down`]: () => select((i + 1) % Math.max(1, rows.length)),
            [`composer.${mode}.select`]: () => {
              if (rows[i]) choose(rows[i]!.id);
            },
          }
        : {}),
    },
    30,
  );
  return (
    <Box flexDirection="column" paddingBottom={note ? 1 : 2} gap={1}>
      <Box flexDirection="row" justifyContent="space-between" paddingX={4}>
        <Text bold>{title}</Text>
        <Text color={t.muted}>esc</Text>
      </Box>
      <Box paddingX={4}>
        <Entry
          onClose={close}
          value={query}
          onChange={(v) => {
            set(v);
            select(0);
          }}
          placeholder="Search"
        />
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {display.slice(start, start + limit).map((r, k) =>
          typeof r === "string" ? (
            <Text height={1} key={k} paddingLeft={3} bold color={t.accent}>
              {r}
            </Text>
          ) : (
            <Box
              key={r.o.id}
              height={1}
              paddingLeft={1}
              paddingRight={3}
              flexDirection="row"
              bg={i === r.j ? t.primaryBgFocused : undefined}
            >
              <Text flexGrow={1} color={i === r.j ? t.primaryTextFocused : t.text} wrap="truncate-end">
                {r.o.current ? "● " : "  "}
                <Text bold={i === r.j}>{r.o.label}</Text>
                {r.o.detail && `  ${r.o.detail}`}
              </Text>
              <Text color={i === r.j ? t.primaryTextFocused : t.muted}>{r.o.hint}</Text>
            </Box>
          ),
        )}
        {!rows.length && <Text color={t.muted}>No items available</Text>}
      </Box>
      {note && (
        <Text paddingX={4} color={t.muted} wrap="wrap">
          {note}
        </Text>
      )}
    </Box>
  );
}
import { useInput } from "@textjs/app";
function Entry({ onClose, ...props }: { onClose: () => void; value: string; onChange: (v: string) => void; placeholder: string }) {
  useInput(
    (e) => {
      if (e.key === "escape") {
        e.stopPropagation();
        onClose();
      }
    },
    { priority: 32 },
  );
  return <Input id="opencode-choice" autoFocus {...props} />;
}
export function PromptDialog({
  title,
  initial = "",
  secret,
  submit,
  close,
  note,
}: {
  title: string;
  initial?: string;
  secret?: boolean;
  submit: (value: string) => void;
  close: () => void;
  note?: string;
}) {
  return (
    <PickerPanel>
      <PromptBody key={title} {...{ title, initial, secret, submit, close, note }} />
    </PickerPanel>
  );
}
function PromptBody({ title, initial, secret, submit, close, note }: Parameters<typeof PromptDialog>[0]) {
  const t = useTokens();
  useInput(
    (e) => {
      if (e.key === "escape") {
        e.stopPropagation();
        close();
      }
    },
    { priority: 31 },
  );
  return (
    <Box paddingX={3} paddingBottom={1} flexDirection="column" gap={1}>
      <Text bold>{title}</Text>
      <Input id="opencode-dialog-field" defaultValue={initial} mask={secret ? "•" : undefined} onSubmit={submit} autoFocus />
      {note && <Text color={t.muted}>{note}</Text>}
    </Box>
  );
}
