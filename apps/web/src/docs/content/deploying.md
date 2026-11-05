`text build` produces a portable `dist/`. An adapter turns it into the output a platform expects.

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

The server adapters (`bun`, `vercel` and `cloudflare`) run the same pipeline as `text start`: [middleware](/docs/middleware), `rewrites`, [route handlers](/docs/route-handlers) with the [route cache](/docs/caching), static assets, then the console document for page URLs. Terminal clients such as curl get the page's first frame as ANSI text instead. On `vercel` and `cloudflare` this covers static pages only (see [curl and terminal clients](/docs/curl)). The server adapters serve hashed files under `/assets/` with `Cache-Control: public, max-age=31536000, immutable`.

## Static

```bash
text build --adapter static
```

Use it for hosts without a server, such as GitHub Pages, S3 or a CDN. `GET` route handlers with `dynamic = "force-static"` or `revalidate` are prerendered into files: `app/api/feed.json/route.ts` becomes `dist/api/feed.json`. A copy of `index.html` is written to `404.html` so deep links open the console app. Static hosts can't tell curl from a browser, so curl gets the HTML page.

The build fails, listing every reason, if the app needs a server: `middleware.ts`, [server-rendered routes](/docs/server-rendering), dynamic route handlers, route handlers with dynamic segments, or non-`GET` methods. Configure `rewrites` on the host instead.

## Bun

```bash
text build --adapter bun
PORT=8080 bun dist/server.js
```

The `bun` adapter writes a single self-contained server that needs no `node_modules` at runtime. It reads `PORT` (default `3000`) and `HOSTNAME` (default `0.0.0.0`), and never serves `server.js` or `.text/`. It is a long-lived process, so it also hosts [server-rendered routes](/docs/server-rendering) (`export const runtime = "server"`) and their live sessions, like `text start`. Use it in a container:

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
| `functions/_middleware.func` | Edge Routing Middleware: `middleware.ts`, and canonical paths for every app |
| `config.json` | Asset headers, middleware matchers, rewrites, handler routes and the console document |

The edge middleware speaks the `x-middleware-next` / `x-middleware-rewrite` protocol, so header overrides and rewrites happen in Vercel's router before the function or CDN is reached. All matchers share one route `src` pattern. Requests no matcher covers skip the middleware unless their path may not be in canonical form (percent-escapes, characters a URL parser encodes, `//`, `.` or `..` segments, a trailing slash). The middleware then matches the canonical path, checks `has` / `missing`, and rewrites the request to that path so Vercel routes it the same way. Apps without `middleware.ts` get the same edge function, which only does the rewrite. Because every build includes an Edge function, deploy from a logged-in Vercel account: anonymous deployments (`vercel deploy --temporary`) don't accept Edge functions.

The handler function is internal. Each handler route passes the matched path to it in the `x-textjs-path` request header. That header is removed from every request before and after middleware, and the edge middleware never forwards one (from the client or from `middleware.ts`), so only the handler routes can set it. Requests for `/_textjs/*` return `404` without running the function, before and after middleware and rewrites. Generated routes match case-sensitively, like the matchers and rewrites on every other host.

The adapter's tests run this output against a local emulation of Vercel's router. Its behavior for `src` matching, `dest` captures, header transforms and `status` routes was checked against real deployments; Edge middleware was not, because it can't be deployed anonymously.

## Cloudflare Pages

```bash
text build --adapter cloudflare
bunx wrangler pages dev dist --compatibility-flags=nodejs_compat
bunx wrangler pages deploy dist
```

The output uses Pages advanced mode:

| File | Purpose |
| :-- | :-- |
| `_worker.js` | Middleware, rewrites, route handlers and the console document. A directory (`index.js` and `yoga.wasm`) when a route handler uses Yoga |
| `_routes.json` | Sends every request to the worker. Without middleware or a `basePath`, `/assets/*` stays on Pages' static CDN |
| `_headers` | Immutable caching for `/assets/*` (appended to yours) |
| `404.html` | Makes Pages answer missing files with `404` instead of the app (kept if you have one) |

`.text/` (server bundles and build manifests) is removed from `dist/`, since Pages publishes the directory as-is.

Enable the `nodejs_compat` compatibility flag in the Pages project (Settings → Runtime) or in `wrangler.toml`; the data cache uses `AsyncLocalStorage`. Static files are served through the `ASSETS` binding, and background revalidation uses `ctx.waitUntil()`.

