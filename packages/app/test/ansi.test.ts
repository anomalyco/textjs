import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { ANSI_BIDI_EXPLICIT, ANSI_BIDI_IMPLICIT } from "@textjs/core";
import { Box, frameToAnsi, Text } from "@textjs/react";
import { render } from "@textjs/react/testing";
import { ANSI_CACHE_CONTROL, ansiResponse, TERMINAL_UA, wantsAnsi } from "../src/ansi";
import { MAX_ANSI_CELLS, pageAnsiSize, resolveAnsiSize } from "../src/config";
import { cloudflareWorkerNote, CLOUDFLARE_WORKER_NOTE_BYTES } from "../src/server/adapters/cloudflare";
import { VERCEL_ANSI_DIR, VERCEL_ROUTES_NOTE, vercelConfig, vercelRouteNote } from "../src/server/adapters/vercel";
import type { AdapterContext } from "../src/server/adapters/shared";
import { ANSI_COLD_RENDERS, ansiPagePath, appendVary, createAnsiHandler, withAnsiVary } from "../src/server/ansi-server";
import { PRIVATE_CACHE_CONTROL } from "../src/server/http";
import { ServerComponentCache } from "../src/server/server-components";

const CURL = "curl/8.7.1";
const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const req = (headers: Record<string, string>, method = "GET"): Request => new Request("http://x.dev/", { method, headers });

describe("wantsAnsi", () => {
  test("terminal clients asking for anything but HTML", () => {
    for (const ua of [CURL, "Wget/1.21.4", "wget2/2.1.0", "HTTPie/3.2.2", "xh/0.22.0"]) {
      expect(wantsAnsi(req({ "user-agent": ua, accept: "*/*" }))).toBe(true);
      expect(wantsAnsi(req({ "user-agent": ua }))).toBe(true);
      expect(wantsAnsi(req({ "user-agent": ua, accept: "text/plain" }))).toBe(true);
      expect(wantsAnsi(req({ "user-agent": ua, accept: "application/json, */*;q=0.5" }))).toBe(true);
      expect(wantsAnsi(req({ "user-agent": ua, accept: "*/*" }, "HEAD"))).toBe(true);
      expect(wantsAnsi(req({ "user-agent": ua, accept: "text/html" }))).toBe(false);
      expect(wantsAnsi(req({ "user-agent": ua, accept: "TEXT/HTML" }))).toBe(false);
      expect(wantsAnsi(req({ "user-agent": ua, accept: "application/xhtml+xml,text/html;q=0.9" }))).toBe(false);
      expect(wantsAnsi(req({ "user-agent": ua, accept: "*/*" }, "POST"))).toBe(false);
      expect(wantsAnsi(req({ "user-agent": ua, accept: "*/*" }, "OPTIONS"))).toBe(false);
    }
  });

  test("browsers, bots and clients without a User-Agent get the page", () => {
    expect(wantsAnsi(req({ "user-agent": CHROME, accept: "text/html,application/xhtml+xml,*/*;q=0.8" }))).toBe(false);
    expect(wantsAnsi(req({ "user-agent": CHROME, accept: "*/*" }))).toBe(false);
    expect(wantsAnsi(req({ "user-agent": CHROME, accept: "text/plain" }))).toBe(false);
    expect(wantsAnsi(req({ "user-agent": "Slackbot-LinkExpanding 1.0", accept: "*/*" }))).toBe(false);
    expect(wantsAnsi(req({ "user-agent": "libcurl-agent/1.0", accept: "*/*" }))).toBe(false);
    expect(wantsAnsi(req({ "user-agent": "CURL/8.0", accept: "*/*" }))).toBe(false);
    expect(wantsAnsi(req({ accept: "*/*" }))).toBe(false);
    expect(TERMINAL_UA.test("Bun/1.4.4")).toBe(false);
  });

  test("accepts (method, Headers) and Node's header records", () => {
    expect(wantsAnsi("GET", new Headers({ "user-agent": CURL }))).toBe(true);
    expect(wantsAnsi("HEAD", { "user-agent": CURL, accept: "*/*" })).toBe(true);
    expect(wantsAnsi("GET", { "user-agent": CURL, accept: "text/html" })).toBe(false);
    expect(wantsAnsi("GET", { "user-agent": [CURL] })).toBe(true);
    expect(wantsAnsi(undefined, { "user-agent": CURL })).toBe(false);
    expect(wantsAnsi("GET", {})).toBe(false);
  });
});

