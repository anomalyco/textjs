Cache route handler responses and data, then revalidate them on a timer or on demand. Stale entries are served instantly while one background refresh runs.

## Route handlers

`GET` route handlers are dynamic by default. Opt into caching with route segment config:

```ts@app/api/posts/route.ts
export const revalidate = 60;

export async function GET() {
  const posts = await db.posts.latest();
  return Response.json(posts);
}
```

| Export | Behavior |
| :-- | :-- |
| *(none)* | Runs on every request |
| `dynamic = "force-static"` | Cached until revalidated |
| `revalidate = N` | Cached; stale after `N` seconds |
| `revalidate = 0` or `dynamic = "force-dynamic"` | Runs on every request |

Cached handlers get one entry per pathname, and their `request` looks like it would at build time: no query string, headers, cookies or body. Read those in a dynamic handler instead. Only `GET` and `HEAD` are cached. Responses with a `5xx` status are never stored.

## Headers

Cached responses carry:

| Header | Value |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT` or `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>`, or `s-maxage=31536000` for `force-static` |

A `Cache-Control` header set by the handler is kept. In `text dev`, segment config applies but nothing is stored, so every request runs the handler.

## Data cache

Cache any async function with `unstable_cache` from `@textjs/next/cache`:

```ts@lib/posts.ts
import { unstable_cache } from "@textjs/next/cache";

export const getPosts = unstable_cache(
  async (author: string) => db.posts.byAuthor(author),
  ["posts"],
  { tags: ["posts"], revalidate: 300 },
);
```

The key is the key parts plus the JSON-encoded arguments. Results are JSON-serialized, so every call returns a fresh copy (and `Date` objects come back as strings). `cache(fn, { key, tags, revalidate })` is the same thing with an options object.

Inside a cached route handler, data entries pass their tags and their shortest `revalidate` up to the route: revalidating `"posts"` also refreshes `/api/posts`. A data call with `revalidate: 0` makes the route dynamic.

## Stale-while-revalidate

Once an entry is older than `revalidate`:

1. The next request receives the stale value immediately (`STALE`).
2. One refresh runs in the background; concurrent requests share it.
3. If the refresh throws, the stale value keeps being served and the error is logged.

On Vercel and Cloudflare, background refreshes are registered with `waitUntil()`. Entries older than a year are always recomputed in the foreground.

## On-demand revalidation

```ts@app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from "@textjs/next/cache";

export async function POST() {
  revalidateTag("posts");
  revalidatePath("/api/feed");
  return Response.json({ revalidated: true });
}
```

| Call | Invalidates |
| :-- | :-- |
| `revalidateTag("posts")` | Everything tagged `posts`; the next request recomputes |
| `revalidateTag("posts", "max")` | Marks it stale; the next request is served stale while it refreshes |
| `revalidatePath("/api/feed")` | That path |
| `revalidatePath("/api/posts/[id]")` | Every path of a dynamic route |
| `revalidatePath("/api", "layout")` | Everything under `/api` |

Both return a promise. With the in-memory store the invalidation is immediate; `await` it when a [custom store](#custom-cache-stores) is asynchronous.

## Custom cache stores

The default store is an in-memory LRU (1,000 entries, about 50 MB) per server instance. To share a cache across instances, point `cacheHandler` at a module that default-exports a `CacheStore`:

```ts@text.config.ts
export default defineConfig({ cacheHandler: "./cache-handler.ts" });
```

```ts@cache-handler.ts
import type { CacheStore } from "@textjs/next/cache";

const store: CacheStore = {
  async get(key) { return redis.get(key).then((v) => (v ? JSON.parse(v) : undefined)); },
  async set(key, entry) { await redis.set(key, JSON.stringify(entry)); },
  async delete(key) { await redis.del(key); },
  async markTags(tags, mode, at) { for (const t of tags) await redis.hset(`tag:${t}`, mode, at); },
  async getTagState(tags) { /* max expiredAt / staleAt across tags */ return { expiredAt: 0, staleAt: 0 }; },
};
export default store;
```

Entries are plain JSON. `setCacheStore(store)` installs a store at runtime instead.

## Platform notes

- Each serverless instance (Vercel functions, Cloudflare isolates) has its own in-memory cache. `Cache-Control: s-maxage` lets the platform CDN cache responses too; on-demand revalidation does not purge a CDN. Use a shared `cacheHandler` when `revalidateTag` must reach every instance.
- Cloudflare requires the `nodejs_compat` flag (the cache uses `AsyncLocalStorage`). See [Deploying](/docs/deploying).