With middleware, every request runs the worker, including hashed assets, so that middleware sees every path a file can be reached by. Each request that runs the worker is one Functions invocation and counts toward your Workers request quota. For a page load, that's the document plus each file it fetches (3 for a small test app: the document, one JavaScript bundle and `yoga-[hash].wasm`; more for apps with more files). On the Workers Free plan, Pages serves static files without the worker once the daily quota runs out, which skips middleware. If middleware guards anything in `dist/`, set Settings → Runtime → Fail open / closed to **Fail closed**.

```toml@wrangler.toml
name = "my-console"
pages_build_output_dir = "dist"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
```

## WebAssembly

Text.js apps load Yoga, the layout engine, from `assets/yoga-[hash].wasm` (72 kB, 29 kB with gzip). `text build` preloads it from every page. Server bundles and `text run` use the inline copy from `yoga-layout`. The Cloudflare worker is the exception: when a route handler uses Yoga, `dist/_worker.js/` holds `yoga.wasm` next to `index.js`.

- Serve `.wasm` files compressed, as you serve JavaScript. Vercel compresses `application/wasm` by default; nginx needs `application/wasm` in `gzip_types`. If your host compresses JavaScript but not `.wasm`, pages download about 32 kB more than with the inline copy.
- Send `Content-Type: application/wasm`, so the browser compiles the file while it downloads. With another type, it compiles after the download.
- Cache it like the other hashed files in `assets/` (`Cache-Control: public, max-age=31536000, immutable`). That's safe because the name changes with the content. Don't use `immutable` for paths without a hash.
- If you set a Content Security Policy, add `'wasm-unsafe-eval'` to `script-src` and the file's origin (usually `'self'`) to `connect-src`.
- If unknown paths fall back to `index.html`, exclude `/assets/` from that rewrite. Otherwise a missing file returns HTML and `initYoga()` rejects with `TX032`.

### Your own Vite or webpack build

When you bundle `@textjs/core` and `@textjs/react` yourself, Yoga stays inline and needs no bundler setup. Bundles that resolve the `workerd` condition, such as Wrangler, import `@textjs/core/yoga.wasm` as a module instead. To load the `.wasm` file in a browser build, add the `@textjs/client` resolve condition to your client build. In Vite 6, which exports `defaultClientConditions`, the dev pre-bundler needs it too:

```ts@vite.config.ts
import { defaultClientConditions, defineConfig } from "vite";

export default defineConfig({
  resolve: { conditions: ["@textjs/client", ...defaultClientConditions] },
  optimizeDeps: { esbuildOptions: { conditions: ["@textjs/client"] } },
});
```

```js@webpack.config.js
module.exports = {
  resolve: { conditionNames: ["@textjs/client", "..."] },
};
```

The condition also splits the bidi engine into its own chunk, which downloads the first time a page shows right-to-left text (see [Loading the bidi engine](/docs/internationalization#loading-the-bidi-engine)).

Leave the condition out of server, prerender and test builds (Vitest, jsdom), which run fine with the inline copy.

## Upgrading

Security fixes in `@textjs/app` reach a deployment only after you rebuild and redeploy it:

- Vercel: deploy the new `.vercel/output`.
- Cloudflare Pages: deploy the new `dist/`, with `_worker.js` and `_routes.json`.
- Bun: deploy the whole new `dist/` (`server.js`, assets and live bundles) and restart the server.
- `text start`: run `text build` and restart.

Older deployments stay reachable at their own URLs (Vercel and Cloudflare Pages preview URLs, for example). Delete them or put them behind the platform's access protection.

## Server-rendered routes

[Server-rendered routes](/docs/server-rendering) keep a session per open tab, so they need a long-lived server: `text start` or the `bun` adapter. The `static`, `vercel` and `cloudflare` adapters fail the build with `TX030` when a page exports `runtime = "server"`.

## Behind a proxy

`text start` binds to `127.0.0.1` and, while bound to loopback, only answers `localhost`, `*.localhost` and IP-address hosts (DNS-rebinding protection). Other hosts get a `403` with `TX028`. Put the public settings in `text.config.ts`:

```ts@text.config.ts
import { defineConfig } from "@textjs/app";

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
