import { afterAll, describe, expect, test } from "bun:test";
import { DOCS_META } from "../src/docs/registry";
import { NOT_FOUND_PATH, PREFIT_MIRRORS_SCRIPT, render, ROUTES } from "../src/entry-server";
import { resetLocation } from "../src/router";

describe("build-time prerender", () => {
  afterAll(() => resetLocation("/"));

  test("covers every page, including /docs/<slug> for each doc", () => {
    const paths = ROUTES.map((r) => r.path);
    for (const p of ["/", "/docs", "/playground", "/opencode"]) expect(paths).toContain(p);
    for (const d of DOCS_META) expect(paths).toContain(`/docs/${d.slug}`);
    expect(ROUTES.find((r) => r.path === "/docs/introduction")?.canonical).toBe("/docs");
  });

  test("docs pages render their final content with live previews inline", async () => {
    for (const d of DOCS_META) {
      const html = await render(`/docs/${d.slug}`);
      expect(html).toContain(`class="docs-title">${d.title.replace(/&/g, "&amp;")}</h1>`);
      expect(html).toContain('class="docs-sidebar"');
      expect(html).toContain('class="footer"');
      expect(html).not.toContain("<!--$?-->");
      expect(html).not.toContain("<template");
    }
  });

  test("platform shortcuts are rendered for both platforms (CSS picks one)", async () => {
    const home = await render("/");
    expect(home).toContain("⌘⌥J");
    expect(home).toContain("Ctrl+Shift+J");
    expect(home).toContain("mirror-scale");
  });

  test("pad pages and the 404 render", async () => {
    expect(await render("/playground")).toContain("data-textjs-focus-pad");
    expect(await render("/opencode")).toContain("data-textjs-focus-pad");
    expect(await render(NOT_FOUND_PATH)).toContain("This page could not be found");
    expect(PREFIT_MIRRORS_SCRIPT).toContain("scrollWidth");
  });
});
