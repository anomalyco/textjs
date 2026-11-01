/**
 * Chapter 3 · Text & Styling. Facts come from the course itself (apps/web/src/learn): titles, summaries, code
 * steps and quiz questions are read from course.ts and the chapter markdown, never retyped.
 */
import { join } from "node:path";
import { CHAPTERS, codeBlocks, getChapter } from "../lib/course";
import { REPO } from "../lib/env";
import { applyDiff, diffLines, fileLines, lineOf, tokenize, type ChapterScript } from "../lib/script";
import { renderFrame, ui } from "../lib/tui";

const { Box, Text } = ui;
const testing: typeof import("../../../packages/react/src/testing") = await import(join(REPO, "packages/react/src/testing.tsx"));
const core: typeof import("../../../packages/core/src/index") = await import(join(REPO, "packages/core/src/index.ts"));

const N = 3;
const chapter = getChapter("styling")!;
const next = CHAPTERS[N]!;
const [attrs, status, card] = codeBlocks(chapter) as [ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number]];
const quiz = chapter.quiz;

// How styling works: one styled Text, its cells, and the console.log the real driver writes for them.
const ready = <Text bold color="success">● Ready</Text>;
const readyFrame = await renderFrame(ready, { cols: 7, rows: 1 });
const readyLog = await (async () => {
  const app = await testing.render(ready, { cols: 7, rows: 1 });
  const { frame } = new core.CssConsoleDriver({ console: { clear() {}, log() {} } }).encode(app.root.renderer.buffer);
  await app.unmount();
  if (!frame) throw new Error("No console frame");
  const css = frame.args[0]!.split(";").filter((d) => /^(color|background-color|font-weight):/.test(d));
  if (css.length !== 3) throw new Error(`Console CSS changed: ${frame.args[0]}`);
  return `console.log(\n  ${JSON.stringify(frame.format)},\n  "…${css[0]};\n   ${css[1]};\n   ${css[2]};"\n)`;
})();

// Text attributes, one row at a time, then the lesson's nested example.
if (!attrs.source.includes('Deployed <Text bold>acme-web</Text> to <Text color="accent">iad1</Text>')) throw new Error("Lesson code changed: review the attributes scene");
const ATTRS = ["bold", "dim", "italic", "underline", "strikethrough"] as const;
const nested = <Text>Deployed <Text bold>acme-web</Text> to <Text color="accent">iad1</Text></Text>;
const attrFrame = (n: number): Promise<Awaited<ReturnType<typeof renderFrame>>> =>
  renderFrame(
    <Box className="flex-col px-1">
      {ATTRS.slice(0, n).map((a) => (
        <Text key={a} {...{ [a]: true }}>
          {a}
        </Text>
      ))}
      {n > ATTRS.length ? (
        <Box marginTop={1}>
          {nested}
        </Box>
      ) : null}
    </Box>,
    { cols: 30, rows: 7, trim: false },
  );
const attrSteps = [{ at: "start", frame: await attrFrame(0), caption: "" }];
for (const [i, a] of ATTRS.entries()) attrSteps.push({ at: a, frame: await attrFrame(i + 1), caption: `<Text ${a}>${a}</Text>` });
attrSteps.push({ at: "nested", frame: await attrFrame(ATTRS.length + 1), caption: '<Text>Deployed <Text bold>acme-web</Text> to <Text color="accent">iad1</Text></Text>' });

// app/status.tsx, and what it renders.
const statusLines = fileLines(applyDiff(status.source), "tsx");
const STATUS = { ready: ["Ready", "success"], building: ["Building", "warning"], error: ["Error", "danger"], queued: ["Queued", "subtle"] } as const;
const statuses = await renderFrame(
  <Box className="flex-col">
    {Object.values(STATUS).map(([label, color]) => (
      <Text key={label} color={color} wrap="nowrap">{`● ${label}`}</Text>
    ))}
  </Box>,
  { cols: 10, rows: 4 },
);
for (const [k, [label, color]] of Object.entries(STATUS)) if (!status.source.includes(`${k}: { label: "${label}", color: "${color}" }`)) throw new Error(`Lesson code changed: STATUS.${k}`);

const cardDiff = diffLines(card.source, "tsx");

