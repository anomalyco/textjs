import { msg } from "../i18n/t";

export interface DocMeta {
  slug: string;
  title: string;
  /** Short sidebar label (defaults to `title`). */
  nav?: string;
  description: string;
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
    description: msg("What Text.js is, what it includes and how a frame is rendered."),
    category: "Getting Started",
  },
  {
    slug: "installation",
    title: msg("Installation"),
    description: msg("Create a Text.js app, open DevTools and configure your console."),
    category: "Getting Started",
  },
  {
    slug: "project-structure",
    title: msg("Project Structure"),
    description: msg("The app/ directory, text.config.ts and the text CLI."),
    category: "Getting Started",
  },
  {
    slug: "routing",
    title: msg("Routing"),
    description: msg("File-system App Router: layouts, pages, dynamic segments, Link and navigation hooks."),
    category: "Building Your Application",
  },
  {
    slug: "loading-and-errors",
    title: msg("Loading UI and Errors"),
    nav: msg("Loading & Errors"),
    description: msg("loading.tsx, error.tsx, not-found.tsx, the in-console Redbox and the Dev Overlay."),
    category: "Building Your Application",
  },
  {
    slug: "route-handlers",
    title: msg("Route Handlers"),
    description: msg("Full-stack app/api/*/route.ts handlers, rewrites and local daemon proxying."),
    category: "Building Your Application",
  },
  {
    slug: "server-rendering",
    title: msg("Server Rendering and Partial Prerendering"),
    nav: msg("Server Rendering"),
    description: msg("runtime = \"server\": routes rendered on the server and streamed as frames; prerendered console shells."),
    category: "Building Your Application",
  },
  {
    slug: "middleware",
    title: msg("Middleware"),
    description: msg("middleware.ts: redirects, rewrites, headers and cookies before every request, with config.matcher."),
    category: "Building Your Application",
  },
  {
    slug: "caching",
    title: msg("Caching and Revalidation"),
    nav: msg("Caching"),
    description: msg("Route segment config, unstable_cache, revalidateTag / revalidatePath and stale-while-revalidate."),
    category: "Building Your Application",
  },
  {
    slug: "deploying",
    title: msg("Deploying"),
    description: msg("Deploy with text build --adapter static, bun, vercel or cloudflare, or run text start behind a proxy."),
    category: "Building Your Application",
  },
  {
    slug: "curl",
    title: "curl and Terminal Clients",
    nav: "curl",
    description: "curl, Wget, HTTPie and xh get a page's first frame as truecolor ANSI: which requests, where and how to configure it.",
    category: "Building Your Application",
  },
  {
    slug: "styling",
    title: msg("Styling"),
    description: msg("Cell-grid className utilities, typed props, responsive viewports and themes."),
    category: "Building Your Application",
  },
  {
    slug: "internationalization",
    title: msg("Internationalization: Bidirectional Text"),
    nav: msg("Bidirectional Text"),
    description: msg("Hebrew, Arabic and mixed-direction text: UAX #9, dir, alignment, Arabic shaping and grid-exact output."),
    category: "Building Your Application",
  },
  {
    slug: "keyboard",
    title: msg("Keyboard Shortcuts"),
    nav: msg("Keyboard"),
    description: msg("useKeymap, sequences, the ? help overlay, key hints and the command palette."),
    category: "Building Your Application",
  },
  {
    slug: "testing",
    title: msg("Testing"),
    description: msg("Render apps offscreen, press keys and assert on frames with @textjs/app/testing."),
    category: "Building Your Application",
  },
  {
    slug: "terminal",
    title: msg("Running in a Terminal"),
    nav: msg("Terminal"),
    description: msg("Render an App Router app or a single component in a terminal with text run and renderToTerminal."),
    category: "Building Your Application",
  },
  {
    slug: "mcp",
    title: msg("MCP for Coding Agents"),
    nav: msg("MCP"),
    description: msg("text mcp: let coding agents navigate, press keys and read frames over the Model Context Protocol."),
    category: "Building Your Application",
  },
  {
    slug: "eslint",
    title: msg("ESLint"),
    description: msg("eslint-plugin-textjs: console-safe JSX, cell-width glyphs, frame-paced timers and App Router checks."),
    category: "Building Your Application",
  },
  {
    slug: "devtools-extension",
    title: msg("DevTools Extension"),
    description: msg("A Text.js panel next to Console: component tree, cell-level frame inspector and frame timeline."),
    category: "Building Your Application",
  },
  {
    slug: "vscode",
    title: msg("VS Code"),
    description: msg("Live Preview of the console frame beside your code, App Router scaffolding, snippets and TX error links."),
    category: "Building Your Application",
  },
  {
    slug: "components-layout",
    title: msg("Layout Components"),
    nav: msg("Layout"),
    description: msg("<Box>, <Text>, <ScrollBox>, <Modal>, <SplitPane>, <Stack>, <Grid>, <Spacer>, <Divider> and <Badge>."),
    category: "Components",
  },
  {
    slug: "components-interactive",
    title: msg("Interactive Components"),
    nav: msg("Interactive"),
    description: msg("<Input>, <Textarea>, <Select> and <Tabs>: focus, shortcuts and copying text while the page is unfocused."),
    category: "Components",
  },
  {
    slug: "components-content",
    title: msg("Content Components"),
    nav: msg("Content"),
    description: msg("<Markdown>, <Code>, <Diff>, <Spinner> and <AsciiFont>."),
    category: "Components",
  },
  {
    slug: "fonts",
    title: msg("Fonts"),
    description: msg("@textjs/font: FIGlet fonts as ES modules, laid out exactly like the figlet program."),
    category: "Components",
  },
  {
    slug: "components-data",
    title: msg("Data Components"),
    nav: msg("Data"),
    description: msg("<List>, <Table> and <Tree>: virtualized, sortable and selectable."),
    category: "Components",
  },
  {
    slug: "components-charts",
    title: msg("Charts and Visuals"),
    nav: msg("Charts"),
    description: msg("<LineChart>, <BarChart>, <Sparkline>, <ProgressBar>, <Gradient> and <Image>."),
    category: "Components",
  },
  {
    slug: "components-forms",
    title: msg("Forms and Feedback"),
    nav: msg("Forms & Feedback"),
    description: msg("<Button>, <Checkbox>, <Switch>, <RadioGroup>, <Slider>, <Dialog>, <Confirm> and toasts."),
    category: "Components",
  },
  {
    slug: "hooks-and-repl",
    title: msg("Hooks and the Console REPL"),
    nav: msg("Hooks & REPL"),
    description: msg("useInput, useFocus, useViewport, useConsoleStats and window.text."),
    category: "API Reference",
  },
  {
    slug: "utility-hooks",
    title: msg("Utility Hooks"),
    description: msg("useInterval, useAnimationFrame, useTween, useSpring, useMeasure, useBreakpoint and useLocalStorage."),
    category: "API Reference",
  },
  {
    slug: "turbolog-engine",
    title: msg("The Turbolog Engine"),
    nav: msg("Turbolog Engine"),
    description: msg("How frames are run-length encoded into one console.log call, plus the CellBuffer, Chromium details and benchmarks."),
    category: "Architecture",
    brand: "turbolog",
  },
  {
    slug: "release-channels",
    title: msg("Release Channels"),
    description: msg("Stable, canary and LTS dist-tags, lockstep versions, provenance and cutting a release."),
    category: "Architecture",
  },
  {
    slug: "support-policy",
    title: msg("Support Policy"),
    description: msg("Active and LTS release lines, what counts as a breaking change, and supported runtimes."),
    category: "Architecture",
  },
  {
    slug: "opencode",
    title: msg("OpenCode in the Console"),
    nav: msg("OpenCode"),
    description: msg("How the OpenCode Lite TUI is built on Text.js and how to run it locally."),
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
