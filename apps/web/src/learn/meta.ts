import { msg } from "../i18n/t";
import type { Hint } from "../console-companion/store";

export interface QuizQuestion {
  question: string;
  options: readonly string[];
  /** Index of the correct option. */
  answer: number;
  /** Shown once answered. */
  explanation: string;
}

export interface ChapterMeta {
  slug: string;
  title: string;
  /** One line, used on the overview and as the meta description. */
  summary: string;
  minutes: number;
  /** "Then click here and …" */
  action: string;
  hints: readonly Hint[];
  quiz: readonly QuizQuestion[];
}

export const COURSE_TITLE = msg("Learn Text.js");
export const COURSE_APP = "Acme Deploys";

export const CHAPTERS_META: readonly ChapterMeta[] = [
  {
    slug: "getting-started",
    title: msg("Getting Started"),
    summary: msg("Create an app, render your first page and respond to a key."),
    minutes: 5,
    action: "press Enter",
    hints: [
      { keys: "Enter", label: "say hello" },
      { keys: "r", label: "reset" },
    ],
    quiz: [
      {
        question: msg("Where does a Text.js app render its UI?"),
        options: [msg("In a <canvas> on the page"), msg("In the DevTools console, via console.log"), msg("In a hidden iframe")],
        answer: 1,
        explanation: msg("Every changed frame is a single console.log of %c-styled spans. The page shows no app UI."),
      },
      {
        question: msg("What does an idle app log?"),
        options: [msg("One frame per second"), msg("One frame per animation frame"), msg("Nothing")],
        answer: 2,
        explanation: msg("If no cell changed, the renderer returns before it builds a string, so nothing is logged."),
      },
    ],
  },
  {
    slug: "layout",
    title: msg("Layout with Box"),
    summary: msg("Build the dashboard shell with Flexbox in cells: a top bar, a sidebar and cards."),
    minutes: 7,
    action: "press s",
    hints: [
      { keys: "s", label: "sidebar" },
      { keys: "d", label: "direction" },
    ],
    quiz: [
      {
        question: msg("In className utilities, what does p-1 mean?"),
        options: [msg("1 pixel of padding"), msg("1 cell of padding"), msg("1rem of padding")],
        answer: 1,
        explanation: msg("Units are terminal cells: one column horizontally, one row vertically."),
      },
      {
        question: msg("Which class lets a box take the remaining space?"),
        options: ["grow", "w-full", "flex-1-auto"],
        answer: 0,
        explanation: msg("grow sets flexGrow: 1, exactly as in CSS Flexbox. Yoga does the layout."),
      },
    ],
  },
  {
    slug: "styling",
    title: msg("Text & Styling"),
    summary: msg("Style a deployment card with colors, text attributes and theme tokens."),
    minutes: 6,
    action: "press t",
    hints: [
      { keys: "t", label: "theme" },
      { keys: "s", label: "status" },
    ],
    quiz: [
      {
        question: 'Why use color="success" instead of a hex value?',
        options: [msg("It renders faster"), msg("Theme tokens follow the active theme"), msg("Hex colors aren't supported")],
        answer: 1,
        explanation: msg("Tokens resolve against the current theme, so switching themes recolors every token."),
      },
      {
        question: 'What does wrap="truncate-end" do?',
        options: [msg("Hides the text"), msg("Ends overflowing text with …"), msg("Wraps onto the next row")],
        answer: 1,
        explanation: msg("The line stays one row tall and ends with an ellipsis."),
      },
    ],
  },
  {
    slug: "input-and-keymaps",
    title: msg("Input & Keymaps"),
    summary: msg("Navigate deployments with the keyboard and add a ? help overlay."),
    minutes: 8,
    action: "press ↓",
    hints: [
      { keys: "↑ ↓", label: "select" },
      { keys: "Enter", label: "details" },
      { keys: "?", label: "shortcuts" },
    ],
    quiz: [
      {
        question: 'In useKeymap, what does the binding "g g" mean?',
        options: [msg("g or g"), msg("g, then g again"), "Shift+G"],
        answer: 1,
        explanation: msg("Space-separated strokes are a sequence; commas separate alternatives."),
      },
      {
        question: msg("Why do you click the page before typing?"),
        options: [msg("To unlock audio"), msg("Keys typed into the DevTools prompt never reach the page"), msg("To start the renderer")],
        answer: 1,
        explanation: msg("Keystrokes arrive through a hidden input on the page, so the page needs focus."),
      },
    ],
  },
  {
    slug: "routing",
    title: msg("Routing"),
    summary: msg("Split the app into routes with a shared layout, links with shortcuts and history."),
    minutes: 8,
    action: "press 2",
    hints: [
      { keys: "1 2 3", label: "navigate" },
      { keys: "⌫", label: "back" },
    ],
    quiz: [
      {
        question: msg("Which file renders at /deployments?"),
        options: ["app/deployments.tsx", "app/deployments/page.tsx", "pages/deployments/index.tsx"],
        answer: 1,
        explanation: msg("Folders are segments and page.tsx makes a segment routable, as in the Next.js App Router."),
      },
      {
        question: msg("What survives navigation between pages?"),
        options: [msg("Layout state"), msg("Nothing"), msg("Page state")],
        answer: 0,
        explanation: msg("Layouts stay mounted while their pages change."),
      },
    ],
  },
  {
    slug: "data-fetching",
    title: msg("Data & Route Handlers"),
    summary: msg("Serve deployments from app/api, fetch them in a page and post new ones."),
    minutes: 8,
    action: "press r",
    hints: [
      { keys: "r", label: "refetch" },
      { keys: "n", label: "new deployment" },
    ],
    quiz: [
      {
        question: msg("What do route handlers return?"),
        options: [msg("A Web Response"), msg("A React element"), msg("A console.log call")],
        answer: 0,
        explanation: msg("Handlers use the Web Request and Response APIs, including ReadableStream for streaming."),
      },
      {
        question: msg("Which file is shown while a route suspends?"),
        options: ["error.tsx", "loading.tsx", "suspense.tsx"],
        answer: 1,
        explanation: msg("loading.tsx wraps the page in a Suspense boundary; error.tsx catches throws."),
      },
    ],
  },
  {
    slug: "components",
    title: msg("Table, List & Charts"),
    summary: msg("Replace hand-rolled rows with a sortable Table and a chart that never shifts the layout."),
    minutes: 7,
    action: "press s",
    hints: [
      { keys: "↑ ↓", label: "rows" },
      { keys: "s", label: "sort" },
      { keys: "c", label: "chart" },
    ],
    quiz: [
      {
        question: msg("With a sortable Table focused, what does s do?"),
        options: [msg("Selects the row"), msg("Cycles the sort column"), msg("Saves the table")],
        answer: 1,
        explanation: msg("s cycles the sort column, S flips the direction, and digits pick a column."),
      },
      {
        question: msg("Why give the chart box a fixed height?"),
        options: [msg("Charts require it"), msg("So switching charts doesn't move the table"), msg("To enable color")],
        answer: 1,
        explanation: msg("A fixed height keeps the table in place, so its rows don't change and aren't re-encoded."),
      },
    ],
  },
  {
    slug: "testing",
    title: msg("Testing"),
    summary: msg("Render offscreen, press keys and assert on the frame as text."),
    minutes: 6,
    action: "press Enter",
    hints: [
      { keys: "Enter", label: "run tests" },
      { keys: "f", label: "break a test" },
    ],
    quiz: [
      {
        question: msg("What does @textjs/app/testing need to run?"),
        options: [msg("Chrome with DevTools open"), msg("Any test runner with async tests"), msg("A real terminal")],
        answer: 1,
        explanation: msg("It renders offscreen into a cell buffer, without a browser or DevTools."),
      },
      {
        question: msg("What does app.lastFrame() return?"),
        options: [msg("The frame as plain text"), msg("A screenshot"), msg("The console.log arguments")],
        answer: 0,
        explanation: msg("Frames are trimmed on the right and at the bottom, so they make stable assertions and snapshots."),
      },
    ],
  },
  {
    slug: "terminal",
    title: msg("Running in a Terminal"),
    summary: msg("Run the same dashboard full-screen in a terminal with text run."),
    minutes: 5,
    action: "press Enter",
    hints: [
      { keys: "Enter", label: "text run" },
      { keys: "↑ ↓", label: "select" },
      { keys: "q", label: "quit" },
    ],
    quiz: [
      {
        question: msg("What changes when the app runs in a terminal?"),
        options: [msg("Your components"), msg("Only the output: ANSI instead of %c spans"), msg("The router")],
        answer: 1,
        explanation: msg("Layout, components, keymaps and route handlers are shared. The terminal output is ANSI instead of %c spans."),
      },
      {
        question: msg("How does an app quit itself?"),
        options: ["process.exit()", "useApp().exit()", "console.clear()"],
        answer: 1,
        explanation: msg("exit() unmounts the app and restores the terminal."),
      },
    ],
  },
  {
    slug: "shipping",
    title: msg("Shipping"),
    summary: msg("Build, set metadata and deploy Acme Deploys."),
    minutes: 4,
    action: "press Enter",
    hints: [
      { keys: "Enter", label: "deploy" },
      { keys: "r", label: "reset" },
    ],
    quiz: [
      {
        question: msg("What does a static host need for dynamic routes?"),
        options: [msg("Nothing"), msg("A rewrite to index.html"), msg("A route per page")],
        answer: 1,
        explanation: msg("Static routes are prerendered to their own HTML files. Dynamic segments fall back to the client app in index.html."),
      },
      {
        question: msg("Which console setting should be off?"),
        options: [msg("Preserve log"), msg("Show timestamps"), msg("Autocomplete")],
        answer: 0,
        explanation: msg("Text.js clears the console to release old frames. With Preserve log on, DevTools ignores the clear."),
      },
    ],
  },
];

