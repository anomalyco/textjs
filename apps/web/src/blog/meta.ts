export interface BlogPostMeta {
  slug: string;
  title: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  author: string;
  summary: string;
  /** Optional `brand: turbolog` frontmatter shows the product's lockup above the date. */
  brand?: "turbolog";
}

export const POSTS_META: readonly BlogPostMeta[] = [
  {
    slug: "text-js-1-0",
    title: "Text.js 1.0",
    date: "2026-10-31",
    author: "Adam",
    summary: "React 19 and the App Router, rendered into the DevTools console with one console.log per frame. Text.js 1.0 is stable.",
  },
  {
    slug: "the-inverted-architecture",
    title: "The Inverted Architecture",
    date: "2026-10-31",
    author: "Adam",
    summary: "How a React commit becomes one console.log call in DevTools.",
  },
  {
    slug: "turbolog-eliminating-the-flash",
    title: "Turbolog: eliminating the flash",
    date: "2026-10-20",
    author: "Adam",
    summary: "Clearing the console before every frame left it visibly blank in 70–81% of DevTools paints. Appending frames brought that to 1%, all of it on the first frame.",
    brand: "turbolog",
  },
  {
    slug: "right-to-left-text",
    title: "Right-to-left text in the console",
    date: "2026-10-06",
    author: "Adam",
    summary: "Text.js implements the Unicode Bidirectional Algorithm and passes all 770,241 BidiTest.txt cases. Hebrew and Arabic render in visual order with Arabic shaping, aligned to the cell grid.",
  },
  {
    slug: "keyboard-shortcuts-with-usekeymap",
    title: "Keyboard shortcuts with useKeymap",
    date: "2026-08-25",
    author: "Adam",
    summary: "Declare a binding once with useKeymap, and Text.js routes the key, lists it in a ? help screen, shows it in the footer and adds it to a Ctrl+K command palette.",
  },
  {
    slug: "server-rendering-in-the-console",
    title: "Server rendering in the console",
    date: "2026-06-16",
    author: "Adam",
    summary: "Text.js 0.4 can render a page on the server and stream its frames to the console as cell deltas. Static routes also prerender their first frame into the HTML.",
  },
  {
    slug: "figlet-fonts",
    title: "FIGlet fonts in Text.js",
    date: "2025-12-02",
    author: "Adam",
    summary: "@textjs/font parses FIGlet .flf fonts and lays them out like the figlet program. Its tests replay 273 outputs recorded from figlet 2.2.5, and all of them match.",
  },
  {
    slug: "laying-out-the-console-with-yoga",
    title: "Laying out the console with Yoga",
    date: "2025-06-10",
    author: "Adam",
    summary: "Text.js runs Yoga in WebAssembly with a point scale factor of 1, so every box lands on a whole cell. Text is segmented with Intl.Segmenter and measured in cells.",
  },
  {
    slug: "text-js-0-1",
    title: "Text.js 0.1",
    date: "2025-03-25",
    author: "Adam",
    summary: "Text.js 0.1 brings a React 19 reconciler, Yoga layout and a file-system App Router to apps that render in the DevTools console.",
  },
  {
    slug: "rendering-react-into-console-log",
    title: "Rendering React into console.log",
    date: "2025-02-12",
    author: "Adam",
    summary: "Text.js draws a React app in the DevTools console as one styled console.log call per frame. How a frame is built, and why it is one call.",
  },
];

export function getPostMeta(slug: string): BlogPostMeta | undefined {
  return POSTS_META.find((p) => p.slug === slug);
}

export function postPath(slug: string): string {
  return `/blog/${slug}`;
}

/** `2026-10-31` → `October 31, 2026` (UTC, so prerender and browser agree). */
export function formatPostDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
