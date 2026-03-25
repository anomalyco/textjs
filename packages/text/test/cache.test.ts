import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import {
  __configureCache,
  cache,
  classifyEntry,
  implicitTags,
  MemoryCacheStore,
  revalidatePath,
  revalidateTag,
  setCacheStore,
  unstable_cache,
  type CacheEntry,
  type CacheStore,
} from "../src/server/cache";
import { cacheControlFor, routeCacheConfig, runRouteHandlerWithCache } from "../src/server/cache-route";
import type { RouteHandlerModule } from "../src/server/http";

let now = 1_000_000;
const advance = (seconds: number): void => {
  now += seconds * 1000;
};
/** Let background revalidations settle. */
const settle = () => new Promise((r) => setTimeout(r, 5));
const errors: unknown[] = [];

beforeEach(() => {
  now = 1_000_000;
  errors.length = 0;
  __configureCache({ reset: true, clock: () => now, onError: (e) => errors.push(e) });
});

afterAll(() => {
  __configureCache({ reset: true, clock: Date.now, onError: (e, key) => console.error(key, e) });
});

describe("unstable_cache", () => {
  test("memoizes per key parts and arguments, returning fresh copies", async () => {
    let calls = 0;
    const get = unstable_cache(async (id: number) => ({ id, n: ++calls }), ["post"]);
    const a = await get(1);
    a.n = 999;
    expect(await get(1)).toEqual({ id: 1, n: 1 });
    expect(await get(2)).toEqual({ id: 2, n: 2 });
    expect(calls).toBe(2);
  });

  test("results are JSON-serialized (Dates become strings, undefined survives)", async () => {
    const d = unstable_cache(async () => new Date(0), ["date"]);
    expect((await d()) as unknown).toBe("1970-01-01T00:00:00.000Z");
    const u = unstable_cache(async () => undefined, ["undef"]);
    expect(await u()).toBeUndefined();
  });

  test("time-based revalidation serves stale data while one refresh runs", async () => {
    let calls = 0;
    const get = unstable_cache(async () => ++calls, ["counter"], { revalidate: 10 });
    expect(await get()).toBe(1);
    advance(5);
    expect(await get()).toBe(1);
    advance(6);
    // Stale: the old value is returned immediately; concurrent callers share one refresh.
    expect(await Promise.all([get(), get(), get()])).toEqual([1, 1, 1]);
    await settle();
    expect(calls).toBe(2);
    expect(await get()).toBe(2);
  });

  test("failed background refreshes keep serving the stale value", async () => {
    let fail = false;
    let calls = 0;
    const get = unstable_cache(
      async () => {
        calls++;
        if (fail) throw new Error("upstream down");
        return calls;
      },
      ["flaky"],
      { revalidate: 1 },
    );
    expect(await get()).toBe(1);
    fail = true;
    advance(2);
    expect(await get()).toBe(1);
    await settle();
    expect(errors).toHaveLength(1);
    expect(await get()).toBe(1);
    await settle();
    fail = false;
    expect(await get()).toBe(1);
    await settle();
    expect(await get()).toBe(4);
  });

  test("revalidateTag expires entries (next read recomputes in the foreground)", async () => {
    let calls = 0;
    const get = unstable_cache(async () => ++calls, ["tagged"], { tags: ["posts"] });
    const other = unstable_cache(async () => "x", ["untagged"], { tags: ["users"] });
    expect(await get()).toBe(1);
    await other();
    await revalidateTag("posts");
    expect(await get()).toBe(2);
    expect(await get()).toBe(2);
    await revalidateTag(["nope", "users"]);
    expect(await get()).toBe(2);
  });

  test('revalidateTag(tag, "max") marks entries stale (stale-while-revalidate)', async () => {
    let calls = 0;
    const get = unstable_cache(async () => ++calls, ["swr"], { tags: ["feed"] });
    await get();
    await revalidateTag("feed", "max");
    expect(await get()).toBe(1);
    await settle();
    expect(await get()).toBe(2);
  });

  test("revalidate: 0 never caches; cache() takes an options object", async () => {
    let calls = 0;
    const live = unstable_cache(async () => ++calls, ["live"], { revalidate: 0 });
    await live();
    await live();
    expect(calls).toBe(2);
    const c = cache(async (x: string) => x.toUpperCase(), { key: "upper", tags: ["t"] });
    expect(await c("a")).toBe("A");
  });

  test("validates options", () => {
    expect(() => unstable_cache(async () => 1, ["x"], { revalidate: -1 })).toThrow(/Invalid revalidate/);
    expect(() => unstable_cache(async () => 1, ["x"], { tags: "nope" as never })).toThrow(/Invalid tags/);
  });

  test("a pluggable store receives entries and tag revalidations", async () => {
    const calls: string[] = [];
    const inner = new MemoryCacheStore();
    const store: CacheStore = {
      get: async (k) => {
        calls.push(`get ${k}`);
        return inner.get(k);
      },
      set: async (k, e) => {
        calls.push(`set ${k} ${e.tags.join(",")}`);
        inner.set(k, e);
      },
      delete: (k) => inner.delete(k),
      markTags: async (tags, mode) => {
        calls.push(`mark ${tags.join(",")} ${mode}`);
        inner.markTags(tags, mode, now + 1);
      },
      getTagState: (tags) => inner.getTagState(tags),
    };
    setCacheStore(store);
    const get = unstable_cache(async () => 1, ["k"], { tags: ["a"] });
    await get();
    await revalidateTag("a");
    expect(calls).toEqual(["get data:k:[]", "set data:k:[] a", "mark a expire"]);
  });
});

