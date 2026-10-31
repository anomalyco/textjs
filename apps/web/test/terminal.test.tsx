import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteView } from "../src/App";
import { isPadRoute, siteStore, tabForPath } from "../src/console-companion/store";
import { viewportLimitsFor } from "../src/console-companion/boot";
import { launchParams } from "../src/demos/terminal";
import { render, ROUTES } from "../src/entry-server";
import { matchRoute, resetLocation, titleFor } from "../src/router";
import { Footer } from "../src/site/Chrome";

const ROOT = join(import.meta.dir, "..");

describe("/terminal", () => {
  afterAll(() => resetLocation("/"));

  test("route, title, companion tab and the 80 × 30 console", () => {
    expect(matchRoute("/terminal")).toEqual({ name: "terminal" });
    expect(matchRoute("/terminal/")).toEqual({ name: "terminal" });
    expect(matchRoute("/terminal/callback")).toEqual({ name: "not-found" });
    expect(titleFor({ name: "terminal" })).toBe("terminal.shop in the Console | Text.js");
    expect(tabForPath("/terminal")).toBe("terminal");
    expect(isPadRoute("/terminal")).toBe(true);
    expect(isPadRoute("/terminals")).toBe(false);
    expect(viewportLimitsFor("terminal")).toEqual({ maxCols: 80, maxRows: 30, fallbackCols: 80, fallbackRows: 30 });
    siteStore.set({ consoleInput: true });
    siteStore.syncRoute("/terminal");
    expect(siteStore.getSnapshot().consoleInput).toBe(true);
    siteStore.syncRoute("/");
  });

  test("a calm focus pad, prerendered", async () => {
    const html = renderToStaticMarkup(<RouteView route={{ name: "terminal" }} />);
    expect(html).toContain("data-textjs-focus-pad");
    expect(html).toContain("terminal.shop, in the console");
    expect(html).toContain("Then click here and press ↑ ↓ to browse.");
    expect(html).toContain("no API key needed");
    expect(html).toContain("Open on a desktop");
    expect(ROUTES.find((r) => r.path === "/terminal")?.description).toContain("terminal.shop");
    const pre = await render("/terminal");
    expect(pre).toContain("terminal.shop, in the console");
    expect(pre).not.toContain("<!--$?-->");
  });

  test("sitemap and footer link", () => {
    expect(readFileSync(join(ROOT, "public/sitemap.xml"), "utf8")).toContain("<loc>https://textjs.org/terminal</loc>");
    expect(renderToStaticMarkup(<Footer />)).toContain('href="/terminal"');
  });

  test("callback params: where to resume and what went wrong", () => {
    expect(launchParams("")).toEqual({ at: "/shop", error: null });
    expect(launchParams("?at=%2Fcart")).toEqual({ at: "/cart", error: null });
    expect(launchParams("?at=%2Faccount%3Fpage%3Dfaq").at).toBe("/account?page=faq");
    expect(launchParams("?signin_error=cancelled").error).toBe("sign in was cancelled");
  });

  test("F-03/F-07/F-13: links can't open checkout, use odd paths or write on the sign in screen", () => {
    for (const at of ["/confirm", "/payment", "/shipping", "/subscribe", "/order/subscribe", "/order/complete", "/addresses", "/email", "//evil.com", "/\\evil.com", "/\\[::", "https://evil.com"]) {
      expect(launchParams(`?at=${encodeURIComponent(at)}`).at).toBe("/shop");
    }
    for (const text of ["Call 1-800-SCAM to verify your card", "sign in was cancelled", "toString", "__proto__", "hasOwnProperty"]) {
      expect(launchParams(`?signin_error=${encodeURIComponent(text)}`).error).toBe(null);
    }
  });

  test("only the Terminal endpoints run as Pages Functions", () => {
    const routes = JSON.parse(readFileSync(join(ROOT, "public/_routes.json"), "utf8")) as { version: number; include: string[]; exclude: string[] };
    expect(routes.version).toBe(1);
    expect(routes.include.sort()).toEqual(["/api/terminal", "/api/terminal/*", "/terminal/callback"]);
    expect(existsSync(join(ROOT, "functions/api/terminal/[[path]].ts"))).toBe(true);
    expect(existsSync(join(ROOT, "functions/terminal/callback.ts"))).toBe(true);
  });
});
