import introduction from "./content/introduction.md?raw";
import installation from "./content/installation.md?raw";
import projectStructure from "./content/project-structure.md?raw";
import routing from "./content/routing.md?raw";
import loadingAndErrors from "./content/loading-and-errors.md?raw";
import routeHandlers from "./content/route-handlers.md?raw";
import styling from "./content/styling.md?raw";
import componentsLayout from "./content/components-layout.md?raw";
import componentsInteractive from "./content/components-interactive.md?raw";
import componentsContent from "./content/components-content.md?raw";
import hooksAndRepl from "./content/hooks-and-repl.md?raw";
import turbologEngine from "./content/turbolog-engine.md?raw";
import opencode from "./content/opencode.md?raw";

export interface DocPage {
  slug: string;
  title: string;
  /** Short sidebar label (defaults to `title`). */
  nav?: string;
  description: string;
  category: DocCategory;
  markdown: string;
}

export const DOC_CATEGORIES = ["Getting Started", "Building Your Application", "Components", "API Reference", "Architecture"] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const DOCS: readonly DocPage[] = [
  {
    slug: "introduction",
    title: "Introduction",
    description: "What Text.js is, why console.log, and the Inverted Architecture.",
    category: "Getting Started",
    markdown: introduction,
  },
  {
    slug: "installation",
    title: "Installation",
    description: "Create a Text.js app, open DevTools and configure your console.",
    category: "Getting Started",
    markdown: installation,
  },
  {
    slug: "project-structure",
    title: "Project Structure",
    description: "The app/ directory, text.config.ts and the text CLI.",
    category: "Getting Started",
    markdown: projectStructure,
  },
  {
    slug: "routing",
    title: "Routing",
    description: "File-system App Router: layouts, pages, dynamic segments, Link and navigation hooks.",
    category: "Building Your Application",
    markdown: routing,
  },
  {
    slug: "loading-and-errors",
    title: "Loading UI and Errors",
    nav: "Loading & Errors",
    description: "loading.tsx, error.tsx, not-found.tsx, the in-console Redbox and [▼] DevTools.",
    category: "Building Your Application",
    markdown: loadingAndErrors,
  },
  {
    slug: "route-handlers",
    title: "Route Handlers",
    description: "Full-stack app/api/*/route.ts handlers, rewrites and local daemon proxying.",
    category: "Building Your Application",
    markdown: routeHandlers,
  },
  {
    slug: "styling",
    title: "Styling",
    description: "Cell-grid className utilities, typed props, responsive viewports and themes.",
    category: "Building Your Application",
    markdown: styling,
  },
  {
    slug: "components-layout",
    title: "Layout Components",
    nav: "Layout",
    description: "<Box>, <Text>, <ScrollBox>, <Modal>, <Spacer>, <Divider>, <Badge> and <KeyHint>.",
    category: "Components",
    markdown: componentsLayout,
  },
  {
    slug: "components-interactive",
    title: "Interactive Components",
    nav: "Interactive",
    description: "<Input>, <Textarea>, <Select> and <Tabs>: focus, shortcuts and cursor freeze.",
    category: "Components",
    markdown: componentsInteractive,
  },
  {
    slug: "components-content",
    title: "Content Components",
    nav: "Content",
    description: "<Markdown>, <Code>, <Diff>, <Spinner> and <AsciiFont>.",
    category: "Components",
    markdown: componentsContent,
  },
  {
    slug: "hooks-and-repl",
    title: "Hooks and the Console REPL",
    nav: "Hooks & REPL",
    description: "useInput, useFocus, useViewport, useConsoleStats and window.text.",
    category: "API Reference",
    markdown: hooksAndRepl,
  },
  {
    slug: "turbolog-engine",
    title: "The Turbolog Engine",
    nav: "Turbolog Engine",
    description: "Single-console.log RLE encoding, CellBuffer, Chromium internals and benchmarks.",
    category: "Architecture",
    markdown: turbologEngine,
  },
  {
    slug: "opencode",
    title: "OpenCode in the Console",
    nav: "OpenCode",
    description: "How the OpenCode Lite TUI is built on Text.js and how to run it locally.",
    category: "Architecture",
    markdown: opencode,
  },
];

export function docPath(slug: string): string {
  return slug === "introduction" || slug === "" ? "/docs" : `/docs/${slug}`;
}

export function getDoc(slug: string | undefined): DocPage | undefined {
  const s = !slug ? "introduction" : slug;
  return DOCS.find((d) => d.slug === s);
}

export function neighbors(slug: string): { prev?: DocPage; next?: DocPage } {
  const i = DOCS.findIndex((d) => d.slug === slug);
  return { prev: i > 0 ? DOCS[i - 1] : undefined, next: i >= 0 && i < DOCS.length - 1 ? DOCS[i + 1] : undefined };
}

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

/** Strip inline markdown for plain-text labels. */
export function plainInline(text: string): string {
  return text
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
}

export function slugify(text: string): string {
  return plainInline(text)
    .toLowerCase()
    .replace(/<[^>]*>/g, (m) => m.slice(1, -1))
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function headingsOf(markdown: string): Heading[] {
  const out: Heading[] = [];
  let fence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const m = /^(#{2,3})\s+(.*)$/.exec(line);
    if (m) {
      const text = plainInline((m[2] as string).trim());
      out.push({ depth: (m[1] as string).length, text, id: slugify(m[2] as string) });
    }
  }
  return out;
}

/** Remove website-only fence metadata (`tsx@file`, `tsx#preview`) for the console renderer. */
export function toConsoleMarkdown(markdown: string): string {
  return markdown.replace(/^(\s*```)([\w-]+)[@#][^\n]*$/gm, "$1$2");
}

export interface SearchHit {
  doc: DocPage;
  heading?: Heading;
  score: number;
}

/** Subsequence fuzzy score (higher is better); `-1` when `query` doesn't match. */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().replace(/\s+/g, "");
  const t = target.toLowerCase();
  if (q.length === 0) return 0;
  const direct = t.indexOf(query.toLowerCase().trim());
  if (direct >= 0) return 1000 - direct - t.length * 0.1;
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return -1;
    streak = found === ti ? streak + 1 : 0;
    score += 10 + streak * 5 - (found - ti);
    ti = found + 1;
  }
  return score - t.length * 0.1;
}

export function searchDocs(query: string, limit = 12): SearchHit[] {
  const q = query.trim();
  if (q.length === 0) return DOCS.map((doc) => ({ doc, score: 0 }));
  const hits: SearchHit[] = [];
  for (const doc of DOCS) {
    const s = Math.max(fuzzyScore(q, doc.title) * 1.5, fuzzyScore(q, doc.nav ?? doc.title) * 1.5, fuzzyScore(q, doc.description));
    if (s >= 0) hits.push({ doc, score: s + 50 });
    for (const h of headingsOf(doc.markdown)) {
      const hs = fuzzyScore(q, h.text);
      if (hs >= 0) hits.push({ doc, heading: h, score: hs });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
