/**
 * Chapter 1 · Getting Started. Facts come from the course itself (apps/web/src/learn): titles, summaries, code
 * steps and quiz questions are read from course.ts and the chapter markdown, never retyped.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHAPTERS, codeBlocks, getChapter } from "../lib/course";
import { REPO } from "../lib/env";
import { applyDiff, diffLines, fileLines, lineOf, tokenize, type ChapterScript } from "../lib/script";
import { renderFrame, ui } from "../lib/tui";

const { Box, Text } = ui;
const chapter = getChapter("getting-started")!;
const next = CHAPTERS[1]!;
const [install, firstPage, respond] = codeBlocks(chapter) as [ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number]];
const quiz = chapter.quiz;

// app/page.tsx after "Your first page", rendered by Text.js itself.
const titleCard = await renderFrame(
  <Box className="flex-col border rounded px-2 py-1">
    <Text bold>▼ Acme Deploys</Text>
    <Text color="muted">Hello, console.</Text>
  </Box>,
  { cols: 21, rows: 6 },
);
const tinyCard = await renderFrame(
  <Box className="flex-col border rounded px-1">
    <Text bold>▼ Acme Deploys</Text>
  </Box>,
  { cols: 18, rows: 3 },
);

const first = fileLines(firstPage.source, "tsx");
const diff = diffLines(respond.source, "tsx");
if (applyDiff(respond.source).split("\n")[0] !== 'import { useState } from "react";') throw new Error("Lesson code changed: review the respond-to-a-key scene");

const commands = install.source.split("\n");
const script: ChapterScript = {
  slug: chapter.slug,
  scenes: [
    {
      id: "cover",
      kind: "title",
      lead: 1.3,
      tail: 1.2,
      narration: "Welcome to Learn Text.js. This is chapter one: Getting Started.",
      props: { variant: "cover", title: chapter.title, body: chapter.summary, chapter: { number: 1, total: CHAPTERS.length } },
    },
    {
      id: "course",
      kind: "course",
      narration:
        "Over ten chapters, {list}you'll build Acme Deploys: a deploy dashboard that renders entirely inside the DevTools console. " +
        "{pill}Each chapter ends with the app exactly as your code leaves it, running live in the console on the lesson page. " +
        "{focus}In this first one, you'll create the app, render your first page, and respond to a key.",
      props: {
        eyebrow: "The course",
        headline: "Build Acme Deploys",
        body: "A deploy dashboard that renders entirely inside the DevTools console.",
        pill: "Every chapter runs live in DevTools",
        chapters: CHAPTERS.map((c, i) => ({ n: i + 1, title: c.title, minutes: c.minutes })),
        current: 1,
        cues: { headline: 0.2, list: "list", pill: "pill", focus: "focus" },
      },
    },
    {
      id: "how",
      kind: "pipeline",
      narration:
        "First, a quick look at how it works. {react}A Text.js app is a React app. " +
        "{layout}Your components lay out with Flexbox, into a grid of character cells. " +
        "{log}Each frame that changes becomes a single console.log call, made of %c-styled spans. " +
        "{console}DevTools draws it in the console, {blank}and the page itself stays blank.",
      tail: 1.4,
      props: {
        eyebrow: "How it works",
        nodes: [
          { title: "React", sub: "Your components", at: "react", content: { type: "code", size: 16, lines: tokenize('<Box className="border">\n  <Text bold>\n    ▼ Acme Deploys\n  </Text>\n</Box>', "tsx") } },
          { title: "Cells", sub: "Flexbox, in a character grid", at: "layout", content: { type: "frame", frame: tinyCard, size: 19, grid: true } },
          { title: "console.log", sub: "One call per changed frame", at: "log", content: { type: "code", size: 16, lines: tokenize('console.log(\n  "%c▼ Acme Deploys",\n  "font-weight:700"\n)', "ts") } },
          { title: "DevTools", sub: "The console draws it", at: "console", content: { type: "console", frame: tinyCard, size: 16 } },
        ],
        statement: { at: "blank", text: "The page itself stays blank" },
      },
    },
    {
      id: "part-create",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Let's create the app.",
      props: { variant: "section", eyebrow: "Part 1 of 3", title: "Create the app" },
    },
    {
      id: "scaffold",
      kind: "terminal",
      narration:
        "{cmd}Scaffold a new project with create-text-app, using the starter template. " +
        "{files}You get the App Router, TypeScript, and the text CLI, in a handful of files. " +
        "{cd}Move into the folder and install dependencies, {dev}then start the dev server.",
      tail: 1.6,
      props: {
        title: "~ — zsh",
        steps: [
          {
            at: "cmd",
            cmd: commands[0],
            output: [
              "",
              { text: "▼ create-text-app v1.0.0", color: "#ededed", bold: true },
              "",
              "Creating a new Text.js app in ~/acme-deploys.",
              "",
              "Using template: starter",
              "",
              ...["  + .gitignore", "  + README.md", "  + app/about/page.tsx", "  + app/layout.tsx", "  + app/page.tsx", "  + package.json", "  + text.config.ts", "  + tsconfig.json"],
              "",
              { text: "Success! Created acme-deploys at ~/acme-deploys", color: "#62c073" },
            ],
          },
          { at: "cd", cmd: commands[1] },
          { at: "cd+1.4", cmd: commands[2] },
          {
            at: "dev",
            cmd: commands[3],
            output: [
              { text: "$ text dev", color: "#707070" },
              "",
              { text: "   ▼ Text.js 1.0.0 (Turbolog)", color: "#ededed", bold: true },
              "   - Local:        http://localhost:3000",
              "   - Config:       text.config.ts",
              "",
              { text: " ✓ Starting...", color: "#62c073" },
              { text: " ✓ Ready in 55ms", color: "#62c073" },
              "",
              " ○ Open DevTools Console (⌘⌥J) to view your app",
            ],
          },
        ],
      },
    },
    {
      id: "open",
      kind: "live",
      narration:
        "{open}Open localhost:3000. {keys}Then open the console with ⌘⌥J, or Ctrl+Shift+J on Windows and Linux. " +
        "{blank}The page itself stays blank, apart from a hint. {app}Your app is in the console.",
      tail: 2.4,
      live: {
        server: "starter",
        path: "/",
        before: true,
        measure: { frame: { in: "dt", frame: true } },
      },
      props: {
        url: "localhost:3000",
        open: "keys+0.9",
        keys: [{ at: "keys+0.3", label: "⌘ ⌥ J" }],
        shots: [{ at: "app-0.3", target: "devtools" }],
      },
    },
    {
      id: "part-page",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Now, your first page.",
      props: { variant: "section", eyebrow: "Part 2 of 3", title: "Your first page" },
    },
    {
      id: "page",
      kind: "editor",
      narration:
        "Every route is a page.tsx file in the app folder. {replace}Replace the starter page with the dashboard's title card. " +
        "{imports}Box and Text come from @textjs/app. " +
        "{box}Box is a layout container. Its class names are Flexbox utilities, measured in cells: a column with a rounded border, " +
        "{pad}and padding of two cells across and one down. " +
        "{text}Inside, a bold title, {muted}and a line in the theme's muted color. " +
        "{save}Save the file. {refresh}Fast Refresh redraws the frame, and keeps your component state.",
      tail: 2.0,
      props: {
        file: firstPage.file,
        language: "tsx",
        mode: "write",
        lines: first,
        replaces: fileLines(readFileSync(join(REPO, "packages/create-text-app/templates/starter/app/page.tsx"), "utf8"), "tsx"),
        appear: "replace",
        highlights: [
          { at: "imports", lines: [0, 0] },
          { at: "box", lines: [lineOf(first, "<Box"), lineOf(first, "<Box")] },
          { at: "text", lines: [lineOf(first, "<Text bold"), lineOf(first, "<Text bold")] },
          { at: "muted", until: "save", lines: [lineOf(first, 'color="muted"'), lineOf(first, 'color="muted"')] },
        ],
        preview: { at: "save", refresh: "refresh", frame: titleCard, size: 24 },
      },
    },
    {
      id: "part-key",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Next, respond to a key.",
      props: { variant: "section", eyebrow: "Part 3 of 3", title: "Respond to a key" },
    },
    {
      id: "input",
      kind: "editor",
      narration:
        "useInput receives every keystroke while the page has focus. Let's count the hellos. " +
        "{imports}Import useState from React, and useInput alongside Box and Text. " +
        "{state}Keep the count in state. " +
        "{enter}When the key is return, add one. {reset}When the input is [r|R], reset to zero. " +
        "{render}Then show the count next to the greeting.",
      tail: 1.8,
      props: {
        file: respond.file,
        language: "tsx",
        mode: "diff",
        lines: diff,
        hunks: ["imports", "state", "render"],
        settle: "voiceEnd+0.6",
        highlights: [
          { at: "enter", lines: [lineOf(diff, 'e.key === "return"'), lineOf(diff, 'e.key === "return"')], focus: true },
          { at: "reset", lines: [lineOf(diff, 'e.input === "r"'), lineOf(diff, 'e.input === "r"')], focus: true },
          { at: "render+0.9", until: "end", lines: [lineOf(diff, "hellos === 0"), lineOf(diff, "hellos === 0")], focus: true },
        ],
      },
    },
    {
      id: "try",
      kind: "live",
      narration:
        "Here it is, running in real DevTools, on the lesson page. " +
        "{click}Click the pad first, so the page has focus: keys typed into the DevTools prompt never reach the page. " +
        "{enter1}Press Enter, {enter2}and again, {enter3}and again. {hello}Each press redraws the frame. " +
        "{reset}Press [r|R], and the count resets.",
      tail: 2.2,
      live: {
        server: "site",
        path: "/learn/getting-started",
        pageHeight: 420,
        devtoolsHeight: 480,
        scroll: ".learn-pad",
        scrollMargin: 84,
        storage: { "textjs:viewport": "fit" },
        actions: [
          { at: "click", click: ".learn-pad" },
          { at: "enter1", key: "Enter" },
          { at: "enter2", key: "Enter" },
          { at: "enter3", key: "Enter" },
          { at: "reset", key: "r" },
        ],
        measure: {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          frame: { in: "dt", frame: true, at: 0.2 },
          hello: { in: "dt", text: "Hello, console. ×3", at: "enter3+0.6" },
          card: { in: "dt", text: "▼ Acme Deploys", at: 0.2 },
        },
      },
      props: {
        url: "textjs.org/learn/getting-started",
        clicks: [{ at: "click", target: "pad" }],
        keys: [
          { at: "enter1", label: "Enter" },
          { at: "enter2", label: "Enter" },
          { at: "enter3", label: "Enter" },
          { at: "reset", label: "R" },
        ],
        shots: [{ at: "enter1-1.2", target: "card", zoom: 2.2 }],
        spots: [{ at: "hello", until: "reset", target: "hello", pad: 3 }],
      },
    },
    {
      id: "frames",
      kind: "logs",
      narration:
        "That's a complete Text.js app: React state, a layout box, and one console.log per changed frame. " +
        "{keys}Each key press changed a few cells, so each one logged exactly one new frame. " +
        "{idle}And while the app sits idle, nothing changes, {zero}so nothing is logged at all.",
      tail: 1.6,
      props: {
        eyebrow: "Frames",
        headline: "One console.log per changed frame",
        counterLabel: "console.log calls",
        events: [
          { at: "keys", label: "Enter" },
          { at: "keys+1.1", label: "Enter" },
          { at: "keys+2.2", label: "Enter" },
          { at: "keys+3.3", label: "R" },
        ],
        idle: { at: "idle", label: "idle · nothing logged" },
        statement: { at: "zero", text: "An idle app logs nothing" },
      },
    },
    {
      id: "quiz-1",
      kind: "quiz",
      move: "down",
      narration: `Quick check. {q}${quiz[0]!.question} {+2.2} {answer}In the DevTools console, through console.log. {explain}Every changed frame is a single log of styled spans, and the page stays blank.`,
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
      narration: `{q}And what does an idle app log? {+2.2} {answer}Nothing. {+0.3} {explain}If no cell changed, nothing is allocated, and nothing is logged.`,
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
      narration: `Next, in chapter two, you'll build the dashboard shell with Flexbox in cells: a top bar, a sidebar, and cards. See you there.`,
      props: {
        variant: "outro",
        eyebrow: "Up next · Chapter 02",
        title: next.title,
        body: next.summary,
        url: `textjs.org/learn/${next.slug}`,
        chapter: { number: 1, total: CHAPTERS.length },
      },
    },
  ],
};

export default script;
