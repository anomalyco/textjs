import { plainInline, slugify, splitHeadingId } from "./meta";

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

const headingsCache = new Map<string, Heading[]>();

/** A page's `##` and `###` headings, for the table of contents and the search index. */
export function headingsOf(markdown: string): Heading[] {
  const cached = headingsCache.get(markdown);
  if (cached !== undefined) return cached;
  const out: Heading[] = [];
  let fence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const m = /^(#{2,3})\s+(.*)$/.exec(line);
    if (m) {
      const heading = splitHeadingId(m[2] as string);
      out.push({ depth: (m[1] as string).length, text: plainInline(heading.text.trim()), id: heading.id ?? slugify(heading.text) });
    }
  }
  if (headingsCache.size < 128) headingsCache.set(markdown, out);
  return out;
}
