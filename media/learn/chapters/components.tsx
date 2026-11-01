/**
 * Chapter 7 · Table, List & Charts. Facts come from the course itself (apps/web/src/learn): titles, summaries, code
 * steps and quiz questions are read from course.ts and the chapter markdown, never retyped. Component frames are
 * real Text.js renders of the course's data (apps/web/src/learn/apps/acme.tsx).
 */
import { join } from "node:path";
import { CHAPTERS, codeBlocks, getChapter } from "../lib/course";
import { REPO } from "../lib/env";
import { diffLines, lineOf, type ChapterScript } from "../lib/script";
import { renderFrame, ui } from "../lib/tui";

const { Box, Text, Table, List, Tabs, ProgressBar, LineChart, Sparkline } = ui;
const acme: typeof import("../../../apps/web/src/learn/apps/acme") = await import(join(REPO, "apps/web/src/learn/apps/acme.tsx"));
const { BUILD_TIMES, DEPLOYMENTS, Status } = acme;
type Deployment = (typeof DEPLOYMENTS)[number];

const chapter = getChapter("components")!;
const number = CHAPTERS.indexOf(chapter) + 1;
const next = CHAPTERS[number]!;
const blocks = codeBlocks(chapter);
const [table, chart] = blocks as [(typeof blocks)[number], (typeof blocks)[number]];
const quiz = chapter.quiz;
for (const s of ["List", "Tree", "Tabs", "Select", "Input", "Modal", "Toaster", "CommandPalette", "ProgressBar", "LineChart"]) {
  if (!chapter.markdown.includes(`<${s}>`)) throw new Error(`Lesson changed (${s}): review the rest scene`);
}

const tableLines = diffLines(table.source, "tsx");
const chartLines = diffLines(chart.source, "tsx");

// Frames, rendered by Text.js itself.
const rows = DEPLOYMENTS.slice(0, 4);
const tableFrame = await renderFrame(
  <Table<Deployment>
    columns={[
      { key: "status", header: "Status", width: 11, render: (d) => <Status status={d.status} /> },
      { key: "project", header: "Project" },
    ]}
    rows={rows}
    getRowKey={(d) => d.id}
    focused
    height={4}
  />,
  { cols: 24, rows: 6 },
);
const listFrame = await renderFrame(<List<Deployment> items={DEPLOYMENTS.slice(0, 5)} getLabel={(d) => d.commit} focused height={5} />, { cols: 24, rows: 5 });
const sparkFrame = await renderFrame(<Sparkline data={BUILD_TIMES} height={3} color="accent" />, { cols: 24, rows: 3 });
const chartBox = await renderFrame(
  <Box className="flex-col" height={4}>
    <Text color="subtle">Build time, last 24 deployments</Text>
    <Sparkline data={BUILD_TIMES} height={3} color="accent" />
  </Box>,
  { cols: 32, rows: 4 },
);
const tabsFrame = await renderFrame(
  <Tabs
    tabs={[
      { id: "overview", label: "Overview" },
      { id: "logs", label: "Logs" },
      { id: "env", label: "Env" },
    ]}
    activeTab="overview"
  />,
  { cols: 24, rows: 1 },
);
const progressFrame = await renderFrame(<ProgressBar label="Build" value={0.42} />, { cols: 24, rows: 1 });
const lineFrame = await renderFrame(<LineChart data={BUILD_TIMES} height={4} />, { cols: 24, rows: 4 });

const one = (lines: Array<{ text: string }>, match: string, from = 0): [number, number] => {
  const i = lineOf(lines, match, from);
  return [i, i];
};

const live = (actions: Array<{ at: string; key?: string; click?: string }>, measure: Record<string, { in: "dt" | "site"; text?: string; selector?: string; at?: string | number }>) => ({
  server: "site" as const,
  path: "/learn/components",
  pageHeight: 420,
  devtoolsHeight: 480,
  scroll: ".learn-pad",
  scrollMargin: 84,
  storage: { "textjs:viewport": "fit" },
  actions,
  measure,
});

