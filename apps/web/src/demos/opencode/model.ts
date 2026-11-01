/**
 * OpenCode Lite data model, scripted sandbox agent and pre-loaded sessions.
 */

export type Agent = "build" | "plan";

export type ToolName = "read" | "edit" | "write" | "shell" | "grep" | "glob" | "todo";

export interface TextPart {
  type: "text";
  text: string;
}

export interface ReasoningPart {
  type: "reasoning";
  text: string;
  /** Thinking time once finished. */
  ms?: number;
}

export interface ToolPart {
  type: "tool";
  tool: ToolName | (string & {});
  title: string;
  status: "pending" | "running" | "completed" | "error";
  /** Source for `read` cards. */
  code?: string;
  language?: string;
  /** Diff for `edit` cards. */
  diff?: { before: string; after: string; filename: string };
  /** Command output for `shell` / `grep` cards. */
  output?: string;
  /** Raw tool input (live sessions). */
  input?: Record<string, unknown>;
}

export type Part = TextPart | ReasoningPart | ToolPart;

export interface Message {
  id: string;
  role: "user" | "assistant";
  agent?: Agent;
  model?: string;
  parts: Part[];
  /** Assistant duration in ms once finished. */
  durationMs?: number;
  tokens?: number;
}

export interface Session {
  id: string;
  title: string;
  updated: string;
  messages: Message[];
  live?: boolean;
  /** Pre-loaded sandbox history; new prompts start a fresh session. */
  demo?: boolean;
  directory?: string;
}

export type Step =
  | { kind: "think"; ms: number; text: string }
  | { kind: "text"; text: string }
  | { kind: "tool"; part: ToolPart; ms: number };

export const MODELS = [
  { id: "anthropic/claude-opus-5-5", label: "Claude Opus 5.5", provider: "Anthropic" },
  { id: "openai/gpt-5-codex", label: "GPT-5 Codex", provider: "OpenAI" },
  { id: "opencode/grok-code", label: "Grok Code Fast", provider: "OpenCode Zen" },
  { id: "opencode/big-pickle", label: "Big Pickle", provider: "OpenCode Zen" },
] as const;

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter++;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

const PAGE_BEFORE = `import { Box, Text } from "@textjs/next";

export default function Page() {
  return (
    <Box className="flex-col p-1">
      <Text bold>Sessions</Text>
    </Box>
  );
}
`;

const PAGE_AFTER = `import { Box, Text, useTheme } from "@textjs/next";
import { SessionList } from "./session-list";

export default function Page() {
  const theme = useTheme();
  return (
    <Box className="flex-col p-1 gap-1">
      <Text bold color={theme.accent}>Sessions</Text>
      <SessionList limit={20} />
    </Box>
  );
}
`;

const PAGE_DIV = `import { Box, Text } from "@textjs/next";

export default function Page() {
  return (
    <Box className="flex-col p-1">
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Text bold>Sessions</Text>
      </div>
    </Box>
  );
}
`;

const PAGE_CENTER = `import { Box, Center, Text } from "@textjs/next";

export default function Page() {
  return (
    <Box className="flex-col p-1">
      <Center>
        <Text bold>Sessions</Text>
      </Center>
    </Box>
  );
}
`;

// `bun run lint` with eslint-plugin-textjs, as ESLint's stylish formatter prints it.
const LINT_DIV = `$ eslint .

app/page.tsx
  6:8  error  <div> is a DOM element; the console renderer only draws Text.js components (TX003). Use <Box> instead  textjs/no-dom-elements

✖ 1 problem (1 error, 0 warnings)`;

const FIX_BEFORE = `export function connect(url: string, onEvent: (e: Event) => void) {
  const source = new EventSource(url);
  source.onmessage = (m) => onEvent(JSON.parse(m.data));
  source.onerror = () => source.close();
  return () => source.close();
}
`;

const FIX_AFTER = `export function connect(url: string, onEvent: (e: Event) => void) {
  const source = new EventSource(url);
  source.onmessage = (m) => onEvent(JSON.parse(m.data));
  source.onerror = () => {
    source.close();
    setTimeout(() => connect(url, onEvent), 250);
  };
  return () => source.close();
}
`;

const SETTINGS_BEFORE = `export default function SettingsPage() {
  return (
    <Box className="flex-col gap-1">
      <Text bold>Settings</Text>
      <Text color="muted">Theme: geistDark</Text>
    </Box>
  );
}
`;

const SETTINGS_AFTER = `import { useAppTheme } from "@textjs/next";

export default function SettingsPage() {
  const { themeName, setTheme } = useAppTheme();
  useInput((e) => {
    if (e.input === "t") setTheme(themeName === "geistDark" ? "geistLight" : "geistDark");
  });
  return (
    <Box className="flex-col gap-1">
      <Text bold>Settings</Text>
      <Text color="muted">Theme: {themeName} · press t to toggle</Text>
    </Box>
  );
}
`;

function shortPrompt(prompt: string): string {
  const one = prompt.replace(/\s+/g, " ").trim();
  return one.length > 60 ? `${one.slice(0, 57)}…` : one;
}

