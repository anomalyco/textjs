/**
 * Chapter 4 · Input & Keymaps. Facts come from the course itself (apps/web/src/learn): titles, summaries, code
 * steps and quiz questions are read from course.ts and the chapter markdown, never retyped.
 */
import { join } from "node:path";
import type { ReactNode } from "react";
import { CHAPTERS, codeBlocks, getChapter } from "../lib/course";
import { REPO } from "../lib/env";
import { applyDiff, fileLines, lineOf, tokenize, type ChapterScript } from "../lib/script";
import { renderFrame, ui } from "../lib/tui";

const { Box, Input, Select, Text } = ui;
const core: typeof import("../../../packages/core/src/index") = await import(join(REPO, "packages/core/src/index.ts"));

const N = 4;
const chapter = getChapter("input-and-keymaps")!;
const next = CHAPTERS[N]!;
const [snippet, keymap] = codeBlocks(chapter) as [ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number]];
const quiz = chapter.quiz;

// How input works: the KeyEvent Text.js really builds for Ctrl+K, and the lesson's useInput snippet.
const ctrlK = core.normalizeKeyEvent({ key: "k", code: "KeyK", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false } as Parameters<typeof core.normalizeKeyEvent>[0])!;
const keyEvent = `{\n${(["key", "input", "ctrl", "alt", "shift", "meta"] as const).map((k) => `  ${k}: ${JSON.stringify(ctrlK[k])},`).join("\n")}\n}`;
const ONE_LINE = '  if (e.ctrl && e.key === "k") openPalette();';
if (!snippet.source.includes(ONE_LINE)) throw new Error("Lesson code changed: review the how scene");
const handler = snippet.source.replace(ONE_LINE, '  if (e.ctrl && e.key === "k")\n    openPalette();');

// app/deployments/page.tsx is a new file.
const page = fileLines(applyDiff(keymap.source), "tsx");

// Focus, rendered by Text.js: keys go to whichever component has focus.
function Form(): ReactNode {
  return (
    <Box className="flex-col gap-1 px-1">
      <Box className="flex-col border rounded px-1">
        <Text color="subtle">Search</Text>
        <Input placeholder="Filter deployments" autoFocus />
      </Box>
      <Box className="flex-col border rounded px-1">
        <Text color="subtle">Region</Text>
        <Select
          options={["iad1", "sfo1", "fra1"].map((r) => ({ label: r, value: r }))}
        />
      </Box>
    </Box>
  );
}
const form = (keys: string[]): ReturnType<typeof renderFrame> => renderFrame(<Form />, { cols: 34, rows: 11, keys, trim: false });
const TYPED = ["a", "c", "m", "e"];
const focusSteps = [{ at: "start", frame: await form([]), caption: "Focused: <Input>" }];
for (let i = 0; i < TYPED.length; i++) focusSteps.push({ at: `type+${(0.6 + i * 0.16).toFixed(2)}`, frame: await form(TYPED.slice(0, i + 1)), caption: "Focused: <Input>" });
focusSteps.push(
  { at: "tab", frame: await form([...TYPED, "tab"]), caption: "Focused: <Select>" },
  { at: "down", frame: await form([...TYPED, "tab", "down"]), caption: "Focused: <Select>" },
  { at: "down+0.9", frame: await form([...TYPED, "tab", "down", "down"]), caption: "Focused: <Select>" },
);

