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

export const COURSE_TITLE = "Learn Text.js";
export const COURSE_APP = "Acme Deploys";

export const CHAPTERS_META: readonly ChapterMeta[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    summary: "Create an app, render your first page and respond to a key.",
    minutes: 5,
    action: "press Enter",
    hints: [
      { keys: "Enter", label: "say hello" },
      { keys: "r", label: "reset" },
    ],
    quiz: [
      {
        question: "Where does a Text.js app render its UI?",
        options: ["In a <canvas> on the page", "In the DevTools console, via console.log", "In a hidden iframe"],
        answer: 1,
        explanation: "Every changed frame is a single console.log of %c-styled spans. The page shows no app UI.",
      },
      {
        question: "What does an idle app log?",
        options: ["One frame per second", "One frame per animation frame", "Nothing"],
        answer: 2,
        explanation: "If no cell changed, nothing is allocated and nothing is logged.",
      },
    ],
  },
  {
    slug: "layout",
    title: "Layout with Box",
    summary: "Build the dashboard shell with Flexbox in cells: a top bar, a sidebar and cards.",
    minutes: 7,
    action: "press s",
    hints: [
      { keys: "s", label: "sidebar" },
      { keys: "d", label: "direction" },
    ],
    quiz: [
      {
        question: "In className utilities, what does p-1 mean?",
        options: ["1 pixel of padding", "1 cell of padding", "1rem of padding"],
        answer: 1,
        explanation: "Units are terminal cells: one column horizontally, one row vertically.",
      },
      {
        question: "Which class lets a box take the remaining space?",
        options: ["grow", "w-full", "flex-1-auto"],
        answer: 0,
        explanation: "grow sets flexGrow: 1, exactly as in CSS Flexbox. Yoga does the layout.",
      },
    ],
  },
  {
    slug: "styling",
    title: "Text & Styling",
    summary: "Colors, attributes and theme tokens for a deployment card with live status.",
    minutes: 6,
    action: "press t",
    hints: [
      { keys: "t", label: "theme" },
      { keys: "s", label: "status" },
    ],
    quiz: [
      {
        question: 'Why use color="success" instead of a hex value?',
        options: ["It renders faster", "Theme tokens follow the active theme", "Hex colors aren't supported"],
        answer: 1,
        explanation: "Tokens resolve against the current theme, so switching themes repaints everything consistently.",
      },
      {
        question: 'What does wrap="truncate-end" do?',
        options: ["Hides the text", "Ends overflowing text with …", "Wraps onto the next row"],
        answer: 1,
        explanation: "The line stays one row tall and ends with an ellipsis.",
      },
    ],
  },
  {
    slug: "input-and-keymaps",
    title: "Input & Keymaps",
    summary: "Navigate deployments with the keyboard and add a ? help overlay.",
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
        options: ["g or g", "g, then g again", "Shift+G"],
        answer: 1,
        explanation: "Space-separated strokes are a sequence; commas separate alternatives.",
      },
      {
        question: "Why do you click the page before typing?",
        options: ["To unlock audio", "Keys typed into the DevTools prompt never reach the page", "To start the renderer"],
        answer: 1,
        explanation: "Keystrokes arrive through a hidden input on the page, so the page needs focus.",
      },
    ],
  },
  {
    slug: "routing",
    title: "Routing",
    summary: "Split the app into routes with a shared layout, links with shortcuts and history.",
    minutes: 8,
    action: "press 2",
    hints: [
      { keys: "1 2 3", label: "navigate" },
      { keys: "⌫", label: "back" },
    ],
    quiz: [
      {
        question: "Which file renders at /deployments?",
        options: ["app/deployments.tsx", "app/deployments/page.tsx", "pages/deployments/index.tsx"],
        answer: 1,
        explanation: "Folders are segments and page.tsx makes a segment routable, as in the Next.js App Router.",
      },
      {
        question: "What survives navigation between pages?",
        options: ["Layout state", "Nothing", "Page state"],
        answer: 0,
        explanation: "Layouts stay mounted while their pages change.",
      },
    ],
  },
  {
    slug: "data-fetching",
    title: "Data & Route Handlers",
    summary: "Serve deployments from app/api, fetch them in a page and post new ones.",
    minutes: 8,
    action: "press r",
    hints: [
      { keys: "r", label: "refetch" },
      { keys: "n", label: "new deployment" },
    ],
    quiz: [
      {
        question: "What do route handlers return?",
        options: ["A Web Response", "A React element", "A console.log call"],
        answer: 0,
        explanation: "Handlers use the Web Request and Response APIs, including ReadableStream for streaming.",
      },
      {
        question: "Which file is shown while a route suspends?",
        options: ["error.tsx", "loading.tsx", "suspense.tsx"],
        answer: 1,
        explanation: "loading.tsx wraps the page in a Suspense boundary; error.tsx catches throws.",
      },
    ],
  },
  {
    slug: "components",
    title: "Table, List & Charts",
    summary: "Replace hand-rolled rows with a sortable Table and a chart that never shifts the layout.",
    minutes: 7,
    action: "press s",
    hints: [
      { keys: "↑ ↓", label: "rows" },
      { keys: "s", label: "sort" },
      { keys: "c", label: "chart" },
    ],
    quiz: [
      {
        question: "With a sortable Table focused, what does s do?",
        options: ["Selects the row", "Cycles the sort column", "Saves the table"],
        answer: 1,
        explanation: "s cycles the sort column, S flips the direction, and digits pick a column.",
      },
      {
        question: "Why give the chart box a fixed height?",
        options: ["Charts require it", "So switching charts doesn't move the table", "To enable color"],
        answer: 1,
        explanation: "Rows that don't change aren't re-encoded or logged.",
      },
    ],
  },
  {
    slug: "testing",
    title: "Testing",
    summary: "Render offscreen, press keys and assert on the frame as text.",
    minutes: 6,
    action: "press Enter",
    hints: [
      { keys: "Enter", label: "run tests" },
      { keys: "f", label: "break a test" },
    ],
    quiz: [
      {
        question: "What does @textjs/react/testing need to run?",
        options: ["Chrome with DevTools open", "Any test runner with async tests", "A real terminal"],
        answer: 1,
        explanation: "It renders offscreen into a cell buffer, without a browser or DevTools.",
      },
      {
        question: "What does app.lastFrame() return?",
        options: ["The frame as plain text", "A screenshot", "The console.log arguments"],
        answer: 0,
        explanation: "Frames are trimmed on the right and at the bottom, so they make stable assertions and snapshots.",
      },
    ],
  },
  {
    slug: "terminal",
    title: "Running in a Terminal",
    summary: "Run the same dashboard full-screen in a terminal with text run.",
    minutes: 5,
    action: "press Enter",
    hints: [
      { keys: "Enter", label: "text run" },
      { keys: "↑ ↓", label: "select" },
      { keys: "q", label: "quit" },
    ],
    quiz: [
      {
        question: "What changes when the app runs in a terminal?",
        options: ["Your components", "Only the output: ANSI instead of %c spans", "The router"],
        answer: 1,
        explanation: "Layout, components, keymaps and route handlers are shared. The terminal output is ANSI instead of %c spans.",
      },
      {
        question: "How does an app quit itself?",
        options: ["process.exit()", "useApp().exit()", "console.clear()"],
        answer: 1,
        explanation: "exit() unmounts the app and restores the terminal.",
      },
    ],
  },
  {
    slug: "shipping",
    title: "Shipping",
    summary: "Build, set metadata and deploy Acme Deploys.",
    minutes: 4,
    action: "press Enter",
    hints: [
      { keys: "Enter", label: "deploy" },
      { keys: "r", label: "reset" },
    ],
    quiz: [
      {
        question: "What does a static host need to serve deep links?",
        options: ["Nothing", "One SPA rewrite to index.html", "A route per page"],
        answer: 1,
        explanation: "Every route is rendered by the same client, so every path serves index.html.",
      },
      {
        question: "Which console setting should be off?",
        options: ["Preserve log", "Show timestamps", "Autocomplete"],
        answer: 0,
        explanation: "Text.js clears the console to release old frames. With Preserve log on, DevTools ignores the clear.",
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
