Render a route's React tree on the server and stream its frames to the console. Prerender every static route's first frame into its HTML.

## Two runtimes

Every page renders in one of two places:

| | Client (default) | Server (`runtime = "server"`) |
| --- | --- | --- |
| React tree runs in | The browser tab | `text dev` / `text start` / the `bun` adapter (Bun or Node) |
| Browser downloads | The full app: React, Yoga WASM, your routes | The frame player, about 19 kB gzip |
| Data access | `fetch()` to route handlers | Directly: databases, files, `node:*`, secrets |
| Async components | Use `use()` or effects | `async function` components just work |
| Keystroke latency | Same task, synchronous | One round trip to the server |
| Works on a static host | Yes | No, it needs `text start` or `bun dist/server.js` |

Both runtimes produce the same frames. The frame player encodes cells with the same `CssConsoleDriver` and paces at the same ~15fps, so a server-rendered frame matches the client's `console.log` call byte for byte.

## Opting in

Export `runtime` from a page:

```tsx@app/status/page.tsx
import { Suspense, type ReactNode } from "react";
import os from "node:os";
import { Box, Text } from "@textjs/next";

export const runtime = "server";

async function Load(): Promise<ReactNode> {
  const [one, five] = os.loadavg();
  return <Text>{`load ${one.toFixed(2)} ${five.toFixed(2)}`}</Text>;
}

export default function StatusPage(): ReactNode {
  return (
    <Box flexDirection="column">
      <Text bold>Status</Text>
      <Suspense fallback={<Text color="gray">Reading host…</Text>}>
        <Load />
      </Suspense>
    </Box>
  );
}
```

`runtime` is read per page, as a static string export (a type annotation, `as const` or a re-export are fine; a computed value is not). Layouts, `loading.tsx`, `error.tsx` and `not-found.tsx` render wherever their page renders: a layout shared by client and server pages runs in both places and ships to the browser, while the layouts and boundaries of a segment that only contains server pages stay on the server. Hooks, focus, `useInput`, `<Link>` and `useRouter()` behave the same as on the client.

## When to use which

Use the **client** runtime (the default) for:

- Typing-heavy UI where every keystroke must paint in the same task, like editors and filters.
- Apps that deploy to a static host or a CDN.
- Offline-capable tools.

Use the **server** runtime for:

- Dashboards and admin views that read databases, files, queues or private APIs. Credentials stay on the server.
- Routes with heavy dependencies (SDKs, parsers, syntax tables) that you don't want in the browser bundle.
- Pages that should load fast on slow networks. The browser downloads the 19 kB player instead of the full app.

You can mix runtimes in one app. Navigating between them loads the target URL as a new document. The browser bundle replaces each server page with a stub, so server modules and anything they import never ship to the client.

Name server-only modules `*.server.ts`. The build fails if code that ships to the browser (a client page, or a layout a client page uses) imports a `*.server.*` module or a `node:*` built-in, naming the importer.

[Middleware](/docs/middleware) guards server routes the same way it guards documents: it runs for the target route before a session opens, before every in-session navigation (`router.push`, Back and Forward), and again whenever the session's cookies or `Authorization` change. When it would redirect, reject or rewrite, the browser loads the URL as a document instead, and middleware answers that request.

## Async server components

On the server, any `async function` component suspends to the nearest `<Suspense>` or `loading.tsx` until its promise resolves:

```tsx@app/deployments/live/page.tsx
export const runtime = "server";

async function Deployments({ team }: { team: string }) {
  const rows = await db.deployments.list({ team });
  return <Table data={rows} columns={COLUMNS} />;
}
```

Each promise is cached per session and keyed by component and props, so a retried render reuses the request already in flight. The cache is cleared when the route changes and on `router.refresh()`. That's how you re-run data access after input:

```tsx
const router = useRouter();
useInput((e) => e.input === "r" && router.refresh());
```

Props passed to async components should be serializable: strings, numbers, plain objects, arrays, `Date`, `URL`, `Map`, `Set` and elements. Function props are not part of the key (pass data, not callbacks). Each session caches at most 256 promises. You can also wrap a component by hand with `serverComponent(fn)` from `@textjs/next/server-components`.

Async components are data loaders, not stateful components: hooks (`useState`, `useInput`, …) don't work inside an `async function`. Render a regular component around or below it for interaction.