const script: ChapterScript = {
  slug: chapter.slug,
  pronounce: {
    KeyHelp: "Key Help",
    KeyHints: "Key Hints",
    KeyEvent: "Key Event",
    useFocusManager: "use Focus Manager",
    useFocus: "use Focus",
    "e.stopPropagation": "E dot stop propagation",
    DEPLOYMENTS: "deployments",
    "lib/deployments.ts": "lib slash deployments dot T S",
    "app/deployments/page.tsx": "app slash deployments slash page dot T S X",
    "ctrl+k": "control K",
  },
  scenes: [
    {
      id: "cover",
      kind: "title",
      lead: 1.3,
      tail: 1.2,
      narration: "This is chapter four of Learn Text.js: Input and Keymaps.",
      props: { variant: "cover", title: chapter.title, body: chapter.summary, chapter: { number: N, total: CHAPTERS.length } },
    },
    {
      id: "how",
      kind: "pipeline",
      narration:
        "First, how a key press reaches your app. {kbd}While the page has focus, {sink}keys land in a hidden textarea that Text.js adds to the page. " +
        "{event}Text.js turns each one into a KeyEvent, with a normalized key name like up, return or escape, the typed character in input, and the ctrl, alt, shift and meta flags. " +
        "{hook}useInput, the low-level hook you've used so far, receives it. Call e.stopPropagation to keep the key from reaching other handlers. " +
        "{prompt}Keys typed into the DevTools prompt go to DevTools, so click the page first.",
      tail: 1.8,
      props: {
        eyebrow: "How input works",
        nodes: [
          { title: "Keyboard", sub: "Ctrl+K, page focused", at: "kbd", content: { type: "code", size: 17, lines: tokenize('keydown {\n  key: "k",\n  ctrlKey: true,\n}', "ts") } },
          { title: "Input sink", sub: "A hidden textarea", at: "sink", content: { type: "code", size: 16, lines: tokenize('<textarea\n  data-textjs-input-sink\n  tabindex="-1"\n/>', "tsx") } },
          { title: "KeyEvent", sub: "Normalized", at: "event", content: { type: "code", size: 14, lines: tokenize(keyEvent, "ts") } },
          { title: "useInput", sub: "Your handler", at: "hook", content: { type: "code", size: 14, lines: tokenize(handler, "tsx") } },
        ],
        statement: { at: "prompt", text: "Click the page before you type" },
      },
    },
    {
      id: "part-keymap",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Next, keymaps.",
      props: { variant: "section", eyebrow: "Part 1 of 3", title: "Keymaps" },
    },
    {
      id: "keymap",
      kind: "editor",
      narration:
        "Once a screen has more than a couple of keys, describe them with useKeymap. {file}Create app/deployments/page.tsx. " +
        "{data}DEPLOYMENTS is a plain array in lib/deployments.ts for now. Chapter six moves it behind a route handler. " +
        "{state}Keep the selected index, and whether the details are open. {move}move keeps the index inside the list. " +
        "{map}Bindings are strings. {alt}[\"up, k\"|up, K] means either key. {enter}enter toggles the details. " +
        "{seq}And [\"g g\"|G G] is a sequence: g, then g again. A chord like ctrl+k works too. " +
        "{labels}Every binding here has a label, and labeled bindings show up in KeyHelp, KeyHints and the command palette. " +
        "{rows}The selected row gets the selection background, {help}and KeyHelp goes at the end.",
      tail: 2.0,
      props: {
        file: keymap.file,
        language: "tsx",
        mode: "write",
        lines: page,
        appear: 2.0,
        highlights: [
          { at: "data", lines: [lineOf(page, "DEPLOYMENTS }"), lineOf(page, "DEPLOYMENTS }")], zoom: 1.3 },
          { at: "state", lines: [lineOf(page, "[index, setIndex]"), lineOf(page, "[open, setOpen]")], zoom: 1.3 },
          { at: "move", lines: [lineOf(page, "const move"), lineOf(page, "const move")], zoom: 1.3 },
          { at: "alt", lines: [lineOf(page, '"up, k"'), lineOf(page, '"down, j"')], zoom: 1.3 },
          { at: "enter", lines: [lineOf(page, "enter:"), lineOf(page, "enter:")], zoom: 1.3 },
          { at: "seq", lines: [lineOf(page, '"g g"'), lineOf(page, '"g g"')], zoom: 1.3 },
          { at: "labels", lines: [lineOf(page, '"up, k"'), lineOf(page, '"g g"')], zoom: 1.3 },
          { at: "rows", lines: [lineOf(page, '"selection"'), lineOf(page, '"selection"')], zoom: 1.3 },
          { at: "help", until: "end", lines: [lineOf(page, "<KeyHelp />"), lineOf(page, "<KeyHelp />")], zoom: 1.3 },
        ],
      },
    },
    {
      id: "part-help",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Let's try it, with the help overlay.",
      props: { variant: "section", eyebrow: "Part 2 of 3", title: "Keyboard shortcuts" },
    },
    {
      id: "try",
      kind: "live",
      narration:
        "Here's the list, live on the lesson page. {click}Click the pad first. " +
        "{d1}Press down, {d2}and down again. {j}j works too. {enter}Enter opens the details. " +
        "{help}Now press the question mark. KeyHelp lists every labeled binding that's live right now. " +
        "{trap}Press down while it's open, and the list underneath doesn't move. Bindings inside a modal trap focus. " +
        "{close}Press question mark or q to close it. {gg}Finally, [g g|G G] jumps back to the first deployment.",
      tail: 2.2,
      live: {
        server: "site",
        path: "/learn/input-and-keymaps",
        pageHeight: 420,
        devtoolsHeight: 480,
        scroll: ".learn-pad",
        scrollMargin: 84,
        storage: { "textjs:viewport": "fit" },
        actions: [
          { at: "click", click: ".learn-pad" },
          { at: "d1", key: "ArrowDown" },
          { at: "d2", key: "ArrowDown" },
          { at: "j", key: "j" },
          { at: "enter", key: "Enter" },
          { at: "help+0.2", key: "?" },
          { at: "trap+0.4", key: "ArrowDown" },
          { at: "close+0.6", key: "q" },
          { at: "gg+0.2", key: "g" },
          { at: "gg+0.45", key: "g" },
        ],
        measure: {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          frame: { in: "dt", frame: true, at: 0.2 },
        },
      },
      props: {
        url: "textjs.org/learn/input-and-keymaps",
        clicks: [{ at: "click", target: "pad" }],
        keys: [
          { at: "d1", label: "↓" },
          { at: "d2", label: "↓" },
          { at: "j", label: "J" },
          { at: "enter", label: "Enter" },
          { at: "help+0.2", label: "?" },
          { at: "trap+0.4", label: "↓" },
          { at: "close+0.6", label: "Q" },
          { at: "gg+0.2", label: "G" },
          { at: "gg+0.45", label: "G" },
        ],
        shots: [{ at: "d1-1.4", target: "frame", zoom: 1.45 }],
      },
    },
    {
      id: "part-focus",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Last, focus.",
      props: { variant: "section", eyebrow: "Part 3 of 3", title: "Focus" },
    },
    {
      id: "focus",
      kind: "frames",
      narration:
        "Components like Input, Select and Table only take keys while they're focused. " +
        "{type}Here the input has focus, so typing goes into it. " +
        "{tab}Tab moves focus to the Select, {down}and now the arrow keys move its highlight. " +
        "{hooks}To move focus yourself, use useFocus and useFocusManager.",
      tail: 2.0,
      props: {
        eyebrow: "Focus",
        headline: "Keys go to the focused component",
        size: 26,
        steps: focusSteps,
        keys: [
          { at: "tab", label: "Tab" },
          { at: "down", label: "↓" },
          { at: "down+0.9", label: "↓" },
        ],
      },
    },
    {
      id: "quiz-1",
      kind: "quiz",
      move: "down",
      narration: `Quick check. {q}In useKeymap, what does the binding ["g g"|G G] mean? {+2.2} {answer}g, then g again. {explain}Space-separated strokes are a sequence, and commas separate alternatives.`,
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
      narration: `{q}${quiz[1]!.question} {+2.2} {answer}Keys typed into the DevTools prompt never reach the page. {explain}Keystrokes arrive through a hidden input on the page, so the page needs focus.`,
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
      narration: `Next, in chapter five, you'll split the app into routes with a shared layout, and add links with shortcuts and history. See you there.`,
      props: {
        variant: "outro",
        eyebrow: "Up next · Chapter 05",
        title: next.title,
        body: next.summary,
        url: `textjs.org/learn/${next.slug}`,
        chapter: { number: N, total: CHAPTERS.length },
      },
    },
  ],
};

export default script;
