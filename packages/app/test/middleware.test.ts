import { describe, expect, test } from "bun:test";
import { NextRequest, NextResponse, NextURL, parseCookieHeader, parseSetCookie, RequestCookies, ResponseCookies, serializeCookie, type MiddlewareModule } from "../src/server/middleware";
import { compileMatcher, compileMatcherSource, matcherKeys, matchesMiddleware, runMiddleware, toMiddlewareResponse, withMiddlewareHeaders } from "../src/server/middleware-runtime";
import { rewriteRoute } from "../src/server/adapters/shared";

const match = (matcher: Parameters<typeof compileMatcher>[0], path: string, request?: Request): boolean => matchesMiddleware(compileMatcher(matcher), path, request);

describe("middleware matcher", () => {
  test("literal paths, with an optional trailing slash", () => {
    expect(match("/about", "/about")).toBe(true);
    expect(match("/about", "/about/")).toBe(true);
    expect(match("/about", "/about/team")).toBe(false);
    expect(match("/about", "/aboutx")).toBe(false);
    expect(match("/", "/")).toBe(true);
    expect(match("/", "/a")).toBe(false);
    expect(match("/a.b", "/axb")).toBe(false);
  });

  test("named parameters and modifiers", () => {
    expect(match("/blog/:slug", "/blog/hello")).toBe(true);
    expect(match("/blog/:slug", "/blog")).toBe(false);
    expect(match("/blog/:slug", "/blog/a/b")).toBe(false);
    expect(match("/docs/:path*", "/docs")).toBe(true);
    expect(match("/docs/:path*", "/docs/a/b/c")).toBe(true);
    expect(match("/docs/:path*", "/docsx")).toBe(false);
    expect(match("/a/:rest+", "/a")).toBe(false);
    expect(match("/a/:rest+", "/a/b/c")).toBe(true);
    expect(match("/:locale?/shop", "/shop")).toBe(true);
    expect(match("/:locale?/shop", "/fr/shop")).toBe(true);
    expect(match("/user/:id(\\d+)", "/user/42")).toBe(true);
    expect(match("/user/:id(\\d+)", "/user/ada")).toBe(false);
  });

  test("raw regex groups (the Next.js negative-lookahead idiom)", () => {
    const m = "/((?!api|assets|favicon.ico).*)";
    expect(match(m, "/")).toBe(true);
    expect(match(m, "/dashboard/settings")).toBe(true);
    expect(match(m, "/api/health")).toBe(false);
    expect(match(m, "/assets/index-abc.js")).toBe(false);
    expect(match(m, "/favicon.ico")).toBe(false);
  });

  test("arrays, no matcher and invalid sources", () => {
    expect(match(["/a", "/b/:x*"], "/b/c")).toBe(true);
    expect(match(["/a", "/b/:x*"], "/c")).toBe(false);
    expect(matchesMiddleware(null, "/anything")).toBe(true);
    expect(() => compileMatcherSource("about")).toThrow(/must start with/);
    expect(() => compileMatcherSource("/(unbalanced")).toThrow(/Unbalanced/);
  });

  test("has / missing conditions on headers, cookies, query and host", () => {
    const req = new Request("http://example.com/x?preview=1", { headers: { "x-flag": "on", cookie: "session=abc; theme=dark" } });
    expect(match({ source: "/x", has: [{ type: "header", key: "x-flag", value: "on|yes" }] }, "/x", req)).toBe(true);
    expect(match({ source: "/x", has: [{ type: "header", key: "x-flag", value: "off" }] }, "/x", req)).toBe(false);
    expect(match({ source: "/x", has: [{ type: "cookie", key: "session" }, { type: "query", key: "preview", value: "1" }] }, "/x", req)).toBe(true);
    expect(match({ source: "/x", has: [{ type: "host", value: "example\\.com" }] }, "/x", req)).toBe(true);
    expect(match({ source: "/x", missing: [{ type: "cookie", key: "session" }] }, "/x", req)).toBe(false);
    expect(match({ source: "/x", missing: [{ type: "cookie", key: "nope" }] }, "/x", req)).toBe(true);
  });
});

