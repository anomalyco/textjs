import { msg } from "../i18n/t";

/** Each docs page's one-line description, by slug. Kept apart from `DOCS_META` so every page's router can title a docs page without loading them. */
export const DOC_DESCRIPTIONS: Readonly<Record<string, string>> = {
  introduction: msg("What Text.js is, what it includes and how a frame is rendered."),
  installation: msg("Create a Text.js app, open DevTools and configure your console."),
  "project-structure": msg("The app/ directory, text.config.ts and the text CLI."),
  routing: msg("File-system App Router: layouts, pages, dynamic segments, Link and navigation hooks."),
  "loading-and-errors": msg("loading.tsx, error.tsx, not-found.tsx, the in-console Redbox and the Dev Overlay."),
  "route-handlers": msg("Full-stack app/api/*/route.ts handlers, rewrites and local daemon proxying."),
  "server-rendering": msg("runtime = \"server\": routes rendered on the server and streamed as frames; prerendered console shells."),
  middleware: msg("middleware.ts: redirects, rewrites, headers and cookies before every request, with config.matcher."),
  caching: msg("Route segment config, unstable_cache, revalidateTag / revalidatePath and stale-while-revalidate."),
  deploying: msg("Deploy with text build --adapter static, bun, vercel or cloudflare, or run text start behind a proxy."),
  curl: "curl, Wget, HTTPie and xh get a page's first frame as truecolor ANSI text. Configure its size or turn it off.",
  embedding: msg("Add an app to another site with one script tag: text build --embed, <text-console>, server-rendered routes and hosting."),
  styling: msg("Cell-grid className utilities, typed props, responsive viewports and themes."),
  internationalization: msg("Right-to-left and mixed-direction text, Arabic shaping, and translating the focus pad."),
  keyboard: msg("useKeymap, sequences, the ? help overlay, key hints and the command palette."),
  testing: msg("Render apps offscreen, press keys and assert on frames with @textjs/app/testing."),
  terminal: msg("Render an App Router app or a single component in a terminal with text run and renderToTerminal."),
  mcp: msg("text mcp: let coding agents navigate, press keys and read frames over the Model Context Protocol."),
  eslint: msg("eslint-plugin-textjs: console-safe JSX, cell-width glyphs, frame-paced timers and App Router checks."),
  "devtools-extension": msg("A Text.js panel next to Console: component tree, cell-level frame inspector and frame timeline."),
  vscode: msg("Live Preview of the console frame beside your code, App Router scaffolding, snippets and TX error links."),
  "components-layout": msg("<Box>, <Text>, <ScrollBox>, <Modal>, <SplitPane>, <Stack>, <Grid>, <Spacer>, <Divider> and <Badge>."),
  "components-interactive": msg("<Input>, <Textarea>, <Select> and <Tabs>: focus, shortcuts and copying text while the page is unfocused."),
  "components-content": msg("<Markdown>, <Code>, <Diff>, <Spinner> and <AsciiFont>."),
  fonts: msg("@textjs/font: FIGlet fonts as ES modules, laid out exactly like the figlet program."),
  "components-data": msg("<List>, <Table> and <Tree>: virtualized, sortable and selectable."),
  "components-charts": msg("<LineChart>, <BarChart>, <Sparkline>, <ProgressBar>, <Gradient> and <Image>."),
  "components-forms": msg("<Button>, <Checkbox>, <Switch>, <RadioGroup>, <Slider>, <Dialog>, <Confirm> and toasts."),
  "hooks-and-repl": msg("useInput, useFocus, useViewport, useConsoleStats and window.text."),
  "utility-hooks": msg("useInterval, useAnimationFrame, useTween, useSpring, useMeasure, useBreakpoint and useLocalStorage."),
  "turbolog-engine": msg("How frames are run-length encoded into one console.log call, plus the CellBuffer, Chromium details and benchmarks."),
  "release-channels": msg("Stable, canary and LTS dist-tags, lockstep versions, provenance and cutting a release."),
  "support-policy": msg("Active and LTS release lines, what counts as a breaking change, and supported runtimes."),
  opencode: msg("How the OpenCode Lite TUI is built on Text.js and how to run it locally."),
};

export function docDescription(slug: string): string {
  return DOC_DESCRIPTIONS[slug] ?? "";
}
