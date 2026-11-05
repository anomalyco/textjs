import { msg } from "../i18n/t";

export interface DocMeta {
  slug: string;
  title: string;
  /** Short sidebar label (defaults to `title`). */
  nav?: string;
  category: DocCategory;
  /** Shows the product's lockup above the title. */
  brand?: "turbolog";
}

export const DOC_CATEGORIES = ["Getting Started", "Building Your Application", "Components", "API Reference", "Architecture"] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

/** Display names for the categories (the ids above stay English). */
export const CATEGORY_LABELS: Readonly<Record<DocCategory, string>> = {
  "Getting Started": msg("Getting Started"),
  "Building Your Application": msg("Building Your Application"),
  Components: msg("Components"),
  "API Reference": msg("API Reference"),
  Architecture: msg("Architecture"),
};

export const DOCS_META: readonly DocMeta[] = [
  {
    slug: "introduction",
    title: msg("Introduction"),
    category: "Getting Started",
  },
  {
    slug: "installation",
    title: msg("Installation"),
    category: "Getting Started",
  },
  {
    slug: "project-structure",
    title: msg("Project Structure"),
    category: "Getting Started",
  },
  {
    slug: "routing",
    title: msg("Routing"),
    category: "Building Your Application",
  },
  {
    slug: "loading-and-errors",
    title: msg("Loading UI and Errors"),
    nav: msg("Loading & Errors"),
    category: "Building Your Application",
  },
  {
    slug: "route-handlers",
    title: msg("Route Handlers"),
    category: "Building Your Application",
  },
  {
    slug: "server-rendering",
    title: msg("Server Rendering and Partial Prerendering"),
    nav: msg("Server Rendering"),
    category: "Building Your Application",
  },
  {
    slug: "middleware",
    title: msg("Middleware"),
    category: "Building Your Application",
  },
  {
    slug: "caching",
    title: msg("Caching and Revalidation"),
    nav: msg("Caching"),
    category: "Building Your Application",
  },
  {
    slug: "deploying",
    title: msg("Deploying"),
    category: "Building Your Application",
  },
  {
    slug: "curl",
    title: "curl and Terminal Clients",
    nav: "curl",
    category: "Building Your Application",
  },
  {
    slug: "embedding",
    title: msg("Embedding in Other Sites"),
    nav: msg("Embedding"),
    category: "Building Your Application",
  },
  {
    slug: "styling",
    title: msg("Styling"),
    category: "Building Your Application",
  },
  {
    slug: "internationalization",
    title: msg("Internationalization"),
    nav: msg("Internationalization"),
    category: "Building Your Application",
  },
  {
    slug: "keyboard",
    title: msg("Keyboard Shortcuts"),
    nav: msg("Keyboard"),
    category: "Building Your Application",
  },
  {
    slug: "testing",
    title: msg("Testing"),
    category: "Building Your Application",
  },
  {
    slug: "terminal",
    title: msg("Running in a Terminal"),
    nav: msg("Terminal"),
    category: "Building Your Application",
  },
  {
    slug: "mcp",
    title: msg("MCP for Coding Agents"),
    nav: msg("MCP"),
    category: "Building Your Application",
  },
  {
    slug: "eslint",
    title: msg("ESLint"),
    category: "Building Your Application",
  },
  {
    slug: "devtools-extension",
    title: msg("DevTools Extension"),
    category: "Building Your Application",
  },
  {
    slug: "vscode",
    title: msg("VS Code"),
    category: "Building Your Application",
  },
  {
    slug: "components-layout",
    title: msg("Layout Components"),
    nav: msg("Layout"),
    category: "Components",
  },
  {
    slug: "components-interactive",
    title: msg("Interactive Components"),
    nav: msg("Interactive"),
    category: "Components",
  },
  {
    slug: "components-content",
    title: msg("Content Components"),
    nav: msg("Content"),
    category: "Components",
  },
  {
    slug: "fonts",
    title: msg("Fonts"),
    category: "Components",
  },
  {
    slug: "components-data",
    title: msg("Data Components"),
    nav: msg("Data"),
    category: "Components",
  },
  {
    slug: "components-charts",
    title: msg("Charts and Visuals"),
    nav: msg("Charts"),
    category: "Components",
  },
  {
    slug: "components-forms",
    title: msg("Forms and Feedback"),
    nav: msg("Forms & Feedback"),
    category: "Components",
  },
  {
    slug: "hooks-and-repl",
    title: msg("Hooks and the Console REPL"),
    nav: msg("Hooks & REPL"),
    category: "API Reference",
  },
  {
    slug: "utility-hooks",
    title: msg("Utility Hooks"),
    category: "API Reference",
  },
  {
    slug: "turbolog-engine",
    title: msg("The Turbolog Engine"),
    nav: msg("Turbolog Engine"),
    category: "Architecture",
    brand: "turbolog",
  },
  {
    slug: "release-channels",
    title: msg("Release Channels"),
    category: "Architecture",
  },
  {
    slug: "support-policy",
    title: msg("Support Policy"),
    category: "Architecture",
  },
  {
    slug: "opencode",
    title: msg("OpenCode in the Console"),
    nav: msg("OpenCode"),
    category: "Architecture",
  },
];

export function docPath(slug: string): string {
  return slug === "introduction" || slug === "" ? "/docs" : `/docs/${slug}`;
}

export function getDocMeta(slug: string | undefined): DocMeta | undefined {
  const s = !slug ? "introduction" : slug;
  return DOCS_META.find((d) => d.slug === s);
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

/**
 * Markup the translation build adds to Markdown (`scripts/i18n/document.ts`): headings keep their English
 * anchor as `## Título {#title}`, and a `<!-- i18n:… -->` line marks the block after it (`en`: shown in English
 * until it's translated; `warning`: a warning callout).
 */
const HEADING_ID = /\s*\{#([\w-]+)\}\s*$/;
const SENTINEL = /^<!-- i18n:([\w-]+) -->$/;

/** `Título {#title}` → `{ text: "Título", id: "title" }`. */
export function splitHeadingId(text: string): { text: string; id?: string } {
  const m = HEADING_ID.exec(text);
  return m ? { text: text.slice(0, m.index), id: m[1] } : { text };
}

/** The flag of a `<!-- i18n:flag -->` paragraph, or `null`. */
export function sentinelFlag(paragraph: string): string | null {
  return SENTINEL.exec(paragraph.trim())?.[1] ?? null;
}

/** Drops the translation markup, for renderers that don't use it (the console). */
export function stripI18nMarkup(markdown: string): string {
  return markdown
    .replace(/^<!-- i18n:[\w-]+ -->\n\n?/gm, "")
    .replace(/^(\s{0,3}#{1,6}\s.*?)\s*\{#[\w-]+\}\s*$/gm, "$1");
}

/** Whether assembled Markdown has any translated heading (one without the `i18n:en` line before it). */
export function hasTranslatedHeading(markdown: string): boolean {
  return /(?<!<!-- i18n:en -->\n\n)^#{2,6} .*\{#[\w-]+\}$/m.test(markdown);
}
