/**
 * Unified diff parsing and a compact line differ for `<Diff>`.
 */

export type DiffLineKind = "add" | "remove" | "context";

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;

function stripPrefix(p: string): string {
  const s = p.trim().split("\t")[0] ?? "";
  if (s === "/dev/null") return s;
  return s.replace(/^[ab]\//, "");
}

/** Parse a (multi-file) unified diff. Text without hunks yields no files. */
export function parseUnifiedDiff(patch: string): DiffFile[] {
  const files: DiffFile[] = [];
  let file: DiffFile | null = null;
  let hunk: DiffHunk | null = null;
  let oldN = 0;
  let newN = 0;
  let oldLeft = 0;
  let newLeft = 0;
  const newFile = (oldPath = "", newPath = ""): DiffFile => {
    const f: DiffFile = { oldPath, newPath, hunks: [], additions: 0, deletions: 0 };
    files.push(f);
    return f;
  };
  for (const line of patch.replace(/\r\n?/g, "\n").split("\n")) {
    if (hunk !== null && (oldLeft > 0 || newLeft > 0)) {
      const f = file as DiffFile;
      if (line.startsWith("+")) {
        hunk.lines.push({ kind: "add", text: line.slice(1), oldLine: null, newLine: newN++ });
        f.additions++;
        newLeft--;
        continue;
      }
      if (line.startsWith("-")) {
        hunk.lines.push({ kind: "remove", text: line.slice(1), oldLine: oldN++, newLine: null });
        f.deletions++;
        oldLeft--;
        continue;
      }
      if (line.startsWith(" ") || line === "") {
        hunk.lines.push({ kind: "context", text: line.slice(1), oldLine: oldN++, newLine: newN++ });
        oldLeft--;
        newLeft--;
        continue;
      }
      if (line.startsWith("\\")) continue;
      hunk = null;
    }
    if (line.startsWith("diff --git ")) {
      const m = /^diff --git a\/(.*) b\/(.*)$/.exec(line);
      file = newFile(m?.[1] ?? "", m?.[2] ?? "");
      hunk = null;
      continue;
    }
    if (line.startsWith("--- ")) {
      if (file === null || file.hunks.length > 0) file = newFile();
      file.oldPath = stripPrefix(line.slice(4));
      continue;
    }
    if (line.startsWith("+++ ")) {
      if (file === null) file = newFile();
      file.newPath = stripPrefix(line.slice(4));
      continue;
    }
    const h = HUNK.exec(line);
    if (h) {
      if (file === null) file = newFile();
      oldN = Number(h[1]);
      newN = Number(h[3]);
      oldLeft = h[2] === undefined ? 1 : Number(h[2]);
      newLeft = h[4] === undefined ? 1 : Number(h[4]);
      hunk = { header: line, oldStart: oldN, newStart: newN, lines: [] };
      file.hunks.push(hunk);
    }
  }
  return files.filter((f) => f.hunks.length > 0);
}

/** Line-level diff (LCS) of two texts, grouped into hunks with `context` lines of context. */
export function diffTexts(before: string, after: string, filename = "", context = 3): DiffFile {
  const a = before.length === 0 ? [] : before.replace(/\n$/, "").split("\n");
  const b = after.length === 0 ? [] : after.replace(/\n$/, "").split("\n");
  // Trim common prefix/suffix to keep the DP small.
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const am = a.slice(pre, a.length - suf);
  const bm = b.slice(pre, b.length - suf);
  const ops: DiffLine[] = [];
  for (let i = 0; i < pre; i++) ops.push({ kind: "context", text: a[i] as string, oldLine: i + 1, newLine: i + 1 });
  const n = am.length;
  const m = bm.length;
  if (n * m > 4_000_000) {
    am.forEach((t, i) => ops.push({ kind: "remove", text: t, oldLine: pre + i + 1, newLine: null }));
    bm.forEach((t, j) => ops.push({ kind: "add", text: t, oldLine: null, newLine: pre + j + 1 }));
  } else {
    const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      const row = dp[i] as Uint32Array;
      const below = dp[i + 1] as Uint32Array;
      for (let j = m - 1; j >= 0; j--) row[j] = am[i] === bm[j] ? (below[j + 1] as number) + 1 : Math.max(below[j] as number, row[j + 1] as number);
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && am[i] === bm[j]) {
        ops.push({ kind: "context", text: am[i] as string, oldLine: pre + i + 1, newLine: pre + j + 1 });
        i++;
        j++;
      } else if (j < m && (i >= n || ((dp[i] as Uint32Array)[j + 1] as number) >= ((dp[i + 1] as Uint32Array)[j] as number))) {
        ops.push({ kind: "add", text: bm[j] as string, oldLine: null, newLine: pre + j + 1 });
        j++;
      } else {
        ops.push({ kind: "remove", text: am[i] as string, oldLine: pre + i + 1, newLine: null });
        i++;
      }
    }
  }
  for (let k = 0; k < suf; k++) {
    const oi = a.length - suf + k;
    const ni = b.length - suf + k;
    ops.push({ kind: "context", text: a[oi] as string, oldLine: oi + 1, newLine: ni + 1 });
  }
  // Order removals before additions within each change run (conventional unified diff).
  for (let s = 0; s < ops.length; ) {
    if (ops[s]?.kind === "context") {
      s++;
      continue;
    }
    let e = s;
    while (e < ops.length && ops[e]?.kind !== "context") e++;
    const run = ops.slice(s, e);
    const sorted = [...run.filter((o) => o.kind === "remove"), ...run.filter((o) => o.kind === "add")];
    ops.splice(s, e - s, ...sorted);
    s = e;
  }
  const hunks: DiffHunk[] = [];
  const changed = ops.map((o) => o.kind !== "context");
  let k = 0;
  while (k < ops.length) {
    if (!changed[k]) {
      k++;
      continue;
    }
    let start = Math.max(0, k - context);
    let end = k;
    while (end < ops.length) {
      if (changed[end]) {
        end++;
        continue;
      }
      let next = end;
      while (next < ops.length && !changed[next]) next++;
      if (next < ops.length && next - end <= context * 2) end = next;
      else break;
    }
    end = Math.min(ops.length, end + context);
    if (hunks.length > 0) {
      const prev = hunks[hunks.length - 1] as DiffHunk & { _end?: number };
      if (prev._end !== undefined && start < prev._end) start = prev._end;
    }
    const lines = ops.slice(start, end);
    const first = lines[0] as DiffLine;
    const oldStart = first.oldLine ?? lines.find((l) => l.oldLine !== null)?.oldLine ?? 0;
    const newStart = first.newLine ?? lines.find((l) => l.newLine !== null)?.newLine ?? 0;
    const oldCount = lines.filter((l) => l.kind !== "add").length;
    const newCount = lines.filter((l) => l.kind !== "remove").length;
    const hk: DiffHunk & { _end?: number } = { header: `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`, oldStart, newStart, lines };
    Object.defineProperty(hk, "_end", { value: end, enumerable: false });
    hunks.push(hk);
    k = end;
  }
  return {
    oldPath: filename,
    newPath: filename,
    hunks,
    additions: ops.filter((o) => o.kind === "add").length,
    deletions: ops.filter((o) => o.kind === "remove").length,
  };
}
