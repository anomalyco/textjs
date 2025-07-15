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
    expect(titleFor({ name: "home" })).toBe("Text.js by Vershell — The Console Framework for the Web");
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
    expect(html).toContain("The Console Framework for the Web");
    expect(html).toContain("Introducing Text.js 0.2 (Turbolog)");
    expect(html).toContain("bunx create-text-app@latest");
    expect(html).toContain("app/sessions/[id]/page.tsx");
    expect(html).toContain("text.config.ts");
    expect(html).toContain("text://viewport:1");
    expect(html).toContain("Not a video.");
    for (const card of ["Inverted Architecture", "Turbolog %c RLE Engine", "File-System App Router", "Yoga WASM Flexbox", "100/100 Lighthouse by Default", "In-Console [▼] DevTools"]) {
      expect(html).toContain(card.replace("&", "&amp;"));
    }
    expect(html).toContain("How Turbolog works");
    expect(html).toContain("DOM Frameworks (Next.js)");
    expect(html).toContain("OpenCode, in console.log.");
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
    for (const label of ["Counter &amp; State", "Server Dashboard", "Form &amp; Inputs", "Streaming Markdown &amp; Diff", "Console Snake", "RLE Inspector", "80×24", "100×32", "120×38", "amberCrt"]) {
      expect(pg).toContain(label);
    }
    const oc = renderToStaticMarkup(<RouteView route={{ name: "opencode" }} />);
    expect(oc).toContain("Connect to Local OpenCode Server");
    expect(oc).toContain("bunx create-text-app my-opencode --template opencode");
    const sc = renderToStaticMarkup(<RouteView route={{ name: "showcase" }} />);
    expect(sc).toContain("Built with Text.js");
    const nf = renderToStaticMarkup(<RouteView route={{ name: "not-found" }} />);
    expect(nf).toContain("404");
  });

  test("header and footer", () => {
    const header = renderToStaticMarkup(<Header />);
    for (const s of ["Text.js", "1.0", "Docs", "Playground", "OpenCode", "Showcase", "Search documentation", "Live in Console"]) expect(header).toContain(s);
    const footer = renderToStaticMarkup(<Footer />);
    for (const s of ["Resources", "Framework", "Engine", "Community", "▼ Elmore Inc. — Deployed downward into console.log"]) expect(footer).toContain(s);
  });
});
