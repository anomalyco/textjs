---
title: Text.js 1.0
date: 2026-10-31
author: Adam
summary: React 19, the App Router and a 3,200-cell framebuffer, rendered in one console.log per frame. Text.js is stable.
---

Today we're releasing Text.js 1.0, the Console Framework for the Web.

```bash
bunx create-text-app@latest
```

Text.js renders React 19 apps inside the Chrome DevTools console. Not a log viewer, not a REPL: layouts, routing, focus, input, forms, charts and streaming Markdown, drawn into `console.log`. The page your users visit can stay empty. The product is one keyboard shortcut away.

## What's in 1.0

- **The App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx` and `api/*/route.ts`, synced with `window.location`. If you have used a file-system router before, you already know this one.
- **Turbolog.** Yoga flexbox lays out a cell grid, a typed-array `CellBuffer` holds it, and a run-length encoder turns it into a single `console.log(format, ...css)` call. Idle frames make zero calls and allocate nothing.
- **A component kit.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, virtualized `List`, `Table`, `Tree`, charts, dialogs, toasts and a `Ctrl+K` command palette from `useKeymap`.
- **Zero-flash frames.** Frames are appended, not cleared. More on that in [Turbolog: eliminating the flash](/blog/turbolog-eliminating-the-flash).
- **A responsive console.** Text.js fits the docked DevTools panel, including page zoom and a wrapping toolbar. Undocked, it falls back to `120×36`.
- **`text run`.** The same App Router app renders in a real terminal.

## One rename

The framework package is now `@textjs/next`. The name `textjs` was taken on npm. Imports change, nothing else does:

```diff
- import { Box, Text } from "textjs";
+ import { Box, Text } from "@textjs/next";
```

## Numbers

On a dense `100×32` dashboard (46 text nodes, 149 `%c` spans), measured with `packages/core/test/perf.test.ts`:

| Frame | Mean |
| :-- | --: |
| Full repaint (layout, paint, encode) | 0.163ms |
| One-row edit (typing) | 0.011ms |
| Idle | 0.000ms, 0 console calls |

The idle number is not rounded down. An unchanged frame returns before it allocates a string.

## Try it

Open [textjs.org](/) and press ⌘⌥J. The site runs a Text.js app in your console, one view per page. The [Playground](/playground) has a counter, a form, streaming Markdown, a dashboard and Snake. [OpenCode](/opencode) connects to your local OpenCode server.

The full list of changes is in the [changelog](/changelog).
