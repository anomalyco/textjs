import { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "@textjs/app";
import fuzzysort from "fuzzysort";
import { useCommandKeys } from "../lib/bindings";
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
  reference?: boolean;
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
    skills = useStoreState((s) => s.skills),
    refs = useStoreState((s) => s.references);
  const [index, move] = useState(0),
    [paths, setPaths] = useState<FileOption[]>(),
    [failed, fail] = useState(false);
  const range = lineRange(token.query),
    slash = token.mode === "slash";
  useEffect(() => {
    if (slash || !api?.findFiles || refs.some((r) => r.name === range.base.split("/")[0])) return;
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
  }, [api, range.base, directory, slash, refs]);
  const catalog = useMemo(() => slashCommands(commands, session, !!api?.share, api?.kind === "v1"), [commands, session, api]);
  const options = useMemo(() => {
    const local: Option[] = slash
      ? catalog.map((command) => ({ label: `/${command.name}`, description: command.description, command }))
      : [
          ...skills.map((a) => ({ label: `@${a.id}`, kind: "skill" as const, description: a.description })),
          ...refs.map((r) => ({ label: `@${r.name}`, file: r.file, reference: true, hint: "reference", description: r.description })),
          ...agents.map((a) => ({ label: `@${a.id}`, kind: "agent" as const })),
        ];
    const q = slash ? token.query : range.base;
    const alias = !slash && local.find((o) => o.reference && o.label.slice(1) === q.split("/")[0]);
    if (alias) return [alias];
    const ranked = q
      ? fuzzysort
          .go(q, local, {
            keys: [(o) => o.label, ...(slash ? ["description"] : []), () => ""],
            limit: 10,
            threshold: slash ? 0 : 0.5,
            scoreFn: (r) => r.score * (r[0]?.target.startsWith((slash ? "/" : "@") + q) ? 2 : 1),
          })
          .map((r) => r.obj)
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
  }, [slash, catalog, skills, agents, refs, token.query, range.base, range.start, range.end, paths]);
  const height = Math.min(10, Math.max(1, space), options.length || 1),
    selected = Math.min(index, Math.max(0, options.length - 1));
  const start = Math.max(0, selected - height + 1);
  useInput(
    (e) => {
      if (e.ctrl && e.key === "c") onHide(slash);
      else return;
      e.stopPropagation();
    },
    { priority: 25 },
  );
  const choose = (tab: boolean) => {
    const o = options[selected];
    if (o) onSelect(o, tab && !!o.file?.directory && !o.reference);
  };
  useCommandKeys(
    {
      "prompt.autocomplete.hide": () => onHide(false),
      "prompt.autocomplete.select": () => choose(false),
      "prompt.autocomplete.complete": () => choose(true),
      "prompt.autocomplete.prev": () => move((selected + options.length - 1) % Math.max(1, options.length)),
      "prompt.autocomplete.next": () => move((selected + 1) % Math.max(1, options.length)),
    },
    25,
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
      border="heavy"
      borderTop={false}
      borderBottom={false}
      borderColor={t.border}
    >
      {!options.length && (
        <Text paddingX={1} bg={t.high} color={failed ? t.error : t.muted} wrap="truncate-end">
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
