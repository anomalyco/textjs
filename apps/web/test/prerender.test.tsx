import { afterAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOCS_META } from "../src/docs/registry";
import { NOT_FOUND_PATH, PREFIT_MIRRORS_SCRIPT, render, ROUTES } from "../src/entry-server";
import { renderHomeFrame } from "../src/pages/home/home-frame-gen";
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

  test("the hero mirrors the companion's first Home frame before it boots", async () => {
    // Run `bun scripts/generate-home-frame.ts` (the build does) after changing HomeTab or CompanionApp.
    const committed = readFileSync(join(import.meta.dirname, "../src/pages/home/home-frame.json"), "utf8");
    expect(committed).toBe(`${JSON.stringify(await renderHomeFrame())}\n`);
    const home = await render("/");
    const hero = home.slice(home.indexOf('class="hero"'), home.indexOf("</section>", home.indexOf('class="hero"')));
    expect(hero).toContain("data-textjs-mirror");
    expect(hero).toContain("React 19 in console.log");
    expect(hero).toContain("data-textjs-engage");
    expect(hero).not.toContain("Waiting for the first frame");
  });

  test("pad pages and the 404 render", async () => {
    expect(await render("/playground")).toContain("data-textjs-focus-pad");
    expect(await render("/opencode")).toContain("data-textjs-focus-pad");
    expect(await render(NOT_FOUND_PATH)).toContain("This page could not be found");
    expect(PREFIT_MIRRORS_SCRIPT).toContain("scrollWidth");
  });
});
