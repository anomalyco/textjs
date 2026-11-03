import introduction from "./content/introduction.md?raw";
import installation from "./content/installation.md?raw";
import projectStructure from "./content/project-structure.md?raw";
import routing from "./content/routing.md?raw";
import loadingAndErrors from "./content/loading-and-errors.md?raw";
import routeHandlers from "./content/route-handlers.md?raw";
import serverRendering from "./content/server-rendering.md?raw";
import middleware from "./content/middleware.md?raw";
import caching from "./content/caching.md?raw";
import deploying from "./content/deploying.md?raw";
import releaseChannels from "./content/release-channels.md?raw";
import supportPolicy from "./content/support-policy.md?raw";
import styling from "./content/styling.md?raw";
import componentsLayout from "./content/components-layout.md?raw";
import componentsInteractive from "./content/components-interactive.md?raw";
import componentsContent from "./content/components-content.md?raw";
import hooksAndRepl from "./content/hooks-and-repl.md?raw";
import keyboard from "./content/keyboard.md?raw";
import testing from "./content/testing.md?raw";
import terminal from "./content/terminal.md?raw";
import mcp from "./content/mcp.md?raw";
import eslint from "./content/eslint.md?raw";
import devtoolsExtension from "./content/devtools-extension.md?raw";
import vscode from "./content/vscode.md?raw";
import componentsData from "./content/components-data.md?raw";
import componentsCharts from "./content/components-charts.md?raw";
import componentsForms from "./content/components-forms.md?raw";
import utilityHooks from "./content/utility-hooks.md?raw";
import turbologEngine from "./content/turbolog-engine.md?raw";
import opencode from "./content/opencode.md?raw";
import fonts from "./content/fonts.md?raw";
import internationalization from "./content/internationalization.md?raw";
import { DOC_CATEGORIES, DOCS_META, docPath, getDocMeta, plainInline, slugify, splitHeadingId, stripI18nMarkup, type DocCategory, type DocMeta } from "./meta";

export { DOC_CATEGORIES, DOCS_META, docPath, getDocMeta, plainInline, slugify, type DocCategory, type DocMeta };

export interface DocPage extends DocMeta {
  markdown: string;
}

const DOC_MARKDOWN: Record<string, string> = {
  introduction,
  installation,
  "project-structure": projectStructure,
  routing,
  "loading-and-errors": loadingAndErrors,
  "route-handlers": routeHandlers,
  "server-rendering": serverRendering,
  middleware,
  caching,
  deploying,
  styling,
  internationalization,
  keyboard,
  testing,
  terminal,
  mcp,
  eslint,
  "devtools-extension": devtoolsExtension,
  vscode,
  "components-layout": componentsLayout,
  "components-interactive": componentsInteractive,
  "components-content": componentsContent,
  fonts,
  "components-data": componentsData,
  "components-charts": componentsCharts,
  "components-forms": componentsForms,
  "hooks-and-repl": hooksAndRepl,
  "utility-hooks": utilityHooks,
  "turbolog-engine": turbologEngine,
  "release-channels": releaseChannels,
  "support-policy": supportPolicy,
  opencode,
};

export const DOCS: readonly DocPage[] = DOCS_META.map((m) => ({
  ...m,
  markdown: DOC_MARKDOWN[m.slug] ?? "",
}));

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

const headingsCache = new Map<string, Heading[]>();

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

/** Remove website-only fence metadata (`tsx@file`, `tsx#preview`) for the console renderer. */
export function toConsoleMarkdown(markdown: string): string {
  return stripI18nMarkup(markdown).replace(/^(\s*```)([\w-]+)[@#][^\n]*$/gm, "$1$2");
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
