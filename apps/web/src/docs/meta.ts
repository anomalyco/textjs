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

export const DOCS_META: readonly DocMeta[] = [
  {
    slug: "introduction",
    title: "Introduction",
    description: "What Text.js is, what it includes and how a frame is rendered.",
    category: "Getting Started",
  },
  {
    slug: "installation",
    title: "Installation",
    description: "Create a Text.js app, open DevTools and configure your console.",
    category: "Getting Started",
  },
  {
    slug: "project-structure",
    title: "Project Structure",
    description: "The app/ directory, text.config.ts and the text CLI.",
    category: "Getting Started",
  },
  {
    slug: "routing",
    title: "Routing",
    description: "File-system App Router: layouts, pages, dynamic segments, Link and navigation hooks.",
    category: "Building Your Application",
  },
  {
    slug: "loading-and-errors",
    title: "Loading UI and Errors",
    nav: "Loading & Errors",
    description: "loading.tsx, error.tsx, not-found.tsx, the in-console Redbox and the Dev Overlay.",
    category: "Building Your Application",
  },
  {
    slug: "route-handlers",
    title: "Route Handlers",
    description: "Full-stack app/api/*/route.ts handlers, rewrites and local daemon proxying.",
    category: "Building Your Application",
  },
  {
    slug: "server-rendering",
    title: "Server Rendering and Partial Prerendering",
    nav: "Server Rendering",
    description: 'runtime = "server": routes rendered on the server and streamed as frames; prerendered console shells.',
    category: "Building Your Application",
  },
  {
    slug: "middleware",
    title: "Middleware",
    description: "middleware.ts: redirects, rewrites, headers and cookies before every request, with config.matcher.",
    category: "Building Your Application",
  },
  {
    slug: "caching",
    title: "Caching and Revalidation",
    nav: "Caching",
    description: "Route segment config, unstable_cache, revalidateTag / revalidatePath and stale-while-revalidate.",
    category: "Building Your Application",
  },
  {
    slug: "deploying",
    title: "Deploying",
    description: "Deploy with text build --adapter static, bun, vercel or cloudflare, or run text start behind a proxy.",
    category: "Building Your Application",
  },
  {
    slug: "styling",
    title: "Styling",
    description: "Cell-grid className utilities, typed props, responsive viewports and themes.",
    category: "Building Your Application",
  },
  {
    slug: "internationalization",
    title: "Internationalization: Bidirectional Text",
    nav: "Bidirectional Text",
    description: "Hebrew, Arabic and mixed-direction text: UAX #9, dir, alignment, Arabic shaping and grid-exact output.",
    category: "Building Your Application",
  },
  {
    slug: "keyboard",
    title: "Keyboard Shortcuts",
    nav: "Keyboard",
    description: "useKeymap, sequences, the ? help overlay, key hints and the command palette.",
    category: "Building Your Application",
  },
  {
    slug: "testing",
    title: "Testing",
    description: "Render apps offscreen, press keys and assert on frames with @textjs/app/testing.",
    category: "Building Your Application",
  },
  {
    slug: "terminal",
    title: "Running in a Terminal",
    nav: "Terminal",
    description: "Render an App Router app or a single component in a terminal with text run and renderToTerminal.",
    category: "Building Your Application",
  },
  {
    slug: "mcp",
    title: "MCP for Coding Agents",
    nav: "MCP",
    description: "text mcp: let coding agents navigate, press keys and read frames over the Model Context Protocol.",
    category: "Building Your Application",
  },
  {
    slug: "eslint",
    title: "ESLint",
    description: "eslint-plugin-textjs: console-safe JSX, cell-width glyphs, frame-paced timers and App Router checks.",
    category: "Building Your Application",
  },
  {
    slug: "devtools-extension",
    title: "DevTools Extension",
    description: "A Text.js panel next to Console: component tree, cell-level frame inspector and frame timeline.",
    category: "Building Your Application",
  },
  {
    slug: "vscode",
    title: "VS Code",
    description: "Live Preview of the console frame beside your code, App Router scaffolding, snippets and TX error links.",
    category: "Building Your Application",
  },
  {
    slug: "components-layout",
    title: "Layout Components",
    nav: "Layout",
    description: "<Box>, <Text>, <ScrollBox>, <Modal>, <SplitPane>, <Stack>, <Grid>, <Spacer>, <Divider> and <Badge>.",
    category: "Components",
  },
  {
    slug: "components-interactive",
    title: "Interactive Components",
    nav: "Interactive",
    description: "<Input>, <Textarea>, <Select> and <Tabs>: focus, shortcuts and copying text while the page is unfocused.",
    category: "Components",
  },
  {
    slug: "components-content",
    title: "Content Components",
    nav: "Content",
    description: "<Markdown>, <Code>, <Diff>, <Spinner> and <AsciiFont>.",
    category: "Components",
  },
  {
    slug: "fonts",
    title: "Fonts",
    description: "@textjs/font: FIGlet fonts as ES modules, laid out exactly like the figlet program.",
    category: "Components",
  },
  {
    slug: "components-data",
    title: "Data Components",
    nav: "Data",
    description: "<List>, <Table> and <Tree>: virtualized, sortable and selectable.",
    category: "Components",
  },
  {
    slug: "components-charts",
    title: "Charts and Visuals",
    nav: "Charts",
    description: "<LineChart>, <BarChart>, <Sparkline>, <ProgressBar>, <Gradient> and <Image>.",
    category: "Components",
  },
  {
    slug: "components-forms",
    title: "Forms and Feedback",
    nav: "Forms & Feedback",
    description: "<Button>, <Checkbox>, <Switch>, <RadioGroup>, <Slider>, <Dialog>, <Confirm> and toasts.",
    category: "Components",
  },
  {
    slug: "hooks-and-repl",
    title: "Hooks and the Console REPL",
    nav: "Hooks & REPL",
    description: "useInput, useFocus, useViewport, useConsoleStats and window.text.",
    category: "API Reference",
  },
  {
    slug: "utility-hooks",
    title: "Utility Hooks",
    description: "useInterval, useAnimationFrame, useTween, useSpring, useMeasure, useBreakpoint and useLocalStorage.",
    category: "API Reference",
  },
  {
    slug: "turbolog-engine",
    title: "The Turbolog Engine",
    nav: "Turbolog Engine",
    description: "How frames are run-length encoded into one console.log call, plus the CellBuffer, Chromium details and benchmarks.",
    category: "Architecture",
    brand: "turbolog",
  },
  {
    slug: "release-channels",
    title: "Release Channels",
    description: "Stable, canary and LTS dist-tags, lockstep versions, provenance and cutting a release.",
    category: "Architecture",
  },
  {
    slug: "support-policy",
    title: "Support Policy",
    description: "Active and LTS release lines, what counts as a breaking change, and supported runtimes.",
    category: "Architecture",
  },
  {
    slug: "opencode",
    title: "OpenCode in the Console",
    nav: "OpenCode",
    description: "How the OpenCode Lite TUI is built on Text.js and how to run it locally.",
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
