import { parseUnifiedDiff, type DiffLine } from "@textjs/app";
import type { FilePatch } from "./types";
import { layoutGraphemeLines, segmentGraphemes } from "@textjs/core";
export type ReviewRow = { file: number; header?: boolean; hunk?: string; left?: DiffLine; right?: DiffLine };
/** Pair change runs, not line numbers: insertions mustn't shift every subsequent context line. */
export function reviewRows(files: FilePatch[], reviewed: Set<string>, one: number | null, split: boolean) {
  const rows: ReviewRow[] = [];
  files.forEach((f, file) => {
    if (one !== null && file !== one) return;
    rows.push({ file, header: true }, { file });
    if (reviewed.has(f.file)) return;
    let first = true;
    for (const h of parseUnifiedDiff(f.patch).flatMap((p) => p.hunks)) {
      if (first) first = false;
      else rows.push({ file, hunk: h.header });
      let del: DiffLine[] = [],
        add: DiffLine[] = [];
      const flush = () => {
        for (let i = 0; i < Math.max(del.length, add.length); i++) rows.push({ file, left: del[i], right: add[i] });
        del = [];
        add = [];
      };
      for (const l of h.lines) {
        if (!split) rows.push({ file, left: l });
        else if (l.kind === "context") {
          flush();
          rows.push({ file, left: l, right: l });
        } else (l.kind === "add" ? add : del).push(l);
      }
      flush();
    }
  });
  return rows;
}
export function wrapRows(rows: ReviewRow[], width: number) {
  const column = (line?: DiffLine) => {
    if (!line) return [];
    const gs = segmentGraphemes(line.text);
    const lines = layoutGraphemeLines(gs, Math.max(1, width), "wrap");
    return lines.map((l, i) => ({
      ...line,
      oldLine: i ? null : line.oldLine,
      newLine: i ? null : line.newLine,
      text: gs
        .slice(l.start, l.end)
        .map((g) => g.grapheme)
        .join(""),
    }));
  };
  return rows.flatMap((r) => {
    if (!r.left && !r.right) return [r];
    const left = column(r.left),
      right = column(r.right);
    return Array.from({ length: Math.max(1, left.length, right.length) }, (_, i) => ({ ...r, left: left[i], right: right[i] }));
  });
}
