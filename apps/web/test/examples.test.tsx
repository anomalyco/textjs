import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { extractStyledFrame, type StyledFrame } from "@textjs/core";
import { CompanionApp } from "../src/console-companion/App";
import { viewportLimitsFor } from "../src/console-companion/boot";
import { SiteStore, siteStore } from "../src/console-companion/store";
import { exampleFrame, exampleGrid, exampleHeader, HOME_EXAMPLE_GRID, homeExampleHeader, isHomeExampleFrame } from "../src/console-companion/tabs/ExampleTab";
import { PREVIEW_META, previewLabel } from "../src/docs/preview-meta";
import { PREVIEWS } from "../src/docs/previews";
import { LivePreview } from "../src/site/LivePreview";
import { KitSection } from "../src/pages/home/Kit";
import { mount, type Harness } from "./helpers";

async function site(fn: () => void): Promise<void> {
  await act(async () => fn());
}

const text = (f: StyledFrame): string => f.rows.map((r) => r.map((s) => s.text).join("").trimEnd()).join("\n");

describe("docs examples in the console: store", () => {
  test("activating an example engages console input; exiting gives the page its keys back", () => {
    const s = new SiteStore();
    s.syncRoute("/docs/components-layout");
    s.activateExample("modal");
    expect(s.getSnapshot()).toMatchObject({ example: "modal", consoleInput: true });
    s.activateExample("scrollbox");
    expect(s.getSnapshot().example).toBe("scrollbox");
    // A stale exit from the previously active example is ignored.
    s.exitExample("modal");
    expect(s.getSnapshot().example).toBe("scrollbox");
    s.exitExample("scrollbox");
    expect(s.getSnapshot()).toMatchObject({ example: null, consoleInput: false });
  });

  test("navigating to another page returns the console to the docs; same-page syncs keep it", () => {
    const s = new SiteStore();
    s.syncRoute("/docs/components-layout");
    s.activateExample("layout");
    s.syncRoute("/docs/components-layout");
    expect(s.getSnapshot().example).toBe("layout");
    s.syncRoute("/docs/styling");
    expect(s.getSnapshot().example).toBeNull();
  });

  test("the console grid is exactly the example's preview plus one header row", () => {
    const spec = PREVIEWS.modal as { cols: number; rows: number };
    expect(exampleGrid("modal")).toEqual({ cols: spec.cols, rows: spec.rows + 1 });
    expect(viewportLimitsFor("docs", "modal")).toMatchObject({ minCols: spec.cols, maxCols: spec.cols, minRows: spec.rows + 1, maxRows: spec.rows + 1 });
    expect(viewportLimitsFor("docs", null)).toMatchObject({ minCols: 40, maxCols: 200 });
    expect(viewportLimitsFor("docs", "nope")).toMatchObject({ maxCols: 200 });
  });
});

