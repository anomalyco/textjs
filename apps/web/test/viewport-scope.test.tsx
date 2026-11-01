import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { initYoga, InputEngine } from "@textjs/core";
import { createConsoleRootSync, type ConsoleRoot } from "@textjs/react";
import { saveViewportChoice, VIEWPORT_CHOICE_KEY } from "@textjs/react/dom";
import { COMPANION_COLS, COMPANION_ROWS, followViewportScope, LEARN_VIEWPORT_KEY, PLAYGROUND_VIEWPORT_KEY, viewportChoiceFor, viewportChoiceKey, viewportLimitsFor } from "../src/console-companion/boot";
import { tabForPath, type CompanionTab } from "../src/console-companion/store";
import { FakeConsole, ManualScheduler } from "./helpers";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

const g = globalThis as { localStorage?: Storage };
const original = g.localStorage;
g.localStorage = new MemoryStorage() as unknown as Storage;
afterAll(() => {
  g.localStorage = original;
});
beforeEach(() => localStorage.clear());

/** A 1440×900 window with DevTools docked at the bottom: a console of 1440 × 512px, wider and taller than Home allows. */
const DOCKED = { innerWidth: 1440, innerHeight: 300, outerWidth: 1440, outerHeight: 900 };

/** The companion as booted on `tab`. */
async function companionOn(tab: CompanionTab): Promise<ConsoleRoot> {
  await initYoga();
  const choice = viewportChoiceFor(tab);
  let root: ConsoleRoot | undefined;
  await act(async () => {
    root = createConsoleRootSync({
      ...(choice === "fit" ? { responsive: true } : { width: choice.cols, height: choice.rows }),
      viewport: { ...viewportLimitsFor(tab), window: DOCKED, charWidth: 7.2, scrollbarWidth: 0, browserChromeHeight: 88, storage: null },
      console: new FakeConsole(),
      scheduler: new ManualScheduler(),
      input: new InputEngine({ document: null }),
      registerGlobal: false,
    });
  });
  return root as ConsoleRoot;
}

const follow = (root: ConsoleRoot, from: CompanionTab, to: CompanionTab, example: string | null): Promise<void> => act(async () => followViewportScope(root, from, to, example));
const size = (root: ConsoleRoot): string => `${root.renderer.buffer.width}x${root.renderer.buffer.height}`;

describe("console size scopes", () => {
  test("Playground demos share one choice, Learn keeps its own, other pages have none", () => {
    expect(PLAYGROUND_VIEWPORT_KEY).toBe(VIEWPORT_CHOICE_KEY);
    for (const path of ["/playground", "/playground/snake", "/opencode", "/coffee"]) expect(viewportChoiceKey(tabForPath(path))).toBe(PLAYGROUND_VIEWPORT_KEY);
    for (const path of ["/learn", "/learn/layout", "/learn/certificate"]) expect(viewportChoiceKey(tabForPath(path))).toBe(LEARN_VIEWPORT_KEY);
    for (const path of ["/", "/docs", "/docs/components", "/blog/turbolog-eliminating-the-flash", "/status"]) expect(viewportChoiceKey(tabForPath(path))).toBeNull();
  });

  test("a size picked on the Playground never reaches Home, docs or Learn", () => {
    saveViewportChoice({ cols: 160, rows: 48 }, PLAYGROUND_VIEWPORT_KEY);
    expect(viewportChoiceFor("playground")).toEqual({ cols: 160, rows: 48 });
    expect(viewportChoiceFor("opencode")).toEqual({ cols: 160, rows: 48 });
    expect(viewportChoiceFor("terminal")).toEqual({ cols: 160, rows: 48 });
    expect(viewportChoiceFor("home")).toBe("fit");
    expect(viewportChoiceFor("docs")).toBe("fit");
    expect(viewportChoiceFor("learn")).toBe("fit");
  });

  test("navigating Playground → Home → Playground keeps Home at its default and the Playground at its choice", async () => {
    saveViewportChoice({ cols: 160, rows: 48 }, PLAYGROUND_VIEWPORT_KEY);
    const root = await companionOn("playground");
    expect(size(root)).toBe("160x48");

    await follow(root, "playground", "home", null);
    expect(root.renderer.viewport.responsive).toBe(true);
    expect(size(root)).toBe(`${COMPANION_COLS}x${COMPANION_ROWS}`);

    // A Components example on Home still gets its exact grid.
    await follow(root, "home", "home", "table");
    expect(size(root)).toBe("76x17");
    await follow(root, "home", "home", null);

    await follow(root, "home", "playground", null);
    expect(root.renderer.viewport.responsive).toBe(false);
    expect(size(root)).toBe("160x48");

    // Between Playground demos nothing is re-applied.
    await follow(root, "playground", "opencode", null);
    expect(size(root)).toBe("160x48");
    await act(async () => root.unmount());
  });

  test("booting on Home ignores the Playground's choice", async () => {
    saveViewportChoice({ cols: 120, rows: 36 }, PLAYGROUND_VIEWPORT_KEY);
    const root = await companionOn("home");
    expect(root.renderer.viewport.responsive).toBe(true);
    expect(size(root)).toBe(`${COMPANION_COLS}x${COMPANION_ROWS}`);
    await act(async () => root.unmount());
  });

  test("Learn's choice stays on Learn", async () => {
    saveViewportChoice({ cols: 80, rows: 24 }, LEARN_VIEWPORT_KEY);
    const root = await companionOn("learn");
    expect(size(root)).toBe("80x24");
    await follow(root, "learn", "playground", null);
    expect(root.renderer.viewport.responsive).toBe(true);
    await follow(root, "playground", "docs", null);
    expect(root.renderer.viewport.responsive).toBe(true);
    await follow(root, "docs", "learn", null);
    expect(size(root)).toBe("80x24");
    await act(async () => root.unmount());
  });
});
