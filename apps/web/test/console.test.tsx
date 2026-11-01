import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { CompanionApp } from "../src/console-companion/App";
import { PAGE_HINTS, PRESETS, siteStore } from "../src/console-companion/store";
import { PREVIEWS } from "../src/docs/previews";
import { newGame, step } from "../src/demos/Snake";
import { scriptFor, partsFromSteps, initialSessions } from "../src/demos/opencode/model";
import { normalizeServerUrl } from "../src/demos/opencode/live";
import { v1Message } from "../../opencode-console/lib/client";
import { shouldRouteToConsole } from "../src/console-companion/boot";
import { mount, type Harness } from "./helpers";

/** Site store updates re-render the mounted companion, so they run inside `act`. */
async function site(fn: () => void): Promise<void> {
  await act(async () => fn());
}

describe("console companion (104×32)", () => {
  let h: Harness | undefined;
  beforeEach(async () => {
    await site(() => siteStore.reset());
  });
  afterAll(async () => {
    await h?.unmount();
    h = undefined;
    await site(() => siteStore.reset());
  });

  test("boots on Home: brand, counter and one quiet line of keys, no tabs", async () => {
    await site(() => siteStore.syncRoute("/"));
    h = await mount(<CompanionApp />, { cols: 104, rows: 32, tabFocus: false });
    const f = h.frame();
    expect(f).toContain("▼ Text.js");
    expect(f).toContain("React 19 in console.log");
    expect(f).toContain("↑ ↓ count");
    expect(f).toContain("t theme");
    for (const gone of ["1 Home", "5 Snake", "Playground", "tabs", "useState", "spans"]) expect(f).not.toContain(gone);
    expect(f).not.toContain("▲");
  });

  test("emits exactly one console.log per dirty frame and none when idle", async () => {
    if (!h) throw new Error("companion not mounted");
    const before = h.console.logs.length;
    await h.key("up");
    h.frame();
    const after = h.console.logs.length;
    expect(after - before).toBe(1);
    // Append mode: frames stack and only the first one clears.
    expect(h.console.clears).toBe(1);
    h.frame();
    h.frame();
    expect(h.console.logs.length).toBe(after);
    const [format, ...args] = h.console.logs[after - 1] as [string, ...string[]];
    expect(typeof format).toBe("string");
    expect(format.replaceAll("%%", "").split("%c").length - 1).toBe(args.length);
    expect(args.length).toBeLessThan(600);
    // No delayed stats-only re-render: a second console.clear() would wipe DevTools text selection.
    await h.wait(600);
    h.frame();
    expect(h.console.logs.length).toBe(after);
  });

  test("theme cycling with t", async () => {
    if (!h) throw new Error("companion not mounted");
    await h.key("t", { input: "t" });
    expect(siteStore.getSnapshot().theme).toBe("opencodeDark");
    expect(h.frame()).toContain("OpenCode Dark");
  });

  test("each page shows only its own view; the playground shows only the picked demo", async () => {
    if (!h) throw new Error("companion not mounted");
    // Number keys no longer switch views.
    await h.key("4", { input: "4" });
    expect(h.frame()).toContain("React 19 in console.log");
    await site(() => siteStore.syncRoute("/docs/routing"));
    expect(h.frame()).toContain("File-system App Router");
    await site(() => siteStore.syncRoute("/playground"));
    expect(h.frame()).toContain("playground / dashboard");
    expect(h.frame()).toContain("Requests / s");
    expect(h.frame()).toContain("← → switch region");
    // Other demos are picked on the page (each has its own URL), never from inside the console.
    await h.key("]", { input: "]" });
    expect(siteStore.getSnapshot().preset).toBe("dashboard");
    await site(() => siteStore.syncRoute("/playground/streaming"));
    expect(h.frame()).toContain("playground / streaming");
    expect(h.frame()).toContain("r stream again");
    await site(() => siteStore.syncRoute("/playground/snake"));
    expect(h.frame()).toContain("score 0");
    await site(() => siteStore.syncRoute("/this-page-does-not-exist"));
    expect(siteStore.getSnapshot().tab).toBe("home");
    expect(h.frame()).not.toContain("score 0");
  });

  test("every playground demo reacts to its declared keys", async () => {
    if (!h) throw new Error("companion not mounted");
    await site(() => siteStore.syncRoute("/playground"));
    expect(siteStore.getSnapshot().preset).toBe("dashboard");
    expect(h.frame()).toMatch(/\biad1\b/);
    expect(h.frame()).not.toContain("Frames / s");
    await h.key("left");
    expect(h.frame()).toContain("Frames / s");
    await site(() => siteStore.syncRoute("/playground/snake"));
    expect(h.frame()).toContain("press an arrow key");
    await h.key("right");
    expect(h.frame()).not.toContain("press an arrow key");
    await site(() => siteStore.syncRoute("/playground/streaming"));
    await h.wait(400);
    await h.key("r", { input: "r" });
    expect(h.frame()).toContain("r stream again");
    await site(() => siteStore.syncRoute("/playground"));
  });

  test("OpenCode: full-screen TUI that opens on the prompt, like the real one", async () => {
    if (!h) throw new Error("companion not mounted");
    await site(() => siteStore.syncRoute("/opencode"));
    let f = h.frame();
    expect(f).toContain("█▀▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀▀ █▀▀█ █▀▀█ █▀▀█");
    expect(f).toContain('Ask anything… "Fix broken tests"');
    expect(f).toContain("Build · Claude Opus 5.5 Anthropic");
    expect(f).toContain("ctrl+x l sessions");
    expect(f).not.toContain("▼ Text.js");
    await h.key("tab", { shift: true });
    expect(h.frame()).toContain("Plan · Claude Opus 5.5");
    await h.key("tab", { shift: true });
    const rows = h.frame().split("\n").length;
    await h.type("explain the renderer");
    expect(h.frame()).toContain("explain the renderer");
    expect(h.frame().split("\n").length).toBe(rows);
    await h.key("return");
    await h.wait(1200);
    f = h.frame();
    expect(f).toContain("explain the renderer");
    expect(f).toMatch(/Thinking|Thought/);
    await h.key("p", { ctrl: true });
    f = h.frame();
    expect(f).toContain("Commands");
    await h.type("flaky");
    expect(h.frame()).toContain("Fix flaky SSE reconnect test");
    await h.key("escape"); // clear the search
    await h.key("escape");
    expect(h.frame()).not.toContain("Search sessions, models and commands");
    await h.key("escape");
    await site(() => siteStore.syncRoute("/"));
    expect(h.frame()).toContain("React 19 in console.log");
  });
});

