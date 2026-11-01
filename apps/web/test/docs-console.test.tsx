import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { act } from "react";
import type { SceneNode } from "@textjs/core";
import { CompanionApp } from "../src/console-companion/App";
import { siteStore } from "../src/console-companion/store";
import { mount, type Harness } from "./helpers";

async function site(fn: () => void): Promise<void> {
  await act(async () => fn());
}

const COLS = 100;
const ROWS = 26;

/** The page column: the text between the list's border and the scrollbar, one entry per row. */
function page(h: Harness): string[] {
  return h
    .frame()
    .split("\n")
    .slice(3, ROWS - 1)
    .map((l) => l.padEnd(COLS).slice(l.indexOf("│") + 1, COLS - 1).trim());
}

function hints(h: Harness): string {
  return (h.frame().split("\n").at(-1) ?? "").trim();
}

function find(node: SceneNode, label: string): SceneNode | null {
  if (node.props.wireframeLabel === label) return node;
  for (const c of node.children) {
    const hit = find(c, label);
    if (hit) return hit;
  }
  return null;
}

describe("console Docs view", () => {
  let h: Harness;
  beforeEach(async () => {
    await site(() => siteStore.reset());
    await site(() => siteStore.syncRoute("/docs/routing"));
  });
  afterAll(async () => {
    await h?.unmount();
    await site(() => siteStore.reset());
  });

  test("the page column fits the console, so a long page has somewhere to scroll", async () => {
    h = await mount(<CompanionApp />, { cols: COLS, rows: ROWS, tabFocus: false });
    h.frame();
    const viewport = find(h.root.rootNode, "scroll");
    expect(viewport).not.toBeNull();
    const L = (viewport as SceneNode).layout;
    expect(L.y + L.height).toBeLessThanOrEqual(ROWS - 1);
    expect(L.scrollHeight).toBeGreaterThan(L.contentHeight);
    await h.unmount();
  });

  test("Enter reads the page: ↓, Space, PageUp/PageDown, g/G and Home/End scroll it; ← Esc ⌫ go back", async () => {
    h = await mount(<CompanionApp />, { cols: COLS, rows: ROWS, tabFocus: false });
    expect(hints(h)).toBe("↑ ↓ browse   Enter read   / search");
    const top = page(h);
    expect(top[0]).toBe("Routing");

    await h.key("return");
    expect(siteStore.getSnapshot().docsPane).toBe("content");
    expect(hints(h)).toBe("↑ ↓ scroll   Space page   ← back   / search");
    expect(page(h)).toEqual(top);

    await h.key("down");
    expect(page(h)).toEqual(top.slice(1).concat(page(h).at(-1) as string));
    await h.key("j", { input: "j" });
    expect(page(h)[0]).toBe(top[2]);
    // The list stays put while the page scrolls.
    expect(siteStore.getSnapshot().docSlug).toBe("routing");

    await h.key("up");
    await h.key("up");
    expect(page(h)).toEqual(top);

    // Space and PageDown keep the last visible row in view, at the top.
    const last = top.length - 1;
    await h.key("space", { input: " " });
    expect(page(h)[0]).toBe(top[last]);
    await h.key("pageup");
    expect(page(h)).toEqual(top);
    await h.key("pagedown");
    expect(page(h)[0]).toBe(top[last]);
    await h.key("g", { input: "g" });
    expect(page(h)).toEqual(top);
    await h.key("g", { input: "G", shift: true });
    const bottom = page(h);
    expect(bottom).not.toContain("Routing");
    await h.key("home");
    expect(page(h)).toEqual(top);
    await h.key("end");
    expect(page(h)).toEqual(bottom);

    await h.key("left");
    expect(siteStore.getSnapshot().docsPane).toBe("list");
    expect(hints(h)).toBe("↑ ↓ browse   Enter read   / search");
    // Back in the list, ↓ picks the next page.
    await h.key("down");
    expect(siteStore.getSnapshot().docSlug).not.toBe("routing");
    await h.key("up");
    expect(siteStore.getSnapshot().docSlug).toBe("routing");

    for (const back of ["escape", "backspace"]) {
      await h.key("right");
      expect(siteStore.getSnapshot().docsPane).toBe("content");
      expect(hints(h)).toContain("← back");
      // The page keeps its place between visits.
      const before = page(h);
      await h.key("down");
      expect(page(h)[0]).toBe(before[1]);
      await h.key(back);
      expect(siteStore.getSnapshot().docsPane).toBe("list");
      expect(hints(h)).toContain("Enter read");
    }

    await h.key("return");
    await h.key("/", { input: "/" });
    expect(siteStore.getSnapshot().docsPane).toBe("search");
    expect(hints(h)).toContain("Enter read");
    await h.key("escape");
    expect(siteStore.getSnapshot().docsPane).toBe("list");
  });

  test("leaving the docs returns the view to the page list", async () => {
    await site(() => siteStore.set({ docsPane: "content" }));
    await site(() => siteStore.syncRoute("/docs/styling"));
    expect(siteStore.getSnapshot().docsPane).toBe("content");
    await site(() => siteStore.syncRoute("/"));
    expect(siteStore.getSnapshot().docsPane).toBe("list");
  });
});
