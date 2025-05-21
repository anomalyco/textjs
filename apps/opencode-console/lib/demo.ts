/**
 * Interactive demo backend: an in-memory OpenCode with seeded sessions and a
 * streaming simulator (reasoning → read → edit with diff → shell → Markdown),
 * so the console is fully usable on static previews with no server.
 */

import type { AppEvent, AssistantMessage, JsonRecord, ModelRef, OpenCodeClient, SessionInfo, SessionMessage, ToolContent, ToolPart } from "./types";

export interface DemoOptions {
  /** Milliseconds per simulated chunk (default `28`). */
  tick?: number;
  /** Override "now" for deterministic seeds. */
  now?: number;
}

const MODEL: ModelRef = { id: "claude-opus-5-5", providerID: "anthropic" };
const DIR = "~/code/acme/storefront";

const MODELS = [
  { id: "claude-opus-5-5", providerID: "anthropic", name: "Claude Opus 5.5", context: 400_000 },
  { id: "claude-sonnet-5", providerID: "anthropic", name: "Claude Sonnet 5", context: 400_000 },
  { id: "gpt-6.1-terra", providerID: "openai", name: "GPT-6.1 Terra", context: 512_000 },
  { id: "gpt-6.1-terra-fast", providerID: "openai", name: "GPT-6.1 Terra Fast", context: 512_000 },
  { id: "gemini-4-pro", providerID: "google", name: "Gemini 4 Pro", context: 2_000_000 },
  { id: "kimi-k3", providerID: "opencode", name: "Kimi K3", context: 256_000 },
  { id: "qwen4-coder", providerID: "opencode", name: "Qwen4 Coder", context: 256_000 },
];

const CART_BEFORE = `export function CartBadge({ count }: { count: number }) {
  return <span className="badge">{count}</span>;
}
`;

const CART_AFTER = `export function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span className="badge" aria-label={\`\${count} items in cart\`}>
      {label}
    </span>
  );
}
`;

let seq = 0;
const id = (prefix: string): string => `${prefix}_demo${Date.now().toString(36)}${(seq++).toString(36)}`;

function textTool(name: string, input: JsonRecord, output: string, at: number, metadata?: JsonRecord): ToolPart {
  return { type: "tool", id: id("call"), name, state: { status: "completed", input, content: [{ type: "text", text: output }], metadata }, time: { created: at, completed: at + 400 } };
}