describe("ansiResponse", () => {
  test("text/plain with the cache and sniffing headers, and the body's byte length", async () => {
    const frame = "\u001b[0mhé ▼\u001b[0m\n";
    const res = ansiResponse(frame);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("vary")).toBe("User-Agent, Accept");
    expect(res.headers.get("cache-control")).toBe(ANSI_CACHE_CONTROL);
    expect(ANSI_CACHE_CONTROL).toBe(PRIVATE_CACHE_CONTROL);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-length")).toBe(String(Buffer.byteLength(frame)));
    expect(await res.text()).toBe(frame);
  });

  test("HEAD has the same headers and no body; status passes through", async () => {
    const res = ansiResponse("frame\n", "HEAD", 404);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-length")).toBe("6");
    expect(res.body).toBeNull();
  });
});

describe("frameToAnsi", () => {
  test("full-width rows that each end in a reset, a final newline, no cursor movement", async () => {
    const app = await render(createElement(Box, { width: 12, height: 3 }, createElement(Text, null, "hi")), { cols: 12, rows: 3, theme: "geistDark", tabFocus: false });
    try {
      const out = frameToAnsi(app.root.renderer.buffer, { theme: "geistDark" });
      expect(out.endsWith("\u001b[0m\n")).toBe(true);
      expect(out.startsWith("\u001b[H")).toBe(false);
      expect(out).not.toContain("\u001b[2J");
      const rows = out.slice(0, -1).split("\n");
      expect(rows).toHaveLength(3);
      for (const row of rows) expect(row.endsWith("\u001b[0m")).toBe(true);
      // geistDark's background (#0a0a0a) fills every cell.
      expect(out).toContain("48;2;10;10;10");
      expect(out).toContain("hi");
    } finally {
      await app.unmount();
    }
  });

  test("a frame that switches the terminal's bidi mode switches it back", async () => {
    const app = await render(createElement(Text, null, "שלום"), { cols: 10, rows: 1, tabFocus: false });
    try {
      const out = frameToAnsi(app.root.renderer.buffer);
      expect(out.startsWith(ANSI_BIDI_EXPLICIT)).toBe(true);
      expect(out.endsWith(`${ANSI_BIDI_IMPLICIT}\n`)).toBe(true);
    } finally {
      await app.unmount();
    }
  });
});

describe("ANSI frame size", () => {
  test("80×24 by default, the viewport when it's fixed, config overrides, `false` turns it off", () => {
    expect(resolveAnsiSize({})).toEqual({ cols: 80, rows: 24 });
    expect(resolveAnsiSize({ viewport: { width: 100, height: 30 } })).toEqual({ cols: 80, rows: 24 });
    expect(resolveAnsiSize({ viewport: { width: 100, height: 30, responsive: false } })).toEqual({ cols: 100, rows: 30 });
    expect(resolveAnsiSize({ viewport: { responsive: false } })).toEqual({ cols: 120, rows: 36 });
    expect(resolveAnsiSize({ ansi: { cols: 60 } })).toEqual({ cols: 60, rows: 24 });
    expect(resolveAnsiSize({ ansi: false })).toBeNull();
  });

  test("sizes are clamped to 1..500 whole cells", () => {
    expect(resolveAnsiSize({ ansi: { cols: 0, rows: 10_000 } })).toEqual({ cols: 1, rows: MAX_ANSI_CELLS });
    expect(resolveAnsiSize({ ansi: { cols: 40.7, rows: Number.NaN } })).toEqual({ cols: 40, rows: 24 });
    expect(pageAnsiSize({ cols: 80, rows: 24 }, { cols: -5, rows: 1e9 })).toEqual({ cols: 1, rows: MAX_ANSI_CELLS });
  });

  test("a page's export overrides the size or opts out", () => {
    const size = { cols: 80, rows: 24 };
    expect(pageAnsiSize(size, undefined)).toEqual(size);
    expect(pageAnsiSize(size, false)).toBeNull();
    expect(pageAnsiSize(size, { rows: 10 })).toEqual({ cols: 80, rows: 10 });
    expect(pageAnsiSize(size, "nope")).toEqual(size);
  });
});