const script: ChapterScript = {
  slug: chapter.slug,
  pronounce: {
    Sparkline: "Spark line",
    BarChart: "Bar Chart",
    LineChart: "Line Chart",
    ProgressBar: "Progress Bar",
    CommandPalette: "Command Palette",
    SortState: "Sort State",
    TableColumn: "Table Column",
    onSelect: "on Select",
    autoFocus: "auto Focus",
  },
  scenes: [
    {
      id: "cover",
      kind: "title",
      lead: 1.3,
      tail: 1.2,
      narration: "This is Learn Text.js, chapter seven: [Table, List & Charts|Table, List and Charts].",
      props: { variant: "cover", title: chapter.title, size: 132, body: chapter.summary, chapter: { number, total: CHAPTERS.length } },
    },
    {
      id: "how",
      kind: "pipeline",
      narration:
        "Hand-rolled rows got Acme Deploys this far. The component kit does the rest. " +
        "{table}Table brings keyboard navigation and sorting. " +
        "{list}List scrolls long lists, and only paints the rows you can see. " +
        "{charts}And charts are drawn with eighth blocks and quadrant dots.",
      tail: 1.6,
      props: {
        eyebrow: "The component kit",
        nodes: [
          { title: "Table", sub: "Keyboard and sorting", at: "table", content: { type: "frame", frame: tableFrame, size: 17 } },
          { title: "List", sub: "Virtualized scrolling", at: "list", content: { type: "frame", frame: listFrame, size: 17 } },
          { title: "Charts", sub: "Eighth blocks and quadrant dots", at: "charts", content: { type: "frame", frame: sparkFrame, size: 17 } },
        ],
      },
    },
    {
      id: "part-table",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "First, a sortable table.",
      props: { variant: "section", eyebrow: "Part 1 of 2", title: "A sortable table" },
    },
    {
      id: "columns",
      kind: "editor",
      narration:
        "{imports}Import Table, along with the SortState and TableColumn types. " +
        "{status}Each column has a key and a header. Status has a fixed width, and renders the status dot. " +
        "{commit}Commit has no width, so it shares the remaining space by grow. " +
        "{build}For Build, value is what sorting compares, {render}and render is what you see. " +
        "{sort}Keep the sort in state, {table}then return a Table with the columns, the rows, a key for each row, and the sort. " +
        "{focus}autoFocus gives it the keyboard.",
      tail: 1.8,
      props: {
        file: table.file,
        language: "tsx",
        mode: "diff",
        lines: tableLines,
        fontSize: 15,
        hunks: ["imports", "sort", "table"],
        settle: "voiceEnd+0.6",
        highlights: [
          { at: "status", lines: one(tableLines, 'key: "status"') },
          { at: "commit", lines: one(tableLines, 'key: "commit"') },
          { at: "build", until: "sort", lines: one(tableLines, 'key: "duration"'), focus: true },
          { at: "table+0.8", until: "end", lines: one(tableLines, "return <Table"), focus: true },
        ],
      },
    },
    {
      id: "try-table",
      kind: "live",
      narration:
        "Here's the table on the lesson page. {click}Click the pad first, so the table gets your keys. " +
        "{down}The arrow keys move the highlight. " +
        "{s1}[s|S] sorts by the first column, Status. {s2}Press it again for the next one. " +
        "{flip}[Shift+S|Shift S] flips the direction, {bar}and the top bar shows the current sort. " +
        "Enter calls onSelect, and long tables only paint the rows you can see.",
      tail: 1.8,
      live: live(
        [
          { at: "click", click: ".learn-pad" },
          { at: "down", key: "ArrowDown" },
          { at: "down+0.7", key: "ArrowDown" },
          { at: "s1", key: "s" },
          { at: "s2", key: "s" },
          { at: "flip", key: "Shift+S" },
        ],
        {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          top: { in: "dt", text: "acme.local/deployments", at: 0.2 },
          sorted: { in: "dt", text: "sorted by commit desc", at: "flip+0.6" },
        },
      ),
      props: {
        url: "textjs.org/learn/components",
        clicks: [{ at: "click", target: "pad" }],
        keys: [
          { at: "down", label: "↓" },
          { at: "down+0.7", label: "↓" },
          { at: "s1", label: "S" },
          { at: "s2", label: "S" },
          { at: "flip", label: "⇧ S" },
        ],
        shots: [{ at: "down-1.2", target: "top", zoom: 1.5, inside: true }],
        spots: [{ at: "bar", until: "end", target: "sorted", pad: 3 }],
      },
    },
    {
      id: "part-chart",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Next, a chart above it.",
      props: { variant: "section", eyebrow: "Part 2 of 2", title: "A chart above it" },
    },
    {
      id: "chart",
      kind: "editor",
      narration:
        "Sparkline fills its box with the most recent points, {bars}and BarChart aligns labels and values for you. " +
        "{imports}Import both. {state}Keep the chart kind in state, {key}and switch it when you press [c|C]. " +
        "{box}Above the table, add a box with a fixed height of four rows. " +
        "{label}It holds a label, {spark}and either a Sparkline three rows tall, {barchart}or the BarChart.",
      tail: 2.0,
      props: {
        file: chart.file,
        language: "tsx",
        mode: "diff",
        lines: chartLines,
        fontSize: 19,
        hunks: ["imports", "box"],
        settle: "voiceEnd+0.6",
        highlights: [
          { at: "state", lines: one(chartLines, "useState<") },
          { at: "key", lines: [lineOf(chartLines, "useInput"), lineOf(chartLines, "useInput") + 2] },
          { at: "box+0.6", lines: one(chartLines, "height={4}") },
          { at: "label", lines: one(chartLines, "Build time") },
          { at: "spark", lines: one(chartLines, "<Sparkline") },
          { at: "barchart", until: "end", lines: one(chartLines, "<BarChart") },
        ],
        preview: { at: "label", frame: chartBox, size: 18, label: "height={4}" },
      },
    },
    {
      id: "try-chart",
      kind: "live",
      narration:
        "Back on the lesson page, {click}click the pad, {c1}and press [c|C] for the bar chart. {c2}Press it again to switch back. " +
        "{still}The table stays where it is, because the chart box has a fixed height.",
      tail: 2.0,
      live: live(
        [
          { at: "click", click: ".learn-pad" },
          { at: "c1", key: "c" },
          { at: "c2", key: "c" },
        ],
        {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          top: { in: "dt", text: "acme.local/deployments", at: 0.2 },
        },
      ),
      props: {
        url: "textjs.org/learn/components",
        clicks: [{ at: "click", target: "pad" }],
        keys: [
          { at: "c1", label: "C" },
          { at: "c2", label: "C" },
        ],
        shots: [{ at: "c1-1.4", target: "top", zoom: 1.5, inside: true }],
      },
    },
    {
      id: "rest",
      kind: "pipeline",
      move: "down",
      narration:
        "The kit has more. {list}List, {tabs}Tabs, {progress}ProgressBar, {line}and LineChart, " +
        "plus Tree, Select, Input, Modal, Toaster and CommandPalette. {docs}They're all documented under Components.",
      tail: 1.6,
      props: {
        eyebrow: "And the rest",
        nodes: [
          { title: "List", sub: "One row per item", at: "list", content: { type: "frame", frame: listFrame, size: 17 } },
          { title: "Tabs", sub: "With shortcuts", at: "tabs", content: { type: "frame", frame: tabsFrame, size: 17 } },
          { title: "ProgressBar", sub: "Eighth-cell bars", at: "progress", content: { type: "frame", frame: progressFrame, size: 17 } },
          { title: "LineChart", sub: "Dot-matrix lines", at: "line", content: { type: "frame", frame: lineFrame, size: 17 } },
        ],
        statement: { at: "docs", text: "Documented under Components" },
      },
    },
    {
      id: "quiz-1",
      kind: "quiz",
      move: "down",
      narration: `Quick check. {q}With a sortable Table focused, what does [s|S] do? {+2.2} {answer}It cycles the sort column. {explain}[s|S] cycles the sort column, [Shift+S|Shift S] flips the direction, and digits pick a column.`,
      tail: 1.4,
      props: {
        eyebrow: "Quick check · 1 of 2",
        question: quiz[0]!.question,
        options: quiz[0]!.options,
        answer: quiz[0]!.answer,
        explanation: quiz[0]!.explanation,
        cues: { options: "q+1.2", answer: "answer", explain: "explain" },
      },
    },
    {
      id: "quiz-2",
      kind: "quiz",
      narration: `{q}And why give the chart box a fixed height? {+2.2} {answer}So switching charts doesn't move the table. {+0.3} {explain}A fixed height keeps the table in place, so its rows don't change and aren't re-encoded.`,
      tail: 1.8,
      props: {
        eyebrow: "Quick check · 2 of 2",
        question: quiz[1]!.question,
        options: quiz[1]!.options,
        answer: quiz[1]!.answer,
        explanation: quiz[1]!.explanation,
        cues: { options: "q+1.2", answer: "answer", explain: "explain" },
      },
    },
    {
      id: "outro",
      kind: "title",
      move: "down",
      lead: 1.0,
      tail: 3.2,
      narration: "Next, in chapter eight, you'll test Acme Deploys: render it offscreen, press keys, and assert on the frame as text. See you there.",
      props: {
        variant: "outro",
        eyebrow: `Up next · Chapter ${String(number + 1).padStart(2, "0")}`,
        title: next.title,
        body: next.summary,
        url: `textjs.org/learn/${next.slug}`,
        chapter: { number, total: CHAPTERS.length },
      },
    },
  ],
};

export default script;
