/**
 * Chapter 10 · Shipping. Facts come from the course itself (apps/web/src/learn): titles, summaries, code steps and
 * quiz questions are read from course.ts and the chapter markdown, never retyped.
 */
import { join } from "node:path";
import { CHAPTERS, chapterIndex, codeBlocks, getChapter } from "../lib/course";
import { REPO } from "../lib/env";
import { applyDiff, fileLines, lineOf, tokenize, type ChapterScript } from "../lib/script";
import { renderFrame, ui } from "../lib/tui";
import type { TableColumn } from "../../../packages/react/src/index";

const { Box, Sparkline, Table, Text } = ui;
const acme: typeof import("../../../apps/web/src/learn/apps/acme") = await import(join(REPO, "apps/web/src/learn/apps/acme.tsx"));

const chapter = getChapter("shipping")!;
const number = chapterIndex(chapter.slug) + 1;
const [build, , pageMeta, redirects] = codeBlocks(chapter) as [ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number], ReturnType<typeof codeBlocks>[number]];
const quiz = chapter.quiz;
if (build.source !== "bun run build") throw new Error("Lesson code changed: review the build scene");

// The title template comes from the Routing chapter's root layout.
const layoutMeta = codeBlocks(getChapter("routing")!).find((b) => b.file === "app/layout.tsx")!.source.split("\n").find((l) => l.includes("export const metadata"))!;
if (!layoutMeta.includes('default: "Acme Deploys", template: "%s · Acme"')) throw new Error("Routing chapter metadata changed: review the metadata scene");
if (!applyDiff(pageMeta.source).startsWith('export const metadata = { title: "Deployments" };')) throw new Error("Lesson code changed: review the metadata scene");

// `text build` and `text start` output, from a real run on the course app (4 routes, 1 route handler) assembled from
// the lessons' code, on November 1, 2026 (NO_COLOR; colors follow the CLI's).
const ok = "#62c073";
const gray = "#707070";
const buildOutput = [
  { text: "$ text build", color: gray },
  { text: "   ▼ Text.js 1.0.1 (Turbolog)", color: "#ededed", bold: true },
  "",
  "   Creating an optimized console production build...",
  "",
  { text: " ✓ Compiled successfully in 0.9s", color: ok },
  { text: " ✓ Collecting route data", color: ok },
  { text: " ✓ Generating static console cells (3/4)", color: ok },
  { text: " ✓ Prerendering console shells (3/3)", color: ok },
  { text: " ✓ Finalizing console optimization", color: ok },
  "",
  { text: "Route (app)                              Type       Target", color: "#ededed", bold: true },
  "┌ ○ /                                    Static     console.log (%c)",
  "├ ○ /_not-found                          Static     console.log (%c)",
  "├ ○ /deployments                         Static     console.log (%c)",
  "├ ƒ /deployments/[id]                    Dynamic    console.log (%c)",
  "├ ○ /settings                            Static     console.log (%c)",
  { text: "└ ƒ /api/deployments                     Dynamic    Route Handler", color: "#ededed" },
  "+ First Load JS shared by all             696.4 kB (241.1 kB gzip)",
  "",
  { text: "○  (Static)   prerendered as static console cells", color: gray },
  { text: "ƒ  (Dynamic)  on-demand console reconciliation", color: gray },
  "",
];
const startOutput = [
  { text: "$ text start", color: gray },
  "",
  { text: "   ▼ Text.js 1.0.1 (Turbolog)", color: "#ededed", bold: true },
  "   - Local:        http://localhost:3000",
  "",
  { text: " ✓ Starting...", color: ok },
  { text: " ✓ Ready in 22ms", color: ok },
];

