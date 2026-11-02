---
title: Server rendering in the console
date: 2026-06-16
author: Adam
summary: Text.js 0.4 can render a page on the server and stream its frames to the console as cell deltas. Static routes also prerender their first frame into the HTML.
---

Text.js 0.4 added a second place for a page to render. By default, a page's React tree runs in the browser tab. A page that exports `runtime = "server"` runs on the server instead, and the browser receives its frames.

```tsx@app/status/page.tsx
import { Suspense, type ReactNode } from "react";
import os from "node:os";
import { Box, Text } from "textjs";

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

`Load` is an `async function` component. On the server it suspends to the nearest `<Suspense>` or `loading.tsx` until its promise resolves, and it can read files, databases and `node:*` modules directly. Async components load data and can't use hooks. The regular components around them keep hooks, focus, `useInput`, `<Link>` and `useRouter()`, which behave the same in both runtimes.

## What the browser downloads

A server-rendered page doesn't ship React, Yoga or your routes. The browser loads a frame player of about 21 kB gzip, which holds a `CellBuffer` and the same `CssConsoleDriver` the client renderer uses. It paces frames at the same 15fps, so a server-rendered frame produces the same `console.log` call as the client would.

## The protocol

Each tab opens its own session on the server: a React root, an in-memory router history and a cell buffer. One endpoint carries both directions:

```text
browser tab ──(GET /__textjs/live, server-sent events)──▶ frame deltas
browser tab ──(POST /__textjs/live, JSON)──────────────▶ keys, paste, wheel, resize, focus, Back/Forward
```

The server sends only the rows whose hash changed since the last frame that connection received. Each row goes out as runs of text against an append-only style table. Wide graphemes, emoji clusters and translucent colors arrive intact.

Frames are at least 66ms apart, and each one is diffed against what the socket last accepted. When a slow connection stops draining, intermediate states are skipped, and the next frame jumps to the latest state.

If the stream drops, the player reconnects with its session id in the `x-textjs-live` header and resumes the same session from a fresh keyframe, with its state intact. Session ids are 192-bit random values kept in memory, never in the URL. A session with no connection stops rendering and is unmounted after 30 seconds.

Both endpoints reject cross-site requests, and every input event is validated against a fixed schema. A session accepts at most 64 events per POST and about 240 per second.

## Async components and data

Each async component's promise is cached per session, keyed by the component and its props, so a render that retries reuses the request already in flight. The cache is cleared when the route changes and when you call `router.refresh()`:

```tsx
const router = useRouter();
useInput((e) => e.input === "r" && router.refresh());
```

Server-only modules are named `*.server.ts`. The build fails if code that ships to the browser imports one, or imports a `node:*` built-in, and it names the importer.

## Partial Prerendering

Partial Prerendering works without a server. `text build` now renders every static route once and inlines its first frame into the route's HTML as a small classic `<script>`, so the console paints before any module loads.

The shell is everything that renders synchronously. A `<Suspense>` boundary that is still waiting shows its fallback, async components included, and `fetch()` never resolves while the shell renders.

When JavaScript boots, the client renderer or the frame player streams the real frame. Because 0.4 also appends frames instead of clearing, the hydrating renderer starts with `initialClear: false` and logs below the shell, and its curtain moves the shell out of view in the same DevTools paint. The console is cleared exactly once, by the shell.

```text
 ✓ Prerendering console shells (5/5) · 1 server-rendered, frame player 56.5 kB (21.3 kB gzip)
```

The shell is rendered at the configured `viewport` size, `100 × 32` by default, because the build can't know the visitor's console size. With `viewport.responsive` on, the first live frame resizes to the docked console. Dynamic routes render no shell, and `ppr: false` in `text.config.ts` turns prerendering off.

## Choosing a runtime

The client runtime stays the default. Keystrokes paint in the same task, and the app deploys to any static host. The server runtime fits dashboards and admin views that read private data, and routes whose dependencies you don't want in the browser bundle. One app can mix both, and navigating between them loads the target URL as a new document.

The full reference is in [Server rendering](/docs/server-rendering).
