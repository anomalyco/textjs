/**
 * Chapter 6 · Data & Route Handlers. Facts come from the course itself (apps/web/src/learn): titles, summaries, code
 * steps and quiz questions are read from course.ts and the chapter markdown, never retyped. The console-prompt scene
 * films a real `text dev` project serving the lesson's route handler; the streaming example is the one in the
 * Route Handlers docs.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHAPTERS, codeBlocks, getChapter } from "../lib/course";
import { REPO } from "../lib/env";
import { applyDiff, diffLines, fileLines, lineOf, tokenize, type ChapterScript } from "../lib/script";
import { renderFrame, ui } from "../lib/tui";

const { Box, Spinner, Text } = ui;
const acme: typeof import("../../../apps/web/src/learn/apps/acme") = await import(join(REPO, "apps/web/src/learn/apps/acme.tsx"));
const { DEPLOYMENTS, Status } = acme;

const chapter = getChapter("data-fetching")!;
const number = CHAPTERS.indexOf(chapter) + 1;
const next = CHAPTERS[number]!;
const blocks = codeBlocks(chapter);
const [handler, prompt, page, loading] = blocks as [(typeof blocks)[number], (typeof blocks)[number], (typeof blocks)[number], (typeof blocks)[number]];
const quiz = chapter.quiz;
if (prompt.language !== "js" || !prompt.source.includes('fetch("/api/deployments")')) throw new Error("Lesson code changed: review the prompt scene");

// The streaming example from the Route Handlers docs.
const docs = readFileSync(join(REPO, "apps/web/src/docs/content/route-handlers.md"), "utf8");
const ticks = /```ts@(app\/api\/ticks\/route\.ts)\n([\s\S]*?)\n```/.exec(docs);
if (!ticks || !ticks[2]!.includes("ReadableStream")) throw new Error("Route Handlers docs changed: review the stream scene");
const streamLines = fileLines(ticks[2]!, "ts");

const handlerSrc = applyDiff(handler.source);
const handlerLines = fileLines(handlerSrc, "ts");
const pageLines = diffLines(page.source, "tsx");
const loadingLines = fileLines(loading.source, "tsx");

// Frames, rendered by Text.js itself.
const rowsFrame = await renderFrame(
  <Box className="flex-col">
    {DEPLOYMENTS.slice(0, 4).map((d) => (
      <Box key={d.id} className="flex-row h-1 gap-2">
        <Box width={11} flexShrink={0}>
          <Status status={d.status} />
        </Box>
        <Text color="muted" wrap="truncate-end">
          {d.id}
        </Text>
      </Box>
    ))}
  </Box>,
  { cols: 22, rows: 4 },
);
const spinnerFrame = await renderFrame(<Spinner label="Loading deployments…" />, { cols: 24, rows: 1 });

// The real project the prompt scene films: chapter 5's layout, the lesson's route handler and the course's data.
const routingLayout = applyDiff(codeBlocks(getChapter("routing")!)[1]!.source);
const libDeployments = `export type DeployStatus = "ready" | "building" | "error" | "queued";

export interface Deployment {
  id: string;
  project: string;
  branch: string;
  commit: string;
  status: DeployStatus;
  region: string;
  duration: number;
  age: string;
}

export const DEPLOYMENTS: Deployment[] = ${JSON.stringify(DEPLOYMENTS, null, 2)};

export function createDeployment(input: Partial<Deployment>): Deployment {
  const deployment: Deployment = { id: \`dpl_\${Math.random().toString(36).slice(2, 6)}\`, project: "acme-web", branch: "main", commit: "feat: POST /api/deployments", status: "building", region: "iad1", duration: 0, age: "now", ...input };
  DEPLOYMENTS.unshift(deployment);
  return deployment;
}
`;
const overview = `import { Text } from "@textjs/app";

export default function Page() {
  return <Text bold>Overview</Text>;
}
`;

const one = (lines: Array<{ text: string }>, match: string, from = 0): [number, number] => {
  const i = lineOf(lines, match, from);
  return [i, i];
};

const script: ChapterScript = {
  slug: chapter.slug,
  pronounce: {
    "app/api/deployments/route.ts": "app, slash A P I, slash deployments, slash route dot T S",
    "/api/deployments": "slash A P I slash deployments",
    "route.ts": "route dot T S",
    "loading.tsx": "loading dot T S X",
    "error.tsx": "error dot T S X",
    "Response.json": "Response dot JSON",
    ReadableStream: "Readable Stream",
    useEffect: "use Effect",
    CORS: "cors",
    "201": "two oh one",
  },
  scenes: [
    {
      id: "cover",
      kind: "title",
      lead: 1.3,
      tail: 1.2,
      narration: "This is Learn Text.js, chapter six: [Data & Route Handlers|Data and Route Handlers].",
      props: { variant: "cover", title: chapter.title, size: 132, body: chapter.summary, chapter: { number, total: CHAPTERS.length } },
    },
    {
      id: "how",
      kind: "pipeline",
      narration:
        "Acme Deploys needs real data. {page}A page fetches it from its own origin, {handler}and a route handler in the app folder answers. " +
        "{response}Handlers use the Web Request and Response APIs, {console}and they run on text dev and text start. " +
        "{statement}Same origin, so no CORS.",
      tail: 1.4,
      props: {
        eyebrow: "Route handlers",
        nodes: [
          { title: "Page", sub: "Fetches its own origin", at: "page", content: { type: "code", size: 16, lines: tokenize('fetch(\n  "/api/deployments"\n)', "ts") } },
          { title: "route.ts", sub: "In app/api/deployments", at: "handler", content: { type: "code", size: 16, lines: tokenize("export function GET() {\n  return Response.json(\n    DEPLOYMENTS\n  );\n}", "ts") } },
          { title: "Response", sub: "The Web API", at: "response", content: { type: "code", size: 16, lines: tokenize("200 OK\ncontent-type:\n  application/json", "text") } },
          { title: "DevTools", sub: "Rows in the console", at: "console", content: { type: "console", frame: rowsFrame, size: 14 } },
        ],
        statement: { at: "statement", text: "Same origin, so no CORS" },
      },
    },
    {
      id: "part-handler",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "First, a route handler.",
      props: { variant: "section", eyebrow: "Part 1 of 3", title: "A route handler" },
    },
    {
      id: "handler",
      kind: "editor",
      narration:
        "Route handlers live next to your pages. Create app/api/deployments/route.ts. " +
        "{imports}It imports the deployments, and a helper that creates one. " +
        "{get}Export a function for each HTTP method you handle. GET returns the list with Response.json. " +
        "{post}POST reads the JSON body of the request and creates a deployment, {status}then answers with status 201.",
      tail: 1.8,
      props: {
        file: handler.file,
        language: "ts",
        mode: "write",
        lines: handlerLines,
        appear: 0.3,
        highlights: [
          { at: "imports", lines: [0, 0] },
          { at: "get", lines: [lineOf(handlerLines, "export function GET"), lineOf(handlerLines, "Response.json(DEPLOYMENTS)")] },
          { at: "post", lines: [lineOf(handlerLines, "export async function POST"), lineOf(handlerLines, "createDeployment(")] },
          { at: "status", until: "end", lines: one(handlerLines, "status: 201") },
        ],
      },
    },
    {
      id: "prompt",
      kind: "live",
      narration:
        "While text dev is running, you can call it from the console prompt. " +
        "{type}Fetch /api/deployments and await the JSON. " +
        "{result}The handler answers with an array. {expand}Expand it, and there's one object per deployment.",
      tail: 2.4,
      live: {
        server: "starter",
        path: "/",
        pageHeight: 300,
        devtoolsHeight: 560,
        files: { "lib/deployments.ts": libDeployments, [handler.file!]: handlerSrc, "app/layout.tsx": routingLayout, "app/page.tsx": overview },
        actions: [
          { at: "type", prompt: prompt.source.trim() },
          { at: "expand-0.2", dtClick: ".console-user-command-result .console-message-text" },
        ],
        measure: {
          result: { in: "dt", frame: true, at: "result+0.4" },
        },
      },
      props: {
        url: "localhost:3000",
        shots: [{ at: "type-1.0", target: "result", zoom: 1.7, inside: true }],
        spots: [{ at: "result", until: "expand", target: "result", pad: 4 }],
      },
    },
    {
      id: "part-page",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Next, fetch in a page.",
      props: { variant: "section", eyebrow: "Part 2 of 3", title: "Fetching in a page" },
    },
    {
      id: "page",
      kind: "editor",
      narration:
        "Now the deployments page asks the handler for its rows. " +
        "{imports}Swap the static import for React's hooks, Spinner and useInput, and the Deployment type. " +
        "{state}Keep the rows and a loading flag in state. {refetch}refetch sets loading, fetches the list, and stores it. " +
        "{effect}An effect runs it once, when the page mounts. " +
        "{keys}Press [r|R] to refetch, {post}or n to post a new deployment and then refetch. " +
        "{spinner}While loading, show a Spinner. {rows}Then render the rows, {status}each with its status.",
      tail: 1.8,
      props: {
        file: page.file,
        language: "tsx",
        mode: "diff",
        lines: pageLines,
        hunks: ["imports", "state", "rows", "status"],
        settle: "voiceEnd+0.6",
        highlights: [
          { at: "refetch", lines: [lineOf(pageLines, "const refetch"), lineOf(pageLines, "setLoading(false)") + 1] },
          { at: "effect", lines: one(pageLines, "useEffect(() =>") },
          { at: "keys", lines: one(pageLines, 'e.input === "r"') },
          { at: "post", lines: one(pageLines, 'e.input === "n"') },
          { at: "spinner", lines: one(pageLines, "if (loading)") },
          { at: "rows+0.6", until: "end", lines: one(pageLines, "<Status") },
        ],
      },
    },
    {
      id: "try",
      kind: "live",
      narration:
        "Here it is, on the lesson page. " +
        "{click}Click the pad first, so the page has focus. " +
        "{r}Press [r|R] to refetch, and {spin}a spinner shows while the data loads. " +
        "To post a new deployment, press n. {building}It shows up as building, {ready}and turns ready once the build finishes.",
      tail: 2.4,
      live: {
        server: "site",
        path: "/learn/data-fetching",
        pageHeight: 420,
        devtoolsHeight: 480,
        scroll: ".learn-pad",
        scrollMargin: 84,
        storage: { "textjs:viewport": "fit" },
        actions: [
          { at: "click", click: ".learn-pad" },
          { at: "spin-0.4", key: "r" },
          { at: "building-0.5", key: "n" },
        ],
        measure: {
          pad: { in: "site", selector: ".learn-pad", at: 0.2 },
          top: { in: "dt", text: "acme.local/deployments", at: 0.2 },
          created: { in: "dt", text: "feat: POST /api/deployments", at: "building" },
        },
      },
      props: {
        url: "textjs.org/learn/data-fetching",
        clicks: [{ at: "click", target: "pad" }],
        keys: [
          { at: "spin-0.4", label: "R" },
          { at: "building-0.5", label: "N" },
        ],
        shots: [{ at: "r-1.2", target: "top", zoom: 1.7, inside: true }],
      },
    },
    {
      id: "part-states",
      kind: "title",
      move: "down",
      lead: 1.0,
      min: 4.8,
      narration: "Last, loading and error states.",
      props: { variant: "section", eyebrow: "Part 3 of 3", title: "Loading and errors" },
    },
    {
      id: "loading",
      kind: "editor",
      narration:
        "Instead of tracking loading by hand, add a loading.tsx next to the page. {shown}It's shown while the page suspends. " +
        "{error}An error.tsx next to it catches anything the page throws. " +
        "{plain}Both are plain components. This one returns the same Spinner.",
      tail: 2.0,
      props: {
        file: loading.file,
        language: "tsx",
        mode: "write",
        lines: loadingLines,
        appear: 0.3,
        highlights: [{ at: "plain+1.2", until: "end", lines: one(loadingLines, "<Spinner") }],
        preview: { at: "shown", frame: spinnerFrame, size: 26, label: "While the page suspends" },
      },
    },
    {
      id: "stream",
      kind: "editor",
      narration:
        "Handlers can also return a ReadableStream. {sse}This example from the docs sends a server-sent event every second. " +
        "{logs}It's how build logs stream into the dashboard, line by line. " +
        "{docs}The Route Handlers docs also cover proxying a local daemon.",
      tail: 1.8,
      props: {
        file: ticks[1],
        language: "ts",
        mode: "write",
        lines: streamLines,
        appear: 0.3,
        highlights: [
          { at: 0.9, until: "sse", lines: [lineOf(streamLines, "new ReadableStream"), lineOf(streamLines, "});")] },
          { at: "sse", until: "logs", lines: one(streamLines, "c.enqueue") },
          { at: "logs", until: "end", lines: one(streamLines, "return new Response(stream") },
        ],
      },
    },
    {
      id: "quiz-1",
      kind: "quiz",
      move: "down",
      narration: `Quick check. {q}${quiz[0]!.question} {+2.2} {answer}A Web Response. {explain}Handlers use the Web Request and Response APIs, including ReadableStream for streaming.`,
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
      narration: `{q}And which file is shown while a route suspends? {+2.2} {answer}loading.tsx. {+0.3} {explain}It wraps the page in a Suspense boundary, and error.tsx catches throws.`,
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
      narration: "Next, in chapter seven, you'll replace the hand-rolled rows with a sortable Table, and add a chart that never shifts the layout. See you there.",
      props: {
        variant: "outro",
        eyebrow: `Up next · Chapter ${String(number + 1).padStart(2, "0")}`,
        title: next.title,
        size: 132,
        body: next.summary,
        url: `textjs.org/learn/${next.slug}`,
        chapter: { number, total: CHAPTERS.length },
      },
    },
  ],
};

export default script;
