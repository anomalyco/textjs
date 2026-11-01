import { memo, useMemo, type ReactNode } from "react";
import { Box, Text, tokenize, parseUnifiedDiff, diffTexts, type DiffInput } from "@textjs/app";
import { useTokens } from "../lib/native-theme";
import { SyntaxRun } from "./TranscriptCode";

/** OpenTUI's unified patch rows use ONE line number; source headers aren't
 * repeated inside the block (the block title already contains the filename). */
export const PatchLines = memo(function PatchLines({
  patch,
  file,
  limit = 60,
}: {
  patch: string | DiffInput;
  file: string;
  limit?: number;
}) {
  const t = useTokens();
  const hunks = useMemo(
    () => (typeof patch === "string" ? parseUnifiedDiff(patch) : [diffTexts(patch.before, patch.after, file, 3)]).flatMap((f) => f.hunks),
    [patch, file],
  );
  const lines = hunks.flatMap((h) => h.lines),
    digits = String(Math.max(1, ...lines.slice(0, limit).map((l) => l.newLine ?? l.oldLine ?? 0))).length;
  const rows: ReactNode[] = [];
  for (const h of hunks) {
    if (rows.length && rows.length < limit)
      rows.push(
        <Text key={`h${rows.length}`} color={t.diffHunk}>
          {h.header}
        </Text>,
      );
    for (const l of h.lines) {
      if (rows.length >= limit) break;
      const add = l.kind === "add",
        del = l.kind === "remove";
      const bg = add ? t.diffAddedBg : del ? t.diffRemovedBg : t.diffContextBg;
      const gutter = add ? t.diffAddedLineNumberBg : del ? t.diffRemovedLineNumberBg : t.diffContextBg;
      const language = file.split(".").pop(),
        pieces = tokenize(l.text, language)[0] ?? [];
      rows.push(
        <Box key={rows.length} flexDirection="row" bg={bg} flexShrink={0}>
          <Text bg={gutter} color={t.diffLineNumber} flexShrink={0}>
            {` ${String(l.newLine ?? l.oldLine ?? "").padStart(digits)} `}
            <Text color={add ? t.diffAddedSign : t.diffRemovedSign}>{add ? "+ " : del ? "- " : "  "}</Text>
          </Text>
          <Text flexShrink={1} color={t.text}>
            <SyntaxRun pieces={pieces} language={language} />
          </Text>
        </Box>,
      );
    }
  }
  return (
    <Box flexDirection="column" flexShrink={0} paddingLeft={1}>
      {rows}
      {lines.length > limit && <Text color={t.muted}>…</Text>}
    </Box>
  );
});
