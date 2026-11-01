---
title: Text.js 1.0
date: 2026-10-31
author: Adam
summary: React 19 and the App Router, rendered into the DevTools console with one console.log per frame. Text.js 1.0 is stable.
---

Today we're releasing Text.js 1.0, the Console Framework for the Web.

```bash
bunx create-text-app@latest
```

Text.js renders React 19 apps inside the Chrome DevTools console, with layouts, routing, focus, input, forms, charts and streaming Markdown drawn with `console.log`.

## What's in 1.0

- **The App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx` and `api/*/route.ts`, synced with `window.location`. It follows the Next.js App Router conventions.
- **Turbolog.** Yoga flexbox lays out a cell grid, a typed-array `CellBuffer` holds it, and a run-length encoder turns it into a single `console.log(format, ...css)` call. Idle frames make zero calls and allocate nothing.
- **A component kit.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, virtualized `List`, `Table`, `Tree`, charts, dialogs, toasts and a `Ctrl+K` command palette from `useKeymap`.
- **Zero-flash frames.** Frames are appended below the previous one, so the console doesn't flash empty between frames. More on that in [Turbolog: eliminating the flash](/blog/turbolog-eliminating-the-flash).
- **Right-to-left text.** Hebrew and Arabic render in order and shaped, from an implementation of UAX #9 that passes all 770,241 `BidiTest.txt` cases. See [Right-to-left text in the console](/blog/right-to-left-text).
- **A responsive console.** Text.js fits the docked DevTools panel, including page zoom and a wrapping toolbar. Undocked, it falls back to `120×36`.
- **`text run`.** The same App Router app renders in a real terminal.
- **Tools for agents and editors.** `text mcp` serves your app to coding agents over the Model Context Protocol, and the Text.js DevTools extension adds a panel next to Console. `eslint-plugin-textjs` and a VS Code extension ship alongside.

## One rename

The framework package is now `@textjs/next`. The name `textjs` was taken on npm. Update your imports:

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

An unchanged frame returns before it allocates a string, so idle frames measure 0.000ms.

## Try it

Open [textjs.org](/) and press ⌘⌥J. The site runs a Text.js app in your console, one view per page. The [Playground](/playground) has a counter, a form, streaming Markdown, a dashboard and Snake. [OpenCode](/opencode) connects to your local OpenCode server.

The full list of changes is in the [changelog](/changelog).
