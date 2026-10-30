import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { extractStyledFrame, type StyledFrame } from "@textjs/core";
import { CompanionApp } from "../src/console-companion/App";
import { viewportLimitsFor } from "../src/console-companion/boot";
import { SiteStore, siteStore } from "../src/console-companion/store";
import { exampleFrame, exampleGrid, exampleHeader } from "../src/console-companion/tabs/ExampleTab";
import { PREVIEWS } from "../src/docs/previews";
import { LivePreview } from "../src/site/LivePreview";
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
    expect(f.split("\n")[0]).toContain("▼ Docs › Layout › Modal");
    expect(f.split("\n")[0]).toContain("esc back to docs");
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
    expect(h.frame()).not.toContain("esc back to docs");
  });

  test("an unknown example id keeps the Docs view", async () => {
    await site(() => siteStore.syncRoute("/docs/components-layout"));
    h = await mount(<CompanionApp />, { cols: 120, rows: 36, tabFocus: false });
    await site(() => siteStore.activateExample("nope"));
    expect(h.frame()).toContain("/ Search");
  });

  test("the page mirror shows exactly the example's cells, the same as a standalone preview", async () => {
    const spec = PREVIEWS.layout as { cols: number; rows: number; render: () => React.ReactNode };
    await site(() => siteStore.syncRoute("/docs/components-layout"));
    await site(() => siteStore.activateExample("layout"));
    h = await mount(<CompanionApp />, { cols: spec.cols + 20, rows: spec.rows + 6, tabFocus: false });
    h.frame();
    const companion = extractStyledFrame(h.root.renderer.buffer);
    const header = exampleHeader("components-layout", "layout");
    const mirrored = exampleFrame(companion, header, "layout");
    expect(mirrored).not.toBeNull();
    expect(mirrored?.height).toBe(spec.rows);
    // A frame that isn't showing this example yet (e.g. the docs view) is never mirrored.
    expect(exampleFrame(companion, exampleHeader("components-layout", "modal"), "modal")).toBeNull();
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
    expect(live).toContain("data-console-engage");
    expect(live).not.toContain("data-console-bypass");

    // Only the active example switches; the others keep their own sandboxes.
    const other = renderToString(<LivePreview id="scrollbox" code="<ScrollBox />" language="tsx" />);
    expect(other).toContain("Run in console");
    expect(other).toContain("data-console-bypass");
  });
});