describe("createAnsiHandler", () => {
  const curl = { method: "GET", headers: { "user-agent": CURL, accept: "*/*" } };

  test("only page paths: no files, dot-paths, hidden segments, internals or invalid paths", () => {
    expect(ansiPagePath("/about")).toEqual({ route: "/about", page: "/about" });
    expect(ansiPagePath("/caf%C3%A9/")).toEqual({ route: "/caf%C3%A9", page: "/café" });
    expect(ansiPagePath("/x/../ad%6din")).toEqual({ route: "/admin", page: "/admin" });
    for (const p of ["/robots.txt", "/admin.", "/.env", "/.well-known/x", "/a/.git/config", "/admin%2fx", "/x%"]) expect(ansiPagePath(p)).toBeNull();
  });

  test("prebuilt frames first, then renders; terminals only", async () => {
    let renders = 0;
    const handler = createAnsiHandler({
      frames: { "/": "home\n", "/café": "cafe\n" },
      isFile: (p) => p === "/notes",
      render: async (href) => {
        renders++;
        return href.startsWith("/posts/") ? { ansi: `${href}\n`, status: 200 } : { ansi: "nf\n", status: 404 };
      },
    });
    expect(await (await handler(curl, "/"))?.text()).toBe("home\n");
    expect(await (await handler(curl, "/caf%C3%A9"))?.text()).toBe("cafe\n");
    const post = await handler(curl, "/posts/1?tab=2");
    expect(await post?.text()).toBe("/posts/1?tab=2\n");
    expect((await handler(curl, "/nope"))?.status).toBe(404);
    expect(await handler(curl, "/notes")).toBeNull();
    expect(await handler(curl, "/robots.txt")).toBeNull();
    expect(await handler(curl, "/__textjs/live")).toBeNull();
    expect(await handler({ method: "GET", headers: { "user-agent": CHROME } }, "/")).toBeNull();
    expect(await handler({ method: "POST", headers: { "user-agent": CURL } }, "/")).toBeNull();
    expect(renders).toBe(2);
  });

  test("renders are cached per href, failures and skips included, until the TTL", async () => {
    let now = 1000;
    const realNow = Date.now;
    Date.now = () => now;
    try {
      const calls: string[] = [];
      const handler = createAnsiHandler({
        cacheTtlMs: 100,
        onError: () => undefined,
        render: async (href) => {
          calls.push(href);
          if (href === "/boom") throw new Error("render failed");
          if (href === "/skip") return null;
          return { ansi: "ok\n", status: 200 };
        },
      });
      for (let i = 0; i < 3; i++) {
        expect((await handler(curl, "/a"))?.status).toBe(200);
        expect(await handler(curl, "/boom")).toBeNull();
        expect(await handler(curl, "/skip")).toBeNull();
      }
      expect(calls).toEqual(["/a", "/boom", "/skip"]);
      now += 101;
      await handler(curl, "/a");
      expect(calls).toEqual(["/a", "/boom", "/skip", "/a"]);
    } finally {
      Date.now = realNow;
    }
  });

  test("uncached renders are budgeted per process: past it, HTML until the budget refills", async () => {
    let now = 0;
    const realNow = Date.now;
    Date.now = () => now;
    try {
      let renders = 0;
      const handler = createAnsiHandler({
        coldRenders: { limit: 3, windowMs: 3000 },
        render: async () => {
          renders++;
          return { ansi: "x\n", status: 200 };
        },
      });
      const statuses: Array<number | null> = [];
      for (const p of ["/a", "/b", "/c", "/d", "/e"]) statuses.push((await handler(curl, p))?.status ?? null);
      expect(statuses).toEqual([200, 200, 200, null, null]);
      expect(renders).toBe(3);
      // Cached pages don't spend the budget, and a refused page wasn't cached as a skip.
      expect((await handler(curl, "/a"))?.status).toBe(200);
      now += 1000;
      expect((await handler(curl, "/d"))?.status).toBe(200);
      expect(await handler(curl, "/e")).toBeNull();
      expect(renders).toBe(4);
    } finally {
      Date.now = realNow;
    }
    expect(ANSI_COLD_RENDERS).toEqual({ limit: 20, windowMs: 10_000 });
  });

  test("concurrent requests for one URL share one render and one token", async () => {
    let renders = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((r) => (release = r));
    const handler = createAnsiHandler({
      coldRenders: { limit: 1, windowMs: 60_000 },
      render: async () => {
        renders++;
        await gate;
        return { ansi: "x\n", status: 200 };
      },
    });
    const pending = Array.from({ length: 20 }, () => handler(curl, "/same"));
    release?.();
    const results = await Promise.all(pending);
    expect(results.map((r) => r?.status)).toEqual(Array(20).fill(200));
    expect(renders).toBe(1);
  });

  test("a clock that steps back doesn't drain the budget", async () => {
    let now = 10_000;
    const realNow = Date.now;
    Date.now = () => now;
    try {
      const handler = createAnsiHandler({ coldRenders: { limit: 2, windowMs: 3000 }, render: async () => ({ ansi: "x\n", status: 200 }) });
      await handler(curl, "/a");
      await handler(curl, "/b");
      now = 0;
      expect(await handler(curl, "/c")).toBeNull();
      now = 1500;
      expect((await handler(curl, "/c"))?.status).toBe(200);
    } finally {
      Date.now = realNow;
    }
  });

  test("varies(): the URLs whose HTML depends on User-Agent and Accept", () => {
    const prebuilt = createAnsiHandler({ frames: { "/": "home\n" }, isFile: (p) => p === "/notes" });
    expect(prebuilt.varies("/")).toBe(true);
    expect(prebuilt.varies("/?x=1")).toBe(true);
    expect(prebuilt.varies("/posts/1")).toBe(false);
    let on = true;
    const rendering = createAnsiHandler({ isFile: (p) => p === "/notes", renders: () => on, render: async () => null });
    expect(rendering.varies("/posts/1")).toBe(true);
    expect(rendering.varies("/notes")).toBe(false);
    expect(rendering.varies("/robots.txt")).toBe(false);
    expect(rendering.varies("/__textjs/live")).toBe(false);
    on = false;
    expect(rendering.varies("/posts/1")).toBe(false);
  });

  test("appendVary keeps what's there", () => {
    expect(appendVary(undefined)).toBe("User-Agent, Accept");
    expect(appendVary("Accept-Encoding")).toBe("Accept-Encoding, User-Agent, Accept");
    expect(appendVary("accept, RSC")).toBe("accept, RSC, User-Agent");
    expect(appendVary("*")).toBe("*");
    const frozen = new Response("x", { headers: { vary: "Origin" } });
    Object.defineProperty(frozen.headers, "set", { value: () => { throw new TypeError("immutable"); } });
    expect(withAnsiVary(frozen).headers.get("vary")).toBe("Origin, User-Agent, Accept");
  });

  test("the cache is bounded and can be turned off", async () => {
    let renders = 0;
    const render = async () => {
      renders++;
      return { ansi: "x\n", status: 200 as const };
    };
    const small = createAnsiHandler({ cacheSize: 2, coldRenders: null, render });
    for (const p of ["/a", "/b", "/c", "/a"]) await small(curl, p);
    expect(renders).toBe(4);
    renders = 0;
    const off = createAnsiHandler({ cacheSize: 0, coldRenders: null, render });
    for (const p of ["/a", "/a"]) await off(curl, p);
    expect(renders).toBe(2);
  });
});

