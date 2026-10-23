import { afterAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { TX_ERRORS, TX_PACKAGES, txError } from "@textjs/core";
import { RouteView } from "../src/App";
import { render, ROUTES } from "../src/entry-server";
import { matchesErrorQuery } from "../src/pages/Errors";
import { matchRoute, resetLocation, titleFor } from "../src/router";
import { Footer } from "../src/site/Chrome";

describe("/errors", () => {
  afterAll(() => resetLocation("/"));

  test("routes", () => {
    expect(matchRoute("/errors")).toEqual({ name: "errors" });
    expect(matchRoute("/errors/")).toEqual({ name: "errors" });
    for (const e of TX_ERRORS) expect(matchRoute(`/errors/${e.code}`)).toEqual({ name: "error", code: e.code });
    expect(matchRoute("/errors/tx004")).toEqual({ name: "error", code: "TX004" });
    expect(matchRoute("/errors/TX999")).toEqual({ name: "not-found" });
    expect(matchRoute("/errors/%E0%A4%A")).toEqual({ name: "not-found" });
    expect(titleFor({ name: "errors" })).toBe("Error Codes | Text.js");
    expect(titleFor({ name: "error", code: "TX004" })).toBe("TX004: <Box> nested inside <Text> | Text.js");
  });

  test("the URL in every message resolves to a page", () => {
    for (const e of TX_ERRORS) {
      const url = /https:\/\/textjs\.org(\/errors\/TX\d{3})$/.exec(txError(e.code).message)?.[1];
      expect(url).toBe(`/errors/${e.code}`);
      expect(matchRoute(url as string)).toEqual({ name: "error", code: e.code });
    }
  });

  test("the index lists every code, grouped by package", () => {
    const html = renderToStaticMarkup(<RouteView route={{ name: "errors" }} />);
    for (const pkg of TX_PACKAGES) expect(html).toContain(`>${pkg}</h2>`);
    for (const e of TX_ERRORS) expect(html).toContain(`href="/errors/${e.code}"`);
    expect(html).toContain(`${TX_ERRORS.length} of ${TX_ERRORS.length}`);
  });

  test("the index search filters by code, number and text", () => {
    const codes = (q: string): string[] => TX_ERRORS.filter((e) => matchesErrorQuery(e, q)).map((e) => e.code);
    expect(codes("")).toHaveLength(TX_ERRORS.length);
    expect(codes("TX004")).toEqual(["TX004"]);
    expect(codes("tx4")).toContain("TX004");
    expect(codes("14")).toContain("TX014");
    expect(codes("<Box>")).toContain("TX004");
    expect(codes("create-text-app").length).toBeGreaterThan(0);
    expect(codes("definitely not an error")).toEqual([]);
  });

  test("prerender covers the index and every code with canonical paths", async () => {
    const paths = ROUTES.map((r) => r.path);
    expect(paths).toContain("/errors");
    for (const e of TX_ERRORS) {
      const route = ROUTES.find((r) => r.path === `/errors/${e.code}`);
      expect(route?.title).toBe(titleFor({ name: "error", code: e.code }));
      expect(route?.canonical ?? route?.path).toBe(`/errors/${e.code}`);
      expect(route?.description).toContain(e.code);
    }
    for (const e of TX_ERRORS) {
      const html = await render(`/errors/${e.code}`);
      expect(html).toContain(`<code class="tx-code">${e.code}</code>`);
      expect(html).toContain('id="why"');
      expect(html).toContain('id="fix"');
      expect(html).toContain('class="codeblock"');
      expect(html).toContain('class="footer"');
      expect(html).not.toContain("<!--$?-->");
    }
    expect(await render("/errors")).toContain("Error Codes</h1>");
  });

  test("sitemap and footer link", () => {
    const sitemap = readFileSync(join(import.meta.dir, "..", "public", "sitemap.xml"), "utf8");
    expect(sitemap).toContain("<loc>https://textjs.org/errors</loc>");
    for (const e of TX_ERRORS) expect(sitemap).toContain(`<loc>https://textjs.org/errors/${e.code}</loc>`);
    expect(renderToStaticMarkup(<Footer />)).toContain('href="/errors"');
  });
});
