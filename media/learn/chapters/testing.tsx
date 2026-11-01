/**
 * Chapter 8 · Testing. Facts come from the course itself (apps/web/src/learn): titles, summaries, code steps and
 * quiz questions are read from course.ts and the chapter markdown, never retyped.
 */
import { useState, type ReactNode } from "react";
import { join } from "node:path";
import { CHAPTERS, chapterIndex, codeBlocks, getChapter } from "../lib/course";
import { REPO } from "../lib/env";
import { applyDiff, diffLines, fileLines, lineOf, tokenize, type ChapterScript } from "../lib/script";
import { renderFrame, ui } from "../lib/tui";

const { Box, Text, useInput } = ui;
const acme: typeof import("../../../apps/web/src/learn/apps/acme") = await import(join(REPO, "apps/web/src/learn/apps/acme.tsx"));

const chapter = getChapter("testing")!;
const number = chapterIndex(chapter.slug) + 1;
const next = CHAPTERS[number]!;
const [firstTest, pressing, , snapshot] = codeBlocks(chapter) as [ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number]];
const quiz = chapter.quiz;

// Three deployments with a highlight that ↓ moves, rendered offscreen by @textjs/react/testing itself.
function Rows(): ReactNode {
  const [index, setIndex] = useState(0);
  useInput((e) => {
    if (e.key === "down") setIndex((i) => Math.min(2, i + 1));
  });
  return (
    <Box className="flex-col">
      {acme.DEPLOYMENTS.slice(0, 3).map((d, i) => (
        <Box key={d.id} className="flex-row h-1 gap-1">
          <Text color={i === index ? "fg" : "muted"}>{i === index ? "›" : " "}</Text>
          <Text color={i === index ? "fg" : "muted"} bold={i === index} wrap="nowrap">
            {d.commit}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
const rows = await renderFrame(<Rows />, { cols: 34, rows: 3, keys: ["down"] });

const first = fileLines(applyDiff(firstTest.source), "tsx");
// The second step appends two tests to the first file; a context line between them makes each test its own hunk.
const pressSource = [
  ...applyDiff(firstTest.source).split("\n").map((l) => ` ${l}`),
  "+",
  ...pressing.source.split("\n").map((l) => (l === "+" ? " " : l)),
].join("\n");
const press = diffLines(pressSource, "tsx");
if (!snapshot.source.includes("app.toAnsi()")) throw new Error("Lesson code changed: review the snapshot scene");
const snap = fileLines(
  [
    'test("matches the snapshot", async () => {',
    "  const app = await render(<DeploymentsPage />);",
    '  await app.waitForText("feat: stream cells downward");',
    `  ${snapshot.source.trim()}`,
    "});",
  ].join("\n"),
  "tsx",
);

const script: ChapterScript = {
  slug: chapter.slug,
  pronounce: {
    "@textjs/react/testing": "at textjs slash react slash testing",
    "globalThis.fetch": "global this dot fetch",
    "app.lastFrame()": "app dot last frame",
    lastFrame: "last frame",
    waitForText: "wait for text",
    afterEach: "after each",
    beforeEach: "before each",
    toAnsi: "to ANSI",
  },
  scenes: [
    {
      id: "cover",
      kind: "title",
      lead: 1.3,
      tail: 1.2,
      narration: `Welcome back to Learn Text.js. This is chapter eight: ${chapter.title}.`,
      props: { variant: "cover", title: chapter.title, body: chapter.summary, chapter: { number, total: CHAPTERS.length } },
    },
    {
      id: "how",
      kind: "pipeline",
      narration:
        "You can't screenshot a console in CI, and you don't need to. " +
        "{render}@textjs/react/testing renders your app offscreen and presses keys, {cells}into a grid of cells in memory. " +
        "{read}Then you read the frame back as plain text: lastFrame returns all of it, lines returns it row by row, and cell gives you one cell's character and colors. " +
        "{runners}It runs in Bun, Vitest or Jest, with no browser involved.",
      tail: 1.4,
      props: {
        eyebrow: "How it works",
        nodes: [
          { title: "Render", sub: "Offscreen, with keys", at: "render", content: { type: "code", size: 16, lines: tokenize('const app = await render(\n  <DeploymentsPage />,\n);\nawait app.press("down");', "tsx") } },
          { title: "Cells", sub: "A grid in memory", at: "cells", content: { type: "frame", frame: rows, size: 15, grid: true } },
          { title: "Read", sub: "The frame as text", at: "read", content: { type: "code", size: 15, lines: tokenize("app.lastFrame()  // all of it\napp.lines()      // row by row\napp.cell(0, 1)   // one cell", "ts") } },
        ],
        statement: { at: "runners", text: "Runs in Bun, Vitest or Jest" },
      },
    },
    {
      id: "part-first",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Let's write the first test.",
      props: { variant: "section", eyebrow: "Part 1 of 3", title: "Your first test" },
    },
    {
      id: "first",
      kind: "editor",
      narration:
        "Tests sit next to the page they test. " +
        "{imports}Import render and cleanup from @textjs/react/testing, along with the page. " +
        "{cleanup}afterEach cleanup unmounts whatever a test rendered. " +
        "{render}render mounts the page in a grid 80 cells wide and 12 rows tall. Without options, it's 80 by 24. " +
        "{wait}The page fetches its deployments, so wait for the first one to show up, " +
        "{lines}then check that the frame has twelve lines. " +
        "{fetch}To keep tests offline, stub globalThis.fetch in a beforeEach, or pass the page its data as props.",
      tail: 1.8,
      props: {
        file: firstTest.file,
        language: "tsx",
        mode: "write",
        lines: first,
        appear: 0.3,
        highlights: [
          { at: "imports", lines: [0, lineOf(first, 'from "./page"')] },
          { at: "cleanup", lines: [lineOf(first, "afterEach"), lineOf(first, "afterEach")] },
          { at: "render", lines: [lineOf(first, "await render("), lineOf(first, "await render(")], focus: true },
          { at: "wait", lines: [lineOf(first, "waitForText"), lineOf(first, "waitForText")], focus: true },
          { at: "lines", until: "fetch", lines: [lineOf(first, "toHaveLength"), lineOf(first, "toHaveLength")], focus: true },
        ],
      },
    },
    {
      id: "part-keys",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Next, pressing keys.",
      props: { variant: "section", eyebrow: "Part 2 of 3", title: "Pressing keys" },
    },
    {
      id: "press",
      kind: "editor",
      narration:
        "press takes the same key strings as useKeymap. " +
        "{act}Each call runs inside act and flushes the frames it causes, so the next assertion sees the update. " +
        "{down}Press down, {contain}and the highlight should move to the second deployment. " +
        "{sort}In the next test, {four}pressing 4 sorts by the fourth column, Build. " +
        "{locate}locate finds text in the frame, so the 12-second build should now sit above the 52-second one.",
      tail: 1.8,
      props: {
        file: pressing.file,
        language: "tsx",
        mode: "diff",
        lines: press,
        hunks: ["act", "sort"],
        settle: "voiceEnd+0.6",
        highlights: [
          { at: "down", lines: [lineOf(press, 'app.press("down")'), lineOf(press, "toContain")], focus: true },
          { at: "four", lines: [lineOf(press, 'app.press("4")'), lineOf(press, 'app.press("4")')], focus: true },
          { at: "locate", until: "end", lines: [lineOf(press, "app.locate"), lineOf(press, "app.locate")], focus: true },
        ],
      },
    },
    {
      id: "part-run",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Now, run it.",
      props: { variant: "section", eyebrow: "Part 3 of 3", title: "Run it" },
    },
    {
      id: "try",
      kind: "live",
      narration:
        "Run the suite with bun test. Any runner that supports async tests works: Bun, Vitest or Jest. " +
        "{click}On the lesson page, click the pad first, so the page has focus. " +
        "{enter}Press Enter to run the suite. {pass}All five tests pass. " +
        "{f}Press F to break one, {fail}and the failure shows the assertion, {received}and what the frame contained instead.",
      tail: 2.6,
      live: {
        server: "site",
        path: "/learn/testing",
        pageHeight: 420,
        devtoolsHeight: 480,
        scroll: ".learn-pad",
        scrollMargin: 84,
        // An 80×24 grid, so the camera can frame the whole app.
        storage: { "textjs:viewport": "80x24" },
        actions: [
          { at: "click", click: ".learn-pad" },
          { at: "enter", key: "Enter" },
          { at: "f", key: "f" },
        ],
        measure: {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          frame: { in: "dt", frame: true, at: "enter+1.6" },
          pass: { in: "dt", text: "5 pass", at: "enter+1.6" },
          expect: { in: "dt", text: 'expect(row).toContain("perf: merge spans across rows")', at: "f+1.6" },
          received: { in: "dt", text: 'Received: "› ● Ready      feat: stream cells downward', at: "f+1.6" },
        },
      },
      props: {
        url: "textjs.org/learn/testing",
        clicks: [{ at: "click", target: "pad" }],
        keys: [
          { at: "enter", label: "Enter" },
          { at: "f", label: "F" },
        ],
        shots: [{ at: "enter-0.9", target: "frame", pad: 1.06 }],
        spots: [
          { at: "pass", until: "f", target: "pass", pad: 4 },
          { at: "fail", until: "received", target: "expect", pad: 4 },
          { at: "received", until: "end", target: "received", pad: 4 },
        ],
      },
    },
    {
      id: "snapshot",
      kind: "editor",
      narration:
        "One more method, for snapshots. {ansi}toAnsi returns the frame as truecolor ANSI, " +
        "{match}so a snapshot records the colors along with the text, and catches color regressions too.",
      tail: 2.0,
      props: {
        file: firstTest.file,
        language: "tsx",
        mode: "write",
        lines: snap,
        appear: 0.3,
        highlights: [{ at: "ansi", until: "end", lines: [lineOf(snap, "toAnsi"), lineOf(snap, "toAnsi")], focus: true }],
      },
    },
    {
      id: "quiz-1",
      kind: "quiz",
      move: "down",
      narration: `Quick check. {q}${quiz[0]!.question} {+2.2} {answer}Any test runner with async tests. {explain}It renders offscreen into a buffer of cells, so there's no browser and no DevTools involved.`,
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
      narration: `{q}And what does app.lastFrame() return? {+2.2} {answer}The frame, as plain text. {+0.3} {explain}Frames are trimmed on the right and at the bottom, so they make stable assertions and snapshots.`,
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
      narration: "Next, in chapter nine, you'll run the same dashboard full-screen in a terminal, with text run. See you there.",
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
