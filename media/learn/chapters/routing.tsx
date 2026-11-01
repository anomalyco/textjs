/**
 * Chapter 5 · Routing. Facts come from the course itself (apps/web/src/learn): titles, summaries, code steps and
 * quiz questions are read from course.ts and the chapter markdown, never retyped. Preview frames are real renders of
 * the lesson's layout inside the real App Router (`@textjs/next`'s router, link and navigation, memory history).
 */
import { join } from "node:path";
import type { ReactNode } from "react";
import { CHAPTERS, codeBlocks, getChapter } from "../lib/course";
import { REPO } from "../lib/env";
import { applyDiff, diffLines, fileLines, lineOf, tokenize, type ChapterScript } from "../lib/script";
import { renderFrame, ui } from "../lib/tui";

const { Box, Spacer, Text } = ui;
const router: typeof import("../../../packages/text/src/router") = await import(join(REPO, "packages/text/src/router.tsx"));
const { Link }: typeof import("../../../packages/text/src/link") = await import(join(REPO, "packages/text/src/link.tsx"));
const nav: typeof import("../../../packages/text/src/navigation") = await import(join(REPO, "packages/text/src/navigation.ts"));

const chapter = getChapter("routing")!;
const number = CHAPTERS.indexOf(chapter) + 1;
const next = CHAPTERS[number]!;
const blocks = codeBlocks(chapter);
const [tree, layout, back, params] = blocks as [(typeof blocks)[number], (typeof blocks)[number], (typeof blocks)[number], (typeof blocks)[number]];
const quiz = chapter.quiz;

// The lesson's app/layout.tsx (first step), rendered by the real App Router.
function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  const pathname = nav.usePathname();
  return (
    <Box className="flex-col grow">
      <Box className="flex-row h-1 px-1 gap-2">
        <Text bold>▼ Acme</Text>
        <Text color="subtle">{`acme.local${pathname === "/" ? "" : pathname}`}</Text>
        <Spacer />
      </Box>
      <Box className="flex-row h-1 px-1 gap-3">
        <Link href="/" shortcut="1">
          Overview
        </Link>
        <Link href="/deployments" shortcut="2">
          Deployments
        </Link>
        <Link href="/settings" shortcut="3">
          Settings
        </Link>
      </Box>
      <Box className="flex-col grow p-1">{children}</Box>
    </Box>
  );
}
const page = (title: string) => () => <Text bold>{title}</Text>;
const routes = {
  segment: "",
  layout: { default: RootLayout },
  page: { default: page("Overview") },
  children: [
    { segment: "deployments", page: { default: page("Deployments") }, children: [{ segment: "[id]", page: { default: ({ params }: { params: { id: string } }) => <Text bold>{params.id}</Text> } }] },
    { segment: "settings", page: { default: page("Settings") } },
  ],
};
const at = (url: string, opts: { cols: number; rows: number; keys?: string[] }) =>
  renderFrame(<router.AppRouter routes={routes as never} history={router.createMemoryHistory(url)} errorStore={null} documentTitle={false} />, opts);
const homeFrame = await at("/", { cols: 40, rows: 5 });
const idFrame = await at("/deployments/dpl_8fK2", { cols: 44, rows: 5 });
const smallFrame = await at("/", { cols: 36, rows: 5, keys: ["2"] });

const treeLines = diffLines(tree.source, "text");
const layoutSrc = applyDiff(layout.source);
const layoutLines = fileLines(layoutSrc, "tsx");
const backLines = diffLines(back.source, "tsx");
const idLines = fileLines(params.source, "tsx");
for (const s of ['shortcut="1"', "usePathname()", "{children}", "metadata"]) if (!layoutSrc.includes(s)) throw new Error(`Lesson code changed (${s}): review the layout scene`);

const one = (lines: Array<{ text: string }>, match: string, from = 0): [number, number] => {
  const i = lineOf(lines, match, from);
  return [i, i];
};

