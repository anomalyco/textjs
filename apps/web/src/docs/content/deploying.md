Ship the console anywhere. `text build` produces a portable `dist/`; an adapter turns it into the exact output a platform expects.

## Adapters

```bash
text build --adapter <name>
```

| Adapter | Output | Runs |
| :-- | :-- | :-- |
| *(none)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | Any static host |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

The adapter can also come from `TEXTJS_ADAPTER`. When `text build` runs on Vercel (`VERCEL=1`) or Cloudflare Pages (`CF_PAGES=1`), the matching adapter is selected automatically.

Every adapter runs the same pipeline as `text start`: [middleware](/docs/middleware), `rewrites`, [route handlers](/docs/route-handlers) with the [route cache](/docs/caching), static assets, then the console document for page URLs. The server adapters serve hashed files under `/assets/` with `Cache-Control: public, max-age=31536000, immutable`.

## Static

```bash
text build --adapter static
```

For hosts without a server (GitHub Pages, S3, any CDN). `GET` route handlers with `dynamic = "force-static"` or `revalidate` are prerendered into files: `app/api/feed.json/route.ts` becomes `dist/api/feed.json`. A copy of `index.html` is written to `404.html` so deep links open the console app.

The build fails, listing every reason, if the app needs a server: `middleware.ts`, [server-rendered routes](/docs/server-rendering), dynamic route handlers, dynamic segments or non-`GET` methods. Configure `rewrites` on the host instead.

## Bun

```bash
text build --adapter bun
PORT=8080 bun dist/server.js
```

A single self-contained server with no `node_modules` needed at runtime. It reads `PORT` (default `3000`) and `HOSTNAME` (default `0.0.0.0`), and never serves `server.js` or `.text/`. It is a long-lived process, so it also hosts [server-rendered routes](/docs/server-rendering) (`export const runtime = "server"`) and their live sessions, like `text start`. Use it in a container:

```text@Dockerfile
FROM oven/bun:1
COPY dist /app
CMD ["bun", "/app/server.js"]
```

## Vercel

```bash
text build --adapter vercel
vercel deploy --prebuilt
```

Or push to a Git repository connected to Vercel: the build runs `text build`, detects Vercel and writes `.vercel/output`.

| Output | Contents |
| :-- | :-- |
| `static/` | The client build (under `basePath`) |
| `functions/_textjs/server.func` | One Node.js 22 function serving every route handler, with streaming |
| `functions/_middleware.func` | `middleware.ts` as Edge Routing Middleware |
| `config.json` | Asset headers, middleware matchers, rewrites, handler routes and the console document |

The edge middleware speaks the `x-middleware-next` / `x-middleware-rewrite` protocol, so header overrides and rewrites happen in Vercel's router before the function or CDN is reached. Matchers become route `src` patterns (with `has` / `missing`), so unmatched requests never invoke the middleware. The handler function is internal: requests for `/_textjs/*` return `404`, and requests carrying the internal `__textjs_path` parameter return `400`, so it is only reachable through the routes the adapter writes.

## Cloudflare Pages

```bash
text build --adapter cloudflare
bunx wrangler pages dev dist --compatibility-flags=nodejs_compat
bunx wrangler pages deploy dist
```

The output uses Pages advanced mode:

| File | Purpose |
| :-- | :-- |
| `_worker.js` | Middleware, rewrites, route handlers and the console document |
| `_routes.json` | Keeps `/assets/*` on Pages' static CDN (unless your matcher covers it, or the app has a `basePath`) |
| `_headers` | Immutable caching for `/assets/*` (appended to yours) |
| `404.html` | Makes Pages answer missing files with `404` instead of the app (kept if you have one) |

`.text/` (server bundles and build manifests) is removed from `dist/`, since Pages publishes the directory as-is.

Enable the `nodejs_compat` compatibility flag in the Pages project (Settings → Runtime) or in `wrangler.toml`; the data cache uses `AsyncLocalStorage`. Static files are served through the `ASSETS` binding, and background revalidation uses `ctx.waitUntil()`.

```toml@wrangler.toml
name = "my-console"
pages_build_output_dir = "dist"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
```

## Server-rendered routes

[Server-rendered routes](/docs/server-rendering) keep a session per open tab, so they need a long-lived server: `text start` or the `bun` adapter. The `static`, `vercel` and `cloudflare` adapters fail the build with `TX030` when a page exports `runtime = "server"`.

## Behind a proxy

`text start` binds to `127.0.0.1` and, while bound to loopback, only answers `localhost`, `*.localhost` and IP-address hosts (DNS-rebinding protection). Put the public settings in `text.config.ts`:

```ts@text.config.ts
import { defineConfig } from "@textjs/next";

export default defineConfig({
  server: {
    origin: "https://console.example.com", // request.url always uses it (or TEXTJS_ORIGIN)
    trustProxy: true, // read X-Forwarded-Host / -Proto from your proxy (or TRUST_PROXY=1)
    allowedHosts: [".example.com"],
  },
});
```

Without `origin` or `trustProxy`, `request.url` is built from the validated `Host` header over `http`.

## Caveats

- `proxy` in `text.config.ts` only runs in `text dev` and `text start`; adapters don't include it. Use `rewrites`, which every server adapter supports.
- Serverless instances each have their own in-memory cache. See [Caching](/docs/caching#platform-notes).
- `rewrites` that use raw regular-expression groups translate to Vercel routes on a best-effort basis; named parameters (`:slug`, `:path*`) are exact.
