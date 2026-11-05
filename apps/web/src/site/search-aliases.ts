import { docPath, getDocMeta } from "../docs/meta";
import { DOC_HEADINGS } from "../docs/search-index";
import { ERROR_PACKAGES } from "../pages/error-titles";
import { getErrorPageTitle } from "../pages/tx000";

export interface SearchItem {
  key: string;
  group: string;
  label: string;
  sub?: string;
  href: string;
}

/** What a Next.js developer types first, and the page that answers it. */
const ALIASES: ReadonlyArray<{ terms: readonly string[]; to: { error: string } | { doc: string; heading?: string } }> = [
  { terms: ["div", "span", "p", "dom"], to: { error: "TX003" } },
  { terms: ["css", "tailwind", "classname", "stylesheet"], to: { doc: "styling" } },
  { terms: ["hydration", "hydrate"], to: { doc: "server-rendering" } },
  { terms: ["next.config", "next.config.js", "next.config.mjs", "next.config.ts"], to: { doc: "project-structure" } },
  { terms: ["safari", "firefox"], to: { doc: "turbolog-engine", heading: "firefox-and-safari" } },
  { terms: ["vercel"], to: { doc: "deploying" } },
];

function errorItem(code: string): SearchItem | null {
  // TX000 is a site page with no package, kept out of search.
  const pkg = Object.hasOwn(ERROR_PACKAGES, code) ? ERROR_PACKAGES[code] : undefined;
  const title = getErrorPageTitle(code);
  if (pkg === undefined || title === undefined) return null;
  return { key: `e:${code}`, group: "Error Codes", label: `${code}: ${title}`, sub: pkg, href: `/errors/${code}` };
}

function docItem(slug: string, heading?: string): SearchItem | null {
  const doc = getDocMeta(slug);
  if (!doc) return null;
  if (heading) {
    const h = (DOC_HEADINGS[slug] ?? []).find((x) => x.id === heading);
    if (!h) return null;
    return { key: `d:${slug}:${h.id}`, group: "Documentation", label: h.text, sub: doc.title, href: `${docPath(slug)}#${h.id}` };
  }
  return { key: `d:${slug}:`, group: "Documentation", label: doc.title, sub: doc.category, href: docPath(slug) };
}

/** Exact-term matches for `query` (`div`, `<div>`, `tx014`…), to show above the fuzzy docs results. */
export function aliasResults(query: string): SearchItem[] {
  const q = query
    .trim()
    .toLowerCase()
    .replace(/^<\/?|\/?>$/g, "");
  if (!q) return [];
  if (/^tx\d{3}$/.test(q)) {
    const item = errorItem(q.toUpperCase());
    return item ? [item] : [];
  }
  const out: SearchItem[] = [];
  for (const a of ALIASES) {
    if (!a.terms.includes(q)) continue;
    const item = "error" in a.to ? errorItem(a.to.error) : docItem(a.to.doc, a.to.heading);
    if (item) out.push(item);
  }
  return out;
}

/** Every U+25B2 becomes U+25BC. */
export function invertTriangles(value: string): string {
  return value.replace(/\u25B2/g, "\u25BC");
}

/** Vim's quit commands; Enter with one of these closes the palette like Esc. */
export function isQuitCommand(query: string): string | boolean {
  return /^:(q!?|wq!?|x)$/.test(query.trim());
}