describe("docs examples in the console: companion", () => {
  let h: Harness | undefined;
  beforeEach(async () => {
    await site(() => siteStore.reset());
  });
  afterEach(async () => {
    await h?.unmount();
    h = undefined;
    await site(() => siteStore.reset());
  });

  test("renders the active example with a one-line header; Esc the example uses stays with it", async () => {
    await site(() => siteStore.syncRoute("/docs/components-layout"));
    h = await mount(<CompanionApp />, { cols: 120, rows: 36, tabFocus: false });
    expect(h.frame()).toContain("Layout");
    await site(() => siteStore.activateExample("modal"));
    const f = h.frame();
    expect(f.split("\n")[0]).toContain("▼ Docs › Modal");
    expect(f.split("\n")[0]).toContain("Esc back to docs");
    expect(f).toContain("Commands");
    expect(f).toContain("Switch theme");
    // The open modal consumes the first Esc…
    await h.key("escape");
    expect(siteStore.getSnapshot().example).toBe("modal");
    expect(h.frame()).not.toContain("Switch theme");
    expect(h.frame()).toContain("Press enter to reopen");
    // …the example's own keys still work…
    await h.key("return");
    expect(h.frame()).toContain("Switch theme");
    await h.key("escape");
    // …and an Esc nobody handles goes back to the docs.
    await h.key("escape");
    expect(siteStore.getSnapshot().example).toBeNull();
    expect(h.frame()).toContain("/ Search");
    expect(h.frame()).not.toContain("Esc back to docs");
  });

  test("an unknown example id keeps the Docs view", async () => {
    await site(() => siteStore.syncRoute("/docs/components-layout"));
    h = await mount(<CompanionApp />, { cols: 120, rows: 36, tabFocus: false });
    await site(() => siteStore.activateExample("nope"));
    expect(h.frame()).toContain("/ Search");
  });

  /** Every live example in the docs, with the page it's on (`tsx#id` fences). */
  const DOC_EXAMPLES = readdirSync(join(import.meta.dir, "../src/docs/content")).flatMap((f) =>
    [...readFileSync(join(import.meta.dir, "../src/docs/content", f), "utf8").matchAll(/```tsx#([\w-]+)/g)].map((m) => ({ slug: f.replace(/\.md$/, ""), id: m[1] as string })),
  );

  /** The console's header row while `id` runs from `/docs/<slug>`, at exactly the example's grid. */
  async function consoleHeader(slug: string, id: string): Promise<{ row: string; frame: StyledFrame }> {
    await site(() => siteStore.syncRoute(`/docs/${slug}`));
    await site(() => siteStore.activateExample(id));
    const grid = exampleGrid(id) as { cols: number; rows: number };
    h = await mount(<CompanionApp />, { cols: grid.cols, rows: grid.rows, tabFocus: false });
    h.frame();
    const frame = extractStyledFrame(h.root.renderer.buffer);
    await h.unmount();
    h = undefined;
    await site(() => siteStore.reset());
    return { row: (frame.rows[0] ?? []).map((s) => s.text).join(""), frame };
  }

  test("no example's header is cut off at the example's width", async () => {
    expect(DOC_EXAMPLES.length).toBeGreaterThanOrEqual(15);
    const cut: string[] = [];
    for (const { slug, id } of DOC_EXAMPLES) {
      const { row } = await consoleHeader(slug, id);
      if (!row.includes(exampleHeader(id)) || row.includes("…")) cut.push(`${slug}#${id}: ${row.trimEnd()}`);
    }
    expect(cut).toEqual([]);
  });

  test("the page finds the console's header for every example, in every language", async () => {
    // The header names only the example, so the English console and a translated page agree.
    for (const id of Object.keys(PREVIEW_META)) expect(exampleHeader(id)).toBe(`▼ Docs › ${previewLabel(id)}`);
    for (const { slug, id } of DOC_EXAMPLES) {
      const { frame } = await consoleHeader(slug, id);
      expect({ example: `${slug}#${id}`, mirrored: exampleFrame(frame, exampleHeader(id), id)?.height }).toEqual({ example: `${slug}#${id}`, mirrored: PREVIEW_META[id]?.rows });
    }
  });

  test("the page mirror shows exactly the example's cells, the same as a standalone preview", async () => {
    const spec = PREVIEWS.layout as { cols: number; rows: number; render: () => React.ReactNode };
    await site(() => siteStore.syncRoute("/docs/components-layout"));
    await site(() => siteStore.activateExample("layout"));
    h = await mount(<CompanionApp />, { cols: spec.cols + 20, rows: spec.rows + 6, tabFocus: false });
    h.frame();
    const companion = extractStyledFrame(h.root.renderer.buffer);
    const header = exampleHeader("layout");
    const mirrored = exampleFrame(companion, header, "layout");
    expect(mirrored).not.toBeNull();
    expect(mirrored?.height).toBe(spec.rows);
    // A frame that isn't showing this example yet (e.g. the docs view) is never mirrored.
    expect(exampleFrame(companion, exampleHeader("modal"), "modal")).toBeNull();
    await h.unmount();

    h = await mount(spec.render(), { cols: spec.cols, rows: spec.rows, tabFocus: false });
    h.frame();
    const standalone = extractStyledFrame(h.root.renderer.buffer);
    const crop = (f: StyledFrame): string =>
      text(f)
        .split("\n")
        .map((l) => [...l].slice(0, spec.cols).join("").trimEnd())
        .join("\n");
    expect(crop(mirrored as StyledFrame)).toBe(crop(standalone));
  });
});