// The dashboard at 80×24, as a docked-to-the-side console would show it.
type Row = (typeof acme.DEPLOYMENTS)[number];
const COLUMNS: TableColumn<Row>[] = [
  { key: "status", header: "Status", width: 11, render: (d) => <acme.Status status={d.status} /> },
  { key: "commit", header: "Commit", grow: 2 },
  { key: "project", header: "Project", width: 10 },
  { key: "duration", header: "Build", width: 6, align: "right", value: (d) => d.duration, render: (d) => <Text>{`${d.duration}s`}</Text> },
];
const small = await renderFrame(
  <Box className="flex-col grow">
    <acme.TopBar path="/deployments" />
    <Box className="flex-col grow p-1 gap-1">
      <Box className="flex-col shrink-0" height={4}>
        <Text color="subtle">Build time, last 24 deployments</Text>
        <Sparkline data={acme.BUILD_TIMES} height={3} color="accent" />
      </Box>
      <Table columns={COLUMNS} rows={acme.DEPLOYMENTS} getRowKey={(d) => d.id} focused height={acme.DEPLOYMENTS.length} />
    </Box>
  </Box>,
  { cols: 80, rows: 24, trim: false },
);

if (redirects.file !== "public/_redirects") throw new Error("Lesson code changed: review the static hosting scene");
const redirectLines = fileLines(applyDiff(redirects.source), "text");