const script: ChapterScript = {
  slug: chapter.slug,
  pronounce: {
    "dpl_8fK2": "D P L, 8 F K 2",
    "/deployments/dpl_8fK2": "slash deployments, slash D P L 8 F K 2",
    "/deployments": "slash deployments",
    "/settings": "slash settings",
    "@textjs/next/link": "at textjs slash next slash link",
    "@textjs/next/navigation": "at textjs slash next slash navigation",
    "acme.local": "acme dot local",
    "params.id": "params dot I D",
    "router.back()": "router dot back",
    PageProps: "Page Props",
    usePathname: "use Pathname",
    useRouter: "use Router",
  },
  scenes: [
    {
      id: "cover",
      kind: "title",
      lead: 1.3,
      tail: 1.2,
      narration: `This is Learn Text.js, chapter five: ${chapter.title}.`,
      props: { variant: "cover", title: chapter.title, body: chapter.summary, chapter: { number, total: CHAPTERS.length } },
    },
    {
      id: "how",
      kind: "pipeline",
      narration:
        "In this chapter, you'll split Acme Deploys into routes that share one layout. " +
        "{files}The App Router maps files in the app folder to URLs, exactly like Next.js. " +
        "{router}It matches the current path to a page, {history}and keeps the browser's address bar and history in sync, " +
        "{console}while the UI stays in the console. {statement}Back, forward and deep links all work.",
      tail: 1.4,
      props: {
        eyebrow: "The App Router",
        nodes: [
          { title: "app/", sub: "Folders are segments", at: "files", content: { type: "code", size: 16, lines: tokenize("app/\n  layout.tsx\n  page.tsx\n  deployments/\n    page.tsx", "text") } },
          { title: "Router", sub: "Matches the path", at: "router", content: { type: "code", size: 16, lines: tokenize('usePathname()\n// "/deployments"', "ts") } },
          { title: "History", sub: "The browser's own", at: "history", content: { type: "code", size: 16, lines: tokenize('history.pushState(\n  state, "",\n  "/deployments"\n)', "ts") } },
          { title: "DevTools", sub: "The UI stays here", at: "console", content: { type: "console", frame: smallFrame, size: 13 } },
        ],
        statement: { at: "statement", text: "Back, forward and deep links all work" },
      },
    },
    {
      id: "part-files",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Let's start with files.",
      props: { variant: "section", eyebrow: "Part 1 of 3", title: "Files are routes" },
    },
    {
      id: "tree",
      kind: "editor",
      narration:
        "Folders in app are route segments, and a page.tsx file makes a segment routable. " +
        "{root}The page.tsx at the top renders at [/|slash]. " +
        "{add}Move the list into a deployments folder, {deploy}and its page renders at /deployments. " +
        "{id}A folder name in square brackets is a dynamic segment. This one matches any deployment ID, like dpl_8fK2. " +
        "{settings}And a settings page renders at /settings.",
      tail: 1.6,
      props: {
        file: "app/",
        language: "text",
        mode: "diff",
        lines: treeLines,
        hunks: ["add"],
        settle: "voiceEnd+0.4",
        highlights: [
          { at: "root", until: "add", lines: one(treeLines, "→ /") },
          { at: "deploy", lines: [lineOf(treeLines, "deployments/"), lineOf(treeLines, "→ /deployments")] },
          { at: "id", lines: one(treeLines, "[id]") },
          { at: "settings", until: "end", lines: [lineOf(treeLines, "settings/"), lineOf(treeLines, "→ /settings")] },
        ],
      },
    },
    {
      id: "part-layout",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Next, a layout every page shares.",
      props: { variant: "section", eyebrow: "Part 2 of 3", title: "A shared layout" },
    },
    {
      id: "layout",
      kind: "editor",
      narration:
        "layout.tsx wraps every page, and it stays mounted while you move between them. Put the top bar and the navigation in it. " +
        "{metadata}metadata sets the document title: Acme Deploys by default, and a template for pages that set their own. " +
        "{pathname}usePathname returns the current path, {bar}and the top bar shows it after acme.local. " +
        "{links}Link comes from @textjs/next/link. {shortcut}shortcut binds a single key to each link: one, two and three. " +
        "{children}The current page renders as children, below the navigation. " +
        "{save}Save, and every route renders inside this layout.",
      tail: 2.0,
      props: {
        file: layout.file,
        language: "tsx",
        mode: "write",
        lines: layoutLines,
        appear: 0.3,
        highlights: [
          { at: "metadata", lines: one(layoutLines, "export const metadata") },
          { at: "pathname", lines: one(layoutLines, "usePathname()") },
          { at: "bar", lines: one(layoutLines, "acme.local") },
          { at: "links", lines: one(layoutLines, "import Link") },
          { at: "shortcut", lines: [lineOf(layoutLines, 'shortcut="1"'), lineOf(layoutLines, 'shortcut="3"')] },
          { at: "children", until: "save", lines: one(layoutLines, "{children}") },
        ],
        preview: { at: "save", frame: homeFrame, size: 20 },
      },
    },
    {
      id: "back",
      kind: "editor",
      narration:
        "useRouter navigates from code, with push, replace, back and forward. " +
        "{imports}Import useInput from @textjs/next, {nav}and useRouter next to usePathname. " +
        "{router}Get the router in the layout, {back}and when the key is backspace, call router.back().",
      tail: 1.8,
      props: {
        file: back.file,
        language: "tsx",
        mode: "diff",
        lines: backLines,
        hunks: ["imports", "nav", "router"],
        settle: "voiceEnd+0.6",
        highlights: [{ at: "back+0.2", until: "end", lines: [lineOf(backLines, "useInput((e)"), lineOf(backLines, "router.back()")], focus: true }],
      },
    },
    {
      id: "try",
      kind: "live",
      narration:
        "Here it is, on the lesson page. " +
        "{click}Click the pad first, so the page has focus. " +
        "{k2}Press two for deployments, {k3}and three for settings. {path}The top bar follows the path. " +
        "{back1}Backspace goes back to deployments, {back2}and back again to the overview.",
      tail: 2.2,
      live: {
        server: "site",
        path: "/learn/routing",
        pageHeight: 420,
        devtoolsHeight: 480,
        scroll: ".learn-pad",
        scrollMargin: 84,
        storage: { "textjs:viewport": "fit" },
        actions: [
          { at: "click", click: ".learn-pad" },
          { at: "k2", key: "2" },
          { at: "k3", key: "3" },
          { at: "back1", key: "Backspace" },
          { at: "back2", key: "Backspace" },
        ],
        measure: {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          nav: { in: "dt", text: "1 Overview   2 Deployments   3 Settings", at: 0.2 },
          path: { in: "dt", text: "acme.local/settings", at: "k3+0.6" },
        },
      },
      props: {
        url: "textjs.org/learn/routing",
        clicks: [{ at: "click", target: "pad" }],
        keys: [
          { at: "k2", label: "2" },
          { at: "k3", label: "3" },
          { at: "back1", label: "⌫" },
          { at: "back2", label: "⌫" },
        ],
        shots: [{ at: "k2-1.2", target: "nav", zoom: 1.8, inside: true }],
        spots: [{ at: "path", until: "back1", target: "path", pad: 3 }],
      },
    },
    {
      id: "part-params",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Last, dynamic segments.",
      props: { variant: "section", eyebrow: "Part 3 of 3", title: "Dynamic segments" },
    },
    {
      id: "params",
      kind: "editor",
      narration:
        "A dynamic segment receives its value in params. " +
        "{imports}Import the PageProps type from @textjs/next, {props}and give it the shape of your params. " +
        "{render}Render the ID in bold. " +
        "{save}At /deployments/dpl_8fK2, params.id is dpl_8fK2, inside the same layout. " +
        "{deep}Deep links like this one work with text dev. A static host needs a single SPA rewrite to serve them, and chapter ten covers it.",
      tail: 2.0,
      props: {
        file: params.file,
        language: "tsx",
        mode: "write",
        lines: idLines,
        fontSize: 19,
        appear: 0.3,
        highlights: [
          { at: "imports", lines: [0, 0] },
          { at: "props", lines: one(idLines, "PageProps<") },
          { at: "render", until: "save", lines: one(idLines, "params.id") },
        ],
        preview: { at: "save", frame: idFrame, size: 20, label: "/deployments/dpl_8fK2" },
      },
    },
    {
      id: "quiz-1",
      kind: "quiz",
      move: "down",
      narration: `Quick check. {q}Which file renders at /deployments? {+2.2} {answer}[app/deployments/page.tsx|app, slash deployments, slash page dot T S X]. {explain}Folders are segments, and page.tsx makes a segment routable, as in the Next.js App Router.`,
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
      narration: `{q}And what survives navigation between pages? {+2.2} {answer}Layout state. {+0.3} {explain}Layouts stay mounted while their pages change.`,
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
      narration: "Next, in chapter six, you'll serve deployments from a route handler, fetch them in a page, and post new ones. See you there.",
      props: {
        variant: "outro",
        eyebrow: `Up next · Chapter ${String(number + 1).padStart(2, "0")}`,
        title: next.title,
        size: 128,
        body: next.summary,
        url: `textjs.org/learn/${next.slug}`,
        chapter: { number, total: CHAPTERS.length },
      },
    },
  ],
};

export default script;
