---
title: The Inverted Architecture
date: 2026-10-31
author: Adam
summary: Most frameworks render up into the DOM. Text.js renders down into the console. Here is the full path from a React commit to a console.log call.
---

Our logo is `▼`. It points down because that is where the pixels go.

Frameworks render up: components become DOM nodes, and the browser lays out and paints them in the page. Text.js renders down: components become cells, and the cells become one `console.log` call in DevTools. We call this the Inverted Architecture. The page is a host. The console is the product.

## The pipeline

```text
React ─▶ reconciler ─▶ Yoga ─▶ CellBuffer ─▶ row-hash gate ─▶ RLE ─▶ console.log
```

Each stage exists because the console is a strange display: monospace, row-oriented, styled with `%c` and refreshed on DevTools' schedule, not ours.

## Reconciler

`@textjs/react` is a React 19 reconciler (`react-reconciler@0.34.0`) with two host elements, `tx-box` and `tx-text`, plus text instances for string children. Everything you import, from `<Box>` to `<Markdown>`, is built on those. Commits are scheduled on `requestAnimationFrame`, and a keypress or paste renders synchronously in the same task.

## Layout

Yoga, compiled to WebAssembly, lays out the tree with `pointScaleFactor = 1`, so every box lands on a whole cell. Text is measured with `Intl.Segmenter` and East Asian width tables, so `你好` takes four cells and `🚀` takes two. If an edit can't change a text node's size, Yoga isn't asked again.

## CellBuffer

The frame is a grid of typed arrays allocated once: characters in a `Uint32Array`, foreground and background as packed `0xRRGGBBAA`, attributes as a `Uint16Array` bitmask. Painting writes into those arrays and tracks which rows it touched.

## The gate

Each row has a cached 32-bit FNV-1a hash. Only rows written since the last frame are re-hashed. If no row changed, the driver returns before it builds a string: no `console.clear()`, no `console.log()`, no allocation. A spinner on a hidden tab costs nothing because it isn't ticking.

## Run-length encoding

Changed rows are re-scanned into runs of identical style, and each run becomes one `%c` span. Runs continue across line breaks. CSS strings are interned behind integer style ids, so the hot path never builds the same string twice. A 100×32 dashboard is 3,200 cells and 149 spans.

The format string defends against Chromium itself. A literal `%` is written as `%%`. A word joiner goes after `://`, inside `www.` and in `path:line`, so DevTools doesn't turn your text into a link and repaint it in its own colors.

## One call

The result is a single call per dirty frame:

```js
console.log("%c\u200b%c\n%c▼ OpenCode Lite%c …", "margin-top:100vh;", "", "color:#fafafa;…", …);
```

Frames are appended, paced to DevTools' 50ms throttler and swapped inside one paint. [Turbolog: eliminating the flash](/blog/turbolog-eliminating-the-flash) covers that part.

## Input

The console can't receive keystrokes, so the page does. A hidden `<textarea>` collects keys, paste and IME composition, and `wheel` events scroll `ScrollBox`es. On textjs.org the Playground and OpenCode pages are one large focus pad: open the console, click the page, type.

## What the page sees

Very little. The page can't read the console's size, only its own window, so Text.js infers it: a docked panel shrinks `innerWidth` or `innerHeight` while `outer*` stays put, and each dock hypothesis is solved for Chrome's zoom levels. The best fit wins. The constants (56px of horizontal padding, 104px of console chrome, a 14px row pitch) were measured in the real DevTools frontend.

That's the architecture. Inverted, measured, and one `console.log` deep.