const script: ChapterScript = {
  slug: chapter.slug,
  pronounce: {
    "textjs.org/learn/certificate": "textjs dot org slash learn slash certificate",
    "/api/deployments": "slash API slash deployments",
    "index.html": "index dot HTML",
    "public/_redirects": "public slash redirects",
  },
  scenes: [
    {
      id: "cover",
      kind: "title",
      lead: 1.3,
      tail: 1.2,
      narration: `Welcome back to Learn Text.js. This is chapter ten, the last one: ${chapter.title}.`,
      props: { variant: "cover", title: chapter.title, body: chapter.summary, chapter: { number, total: CHAPTERS.length } },
    },
    {
      id: "part-build",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Acme Deploys is ready to ship. First, build it.",
      props: { variant: "section", eyebrow: "Part 1 of 4", title: "Build" },
    },
    {
      id: "build",
      kind: "terminal",
      narration:
        "{build}bun run build runs text build. " +
        "{client}It produces a static client, and because the app has a route handler, a server for text start. " +
        "{table}The route table lists every page, and the route handler at /api/deployments. " +
        "{serve}text start serves the build and runs your route handlers. " +
        "{host}It runs on any host with Bun 1.2 or Node 22 and later.",
      tail: 2.0,
      props: {
        title: "~/acme-deploys — zsh",
        steps: [
          { at: "build", cmd: build.source, output: buildOutput },
          { at: "serve", cmd: "bun run start", output: startOutput },
        ],
      },
    },
    {
      id: "part-meta",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Next, metadata.",
      props: { variant: "section", eyebrow: "Part 2 of 4", title: "Metadata" },
    },
    {
      id: "meta",
      kind: "pipeline",
      narration:
        "The browser tab is the only pixel of chrome your app has, so give it a title. " +
        "{layout}The root layout from the routing chapter sets a default title and a template. " +
        "{page}A page can export its own metadata, {tab}and with the template, the tab reads [Deployments · Acme|Deployments dot Acme].",
      tail: 1.8,
      props: {
        eyebrow: "Metadata",
        nodes: [
          {
            title: "Root layout",
            sub: "app/layout.tsx",
            at: "layout",
            content: { type: "code", size: 15, lines: tokenize('export const metadata = {\n  title: {\n    default: "Acme Deploys",\n    template: "%s · Acme",\n  },\n};', "ts") },
          },
          { title: "Page", sub: "app/deployments/page.tsx", at: "page", content: { type: "code", size: 15, lines: tokenize('export const metadata = {\n  title: "Deployments",\n};', "ts") } },
          { title: "Browser tab", sub: "What the tab shows", at: "tab", content: { type: "code", size: 20, lines: tokenize("Deployments · Acme", "text") } },
        ],
      },
    },
    {
      id: "part-static",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Now, static hosting.",
      props: { variant: "section", eyebrow: "Part 3 of 4", title: "Static hosting" },
    },
    {
      id: "static",
      kind: "editor",
      narration:
        "Without route handlers, the build is a plain static site. " +
        "{index}Each static route gets its own HTML file, and dynamic routes like [/deployments/[id]|slash deployments, slash I D] are served by index.html. " +
        "{vercel}On Vercel and Cloudflare Pages, text build detects the platform and sets that up itself. " +
        "{rewrite}Other static hosts need a rewrite. On Netlify, it's one line in public/_redirects. " +
        "{deep}Netlify serves files that exist first, so assets and prerendered routes are unaffected.",
      tail: 2.0,
      props: {
        file: redirects.file,
        language: "text",
        mode: "write",
        lines: redirectLines,
        appear: 0.3,
        highlights: [{ at: "rewrite", until: "end", lines: [lineOf(redirectLines, "/index.html"), lineOf(redirectLines, "/index.html")], focus: true }],
      },
    },
    {
      id: "part-check",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Before you ship, three checks.",
      props: { variant: "section", eyebrow: "Part 4 of 4", title: "Before you ship" },
    },
    {
      id: "checks",
      kind: "pipeline",
      narration:
        "{settings}Turn off Preserve log in your console settings, and tell your users to do the same. " +
        "{size}Test at 80 by 24, because someone will dock DevTools to the side. " +
        "{test}And run bun test.",
      tail: 1.8,
      props: {
        eyebrow: "Before you ship",
        nodes: [
          { title: "Console settings", sub: "Turn it off", at: "settings", content: { type: "code", size: 15, lines: tokenize("Preserve log  off", "text") } },
          { title: "80 × 24", sub: "DevTools docked to the side", at: "size", content: { type: "frame", frame: small, size: 6 } },
          { title: "bun test", sub: "5 tests", at: "test", content: { type: "code", size: 15, lines: tokenize("$ bun test\n 5 pass\n 0 fail", "text") } },
        ],
      },
    },
    {
      id: "try",
      kind: "live",
      narration:
        "Here it is on the lesson page. {click}Click the pad first, so the page has focus, {enter}then press Enter to ship. " +
        "{log}text build runs, then vercel deploy uploads the project and Vercel runs the build. {live}Acme Deploys is live.",
      tail: 2.8,
      live: {
        server: "site",
        path: "/learn/shipping",
        pageHeight: 420,
        devtoolsHeight: 480,
        scroll: ".learn-pad",
        scrollMargin: 84,
        // An 80×24 grid, so the camera can frame the whole app.
        storage: { "textjs:viewport": "80x24" },
        actions: [
          { at: "click", click: ".learn-pad" },
          { at: "enter", key: "Enter" },
        ],
        measure: {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          frame: { in: "dt", frame: true, at: "enter+0.6" },
          live: { in: "dt", text: "Acme Deploys is live.", at: "end-0.2" },
        },
      },
      props: {
        url: "textjs.org/learn/shipping",
        clicks: [{ at: "click", target: "pad" }],
        keys: [{ at: "enter", label: "Enter" }],
        shots: [{ at: "enter-0.9", target: "frame", pad: 1.06 }],
        spots: [{ at: "live", until: "end", target: "live", pad: 3 }],
      },
    },
    {
      id: "quiz-1",
      kind: "quiz",
      move: "down",
      narration: `Quick check. {q}${quiz[0]!.question} {+2.2} {answer}A rewrite to index.html. {explain}Static routes are prerendered to their own HTML files. Dynamic segments fall back to the client app in index.html.`,
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
      narration: `{q}And which console setting should be off? {+2.2} {answer}Preserve log. {+0.3} {explain}Text.js clears the console to release old frames, and Preserve log keeps them.`,
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
      tail: 3.4,
      narration:
        "That's the course. Your certificate is at textjs.org/learn/certificate. Add your name, and it's printed on the page and in your console.",
      props: {
        variant: "outro",
        eyebrow: "Course complete",
        title: "Your certificate",
        body: "Printed on the page and in your console, with your name on it.",
        url: "textjs.org/learn/certificate",
        chapter: { number, total: CHAPTERS.length },
      },
    },
  ],
};

export default script;