export const TOTAL_MINUTES = CHAPTERS_META.reduce((n, c) => n + c.minutes, 0);
/** Course length rounded to five minutes, for prose. */
export const ABOUT_MINUTES = Math.round(TOTAL_MINUTES / 5) * 5;

export function getChapterMeta(slug: string): ChapterMeta | undefined {
  return CHAPTERS_META.find((c) => c.slug === slug);
}

export function chapterIndex(slug: string): number {
  return CHAPTERS_META.findIndex((c) => c.slug === slug);
}

export function chapterNumber(slug: string): string {
  return String(chapterIndex(slug) + 1).padStart(2, "0");
}

export function learnPath(slug = ""): string {
  return slug ? `/learn/${slug}` : "/learn";
}

export const COMPLETE_SLUG = "certificate";

/** Overview and certificate keys in the console. */
export const OVERVIEW_HINTS: { action: string; hints: readonly Hint[] } = {
  action: "press ↓",
  hints: [
    { keys: "↑ ↓", label: "chapters" },
    { keys: "Enter", label: "open" },
  ],
};

export const CERTIFICATE_HINTS: { action: string; hints: readonly Hint[] } = {
  action: "press t",
  hints: [{ keys: "t", label: "theme" }],
};

export function learnHints(slug: string): { action: string; hints: readonly Hint[] } {
  if (slug === COMPLETE_SLUG) return CERTIFICATE_HINTS;
  return getChapterMeta(slug) ?? OVERVIEW_HINTS;
}

/** Slug of the learn page at `pathname` ("" = overview), or `null` outside /learn. */
export function learnSlugForPath(pathname: string): string | null {
  if (pathname === "/learn") return "";
  const m = /^\/learn\/([^/]+)$/.exec(pathname);
  return m ? (m[1] as string) : null;
}
