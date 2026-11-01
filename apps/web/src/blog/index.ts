import textJs10 from "./text-js-1-0.md?raw";
import turbolog from "./turbolog-eliminating-the-flash.md?raw";
import inverted from "./the-inverted-architecture.md?raw";
import rightToLeft from "./right-to-left-text.md?raw";
import useKeymap from "./keyboard-shortcuts-with-usekeymap.md?raw";
import serverRendering from "./server-rendering-in-the-console.md?raw";
import figlet from "./figlet-fonts.md?raw";
import yoga from "./laying-out-the-console-with-yoga.md?raw";
import textJs01 from "./text-js-0-1.md?raw";
import consoleLog from "./rendering-react-into-console-log.md?raw";

export interface BlogPost {
  slug: string;
  title: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  author: string;
  summary: string;
  /** Optional `brand: turbolog` frontmatter shows the product's lockup above the date. */
  brand?: "turbolog";
  markdown: string;
}

/** Split `---` frontmatter (flat `key: value` pairs, optionally quoted) from the body. */
export function parseFrontmatter(source: string): { data: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!m) return { data: {}, body: source };
  const data: Record<string, string> = {};
  for (const line of (m[1] as string).split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    let value = line.slice(i + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    data[line.slice(0, i).trim()] = value;
  }
  return { data, body: source.slice(m[0].length) };
}

function post(slug: string, source: string): BlogPost {
  const { data, body } = parseFrontmatter(source);
  for (const key of ["title", "date", "author", "summary"]) {
    if (!data[key]) throw new Error(`blog/${slug}.md is missing "${key}" in its frontmatter`);
  }
  if (data.brand !== undefined && data.brand !== "turbolog") throw new Error(`blog/${slug}.md has an unknown brand "${data.brand}"`);
  return { slug, title: data.title as string, date: data.date as string, author: data.author as string, summary: data.summary as string, ...(data.brand ? { brand: "turbolog" as const } : {}), markdown: body.trim() };
}

/** Newest first; posts on the same day keep the order listed here. */
export const POSTS: readonly BlogPost[] = [
  post("text-js-1-0", textJs10),
  post("turbolog-eliminating-the-flash", turbolog),
  post("the-inverted-architecture", inverted),
  post("right-to-left-text", rightToLeft),
  post("keyboard-shortcuts-with-usekeymap", useKeymap),
  post("server-rendering-in-the-console", serverRendering),
  post("figlet-fonts", figlet),
  post("laying-out-the-console-with-yoga", yoga),
  post("text-js-0-1", textJs01),
  post("rendering-react-into-console-log", consoleLog),
]
  .map((p, i) => ({ p, i }))
  .sort((a, b) => b.p.date.localeCompare(a.p.date) || a.i - b.i)
  .map(({ p }) => p);

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function postPath(slug: string): string {
  return `/blog/${slug}`;
}

/** `2026-10-31` → `October 31, 2026` (UTC, so prerender and browser agree). */
export function formatPostDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

const SITE = "https://textjs.org";

function xml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** RSS 2.0 feed for `/blog/rss.xml`, written at build time. */
export function renderRss(posts: readonly BlogPost[] = POSTS): string {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${SITE}${postPath(p.slug)}</link>
      <guid isPermaLink="true">${SITE}${postPath(p.slug)}</guid>
      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>
      <dc:creator>${xml(p.author)}</dc:creator>
      <description>${xml(p.summary)}</description>
    </item>`,
    )
    .join("\n");
  const latest = posts[0] ? new Date(`${posts[0].date}T00:00:00Z`).toUTCString() : new Date(0).toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Text.js Blog</title>
    <link>${SITE}/blog</link>
    <description>Releases and engineering notes from the Text.js team.</description>
    <language>en</language>
    <lastBuildDate>${latest}</lastBuildDate>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