const script: ChapterScript = {
  slug: chapter.slug,
  pronounce: {
    useAppTheme: "use App Theme",
    cycleTheme: "cycle Theme",
    "bg-surface": "B G surface",
    'wrap="truncate-end"': "wrap truncate end",
    'wrap="nowrap"': "wrap no wrap",
    "text-emerald-400": "text emerald 400",
    "status.tsx": "status dot T S X",
    STATUS: "status",
    ORDER: "order",
    DeployStatus: "Deploy Status",
  },
  scenes: [
    {
      id: "cover",
      kind: "title",
      lead: 1.3,
      tail: 1.2,
      narration: "This is chapter three of Learn Text.js: Text and Styling.",
      props: { variant: "cover", title: chapter.title, body: chapter.summary, chapter: { number: N, total: CHAPTERS.length } },
    },
    {
      id: "how",
      kind: "pipeline",
      narration:
        "Every cell has a character, a foreground, a background and a handful of attributes. " +
        "{text}You set them with Text props, {cells}and they land in the cells. " +
        "{log}When the frame is logged, Text.js compiles each run of styled cells into a %c CSS span, " +
        "{console}so the console shows real colors, bold and italics.",
      tail: 1.6,
      props: {
        eyebrow: "How styling works",
        nodes: [
          { title: "Text", sub: "Props for color and style", at: "text", content: { type: "code", size: 16, lines: tokenize('<Text bold color="success">\n  ● Ready\n</Text>', "tsx") } },
          { title: "Cells", sub: "Character, colors, attributes", at: "cells", content: { type: "frame", frame: readyFrame, size: 30, grid: true } },
          { title: "console.log", sub: "One %c span per style run", at: "log", content: { type: "code", size: 14, lines: tokenize(readyLog, "ts") } },
          { title: "DevTools", sub: "Real CSS in the console", at: "console", content: { type: "console", frame: readyFrame, size: 22 } },
        ],
        statement: { at: "console+1.2", text: "The console draws real colors and styles" },
      },
    },
    {
      id: "part-attrs",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "First, text attributes.",
      props: { variant: "section", eyebrow: "Part 1 of 3", title: "Text attributes" },
    },
    {
      id: "attrs",
      kind: "frames",
      narration:
        "Text takes five attributes: {bold}bold, {dim}dim, {italic}italic, {underline}underline {strikethrough}and strikethrough. " +
        "{nested}Nested Text elements become styled spans inside one line. Here, acme-web is bold, and iad1 takes the accent color.",
      tail: 2.0,
      props: {
        eyebrow: "Text attributes",
        headline: "Five attributes, nested spans",
        size: 30,
        steps: attrSteps,
      },
    },
    {
      id: "part-tokens",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Next, theme tokens.",
      props: { variant: "section", eyebrow: "Part 2 of 3", title: "Theme tokens" },
    },
    {
      id: "status",
      kind: "editor",
      narration:
        "{file}Add a status component in app/status.tsx. " +
        "{type}A deployment is ready, building, error or queued. " +
        "{map}STATUS gives each one a label and a theme token: success, warning, danger and subtle. " +
        "{tokens}A color can also be a hex value, or a Tailwind palette class like text-emerald-400. " +
        "Tokens follow the active theme, so use them for anything semantic. " +
        "{render}Status draws a dot and the label in that color, {nowrap}and wrap=\"nowrap\" keeps it on one row.",
      tail: 2.0,
      props: {
        file: status.file,
        language: "tsx",
        mode: "write",
        lines: statusLines,
        maxSize: 20,
        appear: "file",
        highlights: [
          { at: "type", lines: [lineOf(statusLines, "export type"), lineOf(statusLines, "export type")] },
          { at: "map", lines: [lineOf(statusLines, "ready: {"), lineOf(statusLines, "queued: {")] },
          { at: "render", until: "end", lines: [lineOf(statusLines, "return <Text"), lineOf(statusLines, "return <Text")] },
        ],
        preview: { at: "render", refresh: "render+0.8", frame: statuses, size: 30, label: "Rendered by Text.js" },
      },
    },
    {
      id: "part-card",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Now, a deployment card.",
      props: { variant: "section", eyebrow: "Part 3 of 3", title: "A deployment card" },
    },
    {
      id: "card",
      kind: "editor",
      narration:
        "{imports}In the page, import useAppTheme, and Status, STATUS and DeployStatus from the new file. " +
        "{order}ORDER is the sequence s steps through. " +
        "{theme}useAppTheme returns the current theme and cycleTheme. {keys}t cycles the theme, and s moves to the next status. " +
        "{card}bg-surface raises the card off the background. " +
        "{truncate}wrap=\"truncate-end\" ends a long commit message with an ellipsis instead of wrapping onto a second row. " +
        "{id}And the deployment id takes the status color, goes italic while building, and is struck through on error.",
      tail: 2.0,
      props: {
        file: card.file,
        language: "tsx",
        mode: "diff",
        lines: cardDiff,
        hunks: ["imports", "theme", "card"],
        settle: "voiceEnd+0.6",
        highlights: [
          { at: "order", lines: [lineOf(cardDiff, "const ORDER"), lineOf(cardDiff, "const ORDER")], zoom: 1.22 },
          { at: "theme+0.8", lines: [lineOf(cardDiff, "useAppTheme();"), lineOf(cardDiff, "useAppTheme();")], zoom: 1.22 },
          { at: "keys", lines: [lineOf(cardDiff, 'e.input === "t"'), lineOf(cardDiff, 'e.input === "s"')], zoom: 1.22 },
          { at: "card+0.8", lines: [lineOf(cardDiff, "bg-surface"), lineOf(cardDiff, "bg-surface")], zoom: 1.22 },
          { at: "truncate", lines: [lineOf(cardDiff, "truncate-end"), lineOf(cardDiff, "truncate-end")], zoom: 1.22 },
          { at: "id", until: "end", lines: [lineOf(cardDiff, "strikethrough="), lineOf(cardDiff, "dpl_8fK2")], zoom: 1.22 },
        ],
      },
    },
    {
      id: "try",
      kind: "live",
      narration:
        "Here's the card, live on the lesson page. {click}Click the pad first. " +
        "{s1}Press s, and the deployment is building. The id turns amber and italic. " +
        "{s2}Again, and it's an error, struck through in red. {s3}Then queued, {s4}and back to ready. " +
        "{t0}Now press t. Five themes ship with Text.js. {t1}OpenCode Dark, {t2}Tokyo Night, {t3}Amber CRT, {t4}Geist Light, {t5}and back to Geist Dark. " +
        "{repaint}The whole frame repaints in each palette, because every color in it is a token.",
      tail: 2.2,
      live: {
        server: "site",
        path: "/learn/styling",
        pageHeight: 420,
        devtoolsHeight: 480,
        scroll: ".learn-pad",
        scrollMargin: 84,
        storage: { "textjs:viewport": "fit" },
        actions: [
          { at: "click", click: ".learn-pad" },
          { at: "s1", key: "s" },
          { at: "s2", key: "s" },
          { at: "s3", key: "s" },
          { at: "s4", key: "s" },
          { at: "t1", key: "t" },
          { at: "t2", key: "t" },
          { at: "t3", key: "t" },
          { at: "t4", key: "t" },
          { at: "t5", key: "t" },
        ],
        measure: {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          frame: { in: "dt", frame: true, at: 0.2 },
          id: { in: "dt", text: "dpl_8fK2", at: 0.2 },
        },
      },
      props: {
        url: "textjs.org/learn/styling",
        clicks: [{ at: "click", target: "pad" }],
        keys: [
          { at: "s1", label: "S" },
          { at: "s2", label: "S" },
          { at: "s3", label: "S" },
          { at: "s4", label: "S" },
          { at: "t1", label: "T" },
          { at: "t2", label: "T" },
          { at: "t3", label: "T" },
          { at: "t4", label: "T" },
          { at: "t5", label: "T" },
        ],
        shots: [{ at: "s1-1.4", target: "frame", zoom: 1.45 }],
        spots: [{ at: "s1+0.3", until: "t0", target: "id", pad: 6 }],
      },
    },
    {
      id: "quiz-1",
      kind: "quiz",
      move: "down",
      narration: `Quick check. {q}Why use [color="success"|color success] instead of a hex value? {+2.2} {answer}Theme tokens follow the active theme. {explain}Tokens resolve against the current theme, so switching themes recolors every token.`,
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
      narration: `{q}What does [wrap="truncate-end"|wrap truncate end] do? {+2.2} {answer}It ends overflowing text with an ellipsis. {explain}The line stays one row tall.`,
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
      narration: `Next, in chapter four, you'll move through deployments with the keyboard, and add a help overlay that lists every shortcut. See you there.`,
      props: {
        variant: "outro",
        eyebrow: "Up next · Chapter 04",
        title: next.title,
        body: next.summary,
        url: `textjs.org/learn/${next.slug}`,
        chapter: { number: N, total: CHAPTERS.length },
      },
    },
  ],
};

export default script;
