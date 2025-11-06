import { describe, expect, test } from "bun:test";
import {
  chainPattern,
  flattenRoutes,
  matchAppRoutes,
  parseSegment,
  resolveMetadata,
  resolveRoute,
  searchParamsToRecord,
  type RouteManifest,
} from "../src/routing";
import { createMemoryHistory, isExternalHref, parseHref } from "../src/history";
import { getRedirectTarget, isNavigationError, isNotFoundError, isRedirectError, notFound, redirect } from "../src/navigation-errors";

const page = (title?: string) => ({ default: () => null, ...(title ? { metadata: { title } } : {}) });

const manifest: RouteManifest = {
  segment: "",
  layout: { default: () => null, metadata: { title: { default: "Acme", template: "%s · Acme" } } },
  page: page("Overview"),
  notFound: page(),
  children: [
    { segment: "logs", page: page("Logs") },
    {
      segment: "deployments",
      layout: { default: () => null },
      page: page("Deployments"),
      notFound: page(),
      children: [
        { segment: "new", page: page("New") },
        { segment: "[id]", page: { default: () => null, generateMetadata: ({ params }) => ({ title: `Deployment ${String(params.id)}` }) } },
      ],
    },
    { segment: "docs", children: [{ segment: "[...slug]", page: page() }] },
    { segment: "shop", children: [{ segment: "[[...path]]", page: page() }] },
    { segment: "(marketing)", children: [{ segment: "pricing", page: page("Pricing") }] },
    { segment: "about", page: { default: () => null, metadata: { title: { absolute: "About Text.js" } } } },
    { segment: "live", page: { default: () => null, dynamic: "force-dynamic" } },
  ],
};

describe("parseSegment", () => {
  test("classifies every segment kind", () => {
    expect(parseSegment("logs")).toEqual({ kind: "static", name: "logs" });
    expect(parseSegment("[id]")).toEqual({ kind: "dynamic", name: "id" });
    expect(parseSegment("[...slug]")).toEqual({ kind: "catchAll", name: "slug" });
    expect(parseSegment("[[...slug]]")).toEqual({ kind: "optionalCatchAll", name: "slug" });
    expect(parseSegment("(group)")).toEqual({ kind: "group", name: "(group)" });
  });
});

describe("matchAppRoutes", () => {
  test("static routes and the root page", () => {
    expect(matchAppRoutes(manifest, "/")?.pattern).toBe("/");
    expect(matchAppRoutes(manifest, "/logs")?.pattern).toBe("/logs");
    expect(matchAppRoutes(manifest, "/logs/")?.pattern).toBe("/logs");
    expect(matchAppRoutes(manifest, "/logs")?.dynamic).toBe(false);
  });

  test("[param] segments, with static siblings taking priority", () => {
    const m = matchAppRoutes(manifest, "/deployments/dpl_8f2k");
    expect(m?.pattern).toBe("/deployments/[id]");
    expect(m?.params).toEqual({ id: "dpl_8f2k" });
    expect(m?.dynamic).toBe(true);
    expect(m?.chain.map((n) => n.segment)).toEqual(["", "deployments", "[id]"]);
    expect(matchAppRoutes(manifest, "/deployments/new")?.pattern).toBe("/deployments/new");
  });

  test("decodes params", () => {
    expect(matchAppRoutes(manifest, "/deployments/a%20b")?.params).toEqual({ id: "a b" });
  });

  test("[...slug] catch-all and [[...slug]] optional catch-all", () => {
    expect(matchAppRoutes(manifest, "/docs/a/b/c")?.params).toEqual({ slug: ["a", "b", "c"] });
    expect(matchAppRoutes(manifest, "/docs")).toBeNull();
    expect(matchAppRoutes(manifest, "/shop")?.params).toEqual({});
    expect(matchAppRoutes(manifest, "/shop/x/y")?.params).toEqual({ path: ["x", "y"] });
  });

  test("route groups are transparent", () => {
    const m = matchAppRoutes(manifest, "/pricing");
    expect(m?.pattern).toBe("/pricing");
    expect(m?.chain.map((n) => n.segment)).toEqual(["", "(marketing)", "pricing"]);
  });

  test("force-dynamic marks a static path ƒ Dynamic", () => {
    expect(matchAppRoutes(manifest, "/live")?.dynamic).toBe(true);
  });

  test("unmatched paths return null", () => {
    expect(matchAppRoutes(manifest, "/nope")).toBeNull();
    expect(matchAppRoutes(manifest, "/logs/extra")).toBeNull();
  });
});

