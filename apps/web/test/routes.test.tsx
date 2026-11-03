import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteView } from "../src/App";
import { BRIDGE_COMMAND } from "../src/demos/opencode/live";
import { DOCS, docPath } from "../src/docs/registry";
import { matchRoute, normalizePath, resetLocation, titleFor } from "../src/router";
import { Footer, Header } from "../src/site/Chrome";
import { REPO_URL, docEditUrl } from "../src/site/links";
import { siteStore, tabForPath } from "../src/console-companion/store";

describe("router", () => {
  test("matches every site route", () => {
    expect(matchRoute("/")).toEqual({ name: "home" });
    expect(matchRoute("/docs")).toEqual({ name: "docs", slug: "introduction" });
    expect(matchRoute("/docs/")).toEqual({ name: "docs", slug: "introduction" });
    expect(matchRoute("/playground")).toEqual({ name: "playground", preset: "dashboard" });
    expect(matchRoute("/playground/streaming")).toEqual({ name: "playground", preset: "streaming" });
    expect(matchRoute("/playground/snake/")).toEqual({ name: "playground", preset: "snake" });
    expect(matchRoute("/opencode/")).toEqual({ name: "opencode" });
    expect(matchRoute("/coffee")).toEqual({ name: "coffee" });
    // The site hasn't launched: paths that never shipped are plain 404s, with no redirects.
    for (const gone of ["/showcase", "/playground/dashboard", "/playground/counter", "/playground/form", "/playground/nope", "/terminal"]) expect(matchRoute(gone)).toEqual({ name: "not-found" });
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
    expect(titleFor({ name: "home" })).toBe("Text.js | The Console Framework");
    expect(titleFor({ name: "docs", slug: "routing" })).toBe("Routing | Text.js Docs");
    expect(titleFor({ name: "not-found" })).toContain("404");
    expect(titleFor({ name: "playground", preset: "dashboard" })).toBe("Playground | Text.js");
    expect(titleFor({ name: "playground", preset: "snake" })).toBe("Snake | Text.js Playground");
    expect(titleFor({ name: "opencode" })).toBe("OpenCode in the Console | Text.js");
  });

  test("route changes sync the console companion tab", () => {
    expect(tabForPath("/docs/routing")).toBe("docs");
    expect(tabForPath("/playground")).toBe("playground");
    expect(tabForPath("/playground/snake")).toBe("playground");
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
    siteStore.syncRoute("/playground/snake");
    expect(siteStore.getSnapshot().consoleInput).toBe(true);
    // The URL picks the demo: /playground opens the first one.
    expect(siteStore.getSnapshot().preset).toBe("snake");
    siteStore.syncRoute("/playground");
    expect(siteStore.getSnapshot().preset).toBe("dashboard");
    siteStore.syncRoute("/docs/styling");
    expect(siteStore.getSnapshot().consoleInput).toBe(false);
    siteStore.syncRoute("/");
  });
});

