import { useEffect, useMemo, useState } from "react";
import { Box, Text, fuzzyFilter, useInput } from "@textjs/app";
import { slashCommands, type SlashCommand } from "../lib/commands";
import { lineRange, type trigger } from "../lib/mentions";
import { useTokens } from "../lib/native-theme";
import { useStore, useStoreState } from "../lib/store";
import type { FileOption } from "../lib/types";

type Option = {
  label: string;
  description?: string;
  hint?: string;
  command?: SlashCommand;
  file?: FileOption;
  kind?: "agent" | "skill";
};
export function Autocomplete({
  token,
  directory,
  session,
  space,
  onSelect,
  onHide,
}: {
  token: NonNullable<ReturnType<typeof trigger>>;
  directory?: string;
  session: boolean;
  space: number;
  onSelect: (option: Option, drill: boolean) => void;
  onHide: (clear: boolean) => void;
}) {
  const t = useTokens(),
    store = useStore(),
    api = store.api;
  const commands = useStoreState((s) => s.commands),
    agents = useStoreState((s) => s.mentionAgents),
    skills = useStoreState((s) => s.skills);
  const [index, move] = useState(0),
    [paths, setPaths] = useState<FileOption[]>(),
    [failed, fail] = useState(false);
  const range = lineRange(token.query),
    slash = token.mode === "slash";
  useEffect(() => {
    if (slash || !api?.findFiles) return;
    let active = true;
    const timer = setTimeout(
      () =>
        void api.findFiles!(range.base, directory).then(
          (list) => {
            if (active) setPaths(list);
          },
          () => {
            if (active) fail(true);
          },
        ),
      40,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, range.base, directory, slash]);
  const catalog = useMemo(() => slashCommands(commands, session, !!api?.share, api?.kind === "v1"), [commands, session, api]);
  const options = useMemo(() => {
    const local: Option[] = slash
      ? catalog.map((command) => ({ label: `/${command.name}`, description: command.description, hint: command.key, command }))
      : [
          ...skills.map((a) => ({ label: `@${a.id}`, kind: "skill" as const, description: a.description })),
          ...agents.map((a) => ({ label: `@${a.id}`, kind: "agent" as const })),
        ];
    const q = slash ? token.query : range.base;
    const ranked = q
      ? fuzzyFilter(q, local, (o) => `${o.label}${slash ? " " + (o.description ?? "") : ""}`)
          .map((r) => r.item)
          .sort(
            (a, b) =>
              Number(b.label.slice(1) === q) - Number(a.label.slice(1) === q) ||
              Number(b.label.slice(1).startsWith(q)) - Number(a.label.slice(1).startsWith(q)),
          )
      : local;
    const files = (paths ?? []).map((file) => {
      if (!range.start || file.directory) return { label: file.path, file };
      const url = new URL(file.uri);
      url.searchParams.set("start", range.start);
      if (range.end) url.searchParams.set("end", range.end);
      const label = file.path + "#" + range.start + (range.end ? "-" + range.end : "");
      return { label, file: { ...file, uri: url.href } };
    });
    const list: Option[] = [...ranked, ...files];
    return q ? list.slice(0, 10) : list;
  }, [slash, catalog, skills, agents, token.query, range.base, range.start, range.end, paths]);
  const height = Math.min(10, Math.max(1, space), options.length || 1),
    selected = Math.min(index, Math.max(0, options.length - 1));
  const start = Math.max(0, selected - height + 1);
  useInput(
    (e) => {
      if (e.key === "escape" || (e.ctrl && e.key === "c")) onHide(e.ctrl && slash);
      else if (["up", "down"].includes(e.key) || (e.ctrl && ["n", "p"].includes(e.key)))
        move((selected + (["up", "p"].includes(e.key) ? -1 : 1) + options.length) % Math.max(1, options.length));
      else if ((e.key === "return" || e.key === "tab") && !e.shift && !e.ctrl && !e.meta && !e.alt) {
        const item = options[selected];
        if (item) onSelect(item, e.key === "tab" && !!item.file?.directory);
      } else return;
      e.stopPropagation();
    },
    { priority: 25 },
  );
  const width = slash ? Math.max(0, ...catalog.map((c) => c.name.length)) + 3 : undefined;
  return (
    <Box
      position="absolute"
      top={-height}
      width="100%"
      height={height}
      zIndex={100}
      flexDirection="column"
      bg={t.high}
      border="heavy"
      borderTop={false}
      borderBottom={false}
      borderColor={t.border}
    >
      {!options.length && (
        <Text paddingX={1} color={failed ? t.error : t.muted} wrap="truncate-end">
          {slash
            ? "No matching commands"
            : failed
              ? "Could not search files. Keep typing to try again."
              : !paths && api?.findFiles
                ? "Searching…"
                : "No matching files, agents, or references"}
        </Text>
      )}
      {options.slice(start, start + height).map((o, i) => {
        const hi = start + i === selected,
          fg = hi ? t.primaryTextFocused : t.text,
          muted = hi ? fg : t.muted;
        return (
          <Box key={`${o.kind ?? ""}:${o.label}`} height={1} paddingX={1} flexDirection="row" bg={hi ? t.primaryBgFocused : t.high}>
            <Text width={width} color={fg} wrap="truncate-middle">
              {o.label}
            </Text>
            <Text flexGrow={1} flexShrink={1} color={muted} wrap="truncate-end">
              {o.description && " " + o.description.replace(/\s+/gu, " ").trim()}
            </Text>
            <Text color={muted} flexShrink={0}>
              {o.hint ?? o.kind}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
