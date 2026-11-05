import { msg } from "../i18n/t";
import type { Hint } from "../console-companion/store";

export interface ChapterMeta {
  slug: string;
  title: string;
  /** One line, used on the overview and as the meta description. */
  summary: string;
  minutes: number;
  /** "Then click here and …" */
  action: string;
  hints: readonly Hint[];
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