describe("page rendering", () => {
  test("landing page", () => {
    const html = renderToStaticMarkup(<RouteView route={{ name: "home" }} />);
    expect(html).toContain("The Console Framework");
    expect(html).toContain("Build full-stack React apps that render inside");
    expect(html).toContain("bunx create-text-app");
    expect(html).toContain("app/page.tsx");
    expect(html).toContain("app/layout.tsx");
    expect(html).toContain("text.config.ts");
    expect(html).toContain(">viewport:3</span>");
    expect(html).toContain("This page is running in your console.");
    for (const card of ["React 19", "App Router", "Responsive grid", "Keyboard input"]) expect(html).toContain(card);
    for (const s of ["Code with OpenCode in DevTools", "rebuilt with Text.js to run in your browser console", "Try the sandbox", "Connect your server", "bunx @textjs/opencode@latest proxy", "Your models and sessions", 'aria-label="OpenCode"']) expect(html).toContain(s);
    for (const section of ["Every changed frame is one <code>console.log</code> call", "Appended frames", "Tables, charts, forms and shortcuts", "Render routes on the server", "Also runs in terminals and agents", "Editor, lint and test tooling", "Build a deploy dashboard in your console"]) expect(html).toContain(section);
    // Headings are statements, not slogans: no trailing periods.
    for (const h of html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/g)) expect(h[1]).not.toMatch(/\.$/);
    for (const gone of ["Introducing Text.js 1.0", "How Turbolog works", "DOM Frameworks (Next.js)", "Render down.", "for free", "DevTools inside DevTools", "No browser, no DevTools", "0.18ms"]) expect(html).not.toContain(gone);
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

  test("the Turbolog lockup appears once on each Turbolog page", () => {
    const count = (html: string): number => html.match(/class="turbolog-lockup/g)?.length ?? 0;
    const pages = [
      renderToStaticMarkup(<RouteView route={{ name: "home" }} />),
      renderToStaticMarkup(<RouteView route={{ name: "docs", slug: "turbolog-engine" }} />),
      renderToStaticMarkup(<RouteView route={{ name: "status" }} />),
      renderToStaticMarkup(<RouteView route={{ name: "blog-post", slug: "turbolog-eliminating-the-flash" }} />),
    ];
    for (const html of pages) {
      expect(count(html)).toBe(1);
      expect(html).toContain('role="img" aria-label="Turbolog"');
    }
    expect(pages[2]).toMatch(/<svg class="turbolog-lockup st-lockup"[^]*?<\/svg><h1>Status<\/h1>/);
    expect(count(renderToStaticMarkup(<RouteView route={{ name: "docs", slug: "introduction" }} />))).toBe(0);
    expect(count(renderToStaticMarkup(<RouteView route={{ name: "blog-post", slug: "text-js-1-0" }} />))).toBe(0);
  });

  test("playground and opencode are one big focus pad, with no TUI on the page", () => {
    const pg = renderToStaticMarkup(<RouteView route={{ name: "playground", preset: "dashboard" }} />);
    // Six demos, each a link: the Playground's own four, then OpenCode and terminal.shop at their own URLs.
    // Pills are words only; the wordmarks live in the message.
    const picker = [...pg.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => `${m[2]} ${m[1]}`);
    expect(picker).toEqual(["Dashboard /playground", "Streaming /playground/streaming", "Snake /playground/snake", "Doom /playground/doom", "OpenCode /opencode", "Coffee /coffee"]);
    // Every demo reserves the banner row (empty here, before the steps), so the wordmarks never move the rest.
    expect(pg).toContain('<div class="tx-pad-banner"><div class="pad-slot pad-slot-banner"></div></div>');
    expect(pg).not.toContain("wordmark-");
    expect(pg).toContain('<a href="/playground" title="Live metrics" aria-current="page">');
    for (const gone of [">Counter<", ">Form<"]) expect(pg).not.toContain(gone);
    expect(pg).toContain("data-textjs-focus-pad");
    expect(pg).toContain("Open the console");
    expect(pg).toContain('<span class="tx-pad-line tx-not-safari">The app renders in DevTools.</span>');
    expect(pg).toContain('<span class="tx-pad-line">Then click here and press ← →.</span>');
    // The demo's keys are the hero once live; before that it is the DevTools shortcut.
    expect(pg).not.toContain("switch region");
    expect(pg).toContain('aria-label="Press ⌘ ⌥ J"');
    expect(pg).toContain("View source");
    expect(pg).toContain("Open on a desktop");
    for (const gone of ["RLE Inspector", "data-textjs-mirror", "Wireframe", "App title"]) expect(pg).not.toContain(gone);
    const oc = renderToStaticMarkup(<RouteView route={{ name: "opencode" }} />);
    expect(oc).toContain("data-textjs-focus-pad");
    expect(oc).toContain('<a href="/opencode" title="OpenCode Lite, a client for the OpenCode coding agent" aria-current="page">OpenCode</a>');
    expect(oc).toContain('<div class="pad-slot pad-slot-banner"><svg class="wordmark-opencode" role="img" aria-label="OpenCode" width="117" height="21" viewBox="0 0 234 42"');
    expect(oc.indexOf("wordmark-opencode")).toBeLessThan(oc.indexOf('class="tx-pad-steps"'));
    expect(oc).not.toContain("View source");
    expect(oc).toContain("Then click here and type a prompt.");
    expect(oc).toContain("http://127.0.0.1:4096");
    expect(oc).toContain(BRIDGE_COMMAND);
    // Prerendering can't know about a remembered server: the status line is a placeholder until hydrated.
    expect(oc).toContain('data-status="pending"');
    expect(oc).not.toContain("data-textjs-mirror");
    const nf = renderToStaticMarkup(<RouteView route={{ name: "not-found" }} />);
    expect(nf).toContain("404");
  });

  test("header and footer", () => {
    const header = renderToStaticMarkup(<Header />);
    // A static link to the repo, with no star count fetched from GitHub's API.
    expect(header).toContain(`href="${REPO_URL}"`);
    expect(header).toContain('aria-label="Text.js on GitHub"');
    expect(header).not.toContain("api.github.com");
    for (const s of ["Text.js", "Docs", "Learn", "Playground", "Search", "⌘K"]) expect(header).toContain(s);
    // OpenCode and Coffee live in the Playground picker now.
    expect(header).not.toContain('href="/opencode"');
    expect(header).not.toContain('href="/coffee"');
    // …so Playground stays highlighted on their pages.
    for (const path of ["/opencode", "/coffee", "/playground/snake"]) {
      resetLocation(path);
      expect(renderToStaticMarkup(<Header />)).toContain('<a href="/playground" aria-current="page">Playground</a>');
    }
    resetLocation("/");
    expect(header).not.toContain("Showcase");
    expect(header).not.toContain("Live in Console");
    expect(header).not.toContain(">1.0<");
    const footer = renderToStaticMarkup(<Footer />);
    for (const s of ["Anomaly", "anomaly-signature.svg", "Docs", "Playground"]) expect(footer).toContain(s);
    // OpenCode and Coffee are reached from the Playground.
    for (const s of ['href="/opencode"', 'href="/coffee"', 'href="/terminal"']) expect(footer).not.toContain(s);
    expect(footer).toContain(`<a href="${REPO_URL}" target="_blank" rel="noreferrer">GitHub</a>`);
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
    expect(docs).toContain(`href="${docEditUrl("routing")}"`);
    expect(docs).toContain("Edit this page on GitHub");
  });
});
