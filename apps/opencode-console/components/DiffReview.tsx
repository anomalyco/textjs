import { useState, useEffect, useMemo } from "react";
import { Box, Text, tokenize, useFocus, useViewport, useWheel, type DiffLine } from "@textjs/app";
import { SyntaxRun } from "./TranscriptCode";
import { tint } from "./Logo";
import { useStore, useStoreState } from "../lib/store";
import { reviewRows, wrapRows } from "../lib/review";
import { binding, defaults, useCommandKeys, type Commands } from "../lib/bindings";
import type { DiffSource, FilePatch } from "../lib/types";
import { useTokens } from "../lib/native-theme";
import { InputTrap } from "./PickerPanel";
import { Choices } from "./Choices";
const sources = {
  branch: ["All", "Branch + local changes"],
  committed: ["Committed", "Branch commits only"],
  working: ["Uncommitted", "Local changes only"],
  turn: ["Last turn", "Latest session turn"],
} as const;
export function DiffReview(props: { id?: string; close: () => void }) {
  return (
    <InputTrap>
      <Body {...props} />
    </InputTrap>
  );
}
function Body({ id, close }: { id?: string; close: () => void }) {
  useFocus({ id: "opencode-diff", autoFocus: true });
  const store = useStore(),
    api = store.api,
    t = useTokens(),
    vp = useViewport();
  const keys = useStoreState((s) => s.keys),
    dir = useStoreState((s) => s.sessions.find((a) => a.id === id)?.directory ?? s.connection.directory);
  const [source, setSource] = useState<DiffSource>(store.review.source === "turn" && !id ? "branch" : store.review.source),
    [base, setBase] = useState(store.review.bases[dir ?? ""] ?? ""),
    [detail, describe] = useState("");
  const [files, load] = useState<FilePatch[]>([]),
    [status, report] = useState("Loading diff…"),
    [branches, listBranches] = useState<string[]>([]),
    [modal, dialog] = useState(""),
    [sel, select] = useState(0),
    [offset, scroll] = useState(0),
    [hunk, chooseHunk] = useState(-1);
  const [tree, treeOn] = useState(true),
    [one, single] = useState(false),
    [pair, columns] = useState(true),
    [full, expand] = useState(false),
    [reviewed, mark] = useState(new Set<string>());
  const busy = useStoreState((s) => source === "turn" && !!id && s.busy[id]);
  useEffect(() => {
    let live = true;
    report("Loading diff…");
    load([]);
    select(0);
    scroll(0);
    chooseHunk(-1);
    mark(new Set());
    describe("");
    void (async () => {
      if (!api?.diff) throw Error("Diff unavailable on this server");
      const against =
        source === "branch" || source === "committed" ? (base ? { name: base, ref: base } : await api.diffBase?.(dir)) : null;
      if (!live) return;
      if (source === "committed" && !against)
        throw Error("Committed comparison unavailable without base metadata. Choose a base branch from Diff source.");
      const diff = await api.diff(id, dir, source, against?.ref);
      if (!live) return;
      load(diff.slice().sort((a, b) => a.file.localeCompare(b.file)));
      report(diff.length ? "" : "No changes to show");
      describe(source === "turn" ? "" : source === "working" ? "vs HEAD" : against ? `vs ${against.name}` : "Base not reported");
    })().catch((e) => {
      if (live) report(String(e instanceof Error ? e.message : e));
    });
    return () => {
      live = false;
    };
  }, [api, dir, id, source, base, busy]);
  useEffect(() => {
    let live = true;
    if (modal === "base")
      void api?.branches?.(dir).then(
        (v) => {
          if (live) listBranches(v);
        },
        () => {},
      );
    return () => {
      live = false;
    };
  }, [api, modal, dir]);
  const docked = !!id && !full && vp.cols >= 108,
    width = docked ? Math.floor(vp.cols / 2) : vp.cols,
    showTree = tree && !docked && width >= 88 && files.length > 0,
    treeWidth = Math.max(30, Math.min(40, Math.floor(width / 4))),
    split = pair && width - (showTree ? treeWidth : 0) - 4 >= 100;
  const noWrap = useStoreState((s) => s.ui.noWrap),
    lineWidth = Math.floor((width - (showTree ? treeWidth : 0) - (docked ? 0 : 4)) / (split ? 2 : 1)) - 7;
  const rows = useMemo(() => {
    const result = reviewRows(files, reviewed, one ? sel : null, split);
    return noWrap ? result : wrapRows(result, lineWidth);
  }, [files, reviewed, one, sel, split, lineWidth, noWrap]);
  const height = Math.max(1, vp.rows - (id ? 1 : 0) - 3),
    top = Math.min(offset, Math.max(0, rows.length - height));
  const by = (n: number) => {
    const next = Math.min(Math.max(0, rows.length - height), Math.max(0, top + n));
    scroll(next);
    if (!one) select(rows[next]?.file ?? 0);
    chooseHunk(-1);
  };
  const go = (n: number) => {
    const i = Math.min(Math.max(0, files.length - 1), Math.max(0, n));
    select(i);
    scroll(
      one
        ? 0
        : Math.max(
            0,
            rows.findIndex((r) => r.file === i),
          ),
    );
    chooseHunk(-1);
  };
  const jump = (d: number) => {
    const i =
      d > 0
        ? rows.findIndex((r, i) => (r.header || !!r.hunk) && i > (hunk >= 0 ? hunk : top))
        : rows.reduce((a, r, i) => ((r.header || r.hunk) && i < (hunk >= 0 ? hunk : top) ? i : a), -1);
    if (i >= 0) {
      chooseHunk(i);
      scroll(i);
      select(rows[i]!.file);
    }
  };
  const actions: Commands = {
    "diff.close": close,
    "diff.down": () => by(1),
    "diff.up": () => by(-1),
    "diff.page.up": () => by(-height),
    "diff.page.down": () => by(height),
    "diff.half_page.up": () => by(-Math.ceil(height / 2)),
    "diff.half_page.down": () => by(Math.ceil(height / 2)),
    "diff.first": () => by(-rows.length),
    "diff.last": () => by(rows.length),
    "diff.next_file": () => go(sel + 1),
    "diff.previous_file": () => go(sel - 1),
    "diff.next_hunk": () => jump(1),
    "diff.previous_hunk": () => jump(-1),
    "diff.toggle_view": () => columns(!pair),
    "diff.single_patch": () => {
      scroll(0);
      single(!one);
    },
    "diff.toggle_file_tree": () => treeOn(!tree),
    "diff.toggle_fullscreen": id ? () => expand(!full) : undefined,
    "diff.switch_source": () => dialog("source"),
    "diff.help": () => dialog("help"),
    "diff.mark_reviewed": () => {
      const name = files[sel]?.file;
      if (!name) return;
      const next = new Set(reviewed);
      if (next.has(name)) next.delete(name);
      else {
        next.add(name);
        if (one) go(sel + 1);
      }
      mark(next);
    },
  };
  useCommandKeys(actions, 28, undefined, !modal);
  useWheel(
    (e) => {
      by(Math.trunc(e.rows));
      e.stopPropagation();
    },
    { isActive: !modal, priority: 28 },
  );
  const treeRows = useMemo(() => fileTree(files, sel, reviewed), [files, sel, reviewed]);
  const header = (
    <Box height={1} flexDirection="row" justifyContent="space-between">
      <Text bold color={t.secondaryText}>
        {sources[source][0]}
        <Text bold={false} color={t.muted}>
          {detail && ` · ${detail}`}
        </Text>
      </Text>
      <Text color={t.muted}>
        {reviewed.size}/{files.length}
      </Text>
    </Box>
  );
  return (
    <>
      <Box
        position="absolute"
        right={0}
        top={id ? 1 : 0}
        bottom={0}
        width={width}
        bg={docked ? t.raised : t.bg}
        zIndex={80}
        flexDirection="column"
      >
        {!showTree && (
          <Box paddingX={2} flexDirection="column">
            {header}
          </Box>
        )}
        <Box flexDirection="row" flexGrow={1} minHeight={0}>
          {showTree && (
            <Box width={treeWidth} bg={t.raised} paddingX={2} paddingTop={1} paddingBottom={2} flexDirection="column">
              {header}
              <Box height={1} />
              {treeRows
                .slice(Math.max(0, treeRows.findIndex((r) => r.current) - height + 5))
                .slice(0, height)
                .map((r) => (
                  <Box key={r.path} height={1} flexDirection="row" justifyContent="space-between">
                    <Text color={r.current ? t.text : t.muted} wrap="truncate-end">
                      <Text color={tint(t.muted, t.raised, 0.45)}>{r.text.slice(0, r.text.lastIndexOf(" ") + 1)}</Text>
                      {r.text.slice(r.text.lastIndexOf(" ") + 1)}
                    </Text>
                    <Text color={t.muted}>{r.status}</Text>
                  </Box>
                ))}
              <Box flexGrow={1} />
              <Text color={t.muted}>
                <Text color={t.text}>?</Text> help
              </Text>
            </Box>
          )}
          <Box flexGrow={1} minWidth={0} paddingX={docked ? 0 : 2} flexDirection="column">
            {!!files.length && <Box height={1} bg={t.diffContextBg} />}
            {status ? (
              <Text paddingX={2} color={t.muted}>
                {status}
              </Text>
            ) : (
              rows.slice(top, top + height).map((r, i) =>
                r.header ? (
                  <Box key={i} height={1} bg={t.diffContextBg} paddingX={1} flexDirection="row" justifyContent="space-between">
                    <Text wrap="truncate-start">{files[r.file]!.file}</Text>
                    <Text color={t.muted}>
                      {reviewed.has(files[r.file]!.file) ? "✓ " : ""}
                      <Text color={t.diffAdded}>+{files[r.file]!.additions}</Text>{" "}
                      <Text color={t.diffRemoved}>-{files[r.file]!.deletions}</Text>
                    </Text>
                  </Box>
                ) : r.hunk ? (
                  <Text key={i} height={1} color={t.diffHunk} wrap="truncate-end">
                    {r.hunk}
                  </Text>
                ) : (
                  <Box key={i} height={1} flexDirection="row">
                    <Line l={r.left} side={split ? "old" : "unified"} path={files[r.file]!.file} />
                    {split && <Line l={r.right} side="new" path={files[r.file]!.file} />}
                  </Box>
                ),
              )
            )}
          </Box>
        </Box>
        {!showTree && (
          <Text color={t.muted} paddingX={2} height={1}>
            ? help d source esc close
          </Text>
        )}
      </Box>
      {modal && (
        <Choices
          key={modal}
          title={modal === "help" ? "Diff shortcuts" : modal === "base" ? "Base branch" : "Diff source"}
          close={() => dialog("")}
          items={
            modal === "help"
              ? Object.keys(actions)
                  .filter((k) => actions[k])
                  .map((k) => ({ id: k, label: defaults[k]![1]!, hint: binding(k, keys) }))
              : modal === "base"
                ? branches.map((b) => ({ id: b, label: b, current: b === base }))
                : [
                    ...Object.entries(sources)
                      .filter(([s]) => s !== "turn" || id)
                      .map(([s, [label, description]]) => ({ id: s, label, detail: description, current: s === source })),
                    { id: "base", label: "Base", detail: base || "Choose…" },
                  ]
          }
          choose={(choice) => {
            if (modal === "base") {
              setBase(choice);
              store.review.bases[dir ?? ""] = choice;
              setSource("branch");
              store.review.source = "branch";
            } else if (modal === "source") {
              if (choice === "base") {
                dialog("base");
                return;
              }
              setSource(choice as DiffSource);
              store.review.source = choice as DiffSource;
            }
            dialog("");
          }}
        />
      )}
    </>
  );
}
function Line({ l, side, path }: { l?: DiffLine; side: "old" | "new" | "unified"; path: string }) {
  const t = useTokens();
  const add = l?.kind === "add",
    del = l?.kind === "remove",
    language = path.split(".").at(-1),
    syntax = language && /^(ts|tsx|js|jsx|py|rs|go|sh|json|css)$/.test(language) ? language : undefined;
  return (
    <Box
      flexGrow={1}
      flexBasis={0}
      minWidth={0}
      bg={add ? t.diffAddedBg : del ? t.diffRemovedBg : t.diffContextBg}
      flexDirection="row"
    >
      {l && (
        <>
          <Text color={t.diffLineNumber} bg={add ? t.diffAddedLineNumberBg : del ? t.diffRemovedLineNumberBg : t.diffContextBg}>
            {` ${side === "old" ? (l.oldLine ?? "") : (l.newLine ?? l.oldLine ?? "")} `}
            <Text color={add ? t.diffAddedSign : del ? t.diffRemovedSign : t.diffContext}>{add ? "+ " : del ? "- " : "  "}</Text>
          </Text>
          <Text wrap="truncate-end" flexShrink={1}>
            {syntax ? <SyntaxRun language={syntax} pieces={tokenize(l.text, syntax)[0] ?? []} /> : l.text}
          </Text>
        </>
      )}
    </Box>
  );
}
function fileTree(files: FilePatch[], sel: number, reviewed: Set<string>) {
  const nodes = new Map<string, { path: string; text: string; current: boolean; status: string }>();
  files.forEach((f, i) => {
    const bits = f.file.split("/");
    bits.forEach((b, j) => {
      const path = bits.slice(0, j + 1).join("/");
      if (!nodes.has(path))
        nodes.set(path, {
          path,
          text: "│ ".repeat(j) + (j < bits.length - 1 ? "▾ " : "≡ ") + b,
          status:
            j < bits.length - 1 ? "" : reviewed.has(f.file) ? "✓" : f.status === "added" ? "A" : f.status === "deleted" ? "D" : "M",
          current: i === sel && j === bits.length - 1,
        });
    });
  });
  return [...nodes.values()];
}
