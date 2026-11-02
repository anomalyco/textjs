import { useEffect, useState } from "react";
import { Box, Text, useViewport } from "@textjs/app";
import { binding, defaults, useCommandKeys, type Commands } from "../lib/bindings";
import { useStoreState } from "../lib/store";
import { useTokens } from "../lib/native-theme";

export function Shortcuts({ commands }: { commands: Commands }) {
  const [shown, show] = useState(false),
    [wide, layout] = useState(false),
    [preview, enable] = useState(true),
    [pending, setPending] = useState<string[]>([]),
    [group, tab] = useState(0),
    [offset, scroll] = useState(0);
  const cfg = useStoreState((s) => s.keys),
    vp = useViewport(),
    t = useTokens(),
    limit = Math.max(2, Math.min(12, Math.floor(vp.rows / 2) - 3));
  const guide: Commands = {
    "which-key.toggle": () => show((v) => !v),
    "which-key.layout.toggle": () => layout((v) => !v),
    "which-key.pending.toggle": () => enable((v) => !v),
  };
  const ids =
    pending.length && preview
      ? [...new Set(pending)]
      : [
          ...Object.keys(commands).filter((id) => commands[id]),
          ...Object.keys(defaults).filter((id) => id.startsWith("which-key.") && (shown || !!guide[id])),
        ].filter((id) => binding(id, cfg));
  const groups = [...new Set(ids.map((id) => defaults[id]?.[2] ?? "Other"))];
  const current = groups[group % groups.length];
  const rows = pending.length && preview ? ids : ids.filter((id) => defaults[id]?.[2] === current);
  const max = Math.max(0, rows.length - limit * (wide ? 2 : 1)),
    start = Math.min(max, offset);
  const groupMove = (d: number) => {
    tab((v) => (v + d + groups.length) % groups.length);
    scroll(0);
  };
  const by = (n: number) => scroll((v) => Math.max(0, Math.min(max, v + n)));
  if (shown)
    Object.assign(guide, {
      "which-key.group.next": () => groupMove(1),
      "which-key.group.previous": () => groupMove(-1),
      "which-key.scroll.up": () => by(-1),
      "which-key.scroll.down": () => by(1),
      "which-key.page.up": () => by(-limit),
      "which-key.page.down": () => by(limit),
      "which-key.home": () => scroll(0),
      "which-key.end": () => scroll(max),
    });
  useCommandKeys({ ...commands, ...guide }, 20, setPending);
  useEffect(() => {
    if (!shown) scroll(0);
  }, [shown]);
  if (!shown && (!pending.length || !preview)) return null;
  const visible = rows.slice(start, start + limit * (wide ? 2 : 1));
  return (
    <Box
      position="absolute"
      bottom={0}
      right={0}
      zIndex={150}
      width={Math.min(vp.cols, wide ? 100 : 54)}
      flexDirection="column"
      paddingX={2}
      paddingY={1}
      bg={t.high}
    >
      <Text bold color={t.accent}>
        {pending.length && preview ? `Leader · ${binding("leader", cfg)}` : `Which-key · ${current}`}
      </Text>
      {Array.from({ length: Math.min(visible.length, limit) }, (_, i) => (
        <Box key={i} height={1} flexDirection="row">
          {[visible[i], wide ? visible[limit + i] : null].map(
            (id) =>
              id && (
                <Text key={id} flexBasis={0} flexGrow={1} wrap="truncate-end">
                  <Text color={t.accent}>{binding(id, cfg).split(",")[0]} </Text>
                  {defaults[id]?.[1]}
                </Text>
              ),
          )}
        </Box>
      ))}
      {shown && <Text color={t.muted}>{`${binding("which-key.toggle", cfg)} close`}</Text>}
    </Box>
  );
}
