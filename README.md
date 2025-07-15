<div align="center">

# ▼ Text.js

**The Console Framework for the Web.**

React 19 App Router applications, rendered entirely inside `console.log`.

[textjs.org](https://textjs.org) · [Docs](https://textjs.org/docs) · [Playground](https://textjs.org/playground) · [OpenCode in the Console](https://textjs.org/opencode)

<img src="apps/web/public/og.png" alt="▼ TEXT.JS — The Console Framework for the Web" width="720" />

</div>

---

Text.js is a full-stack React framework with file-system routing, layouts, loading states, error boundaries, route handlers, Fast Refresh and a production build. It is the framework you already know, with one architectural difference: the DOM has been removed.

Every frame of your application is laid out with Yoga, rasterized into a cell buffer, run-length encoded into `%c` CSS spans and written to the browser's DevTools Console in exactly one `console.log` call. The page itself is intentionally empty. Your users will need to press `⌘⌥J`.

This is not a recommendation. It is a framework.

## Quickstart

```bash
bunx create-text-app@latest
cd my-app
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000), press **⌘⌥J** (macOS) or **Ctrl+Shift+J** (Windows / Linux), then click back into the page so it captures the keyboard. The `text` and `create-text-app` CLIs run on Bun or Node.js 20.11+.

```text
   ▼ Text.js 0.2.0 (Turbolog)
   - Local:        http://localhost:3000

 ✓ Starting...
 ✓ Ready in 412ms

 ○ Open DevTools Console (⌘⌥J) to view your app
```

## A page

```tsx
// app/page.tsx
"use client";

import { useState } from "react";
import { Badge, Box, Text, useInput } from "textjs";
import Link from "textjs/link";

export const metadata = { title: "Deployments" };

export default function Page() {
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });

  return (
    <Box className="flex-col border rounded p-1 gap-1">
      <Box className="flex-row gap-1">
        <Text bold>▼ acme/storefront</Text>
        <Badge variant="success">READY</Badge>
      </Box>
      <Text color="muted">{`${count} deployments (↑/↓ to adjust, which is not how deployments work)`}</Text>
      <Link href="/logs" shortcut="l">View logs</Link>
    </Box>
  );
}
```

That's a real page. It has a route, metadata, state, keyboard input and a link. None of it is in the DOM.

## Architecture

```text
 React 19 ──▶ Reconciler ──▶ SceneNode tree ──▶ Yoga WASM ──▶ CellBuffer ──▶ Row gate ──▶ RLE %c ──▶ console.log
 (your app)   (tx-box,       (props, styles,    (Flexbox      (Uint32Array   (per-row     (merged     (1× per
              tx-text)        className)          layout)       fg/bg/attrs)   hashes)      spans)      dirty frame)
```

- **One `console.log` per dirty frame.** `console.clear()` followed by a single call with every row joined by `\n`. Never line by line.
- **Zero-noop gate.** Per-row hashes compare the back buffer to the last committed frame. If nothing changed, nothing is allocated, cleared or logged. An idle app costs zero.
- **Row-level RLE.** Only dirty rows are re-encoded; identical styles merge across line breaks, so a 100×32 dashboard ships ~200 `%c` arguments instead of 3,200. CSS strings are interned.
- **Chromium defenses.** Literal `%` is escaped as `%%`, URLs get a word joiner after `://` so the auto-linkifier can't restyle them, and blinking cursors freeze when the page loses focus so you can select and copy console text.
- **Inverted Architecture™.** Traditional frameworks render up into the DOM (`▲`). Text.js streams frames down into the DevTools drawer (`▼`).

The full specification lives in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Benchmarks

Measured by [`packages/core/test/perf.test.ts`](packages/core/test/perf.test.ts): a 100×32 dashboard (46 text nodes, 53 Yoga nodes), 1,000 iterations, Bun 1.4.4 on Apple Silicon (arm64). Run them yourself with `bun test packages/core/test/perf.test.ts`.

| Frame                                             | Mean     | p50      | p95      | `console.log` calls |
| ------------------------------------------------- | -------- | -------- | -------- | ------------------- |
| Full frame (layout + paint + RLE, 205 `%c` spans) | 0.174 ms | 0.169 ms | 0.196 ms | 1                   |
| Cold relayout + resize + full encode              | 0.139 ms | 0.135 ms | 0.152 ms | 1                   |
| 1-row partial edit (1 dirty row)                  | 0.057 ms | 0.055 ms | 0.063 ms | 1                   |
| Idle frame (gated)                                | 0.039 ms | 0.038 ms | 0.043 ms | **0**               |

Text.js renders a frame roughly 95× faster than a 60 Hz display can show it. DevTools then takes considerably longer to draw it. We consider this a DevTools problem.

## Workspace

| Path                                                     | Package               | Description                                                                                                       |
| -------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [`packages/core`](packages/core)                         | `@textjs/core`        | `CellBuffer`, text measurement, Yoga layout, the Turbolog `%c` driver, ANSI driver, input engine, viewport + `window.text` REPL |
| [`packages/react`](packages/react)                       | `@textjs/react`       | React 19 reconciler, `className` cell utilities, themes, the TUI component kit, hooks and DOM mirrors             |
| [`packages/text`](packages/text)                         | `textjs`              | The framework: `app/` router, `text dev` / `build` / `start`, route handlers, in-console DevTools and Redbox      |
| [`packages/create-text-app`](packages/create-text-app)   | `create-text-app`     | Project generator with `starter`, `dashboard` and `opencode` templates                                            |
| [`apps/web`](apps/web)                                   | `@textjs/web`         | [textjs.org](https://textjs.org): landing page, docs, playground and a live companion app running in your console |
| [`apps/opencode-console`](apps/opencode-console)         | `@textjs/opencode-console` | OpenCode Lite: a connected OpenCode client rendered in `console.log`                                         |
| [`examples/dashboard`](examples/dashboard)               | `@textjs/example-dashboard` | An App Router dashboard with dynamic routes and API handlers                                                |

## OpenCode in the Console

`apps/opencode-console` is a working [OpenCode](https://opencode.ai) client: sessions, streaming reasoning, tool calls, an agent switcher, a model picker and a command palette, all at 112×34 cells.

1. Start an OpenCode server. Either run the background service:

   ```bash
   opencode service start
   ```

   or a foreground server on the default port:

   ```bash
   opencode serve --port 4096
   ```

2. Start the console app:

   ```bash
   bun install
   bun run dev:opencode   # text dev --port 3001
   ```

3. Open [http://localhost:3001](http://localhost:3001) and press **⌘⌥J**.

The dev server mounts a `/__opencode/*` proxy that discovers the daemon with `opencode service status`, then `$OPENCODE_SERVER_URL`, then `http://127.0.0.1:4096`. The service password stays in the dev server's memory and never reaches the browser. To use a different server, open `/connect` or pass `?server=http://127.0.0.1:4096` (loopback hosts only). With no server available, the app falls back to an interactive demo backend.

The proxy only answers loopback `Host` headers, rejects cross-site requests, requires `x-opencode-client: 1` on writes and caps request bodies at 4 MB. Your console is already a security boundary; we saw no reason to weaken it.

## Development

```bash
bun install
bun test packages/ apps/opencode-console/ apps/web/   # unit, integration and perf tests
bun run typecheck                                      # packages
bun run build                                          # packages (incl. Node CLI bundles) and apps
bun run dev:web                                        # textjs.org on :3000
bun run dev:dashboard                                  # examples/dashboard on :3000
```

`text start` binds to `127.0.0.1` by default. Pass `--host` to listen on every interface, if you must share your console.

## License

MIT