function seed(now: number): { sessions: SessionInfo[]; messages: Map<string, SessionMessage[]> } {
  const min = 60_000;
  const s1: SessionInfo = { id: "ses_demo_cart", title: "Fix cart badge overflow", agent: "build", model: MODEL, directory: DIR, time: { created: now - 42 * min, updated: now - 6 * min } };
  const s2: SessionInfo = { id: "ses_demo_plan", title: "Plan edge caching for /api/products", agent: "plan", model: MODEL, directory: DIR, time: { created: now - 5 * 60 * min, updated: now - 3 * 60 * min } };
  const s3: SessionInfo = { id: "ses_demo_tests", title: "Add checkout e2e tests", agent: "build", model: { id: "gpt-6.1-terra", providerID: "openai" }, directory: DIR, time: { created: now - 30 * 60 * min, updated: now - 26 * 60 * min } };
  const s4: SessionInfo = { id: "ses_demo_tw", title: "Migrate to Tailwind v5", agent: "build", model: MODEL, directory: DIR, time: { created: now - 4 * 24 * 60 * min, updated: now - 3 * 24 * 60 * min } };

  const t = now - 8 * min;
  const cart: SessionMessage[] = [
    { type: "user", id: "msg_u1", time: { created: t }, text: "The cart badge overflows when there are more than 99 items. Can you fix it and hide it when empty?" },
    {
      type: "assistant",
      id: "msg_a1",
      time: { created: t + 1500, completed: t + 14_000 },
      agent: "build",
      model: MODEL,
      content: [
        { type: "reasoning", text: "The badge renders the raw count. I should clamp to 99+, return null at zero, and add an aria-label so screen readers still get the real number.", time: { created: t + 1500, completed: t + 3000 } },
        textTool("read", { path: "src/components/cart-badge.tsx" }, CART_BEFORE, t + 3200),
        { type: "tool", id: "call_seed_edit", name: "edit", state: { status: "completed", input: { path: "src/components/cart-badge.tsx", oldString: CART_BEFORE, newString: CART_AFTER }, content: [{ type: "text", text: "Edit applied." }] }, time: { created: t + 5000, completed: t + 5600 } },
        textTool("shell", { command: "bun test src/components/cart-badge.test.tsx" }, "bun test v1.3.4\n\nsrc/components/cart-badge.test.tsx:\n✓ renders the count [2.11ms]\n✓ clamps to 99+ [0.42ms]\n✓ hides when empty [0.31ms]\n\n 3 pass\n 0 fail\nRan 3 tests across 1 file. [48.00ms]", t + 7000, { exit: 0 }),
        {
          type: "text",
          text: "Fixed. `CartBadge` now:\n\n- returns `null` when `count <= 0`\n- clamps the label to **99+**\n- keeps the real count in an `aria-label`\n\n```tsx\nconst label = count > 99 ? \"99+\" : String(count);\n```\n\nAll 3 badge tests pass.",
        },
      ],
      finish: "stop",
      tokens: { input: 18_420, output: 612, reasoning: 88 },
      cost: 0.0412,
    },
  ];
  const plan: SessionMessage[] = [
    { type: "user", id: "msg_p1", time: { created: s2.time.created }, text: "How should we cache /api/products at the edge without serving stale prices?" },
    {
      type: "assistant",
      id: "msg_p2",
      time: { created: s2.time.created + 2000, completed: s2.time.created + 20_000 },
      agent: "plan",
      model: MODEL,
      content: [
        textTool("grep", { pattern: "revalidate|cache-control", path: "src/app/api" }, "src/app/api/products/route.ts:4:  headers: { \"cache-control\": \"no-store\" },", s2.time.created + 2500, { matches: 1 }),
        {
          type: "text",
          text: "## Plan\n\n1. Serve `/api/products` with `s-maxage=60, stale-while-revalidate=300`.\n2. Tag responses with `product:<id>` and purge tags from the pricing webhook.\n3. Keep `/api/cart` uncached — it is per-user.\n\n| Route | Cache | Invalidation |\n| --- | --- | --- |\n| `/api/products` | 60s + SWR | tag purge |\n| `/api/cart` | none | — |\n\nSay **go** and I'll switch to `build` to implement it.",
        },
      ],
      finish: "stop",
    },
  ];
  const tests: SessionMessage[] = [
    { type: "user", id: "msg_t1", time: { created: s3.time.created }, text: "Add Playwright tests for guest checkout." },
    {
      type: "assistant",
      id: "msg_t2",
      time: { created: s3.time.created + 1000, completed: s3.time.created + 9000 },
      agent: "build",
      model: s3.model as ModelRef,
      content: [
        textTool("glob", { pattern: "e2e/**/*.spec.ts" }, "e2e/home.spec.ts\ne2e/search.spec.ts", s3.time.created + 1200, { count: 2 }),
        textTool("write", { path: "e2e/checkout.spec.ts", content: 'import { expect, test } from "@playwright/test";\n\ntest("guest checkout", async ({ page }) => {\n  await page.goto("/products/hoodie");\n  await page.getByRole("button", { name: "Add to cart" }).click();\n  await page.getByRole("link", { name: "Checkout" }).click();\n  await expect(page.getByText("Order summary")).toBeVisible();\n});\n' }, "Wrote e2e/checkout.spec.ts", s3.time.created + 3000),
        { type: "text", text: "Added `e2e/checkout.spec.ts` covering the guest flow end to end." },
      ],
      finish: "stop",
    },
  ];
  const tw: SessionMessage[] = [
    { type: "user", id: "msg_w1", time: { created: s4.time.created }, text: "Migrate the design tokens to Tailwind v5." },
    { type: "assistant", id: "msg_w2", time: { created: s4.time.created + 1000, completed: s4.time.created + 4000 }, agent: "build", model: MODEL, content: [{ type: "text", text: "Done — tokens now live in `@theme` inside `app.css`." }], finish: "stop" },
  ];
  return {
    sessions: [s1, s2, s3, s4],
    messages: new Map([
      [s1.id, cart],
      [s2.id, plan],
      [s3.id, tests],
      [s4.id, tw],
    ]),
  };
}

type Step = () => void;