/** Build the scripted, multi-step response for a prompt in the sandbox. */
export function scriptFor(prompt: string, agent: Agent): Step[] {
  const p = prompt.toLowerCase();
  const topic = shortPrompt(prompt) || "this";
  if (agent === "plan") {
    return [
      { kind: "think", ms: 700, text: "Reading the app/ tree before proposing changes (plan mode is read-only)." },
      { kind: "tool", ms: 600, part: { type: "tool", tool: "glob", title: '"app/**/*.tsx"', status: "completed", output: "app/layout.tsx\napp/page.tsx\napp/sessions/[id]/page.tsx\napp/sessions/[id]/loading.tsx\napp/settings/page.tsx" } },
      {
        kind: "text",
        text: `Here's how I'd approach **${topic}**. Plan mode is read-only, so no files will change.

1. **Locate the route.** The work lives under \`app/sessions/[id]/page.tsx\`, rendered inside the root \`layout.tsx\`.
2. **Extract a component.** Move the list into \`SessionList\` so \`<ScrollBox stickyScroll>\` can own scrolling.
3. **Add a loading state.** \`loading.tsx\` streams a \`<Spinner>\` through React Suspense while data resolves.
4. **Verify.** Run \`text build\` and \`bun test\`.

Press \`shift+tab\` to switch to **build** and I'll implement it.`,
      },
    ];
  }
  if (/\bdiv\b/.test(p)) {
    return [
      { kind: "think", ms: 600, text: "Wrapping the heading in a centered div." },
      { kind: "tool", ms: 650, part: { type: "tool", tool: "edit", title: "app/page.tsx", status: "completed", diff: { before: PAGE_BEFORE, after: PAGE_DIV, filename: "app/page.tsx" } } },
      { kind: "tool", ms: 1100, part: { type: "tool", tool: "shell", title: "bun run lint", status: "completed", output: LINT_DIV } },
      { kind: "tool", ms: 650, part: { type: "tool", tool: "edit", title: "app/page.tsx", status: "completed", diff: { before: PAGE_DIV, after: PAGE_CENTER, filename: "app/page.tsx" } } },
      { kind: "tool", ms: 1000, part: { type: "tool", tool: "shell", title: "bun run lint", status: "completed", output: "$ eslint ." } },
      { kind: "text", text: "`<div>` can't render in the console (TX003). I used `<Center>`, which centers its children on both axes." },
    ];
  }
  if (/test|fail|flak|bug|fix|error|crash|reconnect/.test(p)) {
    return [
      { kind: "think", ms: 1200, text: "Intermittent failure, likely a reconnect race in the SSE client." },
      { kind: "tool", ms: 500, part: { type: "tool", tool: "grep", title: '"EventSource" in src/', status: "completed", output: "src/events.ts:2:  const source = new EventSource(url);" } },
      { kind: "tool", ms: 450, part: { type: "tool", tool: "read", title: "src/events.ts", status: "completed", code: FIX_BEFORE, language: "ts" } },
      { kind: "text", text: "The client closes on the first `onerror` and never reconnects. I'll retry instead." },
      { kind: "tool", ms: 700, part: { type: "tool", tool: "edit", title: "src/events.ts", status: "completed", diff: { before: FIX_BEFORE, after: FIX_AFTER, filename: "src/events.ts" } } },
      { kind: "tool", ms: 1400, part: { type: "tool", tool: "shell", title: "bun test test/events.test.ts", status: "completed", output: "3 pass, 0 fail" } },
      { kind: "text", text: "Fixed. `connect()` now reconnects after an error. All **3** tests pass, including the flaky one." },
    ];
  }
  if (/dark|theme|light|color|style/.test(p)) {
    return [
      { kind: "think", ms: 700, text: "Settings needs a theme toggle wired to the app shell's ThemeProvider." },
      { kind: "tool", ms: 450, part: { type: "tool", tool: "read", title: "app/settings/page.tsx", status: "completed", code: SETTINGS_BEFORE, language: "tsx" } },
      { kind: "text", text: "Text.js exposes the active theme through `useAppTheme()`, so the toggle only needs a few lines in the settings page." },
      { kind: "tool", ms: 650, part: { type: "tool", tool: "edit", title: "app/settings/page.tsx", status: "completed", diff: { before: SETTINGS_BEFORE, after: SETTINGS_AFTER, filename: "app/settings/page.tsx" } } },
      { kind: "tool", ms: 1100, part: { type: "tool", tool: "shell", title: "bun run typecheck", status: "completed", output: "$ tsc --noEmit\n✓ 0 errors in 42 files (1.8s)" } },
      { kind: "text", text: "Added the toggle. Press **t** on `/settings` to switch between `geistDark` and `geistLight`." },
    ];
  }
  if (/explain|how|what|why|\?/.test(p)) {
    return [
      { kind: "think", ms: 800, text: "They want a conceptual answer; I'll ground it in the renderer source." },
      {
        kind: "tool",
        ms: 450,
        part: {
          type: "tool",
          tool: "read",
          title: "node_modules/@textjs/core/src/drivers/css-console-driver.ts",
          status: "completed",
          language: "ts",
          code: `render(buffer: CellBuffer): DriverRenderResult {
  const { frame } = this.encode(buffer);
  if (frame === null) return SKIPPED; // zero noop logs
  console.log(frame.format, ...frame.args); // appended below the previous frame
}`,
        },
      },
      {
        kind: "text",
        text: `Here's the short version:

- React commits into a **scene graph** of \`tx-box\` and \`tx-text\` nodes.
- **Yoga** computes flexbox layout in integer cells (\`pointScaleFactor = 1\`).
- The painter rasterizes into a **TypedArray CellBuffer**.
- Each row is hashed; unchanged rows reuse cached \`%c\` spans.
- The whole frame ships as **one** \`console.log(format, ...css)\`.

\`\`\`ts
console.log("%c▼ Text.js%c 1.0", "color:#fff;font-weight:700", "color:#888");
\`\`\`

If no row changed, the driver returns before logging, so an idle app makes **0** console calls.`,
      },
    ];
  }
  return [
    { kind: "think", ms: 800, text: `Breaking down: ${topic}` },
    { kind: "text", text: `I'll look at the project layout to see where **${topic}** belongs.` },
    { kind: "tool", ms: 500, part: { type: "tool", tool: "shell", title: "ls -R app", status: "completed", output: "app:\nlayout.tsx  page.tsx  sessions/  settings/\n\napp/sessions:\n[id]/\n\napp/sessions/[id]:\nloading.tsx  page.tsx" } },
    { kind: "tool", ms: 450, part: { type: "tool", tool: "read", title: "app/page.tsx", status: "completed", code: PAGE_BEFORE, language: "tsx" } },
    { kind: "text", text: "The index route only renders a heading. I'll extract a `SessionList` and give the page some structure." },
    { kind: "tool", ms: 700, part: { type: "tool", tool: "edit", title: "app/page.tsx", status: "completed", diff: { before: PAGE_BEFORE, after: PAGE_AFTER, filename: "app/page.tsx" } } },
    {
      kind: "tool",
      ms: 1500,
      part: {
        type: "tool",
        tool: "shell",
        title: "text build",
        status: "completed",
        output: "   ▼ Text.js 1.0.1 (Turbolog)\n\n   Creating an optimized console production build...\n\n ✓ Compiled successfully in 0.8s\n ✓ Collecting route data\n ✓ Generating static console cells (2/3)\n\nRoute (app)                              Type       Target\n┌ ○ /                                    Static     console.log (%c)\n├ ƒ /sessions/[id]                       Dynamic    console.log (%c)\n└ ○ /settings                            Static     console.log (%c)\n\n○  (Static)   prerendered as static console cells\nƒ  (Dynamic)  on-demand console reconciliation",
      },
    },
    { kind: "text", text: `I updated \`app/page.tsx\` with a \`SessionList\` for **${topic}**, and \`text build\` passes.` },
  ];
}

