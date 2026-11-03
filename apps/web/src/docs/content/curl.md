Terminal HTTP clients get a page's first frame as truecolor ANSI text instead of the HTML document. You don't need to configure anything.

```bash
curl https://my-app.example.com/about
```

## Which requests get a frame

A request gets a frame when all of these hold:

- the method is `GET` or `HEAD`;
- the `User-Agent` starts with `curl/`, `Wget/`, `wget2/`, `HTTPie/` or `xh/`;
- the `Accept` header is missing or doesn't mention `text/html`.

Browsers, crawlers and link previews get the HTML page. To get the HTML from curl, ask for it:

```bash
curl -H 'Accept: text/html' https://my-app.example.com/about
```

The frame is chosen at the point where the page would be served: after [middleware](/docs/middleware), `rewrites` and [route handlers](/docs/route-handlers), and never for files or paths whose last segment contains a dot. Middleware redirects, `401`s, headers and rewrites apply to curl as they do to browsers. `/api/health` still runs its handler and `/robots.txt` still serves the file.

## What's in the frame

The frame is the page's first render, as in a [prerendered shell](/docs/server-rendering#partial-prerendering): every `<Suspense>` boundary that is still waiting shows its fallback. Async server components don't run, and `fetch()` never resolves, so data loaded in effects stays in its loading state.

- **Size:** 80 × 24 cells. An app with a fixed viewport (`viewport.responsive: false`) uses `viewport.width × viewport.height` instead.
- **Colors:** 24-bit SGR escape codes in the app's `viewport.theme`. Every row ends with a reset, and the frame ends with a newline.
- **Status:** `200`, or `404` with the app's not-found page when no page matches or the page calls `notFound()`. A page that calls `redirect()` while rendering serves HTML.

Responses are `text/plain; charset=utf-8` with `Vary: User-Agent, Accept` and `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, so shared caches never store a frame and serve it to a browser. The HTML page at a path where curl gets a frame carries the same `Vary` header.

## Where it works

| Host | Static pages | Dynamic pages, unknown paths |
| :-- | :-- | :-- |
| `text dev` | Rendered on request | Rendered on request |
| `text start`, `bun` | Prerendered by `text build` | Rendered on request |
| `vercel`, `cloudflare` | Prerendered by `text build` | HTML page |
| `static` | HTML page | HTML page |

Server-rendered pages need `text start` or `bun` (see [Deploying](/docs/deploying#server-rendered-routes)).

Static hosts can't answer one client differently from another, so the `static` adapter doesn't support frames. On Vercel and Cloudflare, frames for static pages ship with the build. Dynamic pages (`[id]`, `force-dynamic`) serve HTML there, because the `vercel` and `cloudflare` adapters don't deploy a renderer.

`text start` and `bun dist/server.js` render the remaining pages on request with `.text/server/live.mjs`, and keep the last 128 frames for 10 seconds. Each server renders at most 20 uncached pages per 10 seconds. Past that, curl gets the HTML page until the budget refills. If `live.mjs` can't be loaded on the server, for example because a page module reads `window` at the top level, those pages serve HTML.

`text build` reports the prerendered frames:

```
 ✓ Prerendering curl frames (5/5)
```

## Configuration

Change the size for the whole app, or turn frames off:

```ts@text.config.ts
import { defineConfig } from "@textjs/app";

export default defineConfig({
  ansi: { cols: 100, rows: 30 },
  // ansi: false,
});
```

A page can change its own size, or serve HTML to terminals too:

```tsx@app/dashboard/page.tsx
export const ansi = { cols: 120, rows: 40 };
// export const ansi = false;
```

Sizes are clamped to 1–500 cells. With `ansi: false` in `text.config.ts`, page exports are ignored.

## Plain HTTP

curl doesn't follow redirects unless you pass `-L`. Vercel redirects `http://` requests to `https://`, and so does Cloudflare with **Always Use HTTPS** on, so `curl http://…` prints the redirect instead of the frame. Share `https://` URLs.

## Custom servers

`@textjs/app/ansi` exports the detection and response helpers, for servers and functions that don't run `text start` or an adapter:

```ts
import { ansiResponse, wantsAnsi } from "@textjs/app/ansi";
import { frameToAnsi } from "@textjs/react";

if (wantsAnsi(request)) return ansiResponse(frameToAnsi(buffer, { theme: "geistDark" }), request.method);
```

`wantsAnsi(request)` also accepts `(method, headers)` with Web `Headers` or Node's `IncomingHttpHeaders`. `frameToAnsi(buffer, { theme })` encodes a rendered `CellBuffer` the same way the framework does.