describe("cookies", () => {
  test("parse and serialize", () => {
    expect([...parseCookieHeader('a=1; b="two"; a=3; c=%E2%96%BC')]).toEqual([
      ["a", "1"],
      ["b", "two"],
      ["c", "▼"],
    ]);
    const line = serializeCookie({ name: "s", value: "a b", httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 });
    expect(line).toBe("s=a%20b; Path=/; Max-Age=60; HttpOnly; Secure; SameSite=Lax");
    expect(parseSetCookie(line)).toEqual({ name: "s", value: "a b", path: "/", maxAge: 60, httpOnly: true, secure: true, sameSite: "lax" });
    expect(() => serializeCookie({ name: "bad name", value: "" })).toThrow(/Invalid cookie name/);
  });

  test("RequestCookies reads and rewrites the Cookie header", () => {
    const headers = new Headers({ cookie: "a=1; b=2" });
    const c = new RequestCookies(headers);
    expect(c.get("a")).toEqual({ name: "a", value: "1" });
    expect(c.getAll().map((x) => x.name)).toEqual(["a", "b"]);
    c.set("z", "▼");
    c.delete("a");
    expect(headers.get("cookie")).toBe("b=2; z=%E2%96%BC");
    c.clear();
    expect(headers.has("cookie")).toBe(false);
  });

  test("ResponseCookies writes one Set-Cookie per cookie and replaces by name", () => {
    const headers = new Headers();
    const c = new ResponseCookies(headers);
    c.set("a", "1");
    c.set({ name: "b", value: "2", httpOnly: true });
    c.set("a", "3", { path: "/x" });
    expect(headers.getSetCookie()).toEqual(["a=3; Path=/x", "b=2; Path=/; HttpOnly"]);
    c.delete("b");
    expect(headers.getSetCookie()[1]).toContain("Max-Age=0");
    expect(c.get("a")?.value).toBe("3");
  });
});

describe("NextRequest / NextResponse", () => {
  test("nextUrl strips basePath and re-adds it on redirects", () => {
    const req = new NextRequest("http://x.dev/console/login?next=1", { basePath: "/console" });
    expect(req.nextUrl.pathname).toBe("/login");
    expect(req.nextUrl.searchParams.get("next")).toBe("1");
    const url = req.nextUrl.clone();
    url.pathname = "/home";
    expect(NextResponse.redirect(url).headers.get("location")).toBe("http://x.dev/console/home?next=1");
  });

  test("redirect validates status and URL", () => {
    const r = NextResponse.redirect("https://textjs.org/docs", 308);
    expect(r.status).toBe(308);
    expect(() => NextResponse.redirect("/relative")).toThrow(/absolute/);
    expect(() => NextResponse.redirect("https://a.dev", 200)).toThrow(/Invalid status/);
  });

  test("json sets the content type", async () => {
    const r = NextResponse.json({ ok: true }, { status: 201 });
    expect(r.status).toBe(201);
    expect(r.headers.get("content-type")).toBe("application/json");
    expect(await r.json()).toEqual({ ok: true });
  });
});

const mod = (fn: MiddlewareModule["middleware"], config?: MiddlewareModule["config"]): MiddlewareModule => ({ middleware: fn, config });

