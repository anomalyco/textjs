import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteView } from "../src/App";
import { isPadRoute, siteStore, tabForPath } from "../src/console-companion/store";
import { viewportLimitsFor } from "../src/console-companion/boot";
import { launchParams } from "../src/demos/terminal";
import { RECORDED_STATUS, withRecordedFallback } from "../src/demos/terminal-fallback";
import { ShopStore } from "../../terminal-shop/lib/store";
import { render, ROUTES } from "../src/entry-server";
import { matchRoute, resetLocation, titleFor } from "../src/router";
import { Footer } from "../src/site/Chrome";

const ROOT = join(import.meta.dir, "..");

describe("/coffee when its Functions are down", () => {
  const products = JSON.parse(readFileSync(join(ROOT, "../terminal-shop/test/fixtures/products.json"), "utf8"));
  const answer = (res: () => Response | Promise<Response>) => {
    const calls: string[] = [];
    const doFetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return res();
    }) as typeof fetch;
    return { calls, fetch: withRecordedFallback("/api/terminal", doFetch) };
  };

  test("5xx, 429, an HTML error page or no answer: the recorded status and catalogue", async () => {
    const outages: Array<() => Response | Promise<Response>> = [
      () => new Response("error code: 1101", { status: 500 }),
      () => new Response("slow down", { status: 429 }),
      () => new Response("<!doctype html>404", { status: 404, headers: { "content-type": "text/html" } }),
      () => new Response("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } }),
      () => Promise.reject(new TypeError("Failed to fetch")),
    ];
    for (const outage of outages) {
      const f = answer(outage);
      expect(await (await f.fetch("/api/terminal/_status")).json()).toEqual(RECORDED_STATUS);
      expect(await (await f.fetch("/api/terminal/prod/api/product", { method: "GET" })).json()).toEqual({ data: products });
    }
  });

  test("working answers, real errors and everything else pass through", async () => {
    const live = answer(() => Response.json({ data: [] }));
    expect(await (await live.fetch("/api/terminal/prod/api/product")).json()).toEqual({ data: [] });
    const denied = answer(() => Response.json({ code: "cross_site" }, { status: 403 }));
    expect((await denied.fetch("/api/terminal/_status")).status).toBe(403);
    const down = answer(() => new Response("down", { status: 503 }));
    expect((await down.fetch("/api/terminal/prod/api/cart")).status).toBe(503);
    expect((await down.fetch("/api/terminal/prod/api/cart/item", { method: "PUT" })).status).toBe(503);
    expect((await down.fetch("/api/terminal/prod/api/product", { method: "POST" })).status).toBe(503);
  });

  test("the shop opens signed out on the recorded catalogue", async () => {
    const f = answer(() => new Response("error code: 1027", { status: 503 }));
    const store = new ShopStore({ fetch: f.fetch, bases: ["/api/terminal"], splashMs: 0 });
    await store.start("/shop");
    const state = store.getSnapshot();
    expect(state.error).toBe(null);
    expect(state.phase).toBe("ready");
    expect(state.products.map((p) => p.id).sort()).toEqual(products.map((p: { id: string }) => p.id).sort());
    expect(f.calls).toEqual(["/api/terminal/_status", "/api/terminal/prod/api/product"]);
  });
});

