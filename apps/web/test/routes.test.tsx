import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteView } from "../src/App";
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
    expect(matchRoute("/showcase")).toEqual({ name: "showcase" });
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
    expect(html).toContain("this app is live in your console.");
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

  test("playground, opencode, showcase and 404", () => {
    const pg = renderToStaticMarkup(<RouteView route={{ name: "playground" }} />);
    expect(pg).toContain("Edit props, switch themes, and inspect the raw");
    for (const label of ["Counter &amp; State", "Server Dashboard", "Form &amp; Inputs", "Streaming Markdown &amp; Diff", "Console Snake", "RLE Inspector", "80×24", "100×32", "120×38", "amberCrt"]) {
      expect(pg).toContain(label);
    }
    const oc = renderToStaticMarkup(<RouteView route={{ name: "opencode" }} />);
    expect(oc).toContain("Connect Local Server");
    expect(oc).toContain("http://127.0.0.1:4096");
    expect(oc).toContain("bunx textjs proxy");
    expect(oc).toContain("Bridges your local opencode daemon with CORS headers on :4096.");
    expect(oc).not.toContain("Keyboard");
    const sc = renderToStaticMarkup(<RouteView route={{ name: "showcase" }} />);
    expect(sc).toContain("Live console apps rendered by Text.js.");
    for (const t of ["OpenCode Lite", "Edge Console", "Console Snake", "Streaming Markdown"]) expect(sc).toContain(t);
    const nf = renderToStaticMarkup(<RouteView route={{ name: "not-found" }} />);
    expect(nf).toContain("404");
  });

  test("header and footer", () => {
    const header = renderToStaticMarkup(<Header />);
    expect(header).not.toContain("github.com");
    for (const s of ["Text.js", "Docs", "Playground", "OpenCode", "Showcase", "Search", "⌘K"]) expect(header).toContain(s);
    expect(header).not.toContain("Live in Console");
    expect(header).not.toContain(">1.0<");
    const footer = renderToStaticMarkup(<Footer />);
    for (const s of ["Anomaly", "anomaly-signature.svg", "Docs", "Playground", "OpenCode", "Showcase"]) expect(footer).toContain(s);
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