## How it works

```
browser tab ──(GET /__textjs/live, server-sent events)──▶ frame deltas
browser tab ──(POST /__textjs/live, JSON)──────────────▶ keys, paste, wheel, resize, focus, Back/Forward
```

- **One session per tab.** Each page load opens its own session: a React root, an in-memory router history and a cell buffer on the server. Session ids are 192-bit random values that the browser keeps in memory only.
- **Cell deltas.** The server sends only rows whose hash changed since the last frame that connection received. Each row is sent as runs of text against an append-only style table, and wide graphemes, emoji clusters and translucent colors survive exactly.
- **Backpressure.** Frames are at least 66ms apart, and each is diffed against what the socket last accepted. When a slow connection stops draining, intermediate states are skipped, and the next frame jumps straight to the latest one.
- **Reconnects.** If the stream drops, the player reconnects with its session id in the `x-textjs-live` header (never in the URL) and resumes the same session, with its state intact, from a fresh keyframe. Missed address-bar updates are replayed. A session with no connection stops rendering and is unmounted after 30 seconds; if the server forgot it, the player opens a new one.
- **History.** Back and Forward move both histories by the same number of entries, and `router.back()` on the server moves the browser's history too.
- **Security.** Both endpoints reject cross-site requests (`Sec-Fetch-Site` and `Origin`; `X-Forwarded-Host` only counts with `server.trustProxy`). Input POSTs need a JSON body and the `x-textjs-live` header. Every event is validated against a fixed schema, and navigation targets must be paths on your origin. Only pages in your `app/` manifest can be rendered. Sessions are bound to the cookies they were opened with.
- **Limits.** At most 64 events per POST and about 240 per second per session (`429` beyond), a 5-second body timeout, 32 sessions per client address, and `maxSessions` per process (the longest-disconnected session is evicted first).

```ts@text.config.ts
export default defineConfig({
  live: { maxSessions: 512, reconnectGraceMs: 60_000 },
});
```

## Partial Prerendering

`text build` renders every static route once, at the configured `viewport` size, and inlines that first frame into the route's HTML as a small classic `<script>`. The console paints before any module loads:

1. **The static shell.** Everything that renders synchronously. Every `<Suspense>` boundary that is still waiting shows its fallback, including async server components, `use()` and lazy modules. `fetch()` never resolves while the shell renders, so data loaded in effects stays in its loading state too.
2. **The dynamic holes.** When JavaScript boots, either the client renderer or the frame player streams the real frame. It is appended below the shell, and the hydrating frame's own curtain moves the shell out of view in the same DevTools paint. The shell records when it painted, so the first hydrating frame waits out DevTools' post-clear window instead of landing on its slow path.

The console is cleared exactly once, by the shell. The hydrating renderer starts in append mode (`initialClear: false`), so nothing flashes, and the shell only paints on the path it was rendered for. Dynamic routes (`[id]`, `force-dynamic`) render no shell.

```
 ✓ Prerendering console shells (5/5) · 1 server-rendered, frame player 50.4 kB (19.2 kB gzip)
```

Turn it off with `ppr: false` in `text.config.ts`. Prerendering runs your components at build time, so keep top-level module code free of browser-only globals. A route that throws, calls `redirect()` / `notFound()` or navigates while prerendering gets no shell (an error screen is never baked into HTML), and the build tells you why.

The shell is rendered at `viewport.width × viewport.height` (default `120 × 36`) because the build can't know the visitor's console size; the hydrating frame then resizes to the real console. The shell is an inline `<script>`: with a Content Security Policy that forbids inline scripts, either allow it by hash or set `ppr: false`.

## Deploying

`text build` writes the following files:

| File | Purpose |
| --- | --- |
| `index.html`, `<route>/index.html` | Client routes with their shells. Works on any static host. |
| `assets/player-[hash].js` | The frame player. |
| `.text/server/live.mjs` | Server routes, the App Router and the console renderer. |
| `.text/pages/…`, `.text/live.html` | Server-route documents. |

`text start` and the [`bun` adapter](/docs/deploying#bun) serve all of them. Server routes need a long-lived process: the `static`, `vercel` and `cloudflare` adapters fail the build ([TX030](/errors/TX030)).