describe("doc previews render at their declared sizes", () => {
  for (const [id, spec] of Object.entries(PREVIEWS)) {
    test(id, async () => {
      const p = await mount(spec.render(), { cols: spec.cols, rows: spec.rows });
      const f = p.frame();
      expect(f.trim().length).toBeGreaterThan(20);
      await p.unmount();
    });
  }
});

describe("demo logic", () => {
  test("snake moves, eats and dies on walls", () => {
    const g = newGame(12, 8);
    const head = { ...(g.snake[0] as { x: number; y: number }) };
    step(g);
    expect(g.snake[0]?.x).toBe(head.x + 1);
    g.food = { x: (g.snake[0]?.x ?? 0) + 1, y: g.snake[0]?.y ?? 0 };
    const len = g.snake.length;
    step(g);
    expect(g.snake.length).toBe(len + 1);
    expect(g.score).toBe(10);
    for (let i = 0; i < 20 && g.status !== "over"; i++) step(g);
    expect(g.status).toBe("over");
  });

  test("opencode scripts include read / edit / shell tool cards", () => {
    const tools = partsFromSteps(scriptFor("anything at all", "build")).filter((p) => p.type === "tool").map((p) => (p.type === "tool" ? p.tool : ""));
    expect(tools).toContain("read");
    expect(tools).toContain("edit");
    expect(tools).toContain("shell");
    const plan = partsFromSteps(scriptFor("anything", "plan"));
    expect(plan.some((p) => p.type === "tool" && p.tool === "edit")).toBe(false);
    expect(initialSessions().length).toBeGreaterThanOrEqual(4);
  });

  test("live client helpers", () => {
    expect(normalizeServerUrl("localhost:4096/")).toBe("http://localhost:4096");
    expect(normalizeServerUrl(" http://127.0.0.1:49374 ")).toBe("http://127.0.0.1:49374");
    expect(v1Message({ info: { id: "m", role: "assistant" }, parts: [{ type: "step-start" }, { type: "text", text: "hi" }, { type: "tool", tool: "bash", state: { status: "completed", input: { command: "ls" }, output: "a" } }] })).toMatchObject({
      content: [{ type: "text", text: "hi" }, { type: "tool", name: "bash", state: { status: "completed", input: { command: "ls" }, content: [{ type: "text", text: "a" }] } }],
    });
  });

  test("input coexistence gate", () => {
    expect(shouldRouteToConsole(null, true)).toBe(true);
    expect(shouldRouteToConsole(null, false)).toBe(false);
  });

  test("every demo declares two or three keys and what to do first", () => {
    for (const p of PRESETS) {
      expect(p.hints.length).toBeGreaterThanOrEqual(1);
      expect(p.hints.length).toBeLessThanOrEqual(3);
      expect(p.action.length).toBeGreaterThan(0);
    }
    for (const page of Object.values(PAGE_HINTS)) expect(page.hints.length).toBeLessThanOrEqual(3);
  });
});
