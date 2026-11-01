/**
 * Chapter 9 · Running in a Terminal. Facts come from the course itself (apps/web/src/learn): titles, summaries, code
 * steps and quiz questions are read from course.ts and the chapter markdown, never retyped. The terminal screens are
 * real Text.js frames of the course app (layout from Routing, table and chart from Table, List & Charts).
 */
import { useState, type ReactNode } from "react";
import { join } from "node:path";
import { CHAPTERS, chapterIndex, codeBlocks, getChapter } from "../lib/course";
import { REPO } from "../lib/env";
import { applyDiff, diffLines, fileLines, lineOf, tokenize, type ChapterScript } from "../lib/script";
import { renderFrame, ui } from "../lib/tui";
import type { SortState, TableColumn } from "../../../packages/react/src/index";

const { Box, Sparkline, Table, Text } = ui;
const acme: typeof import("../../../apps/web/src/learn/apps/acme") = await import(join(REPO, "apps/web/src/learn/apps/acme.tsx"));
const testing: typeof import("../../../packages/react/src/testing") = await import(join(REPO, "packages/react/src/testing.tsx"));

const chapter = getChapter("terminal")!;
const number = chapterIndex(chapter.slug) + 1;
const next = CHAPTERS[number]!;
const [pkg, commands, layout, cli] = codeBlocks(chapter) as [ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number]];
const quiz = chapter.quiz;
const [runCmd, pathCmd] = commands.source.split("\n").map((l) => l.replace(/\s+#.*$/, "")) as [string, string];
if (runCmd !== "bun run tui" || pathCmd !== "bun run tui -- --path /deployments") throw new Error("Lesson commands changed: review the terminal scenes");

type Row = (typeof acme.DEPLOYMENTS)[number];
const COLUMNS: TableColumn<Row>[] = [
  { key: "status", header: "Status", width: 11, render: (d) => <acme.Status status={d.status} /> },
  { key: "commit", header: "Commit", grow: 2 },
  { key: "project", header: "Project", width: 10 },
  { key: "duration", header: "Build", width: 6, align: "right", value: (d) => d.duration, render: (d) => <Text>{`${d.duration}s`}</Text> },
];

function DeploymentsPage(): ReactNode {
  const [sort, setSort] = useState<SortState | null>(null);
  return (
    <Box className="flex-col grow gap-1">
      <Box className="flex-col shrink-0" height={4}>
        <Text color="subtle">Build time, last 24 deployments</Text>
        <Sparkline data={acme.BUILD_TIMES} height={3} color="accent" />
      </Box>
      <Table columns={COLUMNS} rows={acme.DEPLOYMENTS} getRowKey={(d) => d.id} sortable sort={sort} onSortChange={setSort} focused height={acme.DEPLOYMENTS.length} />
    </Box>
  );
}

// The root layout from Routing: top bar, links, and the page below.
function App({ path }: { path: "/" | "/deployments" }): ReactNode {
  return (
    <Box className="flex-col grow">
      <acme.TopBar path={path} />
      <Box className="flex-row h-1 px-1 gap-3 shrink-0">
        {["Overview", "Deployments", "Settings"].map((label) => (
          <Text key={label} color="accent" underline>
            {label}
          </Text>
        ))}
      </Box>
      <Box className="flex-col grow p-1">
        {path === "/" ? (
          <Box className="flex-col gap-1">
            <Text bold>Overview</Text>
            <Text color="muted">6 deployments · 4 ready · 1 building · 1 error</Text>
          </Box>
        ) : (
          <DeploymentsPage />
        )}
      </Box>
    </Box>
  );
}

// Full-screen frames, sized to the terminal window in the stage (1320×728 body at 20px cells).
const screen = { cols: 104, rows: 29, trim: false };
const overview = await renderFrame(<App path="/" />, screen);
const deployments = await renderFrame(<App path="/deployments" />, screen);

// One status cell in both encodings, from a real render.
const statusRender = await testing.render(<acme.Status status="ready" />, { cols: 10, rows: 1 });
const ansi = statusRender.toAnsi();
await statusRender.unmount();
const rgb = /38;2;(\d+);(\d+);(\d+)/.exec(ansi)!.slice(1).map(Number) as [number, number, number];
const hex = `#${rgb.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
const cellsCard = await renderFrame(
  <Box className="flex-col">
    <acme.TopBar path="/deployments" />
    {acme.DEPLOYMENTS.slice(0, 3).map((d) => (
      <Box key={d.id} className="flex-row h-1 gap-1 px-1">
        <Box width={11} flexShrink={0}>
          <acme.Status status={d.status} />
        </Box>
        <Text color="muted">{d.project}</Text>
      </Box>
    ))}
  </Box>,
  { cols: 33, rows: 4 },
);

const pkgLines = diffLines(pkg.source, "json");
const layoutLines = diffLines(layout.source, "tsx");
if (!applyDiff(layout.source).includes('if (e.input === "q") app.exit();')) throw new Error("Lesson code changed: review the quit scene");
const cliLines = fileLines(cli.source, "tsx");

const zsh = "~/acme-deploys — zsh";
const running = "~/acme-deploys — text run";

const script: ChapterScript = {
  slug: chapter.slug,
  pronounce: {
    "@textjs/next/terminal": "at textjs slash next slash terminal",
    "useApp().exit()": "use App dot exit",
    "app.exit()": "app dot exit",
    "package.json": "package dot JSON",
    "cli.tsx": "C L I dot T S X",
    renderToTerminal: "render to terminal",
    waitUntilExit: "wait until exit",
    useRouter: "use Router",
    notFound: "not found",
    useApp: "use App",
    "Ctrl+C": "Control C",
    "/deployments": "slash deployments",
    "/api": "slash API",
    tui: "T U I",
  },
  scenes: [
    {
      id: "cover",
      kind: "title",
      lead: 1.3,
      tail: 1.2,
      narration: `Welcome back to Learn Text.js. This is chapter nine: ${chapter.title}.`,
      // "Running in a Terminal" wraps at the cover's default 184px.
      props: { variant: "cover", title: chapter.title, size: 140, body: chapter.summary, chapter: { number, total: CHAPTERS.length } },
    },
    {
      id: "how",
      kind: "pipeline",
      narration:
        "The same app runs in a real terminal. " +
        "{app}Layout, components, keymaps and route handlers are shared, {cells}and they render into the same grid of cells. " +
        "{out}Only the last step changes. In the console, cells become %c-styled spans in a console.log call. " +
        "{ansi}In a terminal, they become truecolor ANSI escape codes.",
      tail: 1.6,
      props: {
        eyebrow: "How it works",
        nodes: [
          { title: "Your app", sub: "Components, keymaps, routes", at: "app", content: { type: "code", size: 15, lines: tokenize("app/layout.tsx\napp/deployments/page.tsx\napp/api/deployments/route.ts", "text") } },
          { title: "Cells", sub: "The same grid", at: "cells", content: { type: "frame", frame: cellsCard, size: 15, grid: true } },
          {
            title: "Output",
            sub: "%c spans or ANSI",
            at: "out",
            content: { type: "code", size: 15, lines: tokenize(`// DevTools\nconsole.log("%c● Ready",\n  "color:${hex}")\n// Terminal\n"\\x1b[38;2;${rgb.join(";")}m● Ready"`, "ts") },
          },
        ],
        statement: { at: "out", text: "Only the last step changes" },
      },
    },
    {
      id: "part-run",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Let's run it in a terminal.",
      props: { variant: "section", eyebrow: "Part 1 of 4", title: "text run" },
    },
    {
      id: "script",
      kind: "editor",
      narration: "{script}Add a script to package.json {tui}that runs text run. This one is called tui.",
      tail: 1.6,
      props: {
        file: pkg.file,
        language: "json",
        mode: "diff",
        lines: pkgLines,
        hunks: ["script+0.8"],
        settle: "voiceEnd+0.4",
        highlights: [{ at: "tui", until: "end", lines: [lineOf(pkgLines, '"tui"'), lineOf(pkgLines, '"tui"')] }],
      },
    },
    {
      id: "run",
      kind: "terminal",
      narration:
        "{run}bun run tui draws the app full-screen, starting at the root route. " +
        "{imports}text run imports every file in app, and mounts the App Router with an in-memory history. " +
        "{links}Link, useRouter, notFound and redirect work unchanged. {two}Press 2, and the link goes to /deployments. " +
        "{fetch}Same-origin fetch calls to /api run your route handlers in-process, so the table has its data. " +
        "{quit}Ctrl+C quits and restores your scrollback. " +
        "{bun}text run needs Bun.",
      tail: 1.8,
      props: {
        title: zsh,
        steps: [
          { at: "run", cmd: runCmd, output: [{ text: "$ text run", color: "#707070" }] },
          { at: "quit+0.6", cmd: "" },
        ],
        screens: [
          { at: "run+1.6", frame: overview, title: running },
          { at: "two+0.5", until: "quit+0.5", frame: deployments, title: running },
        ],
      },
    },
    {
      id: "part-quit",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Next, quit with Q.",
      props: { variant: "section", eyebrow: "Part 2 of 4", title: "Quit with q" },
    },
    {
      id: "quit",
      kind: "editor",
      narration:
        "Terminal users expect Q to quit. {import}Import useApp from @textjs/next. " +
        "{app}Call it in the root layout, {exit}and when the input is Q, call app.exit(). " +
        "{terminal}exit unmounts the app and restores the terminal. {browser}In the browser, it unmounts the console app.",
      tail: 1.8,
      props: {
        file: layout.file,
        language: "tsx",
        mode: "diff",
        lines: layoutLines,
        hunks: ["import", "app", "exit"],
        settle: "voiceEnd+0.6",
        highlights: [
          { at: "exit+0.8", until: "end", lines: [lineOf(layoutLines, 'e.input === "q"'), lineOf(layoutLines, 'e.input === "q"')], focus: true },
        ],
      },
    },
    {
      id: "try",
      kind: "live",
      narration:
        "On the lesson page, the console plays the terminal. {click}Click the pad first, so the page has focus. " +
        "{enter}Press Enter to start text run. {down1}The arrow keys {down2}move the selection, {q}and Q quits back to the shell.",
      tail: 2.4,
      live: {
        server: "site",
        path: "/learn/terminal",
        pageHeight: 420,
        devtoolsHeight: 480,
        scroll: ".learn-pad",
        scrollMargin: 84,
        // An 80×24 grid, so the camera can frame the whole app.
        storage: { "textjs:viewport": "80x24" },
        actions: [
          { at: "click", click: ".learn-pad" },
          { at: "enter", key: "Enter" },
          { at: "down1", key: "ArrowDown" },
          { at: "down2", key: "ArrowDown" },
          { at: "q", key: "q" },
        ],
        measure: {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          frame: { in: "dt", frame: true, at: "enter+1.0" },
        },
      },
      props: {
        url: "textjs.org/learn/terminal",
        clicks: [{ at: "click", target: "pad" }],
        keys: [
          { at: "enter", label: "Enter" },
          { at: "down1", label: "↓" },
          { at: "down2", label: "↓" },
          { at: "q", label: "Q" },
        ],
        shots: [{ at: "enter-0.9", target: "frame", pad: 1.06 }],
      },
    },
    {
      id: "part-cli",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "You can also write your own CLI.",
      props: { variant: "section", eyebrow: "Part 3 of 4", title: "Your own CLI" },
    },
    {
      id: "cli",
      kind: "editor",
      narration:
        "For a single component, use renderToTerminal. {import}Import it from @textjs/next/terminal, along with the component. " +
        "{render}Pass it an element, and it draws full-screen. " +
        "{wait}waitUntilExit resolves when the app exits, for example after useApp().exit().",
      tail: 2.0,
      props: {
        file: cli.file,
        language: "tsx",
        mode: "write",
        lines: cliLines,
        appear: 0.3,
        highlights: [
          { at: "import", lines: [0, 1] },
          { at: "render", lines: [lineOf(cliLines, "renderToTerminal(<"), lineOf(cliLines, "renderToTerminal(<")], focus: true },
          { at: "wait", until: "end", lines: [lineOf(cliLines, "waitUntilExit"), lineOf(cliLines, "waitUntilExit")], focus: true },
        ],
      },
    },
    {
      id: "part-diff",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Finally, what's different in a terminal.",
      props: { variant: "section", eyebrow: "Part 4 of 4", title: "What's different" },
    },
    {
      id: "different",
      kind: "terminal",
      narration:
        "{path}To start on another route, pass [--path|the path flag]. " +
        "{fps}In a terminal, frames repaint at up to 60 a second, where the console gets about 15. " +
        "{grid}The grid is sized to the window, instead of the docked console. " +
        "{images}Images need pixel data instead of a URL. " +
        "{same}Everything else, including this dashboard, is the same code.",
      tail: 2.4,
      props: {
        title: zsh,
        steps: [{ at: "path", cmd: pathCmd, output: [{ text: "$ text run --path /deployments", color: "#707070" }] }],
        screens: [{ at: "fps-0.4", frame: deployments, title: running }],
      },
    },
    {
      id: "quiz-1",
      kind: "quiz",
      move: "down",
      narration: `Quick check. {q}${quiz[0]!.question} {+2.2} {answer}Only the output: ANSI instead of %c spans. {explain}Layout, components, keymaps and route handlers are shared. Only the final encoding differs.`,
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
      narration: `{q}And how does an app quit itself? {+2.2} {answer}useApp().exit(). {+0.3} {explain}exit unmounts the app and restores the terminal.`,
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
      narration: "Next, in chapter ten, the last one, you'll build Acme Deploys, set its metadata and ship it. See you there.",
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
