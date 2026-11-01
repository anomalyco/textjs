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

export interface DocPage {
  slug: string;
  title: string;
  /** Short sidebar label (defaults to `title`). */
  nav?: string;
  description: string;
  category: DocCategory;
  markdown: string;
  /** Shows the product's lockup above the title. */
  brand?: "turbolog";
}

export const DOC_CATEGORIES = ["Getting Started", "Building Your Application", "Components", "API Reference", "Architecture"] as const;
export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const DOCS: readonly DocPage[] = [
  {
    slug: "introduction",
    title: "Introduction",
    description: "What Text.js is, what it includes and how a frame is rendered.",
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
    slug: "server-rendering",
    title: "Server Rendering and Partial Prerendering",
    nav: "Server Rendering",
    description: "runtime = \"server\": routes rendered on the server and streamed as frames; prerendered console shells.",
    category: "Building Your Application",
    markdown: serverRendering,
  },
  {
    slug: "middleware",
    title: "Middleware",
    description: "middleware.ts: redirects, rewrites, headers and cookies before every request, with config.matcher.",
    category: "Building Your Application",
    markdown: middleware,
  },
  {
    slug: "caching",
    title: "Caching and Revalidation",
    nav: "Caching",
    description: "Route segment config, unstable_cache, revalidateTag / revalidatePath and stale-while-revalidate.",
    category: "Building Your Application",
    markdown: caching,
  },
  {
    slug: "deploying",
    title: "Deploying",
    description: "Deploy with text build --adapter static, bun, vercel or cloudflare, or run text start behind a proxy.",
    category: "Building Your Application",
    markdown: deploying,
  },
  {
    slug: "styling",
    title: "Styling",
    description: "Cell-grid className utilities, typed props, responsive viewports and themes.",
    category: "Building Your Application",
    markdown: styling,
  },
  {
    slug: "internationalization",
    title: "Internationalization: Bidirectional Text",
    nav: "Bidirectional Text",
    description: "Hebrew, Arabic and mixed-direction text: UAX #9, dir, alignment, Arabic shaping and grid-exact output.",
    category: "Building Your Application",
    markdown: internationalization,
  },
  {
    slug: "keyboard",
    title: "Keyboard Shortcuts",
    nav: "Keyboard",
    description: "useKeymap, sequences, the ? help overlay, key hints and the command palette.",
    category: "Building Your Application",
    markdown: keyboard,
  },
  {
    slug: "testing",
    title: "Testing",
    description: "Render apps offscreen, press keys and assert on frames with @textjs/next/testing.",
    category: "Building Your Application",
    markdown: testing,
  },
  {
    slug: "terminal",
    title: "Running in a Terminal",
    nav: "Terminal",
    description: "Render an App Router app or a single component in a terminal with text run and renderToTerminal.",
    category: "Building Your Application",
    markdown: terminal,
  },
  {
    slug: "mcp",
    title: "MCP for Coding Agents",
    nav: "MCP",
    description: "text mcp: let coding agents navigate, press keys and read frames over the Model Context Protocol.",
    category: "Building Your Application",
    markdown: mcp,
  },
  {
    slug: "eslint",
    title: "ESLint",
    description: "eslint-plugin-textjs: console-safe JSX, cell-width glyphs, frame-paced timers and App Router checks.",
    category: "Building Your Application",
    markdown: eslint,
  },
  {
    slug: "devtools-extension",
    title: "DevTools Extension",
    description: "A Text.js panel next to Console: component tree, cell-level frame inspector and frame timeline.",
    category: "Building Your Application",
    markdown: devtoolsExtension,
  },
  {
    slug: "vscode",
    title: "VS Code",
    description: "Live Preview of the console frame beside your code, App Router scaffolding, snippets and TX error links.",
    category: "Building Your Application",
    markdown: vscode,
  },
  {
    slug: "components-layout",
    title: "Layout Components",
    nav: "Layout",
    description: "<Box>, <Text>, <ScrollBox>, <Modal>, <SplitPane>, <Stack>, <Grid>, <Spacer>, <Divider> and <Badge>.",
    category: "Components",
    markdown: componentsLayout,
  },
  {
    slug: "components-interactive",
    title: "Interactive Components",
    nav: "Interactive",
    description: "<Input>, <Textarea>, <Select> and <Tabs>: focus, shortcuts and copying text while the page is unfocused.",
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
    slug: "fonts",
    title: "Fonts",
    description: "@textjs/font: FIGlet fonts as ES modules, laid out exactly like the figlet program.",
    category: "Components",
    markdown: fonts,
  },
  {
    slug: "components-data",
    title: "Data Components",
    nav: "Data",
    description: "<List>, <Table> and <Tree>: virtualized, sortable and selectable.",
    category: "Components",
    markdown: componentsData,
  },
  {
    slug: "components-charts",
    title: "Charts and Visuals",
    nav: "Charts",
    description: "<LineChart>, <BarChart>, <Sparkline>, <ProgressBar>, <Gradient> and <Image>.",
    category: "Components",
    markdown: componentsCharts,
  },
  {
    slug: "components-forms",
    title: "Forms and Feedback",
    nav: "Forms & Feedback",
    description: "<Button>, <Checkbox>, <Switch>, <RadioGroup>, <Slider>, <Dialog>, <Confirm> and toasts.",
    category: "Components",
    markdown: componentsForms,
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
    slug: "utility-hooks",
    title: "Utility Hooks",
    description: "useInterval, useAnimationFrame, useTween, useSpring, useMeasure, useBreakpoint and useLocalStorage.",
    category: "API Reference",
    markdown: utilityHooks,
  },
  {
    slug: "turbolog-engine",
    title: "The Turbolog Engine",
    nav: "Turbolog Engine",
    description: "How frames are run-length encoded into one console.log call, plus the CellBuffer, Chromium details and benchmarks.",
    category: "Architecture",
    markdown: turbologEngine,
    brand: "turbolog",
  },
  {
    slug: "release-channels",
    title: "Release Channels",
    description: "Stable, canary and LTS dist-tags, lockstep versions, provenance and cutting a release.",
    category: "Architecture",
    markdown: releaseChannels,
  },
  {
    slug: "support-policy",
    title: "Support Policy",
    description: "Active and LTS release lines, what counts as a breaking change, and supported runtimes.",
    category: "Architecture",
    markdown: supportPolicy,
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