describe("docs examples in the console: page preview", () => {
  afterEach(() => siteStore.reset());

  test("offers Run in console, and says when it's live in the console", () => {
    siteStore.syncRoute("/docs/components-layout");
    const idle = renderToString(<LivePreview id="modal" code="<Modal />" language="tsx" />);
    expect(idle).toContain("Run in console");
    expect(idle).not.toContain("Live in your console");
    expect(idle).toContain("data-console-bypass");

    siteStore.activateExample("modal");
    const live = renderToString(<LivePreview id="modal" code="<Modal />" language="tsx" />);
    expect(live).toContain("Live in your console");
    expect(live).toContain("Back to docs");
    // Mirrors the companion: a console surface that engages console input, not a private sandbox.
    expect(live).toContain("data-textjs-engage");
    expect(live).not.toContain("data-console-bypass");

    // Only the active example switches; the others keep their own sandboxes.
    const other = renderToString(<LivePreview id="scrollbox" code="<ScrollBox />" language="tsx" />);
    expect(other).toContain("Run in console");
    expect(other).toContain("data-console-bypass");
  });
});

describe("Home examples in the console: store", () => {
  test("the Components section hands its tab to the console and switches with it; Esc-style exits return to Home", () => {
    const s = new SiteStore();
    s.syncRoute("/");
    s.activateExample("table");
    expect(s.getSnapshot()).toMatchObject({ tab: "home", example: "table", consoleInput: true });
    s.activateExample("charts");
    expect(s.getSnapshot().example).toBe("charts");
    // A stale exit from the previous tab is ignored; an exit without an id always returns.
    s.exitExample("table");
    expect(s.getSnapshot().example).toBe("charts");
    s.exitExample();
    expect(s.getSnapshot()).toMatchObject({ tab: "home", example: null, consoleInput: false });
  });

  test("leaving Home returns the console to the next page's view", () => {
    const s = new SiteStore();
    s.syncRoute("/");
    s.activateExample("keymap");
    s.syncRoute("/");
    expect(s.getSnapshot().example).toBe("keymap");
    s.syncRoute("/docs/keyboard");
    expect(s.getSnapshot()).toMatchObject({ tab: "docs", example: null });
  });

  test("Home examples get the Components stage's grid plus one header row", () => {
    expect(exampleGrid("keymap", "home")).toEqual({ cols: HOME_EXAMPLE_GRID.cols, rows: HOME_EXAMPLE_GRID.rows + 1 });
    expect(viewportLimitsFor("home", "table")).toMatchObject({ minCols: 76, maxCols: 76, minRows: 17, maxRows: 17 });
    expect(viewportLimitsFor("home", null)).toMatchObject({ maxCols: 100, maxRows: 26 });
    expect(viewportLimitsFor("home", "nope")).toMatchObject({ maxCols: 100 });
    // Other pages never run examples.
    expect(viewportLimitsFor("blog", "table")).toMatchObject({ maxCols: 200 });
  });
});

