/**
 * Chapter 2 · Layout with Box. Facts come from the course itself (apps/web/src/learn): titles, summaries, code
 * steps and quiz questions are read from course.ts and the chapter markdown, never retyped.
 */
import { join } from "node:path";
import type { ReactNode } from "react";
import { CHAPTERS, codeBlocks, getChapter } from "../lib/course";
import { REPO } from "../lib/env";
import { diffLines, lineOf, tokenize, type ChapterScript } from "../lib/script";
import { renderFrame, ui } from "../lib/tui";

const { Box, Spacer, Text, parseClassName } = ui;
const { themes }: typeof import("../../../packages/react/src/theme") = await import(join(REPO, "packages/react/src/theme.ts"));
const { BREAKPOINTS } = ui;

const N = 2;
const chapter = getChapter("layout")!;
const next = CHAPTERS[N]!;
const [topBar, shell] = codeBlocks(chapter) as [ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number]];
const quiz = chapter.quiz;

// "Sidebar and cards" is one long step; the video shows the Card component, then the page.
const shellLines = shell.source.split("\n");
const split = shellLines.findIndex((l) => l === " export default function Page() {");
if (split < 0) throw new Error("Lesson code changed: review the sidebar-and-cards scenes");
const cardDiff = diffLines(shellLines.slice(0, split + 1).join("\n"), "tsx");
const pageDiff = diffLines(shellLines.slice(split).join("\n"), "tsx");
const barDiff = diffLines(topBar.source, "tsx");

// The intro's example, rendered by Text.js and compiled by the real className parser.
const EXAMPLE = "border p-1 gap-1";
const example = await renderFrame(
  <Box className={EXAMPLE}>
    <Text bold>▼ Acme</Text>
    <Text>acme.local</Text>
  </Box>,
  { cols: 22, rows: 6 },
);
const yoga = Object.entries(parseClassName(EXAMPLE, themes.geistDark));
if (yoga.length !== 3) throw new Error(`className parser changed: ${JSON.stringify(yoga)}`);

// The page as the lesson leaves it (sidebar open, cards in a row), at a range of console widths.
const NAV = ["Overview", "Deployments", "Settings"];
function Card({ title, value }: { title: string; value: string }): ReactNode {
  return (
    <Box className="flex-col border rounded px-1 grow shrink basis-0" minWidth={14} minHeight={4}>
      <Text color="subtle">{title}</Text>
      <Text bold>{value}</Text>
    </Box>
  );
}
function Page(): ReactNode {
  return (
    <Box className="flex-col grow">
      <Box className="flex-row h-1 px-1 gap-2 shrink-0">
        <Text bold>▼ Acme</Text>
        <Text color="subtle">acme.local</Text>
        <Spacer />
      </Box>
      <Box className="flex-row grow">
        <Box className="flex-col w-18 shrink-0 border-r px-1 pt-1">
          {NAV.map((item) => (
            <Text key={item}>{item}</Text>
          ))}
        </Box>
        <Box className="flex-row grow items-start gap-1 p-1">
          <Card title="Production" value="acme-web" />
          <Card title="Deployments" value="6 today" />
          <Card title="Build time" value="38s p50" />
        </Box>
      </Box>
    </Box>
  );
}
const WIDE = 116;
const NARROW = 68;
const ROWS = 10;
const breakpoint = (cols: number): string => (["xl", "lg", "md", "sm"] as const).find((b) => cols >= BREAKPOINTS[b]) ?? "xs";
const pageAt = new Map<number, Awaited<ReturnType<typeof renderFrame>>>();
for (let c = NARROW; c <= WIDE; c++) pageAt.set(c, await renderFrame(<Page />, { cols: c, rows: ROWS, trim: false }));
const STEP = 0.045;
const sweep = (cue: string, delay: number, from: number, to: number): Array<{ at: string; frame: Awaited<ReturnType<typeof renderFrame>>; caption: string }> => {
  const out = [];
  const dir = Math.sign(to - from) || 1;
  for (let i = 0, c = from; dir > 0 ? c <= to : c >= to; i++, c += dir) {
    out.push({ at: `${cue}+${(delay + i * STEP).toFixed(3)}`, frame: pageAt.get(c)!, caption: `useBreakpoint() → { breakpoint: "${breakpoint(c)}", cols: ${c} }` });
  }
  return out;
};

