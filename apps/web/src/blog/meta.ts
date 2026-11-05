import { msg } from "../i18n/t";

export interface BlogPostMeta {
  slug: string;
  title: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  author: string;
  /** Optional `brand: turbolog` frontmatter shows the product's lockup above the date. */
  brand?: "turbolog";
}

export const POSTS_META: readonly BlogPostMeta[] = [
  {
    slug: "text-js-1-0",
    title: msg("Text.js 1.0"),
    date: "2026-10-31",
    author: "Adam",
  },
  {
    slug: "the-inverted-architecture",
    title: msg("The Inverted Architecture"),
    date: "2026-10-31",
    author: "Adam",
  },
  {
    slug: "turbolog-eliminating-the-flash",
    title: msg("Turbolog: eliminating the flash"),
    date: "2026-10-20",
    author: "Adam",
    brand: "turbolog",
  },
  {
    slug: "right-to-left-text",
    title: msg("Right-to-left text in the console"),
    date: "2026-10-06",
    author: "Adam",
  },
  {
    slug: "keyboard-shortcuts-with-usekeymap",
    title: msg("Keyboard shortcuts with useKeymap"),
    date: "2026-08-25",
    author: "Adam",
  },
  {
    slug: "server-rendering-in-the-console",
    title: msg("Server rendering in the console"),
    date: "2026-06-16",
    author: "Adam",
  },
  {
    slug: "figlet-fonts",
    title: msg("FIGlet fonts in Text.js"),
    date: "2025-12-02",
    author: "Adam",
  },
  {
    slug: "laying-out-the-console-with-yoga",
    title: msg("Laying out the console with Yoga"),
    date: "2025-06-10",
    author: "Adam",
  },
  {
    slug: "text-js-0-1",
    title: msg("Text.js 0.1"),
    date: "2025-03-25",
    author: "Adam",
  },
  {
    slug: "rendering-react-into-console-log",
    title: msg("Rendering React into console.log"),
    date: "2025-02-12",
    author: "Adam",
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
