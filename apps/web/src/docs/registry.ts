import { DOC_CATEGORIES, DOCS_META, docPath, getDocMeta, plainInline, slugify, stripI18nMarkup, type DocCategory, type DocMeta } from "./meta";
import { docDescription } from "./descriptions";
import { headingsOf, type Heading } from "./outline";

export { DOC_CATEGORIES, DOCS_META, docPath, getDocMeta, headingsOf, plainInline, slugify, type DocCategory, type DocMeta, type Heading };

export interface DocPage extends DocMeta {
  description: string;
  markdown: string;
}

/**
 * Each page's Markdown is a chunk of its own, so a docs page downloads only the page it shows. The route loader
 * fetches it with the Docs chunk (`preloadRoute`), on link hover too, and the prerenderer modulepreloads it.
 */
const CONTENT: Readonly<Record<string, () => Promise<{ default: string }>>> = {
  introduction: () => import("./content/introduction.md?raw"),
  installation: () => import("./content/installation.md?raw"),
  "project-structure": () => import("./content/project-structure.md?raw"),
  routing: () => import("./content/routing.md?raw"),
  "loading-and-errors": () => import("./content/loading-and-errors.md?raw"),
  "route-handlers": () => import("./content/route-handlers.md?raw"),
  "server-rendering": () => import("./content/server-rendering.md?raw"),
  middleware: () => import("./content/middleware.md?raw"),
  caching: () => import("./content/caching.md?raw"),
  deploying: () => import("./content/deploying.md?raw"),
  curl: () => import("./content/curl.md?raw"),
  styling: () => import("./content/styling.md?raw"),
  internationalization: () => import("./content/internationalization.md?raw"),
  keyboard: () => import("./content/keyboard.md?raw"),
  testing: () => import("./content/testing.md?raw"),
  terminal: () => import("./content/terminal.md?raw"),
  mcp: () => import("./content/mcp.md?raw"),
  eslint: () => import("./content/eslint.md?raw"),
  "devtools-extension": () => import("./content/devtools-extension.md?raw"),
  vscode: () => import("./content/vscode.md?raw"),
  "components-layout": () => import("./content/components-layout.md?raw"),
  "components-interactive": () => import("./content/components-interactive.md?raw"),
  "components-content": () => import("./content/components-content.md?raw"),
  fonts: () => import("./content/fonts.md?raw"),
  "components-data": () => import("./content/components-data.md?raw"),
  "components-charts": () => import("./content/components-charts.md?raw"),
  "components-forms": () => import("./content/components-forms.md?raw"),
  "hooks-and-repl": () => import("./content/hooks-and-repl.md?raw"),
  "utility-hooks": () => import("./content/utility-hooks.md?raw"),
  "turbolog-engine": () => import("./content/turbolog-engine.md?raw"),
  "release-channels": () => import("./content/release-channels.md?raw"),
  "support-policy": () => import("./content/support-policy.md?raw"),
  opencode: () => import("./content/opencode.md?raw"),
};

const pages = new Map<string, DocPage>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

/** Loads a page's Markdown once; `getDoc` has the page when this resolves. */
export function preloadDoc(slug: string): Promise<void> {
  if (pages.has(slug)) return Promise.resolve();
  const existing = inflight.get(slug);
  if (existing) return existing;
  const meta = getDocMeta(slug);
  const load = CONTENT[slug];
  if (!meta || !load) return Promise.reject(new Error(`No docs page "${slug}"`));
  const p = load()
    .then((m) => {
      pages.set(slug, { ...meta, description: docDescription(slug), markdown: m.default });
      for (const l of listeners) l();
    })
    .finally(() => inflight.delete(slug));
  inflight.set(slug, p);
  return p;
}

export function preloadAllDocs(): Promise<void> {
  return Promise.all(DOCS_META.map((d) => preloadDoc(d.slug))).then(() => undefined);
}

export function subscribeDocs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A page with its Markdown, once `preloadDoc` has loaded it (`/docs` is `introduction`). */
export function getDoc(slug: string | undefined): DocPage | undefined {
  return pages.get(!slug ? "introduction" : slug);
}

export function neighbors(slug: string): { prev?: DocMeta; next?: DocMeta } {
  const i = DOCS_META.findIndex((d) => d.slug === slug);
  return { prev: i > 0 ? DOCS_META[i - 1] : undefined, next: i >= 0 && i < DOCS_META.length - 1 ? DOCS_META[i + 1] : undefined };
}

/** Remove website-only fence metadata (`tsx@file`, `tsx#preview`) for the console renderer. */
export function toConsoleMarkdown(markdown: string): string {
  return stripI18nMarkup(markdown).replace(/^(\s*```)([\w-]+)[@#][^\n]*$/gm, "$1$2");
}