describe("ServerComponentCache({ suspendOnly })", () => {
  test("never runs the component: every read suspends", async () => {
    let ran = false;
    const cache = new ServerComponentCache({ suspendOnly: true });
    const p = cache.read(
      async () => {
        ran = true;
        return null;
      },
      {},
      "",
    );
    const settled = await Promise.race([p.then(() => "settled"), new Promise((r) => setTimeout(() => r("pending"), 20))]);
    expect(settled).toBe("pending");
    expect(ran).toBe(false);
    expect(cache.size).toBe(0);
  });
});

describe("platform limits", () => {
  test("Vercel: a note past 1,800 routes", () => {
    expect(vercelRouteNote(VERCEL_ROUTES_NOTE)).toBeNull();
    expect(vercelRouteNote(1900)).toContain("config.json has 1900 routes. Vercel allows 2,048 per deployment");
  });

  test("Vercel: 500 pages' Vary routes fit the 4,096-character src limit, in order", () => {
    const pages = Array.from({ length: 500 }, (_, i) => `/docs/section-${i}/page-with-a-long-name-${i}`);
    const ctx = { basePath: "/console", api: [], rewrites: [] } as unknown as AdapterContext;
    const routes = vercelConfig(ctx, null, ["/", ...pages]).routes;
    for (const r of routes) expect((r.src ?? "").length).toBeLessThanOrEqual(4096);
    const isFrame = (r: (typeof routes)[number]) => (r.dest ?? "").startsWith(`/${VERCEL_ANSI_DIR}/`);
    const varyAt = routes.flatMap((r, i) => (r.headers?.vary && !r.dest ? [i] : []));
    expect(varyAt.length).toBeGreaterThan(1);
    const lastFrame = routes.map(isFrame).lastIndexOf(true);
    const filesystem = routes.findIndex((r) => r.handle === "filesystem");
    for (const i of varyAt) {
      expect(i).toBeGreaterThan(lastFrame);
      expect(i).toBeLessThan(filesystem);
      expect(routes[i]).toMatchObject({ continue: true, caseSensitive: true, methods: ["GET", "HEAD"], headers: { vary: "User-Agent, Accept" } });
    }
    const vary = varyAt.map((i) => new RegExp(routes[i]?.src as string));
    for (const p of ["/console", "/console/", ...pages.map((p) => `/console${p}`), `/console${pages[499]}/`]) expect(vary.filter((re) => re.test(p))).toHaveLength(1);
    for (const p of ["/console/docs/section-1", "/docs/section-0/page-with-a-long-name-0", `/console${pages[0]}x`]) expect(vary.some((re) => re.test(p))).toBe(false);
    // The 1,800-route note counts them.
    expect(vercelRouteNote(routes.length)).toBeNull();
    expect(routes.length).toBe(501 + varyAt.length + vercelConfig(ctx, null).routes.length);
  });

  test("Cloudflare: a note past 20 MiB of _worker.js", () => {
    expect(cloudflareWorkerNote(CLOUDFLARE_WORKER_NOTE_BYTES)).toBeNull();
    expect(cloudflareWorkerNote(22 * 1024 * 1024)).toContain("_worker.js is 22.0 MiB");
  });
});
