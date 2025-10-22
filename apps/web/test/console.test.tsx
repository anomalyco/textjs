import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { CompanionApp } from "../src/console-companion/App";
import { siteStore } from "../src/console-companion/store";
import { PREVIEWS } from "../src/docs/previews";
import { newGame, step } from "../src/demos/Snake";
import { scriptFor, partsFromSteps, initialSessions } from "../src/demos/opencode/model";
import { normalizeServerUrl, toPart } from "../src/demos/opencode/live";
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

  test("boots on the Home tab with brand, counter and theme picker", async () => {
    await site(() => siteStore.syncRoute("/"));
    h = await mount(<CompanionApp />, { cols: 104, rows: 32, tabFocus: false });
    const f = h.frame();
    expect(f).toContain("▼ Text.js");
    expect(f).toContain("1 Home");
    expect(f).toContain("5 Snake");
    expect(f).toContain("React 19 in console.log");
    expect(f).toContain("useState");
    expect(f).not.toContain("spans");
    expect(f).not.toContain("▲");
  });

  test("emits exactly one console.log per dirty frame and none when idle", async () => {
    if (!h) throw new Error("companion not mounted");
    const before = h.console.logs.length;
    await h.key("up");
    h.frame();
    const after = h.console.logs.length;
    expect(after - before).toBe(1);
    expect(h.console.clears).toBe(h.console.logs.length);
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

  test("number keys switch tabs; website navigation syncs tabs", async () => {
    if (!h) throw new Error("companion not mounted");
    await h.key("4", { input: "4" });
    expect(h.frame()).toContain("Search docs");
    expect(h.frame()).toContain("Introduction");
    await h.key("5", { input: "5" });
    expect(h.frame()).toContain("snake · 60fps");
    await h.key("2", { input: "2" });
    expect(h.frame()).toContain("Counter & State");
    await h.key("]", { input: "]" });
    expect(siteStore.getSnapshot().preset).toBe("dashboard");
    expect(h.frame()).toContain("Throughput");
    await site(() => siteStore.syncRoute("/docs/routing"));
    expect(h.frame()).toContain("File-system App Router");
    await site(() => siteStore.syncRoute("/"));
    expect(h.frame()).toContain("useState");
    await h.key("5", { input: "5" });
    await site(() => siteStore.syncRoute("/this-page-does-not-exist"));
    expect(siteStore.getSnapshot().tab).toBe("home");
    expect(h.frame()).not.toContain("snake · 60fps");
  });

  test("OpenCode tab: session view, home logo, agent switch and streamed sandbox response", async () => {
    if (!h) throw new Error("companion not mounted");
    await site(() => siteStore.syncRoute("/opencode"));
    let f = h.frame();
    expect(f).toContain("Fix flaky SSE reconnect test");
    expect(f).toContain("← Edit src/events.ts");
    expect(f).toContain("$ bun test test/events.test.ts");
    expect(f).toContain("Build · Claude Opus 5.5 Anthropic");
    expect(f).toContain("tab plan · ctrl+p commands");
    expect(f).not.toContain("Sessions");
    await h.key("n", { ctrl: true });
    f = h.frame();
    expect(f).toContain("█▀▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀▀ █▀▀█ █▀▀█ █▀▀█");
    expect(f).toContain('Ask anything... "Fix broken tests"');
    expect(f).toContain("ctrl+p sessions");
    await h.key("tab");
    expect(h.frame()).toContain("Plan · Claude Opus 5.5");
    await h.key("tab");
    const rows = h.frame().split("\n").length;
    await h.type("explain the renderer");
    expect(h.frame()).toContain("explain the renderer");
    expect(h.frame().split("\n").length).toBe(rows);
    await h.key("return");
    await h.wait(1200);
    f = h.frame();
    expect(f).toContain("explain the renderer");
    expect(f).toMatch(/Thinking|Thought for/);
    await h.key("p", { ctrl: true });
    f = h.frame();
    expect(f).toContain("Commands");
    expect(f).toContain("New session");
    await h.key("escape");
    expect(h.frame()).not.toContain("Search sessions, models and commands");
    await h.key("escape");
    await h.key("escape");
    await h.key("1", { input: "1" });
    expect(h.frame()).toContain("useState");
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
    expect(toPart({ type: "text", text: "hi" })).toEqual({ type: "text", text: "hi" });
    expect(toPart({ type: "tool", tool: "bash", state: { status: "completed", input: { command: "ls" }, output: "a" } })).toEqual({
      type: "tool",
      tool: "bash",
      title: "ls",
      status: "completed",
      output: "a",
    });
    expect(toPart({ type: "step-start" })).toBeNull();
  });

  test("input coexistence gate", () => {
    expect(shouldRouteToConsole(null, true)).toBe(true);
    expect(shouldRouteToConsole(null, false)).toBe(false);
  });
});