describe("Home examples in the console: companion", () => {
  let h: Harness | undefined;
  beforeEach(async () => {
    await site(() => siteStore.reset());
  });
  afterEach(async () => {
    await h?.unmount();
    h = undefined;
    await site(() => siteStore.reset());
  });

  test("runs the selected Components tab instead of the counter, and Esc returns to the counter", async () => {
    await site(() => siteStore.syncRoute("/"));
    h = await mount(<CompanionApp />, { cols: 104, rows: 32, tabFocus: false });
    expect(h.frame()).toContain("React 19 in console.log");

    await site(() => siteStore.activateExample("table"));
    let f = h.frame();
    expect(f.split("\n")[0]).toContain("▼ Text.js › Components › Table");
    expect(f.split("\n")[0]).toContain("Esc back to counter");
    expect(f).toContain("↑↓ move · space select · s sort · ↵ open");
    expect(f).not.toContain("React 19 in console.log");
    // The table's own keys work.
    await h.key("return");
    expect(h.frame()).toMatch(/opened \w+/);

    // Switching tabs on the page switches the console.
    await site(() => siteStore.activateExample("controls"));
    f = h.frame();
    expect(f.split("\n")[0]).toContain("Components › Controls");
    expect(f).toContain("Web Analytics");
    // Tab moves focus between controls, as in the in-page sandbox: Space now toggles the switch.
    const edge = (): string | undefined => h?.frame().split("\n").find((l) => l.includes("Edge runtime"));
    const before = edge();
    await h.key("tab");
    await h.key("space");
    expect(edge()).not.toBe(before);
    expect(h.frame()).toContain("[✓] Web Analytics");
    await h.key("escape");
    expect(siteStore.getSnapshot().example).toBeNull();
    f = h.frame();
    expect(f).toContain("React 19 in console.log");
    expect(f).not.toContain("Esc back to counter");
  });

  test("Home examples stay on Home: a 404 keeps its own view", async () => {
    await site(() => siteStore.syncRoute("/nope"));
    await site(() => siteStore.activateExample("table"));
    h = await mount(<CompanionApp />, { cols: 104, rows: 32, tabFocus: false });
    expect(h.frame()).not.toContain("Components › Table");
  });

  test("the Components mirror shows exactly the in-page sandbox's cells; the hero skips those frames", async () => {
    await site(() => siteStore.syncRoute("/"));
    h = await mount(<CompanionApp />, { cols: 104, rows: 32, tabFocus: false });
    h.frame();
    const homeFrame = extractStyledFrame(h.root.renderer.buffer);
    expect(isHomeExampleFrame(homeFrame)).toBe(false);
    expect(exampleFrame(homeFrame, homeExampleHeader("table"), "table", "home")).toBeNull();

    await site(() => siteStore.activateExample("table"));
    h.frame();
    const companion = extractStyledFrame(h.root.renderer.buffer);
    expect(isHomeExampleFrame(companion)).toBe(true);
    const mirrored = exampleFrame(companion, homeExampleHeader("table"), "table", "home");
    expect(mirrored?.height).toBe(HOME_EXAMPLE_GRID.rows);
    await h.unmount();

    const { cols, rows } = HOME_EXAMPLE_GRID;
    h = await mount((PREVIEWS.table as { render: () => React.ReactNode }).render(), { cols, rows, tabFocus: false });
    h.frame();
    const standalone = extractStyledFrame(h.root.renderer.buffer);
    const crop = (fr: StyledFrame): string =>
      text(fr)
        .split("\n")
        .map((l) => [...l].slice(0, cols).join("").trimEnd())
        .join("\n");
    expect(crop(mirrored as StyledFrame)).toBe(crop(standalone));
  });
});

describe("Home examples in the console: Components section", () => {
  afterEach(() => siteStore.reset());

  test("offers Run in console, and mirrors the console while its tab runs there", () => {
    siteStore.syncRoute("/");
    const idle = renderToString(<KitSection />);
    expect(idle).toContain("Run in console");
    expect(idle).not.toContain("Live in your console");
    expect(idle).toContain("data-console-bypass");

    siteStore.activateExample("table");
    const live = renderToString(<KitSection />);
    expect(live).toContain("Live in your console");
    expect(live).toContain("Back to counter");
    expect(live).toContain("Esc back to counter");
    expect(live).toContain("data-textjs-engage");
    expect(live).not.toContain("data-console-bypass");
  });
});