/** Collapse a script into finished parts (used to pre-load history). */
export function partsFromSteps(steps: readonly Step[]): Part[] {
  const parts: Part[] = [];
  for (const s of steps) {
    if (s.kind === "think") parts.push({ type: "reasoning", text: s.text, ms: s.ms });
    else if (s.kind === "text") parts.push({ type: "text", text: s.text });
    else parts.push({ ...s.part, status: "completed" });
  }
  return parts;
}

function convo(prompt: string, agent: Agent, model: string, durationMs: number, tokens: number): Message[] {
  return [
    { id: nextId("msg"), role: "user", parts: [{ type: "text", text: prompt }] },
    { id: nextId("msg"), role: "assistant", agent, model, parts: partsFromSteps(scriptFor(prompt, agent)), durationMs, tokens },
  ];
}

export function initialSessions(): Session[] {
  const list: Session[] = [
    { id: "ses_fix_sse", title: "Fix flaky SSE reconnect test", updated: "2m ago", messages: convo("The events reconnect test fails ~1 in 5 runs. Can you fix it?", "build", "anthropic/claude-opus-5-5", 18_400, 12_400) },
    { id: "ses_dark", title: "Add theme toggle to settings", updated: "1h ago", messages: convo("Add a dark/light theme toggle to the settings page", "build", "openai/gpt-5-codex", 9_100, 6_210) },
    { id: "ses_rle", title: "Explain the Turbolog RLE encoder", updated: "yesterday", messages: convo("How does Turbolog get a whole frame into one console.log?", "build", "anthropic/claude-opus-5-5", 6_700, 4_022) },
    { id: "ses_plan", title: "Plan: sessions/[id] loading state", updated: "2d ago", messages: convo("Add a loading state to sessions/[id]", "plan", "opencode/grok-code", 4_300, 3_310) },
  ];
  return list.map((s) => ({ ...s, demo: true }));
}

export const EXAMPLE_PROMPTS = [
  "Fix the flaky reconnect test in src/events.ts",
  "Add a dark mode toggle to settings",
  "Explain how console.log renders a whole frame",
  "Build a sessions list on the home page",
] as const;