describe("/coffee (terminal.shop)", () => {
  afterAll(() => resetLocation("/"));

  test("route, title, companion tab and the 80 × 30 console", () => {
    expect(matchRoute("/coffee")).toEqual({ name: "coffee" });
    expect(matchRoute("/coffee/")).toEqual({ name: "coffee" });
    // Only the OAuth callback and the API live under /terminal, and they're Pages Functions.
    expect(matchRoute("/terminal")).toEqual({ name: "not-found" });
    expect(matchRoute("/terminal/callback")).toEqual({ name: "not-found" });
    expect(titleFor({ name: "coffee" })).toBe("terminal.shop in the Console | Text.js");
    expect(tabForPath("/coffee")).toBe("terminal");
    expect(tabForPath("/terminal")).toBe("home");
    expect(isPadRoute("/coffee")).toBe(true);
    expect(isPadRoute("/coffees")).toBe(false);
    expect(isPadRoute("/terminal")).toBe(false);
    expect(viewportLimitsFor("terminal")).toEqual({ minCols: 80, maxCols: 80, minRows: 30, maxRows: 30, fallbackCols: 80, fallbackRows: 30 });
    siteStore.set({ consoleInput: true });
    siteStore.syncRoute("/coffee");
    expect(siteStore.getSnapshot().consoleInput).toBe(true);
    siteStore.syncRoute("/");
  });

  test("the Playground's last demo, prerendered with Coffee picked", async () => {
    const html = renderToStaticMarkup(<RouteView route={{ name: "coffee" }} />);
    expect(html).toContain("data-textjs-focus-pad");
    expect(html).toContain('<a href="/coffee" title="The terminal.shop storefront" aria-current="page">Coffee</a>');
    // terminal.shop's wordmark leads the message, on desktop and in the touch notice.
    expect(html.match(/<svg class="wordmark-terminal" role="img" aria-label="terminal.shop" width="132" height="32" viewBox="0 0 744 180"/g)?.length).toBe(2);
    expect(html).toContain('fill="#FF5C00"');
    expect(html).toContain(">Coffee</a></nav>");
    expect(html).not.toContain("View source");
    expect(html).toContain("Then click here and press ↑ ↓ to browse.");
    expect(html).toContain("no API key needed");
    expect(html).toContain("Open on a desktop");
    expect(ROUTES.find((r) => r.path === "/coffee")?.description).toContain("terminal.shop");
    expect(ROUTES.some((r) => r.path.startsWith("/terminal"))).toBe(false);
    const pre = await render("/coffee");
    expect(pre).toContain('<div class="pad-slot pad-slot-banner"><svg class="wordmark-terminal"');
    expect(pre).toContain("no API key needed");
    expect(pre).not.toContain("<!--$?-->");
  });

  test("sitemap, and no footer link (the Playground picker has it)", () => {
    const sitemap = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
    expect(sitemap).toContain("<loc>https://textjs.org/coffee</loc>");
    expect(sitemap).not.toContain("textjs.org/terminal<");
    expect(renderToStaticMarkup(<Footer />)).not.toContain('href="/coffee"');
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

  test("only / and the Terminal endpoints run as Pages Functions", () => {
    const routes = JSON.parse(readFileSync(join(ROOT, "public/_routes.json"), "utf8")) as { version: number; include: string[]; exclude: string[] };
    expect(routes.version).toBe(1);
    // `/` is exact (no `/*`): it serves `curl textjs.org` and passes every other request through.
    expect(routes.include.sort()).toEqual(["/", "/api/terminal", "/api/terminal/*", "/terminal/callback"]);
    expect(existsSync(join(ROOT, "functions/index.ts"))).toBe(true);
    expect(existsSync(join(ROOT, "functions/api/terminal/[[path]].ts"))).toBe(true);
    expect(existsSync(join(ROOT, "functions/terminal/callback.ts"))).toBe(true);
  });
});

describe("F-04: static security headers", () => {
  test("public/_headers sets nosniff, referrer policy, framing rules and asset caching", () => {
    const text = readFileSync(join(ROOT, "public/_headers"), "utf8");
    const blocks = new Map<string, Map<string, string>>();
    let current: Map<string, string> | null = null;
    for (const line of text.split("\n")) {
      if (!line.trim() || line.startsWith("#")) continue;
      if (!/^\s/.test(line)) blocks.set(line.trim(), (current = new Map()));
      else {
        const i = line.indexOf(":");
        current!.set(line.slice(0, i).trim().toLowerCase(), line.slice(i + 1).trim());
      }
    }
    const all = blocks.get("/*")!;
    expect(all.get("x-content-type-options")).toBe("nosniff");
    expect(all.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(all.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(all.get("content-security-policy")).toBe("frame-ancestors 'self'");
    expect(blocks.get("/assets/*")!.get("cache-control")).toBe("public, max-age=31536000, immutable");
    for (const path of ["/fonts/*", "/og/*"]) expect(blocks.get(path)!.get("cache-control")).toBe("public, max-age=86400, stale-while-revalidate=604800");
    expect(all.has("cache-control")).toBe(false);
    // No header is set by two matching rules (Pages would join the values with a comma).
    expect([...blocks.get("/assets/*")!.keys()].some((k) => all.has(k))).toBe(false);
  });
});