describe("MemoryCacheStore", () => {
  const entry = (value: unknown): CacheEntry => ({ value, lastModified: 0, revalidate: false, tags: [] });
  test("evicts least recently used entries beyond maxEntries / maxSize", () => {
    const s = new MemoryCacheStore({ maxEntries: 2 });
    s.set("a", entry("1"));
    s.set("b", entry("2"));
    s.get("a");
    s.set("c", entry("3"));
    expect(s.get("b")).toBeUndefined();
    expect(s.get("a")?.value).toBe("1");
    const small = new MemoryCacheStore({ maxSize: 10 });
    small.set("big", entry("x".repeat(100)));
    expect(small.size).toBe(0);
  });

  test("classifyEntry: fresh, stale by time / tag, expired by tag", () => {
    const e: CacheEntry = { value: 1, lastModified: 1000, revalidate: 10, tags: ["t"] };
    expect(classifyEntry(e, { expiredAt: 0, staleAt: 0 }, 5000)).toBe("fresh");
    expect(classifyEntry(e, { expiredAt: 0, staleAt: 0 }, 11_001)).toBe("stale");
    expect(classifyEntry(e, { expiredAt: 0, staleAt: 2000 }, 2000)).toBe("stale");
    expect(classifyEntry(e, { expiredAt: 2000, staleAt: 0 }, 2000)).toBe("expired");
    expect(classifyEntry(e, { expiredAt: 500, staleAt: 0 }, 2000)).toBe("fresh");
  });
});

describe("route segment config", () => {
  test("routeCacheConfig mirrors Next.js semantics", () => {
    expect(routeCacheConfig({})).toEqual({ static: false, revalidate: false });
    expect(routeCacheConfig({ dynamic: "force-static" })).toEqual({ static: true, revalidate: false });
    expect(routeCacheConfig({ revalidate: 60 })).toEqual({ static: true, revalidate: 60 });
    expect(routeCacheConfig({ revalidate: 0 })).toEqual({ static: false, revalidate: 0 });
    expect(routeCacheConfig({ dynamic: "force-dynamic", revalidate: 60 })).toEqual({ static: false, revalidate: 0 });
    expect(() => routeCacheConfig({ dynamic: "sometimes" })).toThrow(/Invalid `dynamic`/);
    expect(() => routeCacheConfig({ revalidate: "60" })).toThrow(/Invalid revalidate/);
  });

  test("Cache-Control values", () => {
    expect(cacheControlFor(false)).toBe("s-maxage=31536000");
    expect(cacheControlFor(60)).toBe("s-maxage=60, stale-while-revalidate=31535940");
  });

  test("implicit path tags cover the path, its pattern and every enclosing segment", () => {
    expect(implicitTags("/api/posts/1", "/api/posts/[id]").sort()).toEqual(
      ["_L:/", "_L:/api", "_L:/api/posts", "_L:/api/posts/1", "_L:/api/posts/[id]", "_P:/api/posts/1", "_P:/api/posts/[id]"].sort(),
    );
  });
});