const script: ChapterScript = {
  slug: chapter.slug,
  pronounce: {
    className: "class name",
    "p-1": "P 1",
    "h-1": "H 1",
    "w-18": "W 18",
    "border-r": "border R",
    "shrink-0": "shrink zero",
    "basis-0": "basis zero",
    "items-start": "items start",
    minWidth: "min width",
    minHeight: "min height",
    useBreakpoint: "use Breakpoint",
    flexGrow: "flex grow",
    NAV: "nav",
  },
  scenes: [
    {
      id: "cover",
      kind: "title",
      lead: 1.3,
      tail: 1.2,
      narration: "This is chapter two of Learn Text.js: Layout with Box.",
      props: { variant: "cover", title: chapter.title, body: chapter.summary, chapter: { number: N, total: CHAPTERS.length } },
    },
    {
      id: "cells",
      kind: "pipeline",
      narration:
        "The console is a grid of cells. {box}You describe a layout with Box and Tailwind-style class names. " +
        "{yoga}Text.js turns them into Flexbox properties and lays them out with Yoga, the engine React Native uses, so Box behaves the way you already expect. " +
        "{cells}Units are cells. {p1}p-1 is one column and one row of padding.",
      tail: 1.6,
      props: {
        eyebrow: "How layout works",
        nodes: [
          { title: "Box", sub: "Tailwind-style classes", at: "box", content: { type: "code", size: 15, lines: tokenize(`<Box className="${EXAMPLE}">\n  <Text bold>▼ Acme</Text>\n  <Text>acme.local</Text>\n</Box>`, "tsx") } },
          { title: "Yoga", sub: "Flexbox properties", at: "yoga", content: { type: "code", size: 17, lines: tokenize(`{\n${yoga.map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join("\n")}\n}`, "ts") } },
          { title: "Cells", sub: "One column, one row", at: "cells", content: { type: "frame", frame: example, size: 22, grid: true } },
        ],
        statement: { at: "p1", text: "p-1 is one cell of padding" },
      },
    },
    {
      id: "part-bar",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Start with a top bar.",
      props: { variant: "section", eyebrow: "Part 1 of 3", title: "A top bar" },
    },
    {
      id: "bar",
      kind: "editor",
      narration:
        "Most screens are a column, with a one-row bar on top and everything else below it. " +
        "{imports}Import Spacer alongside Box, Text and useInput. " +
        "{replace}Then replace the title card with a column that grows to fill the console. " +
        "{bar}The bar is a row. h-1 makes it exactly one cell tall, {shrink}and shrink-0 keeps it from being squeezed. " +
        "{spacer}Spacer is a box that grows, so anything after it is pushed to the right edge. " +
        "{rest}The row below takes the rest of the height with grow.",
      tail: 1.8,
      props: {
        file: topBar.file,
        language: "tsx",
        mode: "diff",
        lines: barDiff,
        hunks: ["imports", "replace"],
        settle: "voiceEnd+0.6",
        highlights: [
          { at: "imports+0.6", lines: [lineOf(barDiff, "Spacer, Text"), lineOf(barDiff, "Spacer, Text")] },
          { at: "replace+1.2", lines: [lineOf(barDiff, '"flex-col grow"'), lineOf(barDiff, '"flex-col grow"')], focus: true },
          { at: "bar", lines: [lineOf(barDiff, "h-1 px-1"), lineOf(barDiff, "h-1 px-1")], focus: true },
          { at: "spacer", lines: [lineOf(barDiff, "<Spacer />"), lineOf(barDiff, "<Spacer />")], focus: true },
          { at: "rest", until: "end", lines: [lineOf(barDiff, "sidebar + cards"), lineOf(barDiff, "sidebar + cards")], focus: true },
        ],
      },
    },
    {
      id: "part-cards",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Next, a sidebar and cards.",
      props: { variant: "section", eyebrow: "Part 2 of 3", title: "Sidebar and cards" },
    },
    {
      id: "card",
      kind: "editor",
      narration:
        "{card}Add a Card component above the page. {box}Each card is a bordered column with one cell of padding on either side. " +
        "{share}grow, shrink and basis-0 give every card an equal share of the row, whatever its content. " +
        "{min}minWidth and minHeight set a floor, also in cells. " +
        "{nav}NAV lists the sidebar's three items.",
      tail: 1.6,
      props: {
        file: shell.file,
        language: "tsx",
        mode: "diff",
        lines: cardDiff,
        maxSize: 21,
        hunks: ["card"],
        settle: "voiceEnd+0.6",
        highlights: [
          { at: "box", lines: [lineOf(cardDiff, "<Box className"), lineOf(cardDiff, "<Box className")] },
          { at: "nav", until: "end", lines: [lineOf(cardDiff, "const NAV"), lineOf(cardDiff, "const NAV")] },
        ],
      },
    },
    {
      id: "page",
      kind: "editor",
      narration:
        "In the page, keep two flags in state. {state}One shows the sidebar, and the other stacks the cards. " +
        "{keys}Press s to toggle the sidebar, and d to flip the direction. " +
        "{fill}Then fill the row. {sidebar}The sidebar is 18 cells wide, with a border on its right edge only. " +
        "{cards}The cards sit in a row, or in a column when stacked, with one cell of gap between them. " +
        "{items}In the row, items-start keeps them from stretching to the full height.",
      tail: 1.8,
      props: {
        file: shell.file,
        language: "tsx",
        mode: "diff",
        lines: pageDiff,
        hunks: ["state", "fill"],
        settle: "voiceEnd+0.6",
        highlights: [
          { at: "state", lines: [lineOf(pageDiff, "[sidebar, setSidebar]"), lineOf(pageDiff, "[stacked, setStacked]")], zoom: 1.22 },
          { at: "keys", lines: [lineOf(pageDiff, 'e.input === "s"'), lineOf(pageDiff, 'e.input === "d"')], zoom: 1.22 },
          { at: "sidebar", lines: [lineOf(pageDiff, "w-18"), lineOf(pageDiff, "w-18")], zoom: 1.22 },
          { at: "cards", until: "end", lines: [lineOf(pageDiff, "stacked ?"), lineOf(pageDiff, "stacked ?")], zoom: 1.22 },
        ],
      },
    },
    {
      id: "try",
      kind: "live",
      narration:
        "Here's the dashboard shell, live on the lesson page. " +
        "{click}Click the pad so the page has focus. " +
        "{s1}Press s, and the sidebar closes. {s2}Press it again to bring it back. " +
        "{d1}Press d, and the cards stack into a column. {d2}Press d again to put them back in a row. " +
        "{log}Each time, Yoga recomputes the layout and only the rows that changed are encoded again, {one}so every toggle is a single console.log.",
      tail: 2.0,
      live: {
        server: "site",
        path: "/learn/layout",
        pageHeight: 420,
        devtoolsHeight: 480,
        scroll: ".learn-pad",
        scrollMargin: 84,
        storage: { "textjs:viewport": "fit" },
        actions: [
          { at: "click", click: ".learn-pad" },
          { at: "s1", key: "s" },
          { at: "s2", key: "s" },
          { at: "d1", key: "d" },
          { at: "d2", key: "d" },
        ],
        measure: {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          frame: { in: "dt", frame: true, at: 0.2 },
          app: { in: "dt", text: "▼ Acme", at: 0.2 },
        },
      },
      props: {
        url: "textjs.org/learn/layout",
        clicks: [{ at: "click", target: "pad" }],
        keys: [
          { at: "s1", label: "S" },
          { at: "s2", label: "S" },
          { at: "d1", label: "D" },
          { at: "d2", label: "D" },
        ],
        shots: [{ at: "s1-1.4", target: "frame", zoom: 1.45 }],
      },
    },
    {
      id: "part-responsive",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Finally, responsive layout.",
      props: { variant: "section", eyebrow: "Part 3 of 3", title: "Responsive by default" },
    },
    {
      id: "reflow",
      kind: "frames",
      narration:
        "The grid follows the docked DevTools panel. " +
        "{narrow}Drag the console narrower, and the cards shrink to share the space that's left. " +
        "{wide}Drag it wider, and they grow back. " +
        "{bp}When you need breakpoints, useBreakpoint returns the current one, measured in columns: " +
        "[sm|S M] from 60, [md|M D] from 80, and [lg|L G] from 110.",
      tail: 2.0,
      props: {
        eyebrow: "Responsive by default",
        headline: "The grid follows the console",
        size: 20,
        steps: [...sweep("start", 0, WIDE, WIDE), ...sweep("narrow", 0.2, WIDE - 1, NARROW), ...sweep("wide", 0.2, NARROW + 1, WIDE)],
      },
    },
    {
      id: "quiz-1",
      kind: "quiz",
      move: "down",
      narration: `Quick check. {q}${quiz[0]!.question} {+2.2} {answer}One cell. {explain}Units are terminal cells: one column across, and one row down.`,
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
      narration: `{q}${quiz[1]!.question} {+2.2} {answer}grow. {+0.3} {explain}It sets flexGrow to 1, exactly as in CSS Flexbox, and Yoga does the layout.`,
      tail: 1.6,
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
      narration: `Next, in chapter three, you'll style a deployment card with colors, text attributes and theme tokens. See you there.`,
      props: {
        variant: "outro",
        eyebrow: "Up next · Chapter 03",
        title: next.title,
        body: next.summary,
        url: `textjs.org/learn/${next.slug}`,
        chapter: { number: N, total: CHAPTERS.length },
      },
    },
  ],
};

export default script;