describe("runMiddleware", () => {
  test("returns redirects and direct responses as-is", async () => {
    const m = mod((req) => (req.nextUrl.pathname === "/secret" ? NextResponse.redirect(new URL("/login", req.url)) : new Response("nope", { status: 401 })));
    const a = await runMiddleware(m, new Request("http://x.dev/secret"));
    expect(a.type).toBe("response");
    if (a.type === "response") {
      expect(a.response.status).toBe(307);
      expect(a.response.headers.get("location")).toBe("http://x.dev/login");
    }
    const b = await runMiddleware(m, new Request("http://x.dev/other"));
    expect(b.type === "response" && b.response.status).toBe(401);
  });

  test("skips unmatched paths without calling middleware", async () => {
    let calls = 0;
    const m = mod(
      () => {
        calls++;
      },
      { matcher: "/admin/:path*" },
    );
    const out = await runMiddleware(m, new Request("http://x.dev/public"));
    expect(out.type === "next" && out.matched).toBe(false);
    expect(calls).toBe(0);
  });

  test("next() forwards request header overrides, response headers and cookies", async () => {
    const m = mod((req) => {
      const headers = new Headers(req.headers);
      headers.set("x-user", "ada");
      headers.delete("x-drop");
      const res = NextResponse.next({ request: { headers }, headers: { "x-mw": "1" } });
      res.cookies.set("seen", "yes");
      return res;
    });
    const out = await runMiddleware(m, new Request("http://x.dev/api/me", { headers: { "x-drop": "1", cookie: "a=1", host: "x.dev" } }));
    if (out.type !== "next") throw new Error("expected next");
    expect(out.request.headers.get("x-user")).toBe("ada");
    expect(out.request.headers.has("x-drop")).toBe(false);
    expect(out.request.headers.get("host")).toBe("x.dev");
    expect(out.request.headers.get("cookie")).toBe("a=1; seen=yes");
    expect(out.headers.get("x-mw")).toBe("1");
    expect(out.headers.getSetCookie()).toEqual(["seen=yes; Path=/"]);
    expect([...out.headers.keys()].some((k) => k.startsWith("x-middleware-"))).toBe(false);
  });

  test("request.cookies mutations reach downstream handlers", async () => {
    const m = mod((req) => {
      req.cookies.set("flag", "1");
      req.cookies.delete("old");
    });
    const out = await runMiddleware(m, new Request("http://x.dev/", { headers: { cookie: "old=1; keep=2" } }));
    expect(out.type === "next" && out.request.headers.get("cookie")).toBe("keep=2; flag=1");
  });

  test("rewrite() changes the downstream URL and preserves the body", async () => {
    const m = mod((req) => NextResponse.rewrite(new URL("/api/v2/echo?x=1", req.url)));
    const out = await runMiddleware(m, new Request("http://x.dev/api/echo", { method: "POST", body: "payload" }));
    if (out.type !== "next") throw new Error("expected next");
    expect(out.rewrite?.href).toBe("http://x.dev/api/v2/echo?x=1");
    expect(out.request.url).toBe("http://x.dev/api/v2/echo?x=1");
    expect(out.request.method).toBe("POST");
    expect(await out.request.text()).toBe("payload");
  });

  test("middleware may read the body without consuming it for the handler", async () => {
    let seen = "";
    const m = mod(async (req) => {
      seen = await req.text();
    });
    const out = await runMiddleware(m, new Request("http://x.dev/api", { method: "PUT", body: "hello" }));
    expect(seen).toBe("hello");
    expect(out.type === "next" && (await out.request.text())).toBe("hello");
  });

  test("external rewrites keep the original request URL", async () => {
    const m = mod(() => NextResponse.rewrite("https://api.example.com/v1"));
    const out = await runMiddleware(m, new Request("http://x.dev/proxy"));
    if (out.type !== "next") throw new Error("expected next");
    expect(out.rewrite?.origin).toBe("https://api.example.com");
    expect(out.request.url).toBe("http://x.dev/proxy");
  });

  test("toMiddlewareResponse re-encodes outcomes for edge routers", async () => {
    const m = mod((req) => {
      const headers = new Headers(req.headers);
      headers.set("x-user", "ada");
      return NextResponse.rewrite(new URL("/b", req.url), { request: { headers } });
    });
    const req = new Request("http://x.dev/a");
    const res = toMiddlewareResponse(await runMiddleware(m, req), req);
    expect(res.headers.get("x-middleware-rewrite")).toBe("http://x.dev/b");
    expect(res.headers.get("x-middleware-request-x-user")).toBe("ada");
    expect(res.headers.get("x-middleware-override-headers")).toContain("x-user");
    const plain = toMiddlewareResponse(await runMiddleware(mod(() => undefined), req), req);
    expect(plain.headers.get("x-middleware-next")).toBe("1");
    expect(plain.headers.has("x-middleware-override-headers")).toBe(false);
  });

  test("withMiddlewareHeaders puts middleware cookies first (as on Node) and never clobbers handler headers", () => {
    const h = new Headers({ "x-a": "mw", "x-b": "mw" });
    h.append("set-cookie", "m=1; Path=/");
    const res = withMiddlewareHeaders(new Response("ok", { headers: { "x-a": "handler", "set-cookie": "h=1; Path=/" } }), h);
    expect(res.headers.get("x-a")).toBe("handler");
    expect(res.headers.get("x-b")).toBe("mw");
    expect(res.headers.getSetCookie()).toEqual(["m=1; Path=/", "h=1; Path=/"]);
  });

  test("rejects modules without a function and non-Response results", async () => {
    await expect(runMiddleware({}, new Request("http://x.dev/"))).rejects.toThrow(/must export a `middleware` function/);
    await expect(runMiddleware(mod((() => "nope") as never), new Request("http://x.dev/"))).rejects.toThrow(/must return a `Response`/);
    expect((await runMiddleware({ default: () => NextResponse.json({ d: 1 }) }, new Request("http://x.dev/"))).type).toBe("response");
  });
});