describe("resolveRoute (not-found)", () => {
  test("falls back to the deepest not-found boundary", () => {
    const nested = resolveRoute(manifest, "/deployments/x/y/z");
    expect(nested.notFound).toBe(true);
    expect(nested.pattern).toBe("/_not-found");
    expect(nested.chain.map((n) => n.segment)).toEqual(["", "deployments"]);

    const root = resolveRoute(manifest, "/missing");
    expect(root.notFound).toBe(true);
    expect(root.chain.map((n) => n.segment)).toEqual([""]);
  });
});

describe("metadata", () => {
  test("applies title templates, generateMetadata and absolute titles", () => {
    expect(resolveMetadata(resolveRoute(manifest, "/")).title).toBe("Overview · Acme");
    expect(resolveMetadata(resolveRoute(manifest, "/deployments/dpl_1")).title).toBe("Deployment dpl_1 · Acme");
    expect(resolveMetadata(resolveRoute(manifest, "/about")).title).toBe("About Text.js");
    expect(resolveMetadata(resolveRoute(manifest, "/docs/a")).title).toBe("Acme");
  });
});

describe("flattenRoutes", () => {
  test("lists every page with ○ / ƒ classification", () => {
    const flat = flattenRoutes(manifest);
    expect(flat[0]?.pattern).toBe("/");
    expect(flat.map((r) => `${r.dynamic ? "ƒ" : "○"} ${r.pattern}`)).toEqual([
      "○ /",
      "○ /about",
      "ƒ /deployments/[id]",
      "○ /deployments",
      "○ /deployments/new",
      "ƒ /docs/[...slug]",
      "ƒ /live",
      "○ /logs",
      "○ /pricing",
      "ƒ /shop/[[...path]]",
    ].sort((a, b) => (a.endsWith(" /") ? -1 : b.endsWith(" /") ? 1 : a.slice(2).localeCompare(b.slice(2)))));
    expect(chainPattern([manifest])).toBe("/");
  });
});

describe("history", () => {
  test("parseHref resolves relative hrefs and strips trailing slashes", () => {
    expect(parseHref("/a/b/?x=1#h").href).toBe("/a/b?x=1#h");
    expect(parseHref("c", "/a/b").pathname).toBe("/a/c");
    expect(parseHref("../c", "/a/b/").pathname).toBe("/a/c");
    expect(isExternalHref("https://textjs.org")).toBe(true);
    expect(isExternalHref("/docs")).toBe(false);
  });

  test("memory history push / replace / back / forward", () => {
    const h = createMemoryHistory("/");
    const seen: string[] = [];
    h.listen((l, a) => seen.push(`${a}:${l.href}`));
    h.push("/logs?level=error");
    h.push("/deployments/1");
    h.replace("/deployments/2");
    h.back();
    h.forward();
    h.go(-10);
    expect(seen).toEqual(["push:/logs?level=error", "push:/deployments/1", "replace:/deployments/2", "pop:/logs?level=error", "pop:/deployments/2", "pop:/"]);
    expect(h.entries.map((e) => e.href)).toEqual(["/", "/logs?level=error", "/deployments/2"]);
    expect(h.index).toBe(0);
    h.push("/new");
    expect(h.entries.map((e) => e.href)).toEqual(["/", "/new"]);
  });

  test("searchParamsToRecord groups repeated keys", () => {
    expect(searchParamsToRecord("?a=1&b=2&a=3")).toEqual({ a: ["1", "3"], b: "2" });
  });
});

describe("navigation errors", () => {
  test("notFound() and redirect() throw tagged errors", () => {
    let nf: unknown;
    try {
      notFound();
    } catch (e) {
      nf = e;
    }
    expect(isNotFoundError(nf)).toBe(true);
    let rd: unknown;
    try {
      redirect("/login?next=/a;b", "push");
    } catch (e) {
      rd = e;
    }
    expect(isRedirectError(rd)).toBe(true);
    expect(isNavigationError(rd)).toBe(true);
    if (isRedirectError(rd)) expect(getRedirectTarget(rd)).toEqual({ href: "/login?next=/a;b", type: "push" });
    expect(isNavigationError(new Error("x"))).toBe(false);
  });
});
