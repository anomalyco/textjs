import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteView } from "../src/App";
import { BRIDGE_COMMAND } from "../src/demos/opencode/live";
import { DOCS, docPath } from "../src/docs/registry";
import { matchRoute, normalizePath, titleFor } from "../src/router";
import { Footer, Header } from "../src/site/Chrome";
import { siteStore, tabForPath } from "../src/console-companion/store";

describe("router", () => {
  test("matches every site route", () => {
    expect(matchRoute("/")).toEqual({ name: "home" });
    expect(matchRoute("/docs")).toEqual({ name: "docs", slug: "introduction" });
    expect(matchRoute("/docs/")).toEqual({ name: "docs", slug: "introduction" });
    expect(matchRoute("/playground")).toEqual({ name: "playground" });
    expect(matchRoute("/opencode/")).toEqual({ name: "opencode" });
    // Showcase was folded into the Playground.
    expect(matchRoute("/showcase")).toEqual({ name: "playground" });
    expect(matchRoute("/nope")).toEqual({ name: "not-found" });
    expect(matchRoute("/docs/does-not-exist")).toEqual({ name: "not-found" });
    for (const d of DOCS) expect(matchRoute(docPath(d.slug))).toEqual({ name: "docs", slug: d.slug });
    expect(normalizePath("//docs//routing/")).toBe("/docs/routing");
    // Malformed percent-encoding never throws.
    expect(matchRoute("/docs/%E0%A4%A")).toEqual({ name: "not-found" });
    expect(() => siteStore.syncRoute("/docs/%E0%A4%A")).not.toThrow();
    siteStore.syncRoute("/");
  });

  test("titles", () => {
    expect(titleFor({ name: "home" })).toBe("Text.js — The Console Framework");
    expect(titleFor({ name: "docs", slug: "routing" })).toBe("Routing | Text.js Docs");
    expect(titleFor({ name: "not-found" })).toContain("404");
  });

  test("route changes sync the console companion tab", () => {
    expect(tabForPath("/docs/routing")).toBe("docs");
    expect(tabForPath("/playground")).toBe("playground");
    expect(tabForPath("/opencode")).toBe("opencode");
    expect(tabForPath("/")).toBe("home");
    expect(tabForPath("/nope/404")).toBe("home");
    siteStore.syncRoute("/docs/styling");
    expect(siteStore.getSnapshot().tab).toBe("docs");
    expect(siteStore.getSnapshot().docSlug).toBe("styling");
    siteStore.syncRoute("/opencode");
    expect(siteStore.getSnapshot().tab).toBe("opencode");
    // Console input survives moving between pad pages, and is released on regular pages.
    siteStore.set({ consoleInput: true });
    siteStore.syncRoute("/playground");
    expect(siteStore.getSnapshot().consoleInput).toBe(true);
    siteStore.syncRoute("/docs/styling");
    expect(siteStore.getSnapshot().consoleInput).toBe(false);
    siteStore.syncRoute("/");
  });
});

describe("page rendering", () => {
  test("landing page", () => {
    const html = renderToStaticMarkup(<RouteView route={{ name: "home" }} />);
    expect(html).toContain("The Console Framework");
    expect(html).toContain("Build interactive React apps rendered entirely inside");
    expect(html).toContain("bunx create-text-app");
    expect(html).toContain("app/page.tsx");
    expect(html).toContain("app/layout.tsx");
    expect(html).toContain("text.config.ts");
    expect(html).toContain("text://viewport:1");
    expect(html).toContain("This page is running in your console.");
    for (const card of ["App Router", "Yoga Flexbox", "Zero DOM"]) expect(html).toContain(card);
    expect(html).toContain("OpenCode in console.log");
    expect(html).toContain("Explore OpenCode");
    for (const gone of ["Introducing Text.js", "How Turbolog works", "DOM Frameworks (Next.js)", "Render down."]) expect(html).not.toContain(gone);
    expect(html).not.toContain("▲");
  });

  test("every docs page renders with title, TOC and pagination", () => {
    for (const d of DOCS) {
      const html = renderToStaticMarkup(<RouteView route={{ name: "docs", slug: d.slug }} />);
      expect(html).toContain(d.title.replace(/&/g, "&amp;"));
      expect(html).toContain("On this page");
      expect(html).toContain('class="prose"');
    }
  });

  test("playground and opencode are one big focus pad, with no TUI on the page", () => {
    const pg = renderToStaticMarkup(<RouteView route={{ name: "playground" }} />);
    for (const label of ["Counter", "Form", "Streaming", "Dashboard", "Snake"]) expect(pg).toContain(`>${label}</button>`);
    expect(pg).toContain("data-textjs-focus-pad");
    expect(pg).toContain("Open the console");
    expect(pg).toContain("It runs in DevTools, not on this page. Then click here and press ↑ ↓.");
    expect(pg).toContain("count");
    expect(pg).toContain("Open on a desktop");
    for (const gone of ["RLE Inspector", "data-textjs-mirror", "Wireframe", "App title"]) expect(pg).not.toContain(gone);
    const oc = renderToStaticMarkup(<RouteView route={{ name: "opencode" }} />);
    expect(oc).toContain("data-textjs-focus-pad");
    expect(oc).toContain("Then click here and type a prompt.");
    expect(oc).toContain("Enter");
    expect(oc).toContain("http://127.0.0.1:4096");
    expect(oc).toContain(BRIDGE_COMMAND);
    expect(oc).not.toContain("data-textjs-mirror");
    const nf = renderToStaticMarkup(<RouteView route={{ name: "not-found" }} />);
    expect(nf).toContain("404");
  });

  test("header and footer", () => {
    const header = renderToStaticMarkup(<Header />);
    expect(header).not.toContain("github.com");
    for (const s of ["Text.js", "Docs", "Playground", "OpenCode", "Search", "⌘K"]) expect(header).toContain(s);
    expect(header).not.toContain("Showcase");
    expect(header).not.toContain("Live in Console");
    expect(header).not.toContain(">1.0<");
    const footer = renderToStaticMarkup(<Footer />);
    for (const s of ["Anomaly", "anomaly-signature.svg", "Docs", "Playground", "OpenCode"]) expect(footer).toContain(s);
    expect(footer).not.toContain("GitHub");
    expect(footer).not.toContain("Community");
  });

  test("mobile navigation controls are accessible and closed by default", () => {
    const header = renderToStaticMarkup(<Header />);
    expect(header).toContain('aria-label="Open menu"');
    expect(header).toContain('aria-expanded="false"');
    expect(header).toContain('aria-controls="mobile-nav"');
    expect(header).toContain('aria-label="Search documentation"');
    // Sheets portal to <body> only while open, outside the header's stacking context.
    expect(header).not.toContain("sheet-layer");
    const docs = renderToStaticMarkup(<RouteView route={{ name: "docs", slug: "routing" }} />);
    expect(docs).toContain('aria-label="Open docs navigation"');
    expect(docs).toContain('aria-controls="docs-drawer"');
    expect(docs).not.toContain("sheet-layer");
  });
});