export function createDemoClient(options: DemoOptions = {}): OpenCodeClient {
  const tick = options.tick ?? 28;
  const db = seed(options.now ?? Date.now());
  const listeners = new Set<(e: AppEvent) => void>();
  const runs = new Map<string, { timer: ReturnType<typeof setTimeout> | null; finish: () => void }>();
  let currentModel = MODEL;

  const emit = (e: AppEvent): void => {
    for (const l of listeners) l(e);
  };
  const list = (sessionID: string): SessionMessage[] => {
    let l = db.messages.get(sessionID);
    if (!l) {
      l = [];
      db.messages.set(sessionID, l);
    }
    return l;
  };
  const touch = (sessionID: string): void => {
    const s = db.sessions.find((x) => x.id === sessionID);
    if (s) s.time.updated = Date.now();
  };

  const simulate = (sessionID: string, prompt: string): void => {
    const session = db.sessions.find((s) => s.id === sessionID);
    const agent = session?.agent ?? "build";
    const model = session?.model ?? currentModel;
    const msg: AssistantMessage = { type: "assistant", id: id("msg"), time: { created: Date.now() }, agent, model, content: [] };
    const messageID = msg.id;
    const steps: Step[] = [];
    const chunked = (text: string, size: number, fn: (chunk: string) => void): void => {
      const words = text.match(new RegExp(`[\\s\\S]{1,${size}}(?=\\s|$)|[\\s\\S]{1,${size}}`, "g")) ?? [text];
      for (const w of words) steps.push(() => fn(w));
    };
    const part = (kind: "text" | "reasoning", text: string, size: number): void => {
      steps.push(() => {
        msg.content.push(kind === "text" ? { type: "text", text: "" } : { type: "reasoning", text: "", time: { created: Date.now() } });
        emit({ type: "part.started", sessionID, messageID, kind });
      });
      chunked(text, size, (delta) => {
        const p = msg.content[msg.content.length - 1];
        if (p && p.type === kind) p.text += delta;
        emit({ type: "part.delta", sessionID, messageID, kind, delta });
      });
      steps.push(() => emit({ type: "part.ended", sessionID, messageID, kind, text }));
    };
    const tool = (name: string, input: JsonRecord, output: string, metadata?: JsonRecord, pause = 6): void => {
      const toolID = id("call");
      steps.push(() => {
        msg.content.push({ type: "tool", id: toolID, name, state: { status: "streaming", input: "" }, time: { created: Date.now() } });
        emit({ type: "tool.started", sessionID, messageID, toolID, name });
      });
      steps.push(() => {
        const p = msg.content.find((c): c is ToolPart => c.type === "tool" && c.id === toolID);
        if (p) p.state = { status: "running", input, metadata: {} };
        emit({ type: "tool.called", sessionID, messageID, toolID, input });
      });
      for (let i = 0; i < pause; i++) steps.push(() => undefined);
      steps.push(() => {
        const content: ToolContent[] = [{ type: "text", text: output }];
        const p = msg.content.find((c): c is ToolPart => c.type === "tool" && c.id === toolID);
        if (p && p.state.status === "running") p.state = { status: "completed", input: p.state.input, content, metadata };
        emit({ type: "tool.success", sessionID, messageID, toolID, content, metadata });
      });
    };

    const lower = prompt.toLowerCase();
    steps.push(() => {
      list(sessionID).push(msg);
      emit({ type: "step.started", sessionID, messageID, agent, model, started: msg.time.created });
    });
    if (agent === "plan" || /\b(plan|how|why|explain|what)\b/.test(lower)) {
      part("reasoning", `The user asked: "${prompt.slice(0, 80)}". I'll look at the relevant code before proposing an approach, and keep this read-only since I'm in ${agent} mode.`, 12);
      tool("grep", { pattern: "export function", path: "src" }, "src/lib/cart.ts:12:export function addToCart(item: Item) {\nsrc/lib/cart.ts:31:export function cartTotal(items: Item[]) {\nsrc/components/cart-badge.tsx:1:export function CartBadge({ count }: { count: number }) {", { matches: 3 });
      part(
        "text",
        `Here's how I'd approach it:\n\n1. **Find the hot path** — \`cartTotal\` recomputes on every render.\n2. **Memoize** it with \`useMemo\` keyed on \`items\`.\n3. **Verify** with the existing cart tests.\n\n\`\`\`ts\nconst total = useMemo(() => cartTotal(items), [items]);\n\`\`\`\n\nPress **Tab** to switch to \`build\` and I'll make the change.`,
        6,
      );
    } else {
      part("reasoning", `Request: "${prompt.slice(0, 80)}". Read the component, make a minimal edit, then run the tests to confirm.`, 12);
      tool("read", { path: "src/components/cart-badge.tsx" }, CART_BEFORE, { truncated: false }, 4);
      tool("edit", { path: "src/components/cart-badge.tsx", oldString: CART_BEFORE, newString: CART_AFTER }, "Edit applied.", { files: ["src/components/cart-badge.tsx"] }, 5);
      tool("shell", { command: "bun test src/components" }, "bun test v1.3.4\n\nsrc/components/cart-badge.test.tsx:\n✓ renders the count [1.92ms]\n✓ clamps to 99+ [0.38ms]\n✓ hides when empty [0.29ms]\n\n 3 pass\n 0 fail\nRan 3 tests across 1 file. [51.00ms]", { exit: 0 }, 14);
      part(
        "text",
        `Done. I updated \`src/components/cart-badge.tsx\`:\n\n- Hides the badge when the cart is empty\n- Clamps large counts to **99+**\n- Adds an accessible \`aria-label\`\n\n\`\`\`tsx\nif (count <= 0) return null;\nconst label = count > 99 ? "99+" : String(count);\n\`\`\`\n\nTests: **3 pass**, 0 fail.`,
        6,
      );
    }
    const finish = (outcome: "succeeded" | "interrupted"): void => {
      const run = runs.get(sessionID);
      if (run?.timer) clearTimeout(run.timer);
      runs.delete(sessionID);
      msg.time.completed = Date.now();
      msg.finish = outcome === "succeeded" ? "stop" : "unknown";
      for (const p of msg.content) if (p.type === "tool" && (p.state.status === "running" || p.state.status === "streaming")) p.state = { status: "error", input: typeof p.state.input === "string" ? {} : p.state.input, error: { message: "interrupted" } };
      msg.tokens = { input: 12_000 + prompt.length * 4, output: 480, reasoning: 64 };
      msg.cost = 0.0213;
      if (!list(sessionID).includes(msg)) list(sessionID).push(msg);
      if (outcome === "interrupted") list(sessionID).push({ type: "note", id: id("msg"), time: { created: Date.now() }, text: "interrupted", tone: "warning" });
      touch(sessionID);
      emit({ type: "step.ended", sessionID, messageID, finish: msg.finish, tokens: msg.tokens, cost: msg.cost });
      emit({ type: "execution.ended", sessionID, outcome });
      if (outcome === "interrupted") emit({ type: "messages.changed", sessionID });
      emit({ type: "status", sessionID, busy: false });
    };
    let i = 0;
    const next = (): void => {
      const run = runs.get(sessionID);
      if (!run) return;
      if (i >= steps.length) {
        finish("succeeded");
        return;
      }
      (steps[i++] as Step)();
      run.timer = setTimeout(next, tick);
    };
    runs.set(sessionID, { timer: setTimeout(next, tick * 4), finish: () => finish("interrupted") });
  };

  return {
    kind: "demo",
    mode: "demo",
    label: "demo",
    async info() {
      return { version: "demo", directory: DIR };
    },
    async sessions() {
      return [...db.sessions].sort((a, b) => b.time.updated - a.time.updated).map((s) => ({ ...s, time: { ...s.time } }));
    },
    async session(sid) {
      const s = db.sessions.find((x) => x.id === sid);
      return s ? { ...s } : null;
    },
    async messages(sid) {
      return structuredClone(db.messages.get(sid) ?? []);
    },
    async create(input) {
      const now = Date.now();
      const s: SessionInfo = { id: id("ses"), title: input.title, agent: input.agent ?? "build", model: input.model ?? currentModel, directory: DIR, time: { created: now, updated: now } };
      db.sessions.unshift(s);
      db.messages.set(s.id, []);
      emit({ type: "sessions.changed" });
      return { ...s };
    },
    async prompt(sid, text) {
      const s = db.sessions.find((x) => x.id === sid);
      if (!s) throw new Error(`Unknown session ${sid}`);
      if (!s.title) {
        s.title = text.length > 48 ? `${text.slice(0, 47).trimEnd()}…` : text;
        emit({ type: "session.renamed", sessionID: sid, title: s.title });
      }
      list(sid).push({ type: "user", id: id("msg"), time: { created: Date.now() }, text });
      touch(sid);
      emit({ type: "status", sessionID: sid, busy: true });
      emit({ type: "messages.changed", sessionID: sid });
      runs.get(sid)?.finish();
      simulate(sid, text);
    },
    async interrupt(sid) {
      runs.get(sid)?.finish();
    },
    async setAgent(sid, agent) {
      const s = db.sessions.find((x) => x.id === sid);
      if (s) s.agent = agent;
      emit({ type: "session.agent", sessionID: sid, agent });
    },
    async setModel(sid, model) {
      currentModel = model;
      const s = db.sessions.find((x) => x.id === sid);
      if (s) s.model = model;
      emit({ type: "session.model", sessionID: sid, model });
    },
    async view() {},
    async agents() {
      return [
        { id: "build", name: "build", description: "Default agent with every tool enabled" },
        { id: "plan", name: "plan", description: "Read-only planning and analysis" },
      ];
    },
    async models() {
      return MODELS;
    },
    async defaultModel() {
      return currentModel;
    },
    subscribe(onEvent, onState) {
      listeners.add(onEvent);
      onState?.("open");
      queueMicrotask(() => onEvent({ type: "connected" }));
      return () => {
        listeners.delete(onEvent);
      };
    },
  };
}
