import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HERO_FILES } from "../src/pages/home-files";
import { HighlightedCode } from "../src/site/highlight";
import { aliasResults, invertTriangles, isQuitCommand } from "../src/site/search-aliases";
import { matchesErrorQuery } from "../src/pages/Errors";
import { getTxError, TX_ERRORS } from "@textjs/core";

describe("hero files", () => {
  test("app/globals.css is empty and renders one numbered line", () => {
    const css = HERO_FILES.find((f) => f.name === "app/globals.css");
    expect(css).toEqual({ name: "app/globals.css", language: "css", code: "" });
    const html = renderToStaticMarkup(<HighlightedCode code="" language="css" lineNumbers />);
    expect(html.match(/class="line"/g)?.length).toBe(1);
    expect(html).toContain('<span class="ln">1</span></span>');
  });
});

describe("search", () => {
  const first = (q: string) => aliasResults(q)[0];

  test("React and Next.js terms return real pages", () => {
    for (const q of ["div", "span", "p", "dom", "<div>", " DIV "]) expect(first(q)).toMatchObject({ label: "TX003: Unknown host element", sub: "@textjs/react", href: "/errors/TX003" });
    for (const q of ["css", "tailwind", "className", "stylesheet"]) expect(first(q)).toMatchObject({ label: "Styling", sub: "Building Your Application", href: "/docs/styling" });
    for (const q of ["hydration", "hydrate"]) expect(first(q)).toMatchObject({ label: "Server Rendering and Partial Prerendering", href: "/docs/server-rendering" });
    expect(first("next.config")).toMatchObject({ label: "Project Structure", sub: "Getting Started", href: "/docs/project-structure" });
    for (const q of ["safari", "firefox"]) expect(first(q)).toMatchObject({ label: "Runtime support", sub: "Support Policy", href: "/docs/support-policy#runtime-support" });
    expect(first("vercel")).toMatchObject({ label: "Deploying", href: "/docs/deploying" });
    expect(first("tx014")).toMatchObject({ href: "/errors/TX014", label: `TX014: ${getTxError("TX014")?.title}` });
    expect(aliasResults("tx000")).toEqual([]);
    expect(aliasResults("tx999")).toEqual([]);
    expect(aliasResults("divide")).toEqual([]);
    expect(aliasResults("")).toEqual([]);
  });

  test("every alias target exists", () => {
    for (const q of ["div", "css", "hydration", "next.config", "safari", "vercel"]) expect(aliasResults(q)).toHaveLength(1);
  });

  test("/errors finds TX003 by its cause", () => {
    expect(TX_ERRORS.filter((e) => matchesErrorQuery(e, "div")).map((e) => e.code)).toContain("TX003");
  });

  test("up-triangles flip to down-triangles", () => {
    expect(invertTriangles("\u25B2 Vercel \u25B2")).toBe("\u25BC Vercel \u25BC");
    expect(invertTriangles("\u25BC")).toBe("\u25BC");
  });

  test("vim quit commands", () => {
    for (const q of [":q", ":q!", ":wq", ":wq!", ":x", " :q "]) expect(isQuitCommand(q)).toBe(true);
    for (const q of ["q", ":w", ":qa", "::q", ":quit"]) expect(isQuitCommand(q)).toBe(false);
  });
});