describe("runRouteHandlerWithCache", () => {
  const call = (mod: RouteHandlerModule, path: string, init?: RequestInit & { pattern?: string; dev?: boolean }) => {
    const { pattern, dev, ...rest } = init ?? {};
    return runRouteHandlerWithCache(mod, new Request(`http://x.dev${path}`, rest), { params: {}, pattern: pattern ?? path.split("?")[0]!, cache: dev ? false : undefined });
  };

  test("dynamic handlers run every time and are left untouched", async () => {
    let n = 0;
    const mod: RouteHandlerModule = { GET: () => Response.json({ n: ++n }) };
    await call(mod, "/api/d");
    const res = await call(mod, "/api/d");
    expect(await res.json()).toEqual({ n: 2 });
    expect(res.headers.has("x-textjs-cache")).toBe(false);
    expect(res.headers.has("cache-control")).toBe(false);
  });

  test("revalidate = N: MISS → HIT → STALE → refreshed HIT with Cache-Control", async () => {
    let n = 0;
    const mod: RouteHandlerModule = { revalidate: 30, GET: () => Response.json({ n: ++n }) };
    const a = await call(mod, "/api/r");
    expect(a.headers.get("x-textjs-cache")).toBe("MISS");
    expect(a.headers.get("cache-control")).toBe("s-maxage=30, stale-while-revalidate=31535970");
    expect(await a.json()).toEqual({ n: 1 });
    const b = await call(mod, "/api/r");
    expect(b.headers.get("x-textjs-cache")).toBe("HIT");
    expect(await b.json()).toEqual({ n: 1 });
    advance(31);
    const c = await call(mod, "/api/r");
    expect(c.headers.get("x-textjs-cache")).toBe("STALE");
    expect(await c.json()).toEqual({ n: 1 });
    await settle();
    const d = await call(mod, "/api/r");
    expect(d.headers.get("x-textjs-cache")).toBe("HIT");
    expect(await d.json()).toEqual({ n: 2 });
  });

  test("force-static handlers see no query string, headers, cookies or body", async () => {
    const mod: RouteHandlerModule = {
      dynamic: "force-static",
      GET: (req) => Response.json({ url: req.url, auth: req.headers.get("authorization"), cookie: req.headers.get("cookie") }),
    };
    const res = await call(mod, "/api/s?user=1", { headers: { authorization: "Bearer x", cookie: "a=1" } });
    expect(await res.json()).toEqual({ url: "http://x.dev/api/s", auth: null, cookie: null });
    expect(res.headers.get("cache-control")).toBe("s-maxage=31536000");
    // One entry per path, regardless of the query string.
    expect((await call(mod, "/api/s?user=2")).headers.get("x-textjs-cache")).toBe("HIT");
  });

  test("POST is never cached; HEAD reuses the cached GET without a body", async () => {
    let n = 0;
    const mod: RouteHandlerModule = { dynamic: "force-static", GET: () => new Response(String(++n)), POST: () => new Response("posted") };
    expect(await (await call(mod, "/api/m", { method: "POST" })).text()).toBe("posted");
    await call(mod, "/api/m");
    const head = await call(mod, "/api/m", { method: "HEAD" });
    expect(head.headers.get("x-textjs-cache")).toBe("HIT");
    expect(await head.text()).toBe("");
    expect(n).toBe(1);
  });

  test("revalidatePath and tags from unstable_cache invalidate cached routes", async () => {
    let n = 0;
    const posts = unstable_cache(async () => ({ v: ++n }), ["posts-data"], { tags: ["posts"], revalidate: 120 });
    const mod: RouteHandlerModule = { dynamic: "force-static", GET: async () => Response.json(await posts()) };
    const pattern = "/api/posts/[id]";
    const get = (path: string) => runRouteHandlerWithCache(mod, new Request(`http://x.dev${path}`), { params: {}, pattern });
    const first = await get("/api/posts/1");
    // The route inherits the shortest data revalidate.
    expect(first.headers.get("cache-control")).toBe("s-maxage=120, stale-while-revalidate=31535880");
    expect((await get("/api/posts/1")).headers.get("x-textjs-cache")).toBe("HIT");

    await revalidateTag("posts");
    const afterTag = await get("/api/posts/1");
    expect(afterTag.headers.get("x-textjs-cache")).toBe("MISS");
    expect(await afterTag.json()).toEqual({ v: 2 });

    await revalidatePath("/api/posts/1");
    expect((await get("/api/posts/1")).headers.get("x-textjs-cache")).toBe("MISS");
    await get("/api/posts/2");
    await revalidatePath("/api/posts/[id]");
    expect((await get("/api/posts/2")).headers.get("x-textjs-cache")).toBe("MISS");
    await revalidatePath("/api", "layout");
    expect((await get("/api/posts/1")).headers.get("x-textjs-cache")).toBe("MISS");
    expect((await get("/api/posts/1")).headers.get("x-textjs-cache")).toBe("HIT");
  });

  test("a revalidate: 0 data fetch makes the route dynamic", async () => {
    const live = unstable_cache(async () => Date.now(), ["now"], { revalidate: 0 });
    const mod: RouteHandlerModule = { revalidate: 60, GET: async () => Response.json(await live()) };
    const res = await call(mod, "/api/live");
    expect(res.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
    expect((await call(mod, "/api/live")).headers.has("x-textjs-cache")).toBe(false);
  });

  test("5xx responses are returned but never cached", async () => {
    let n = 0;
    const mod: RouteHandlerModule = { revalidate: 60, GET: () => new Response(`err ${++n}`, { status: n === 1 ? 503 : 200 }) };
    expect((await call(mod, "/api/e")).status).toBe(503);
    const ok = await call(mod, "/api/e");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("x-textjs-cache")).toBe("MISS");
  });

  test("concurrent misses share one handler invocation", async () => {
    let n = 0;
    const mod: RouteHandlerModule = {
      revalidate: 60,
      GET: async () => {
        n++;
        await new Promise((r) => setTimeout(r, 10));
        return new Response("x");
      },
    };
    const all = await Promise.all([call(mod, "/api/c"), call(mod, "/api/c"), call(mod, "/api/c")]);
    expect(n).toBe(1);
    expect(await Promise.all(all.map((r) => r.text()))).toEqual(["x", "x", "x"]);
  });

  test("streaming responses from static handlers are a clear error", async () => {
    const mod: RouteHandlerModule = { dynamic: "force-static", GET: () => new Response(new ReadableStream(), { headers: { "content-type": "text/event-stream" } }) };
    await expect(call(mod, "/api/sse")).rejects.toThrow(/must be dynamic/);
  });

  test("cache: false (text dev) keeps static request semantics without storing", async () => {
    let n = 0;
    const mod: RouteHandlerModule = { dynamic: "force-static", GET: (req) => new Response(`${++n} ${new URL(req.url).search}`) };
    expect(await (await call(mod, "/api/dev?x=1", { dev: true })).text()).toBe("1 ");
    expect(await (await call(mod, "/api/dev", { dev: true })).text()).toBe("2 ");
  });
});