describe("middleware hardening", () => {
  test("unprefixed :param* / :param+ compile without nested quantifiers (no ReDoS)", () => {
    const re = new RegExp(compileMatcherSource("/files-:name*"));
    const input = `/files-${"a".repeat(40)}/x`;
    const t0 = performance.now();
    expect(re.test(input)).toBe(false);
    // Nested quantifiers would take minutes on 40 characters; a second leaves room for a busy machine.
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(re.test("/files-abc")).toBe(true);
    expect(re.test("/files-")).toBe(true);
    expect(new RegExp(compileMatcherSource("/v:ver+")).test("/v")).toBe(false);
    expect(new RegExp(compileMatcherSource("/v:ver+")).test("/v12")).toBe(true);
  });

  test("capture keys count unnamed groups (Vercel rewrite $n)", () => {
    expect(matcherKeys("/(a|b)/:id")).toEqual([null, "id"]);
    expect(matcherKeys("/user/:id(\\d+)/:tab")).toEqual(["id", "tab"]);
    expect(matcherKeys("/x/:p((a)|b)")).toEqual(["p", null]);
    expect(rewriteRoute({ source: "/(en|fr)/docs/:slug", destination: "/docs/:slug" }).dest).toBe("/docs/$2");
  });

  test("only NextResponse.next() / rewrite() steer routing; other responses lose x-middleware-* headers", async () => {
    const plain = await runMiddleware(mod(() => new Response("upstream", { headers: { "x-middleware-rewrite": "http://x.dev/admin", "x-middleware-next": "1" } })), new Request("http://x.dev/"));
    expect(plain.type).toBe("response");
    if (plain.type !== "response") throw new Error("unreachable");
    expect(plain.response.headers.has("x-middleware-rewrite")).toBe(false);
    expect(await plain.response.text()).toBe("upstream");
    const vercel = toMiddlewareResponse(plain, new Request("http://x.dev/"));
    expect(vercel.headers.has("x-middleware-next")).toBe(false);
    const next = await runMiddleware(mod(() => NextResponse.rewrite(new URL("http://x.dev/y"), { status: 404 })), new Request("http://x.dev/"));
    expect(next).toMatchObject({ type: "next", status: 404, private: true });
    const plainNext = await runMiddleware(mod(() => NextResponse.next()), new Request("http://x.dev/"));
    expect(plainNext).toMatchObject({ type: "next", matched: true });
    expect("private" in plainNext).toBe(false);
  });

  test("NextURL: href includes basePath, instanceof works across module copies", () => {
    const u = new NextURL("http://x.dev/console/a?q=1", undefined, "/console");
    expect(u.pathname).toBe("/a");
    expect(u.href).toBe("http://x.dev/console/a?q=1");
    expect(String(u)).toBe(u.href);
    expect(u.clone().href).toBe(u.href);
    u.href = "http://x.dev/console/b";
    expect(u.pathname).toBe("/b");
    const foreign = Object.assign(new URL("http://x.dev/console/a"), { [Symbol.for("textjs.nextUrl")]: true });
    expect(foreign instanceof NextURL).toBe(true);
    expect(NextResponse.redirect(u).headers.get("location")).toBe("http://x.dev/console/b");
  });

  test("cookie path / domain can't inject attributes or headers", () => {
    expect(() => serializeCookie({ name: "a", value: "1", path: "/; Domain=evil.example" })).toThrow(/Invalid cookie path/);
    expect(() => serializeCookie({ name: "a", value: "1", domain: "x.dev\r\nSet-Cookie: b=2" })).toThrow(/Invalid cookie domain/);
    expect(serializeCookie({ name: "a", value: "1; b=2" })).toBe("a=1%3B%20b%3D2; Path=/");
  });

  test("the tee'd body copies are released when middleware answers or ignores the body", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        c.enqueue(new Uint8Array(1024));
      },
      cancel() {
        cancelled = true;
      },
    });
    const req = new Request("http://x.dev/upload", { method: "POST", body, duplex: "half" } as RequestInit);
    const out = await runMiddleware(mod(() => new Response("no", { status: 401 })), req);
    expect(out.type).toBe("response");
    await new Promise((r) => setTimeout(r, 10));
    expect(cancelled).toBe(true);
  });
});
