Turbolog turns each React commit into one `console.log` call — or none.

## Goals

1. **One call per dirty frame.** Never log line by line.
2. **Zero calls when idle.** No allocation, no clear, no log.
3. **Few style arguments.** 149 `%c` spans for the 3,200 cells of a dense `100×32` dashboard.

## Pipeline

```text
React ─▶ Yoga ─▶ CellBuffer ─▶ row-hash gate ─▶ RLE ─▶ console.log
```

## CellBuffer

The frame lives in flat typed arrays — characters, colors and attributes — allocated once.

## Dirty gate

Each row is hashed. If nothing changed, the driver returns early:

```ts
if (frame === null) return SKIPPED; // 0 console calls
console.log(frame.format, ...frame.args);
```

## Frame swap

Frames are appended, not cleared. DevTools removes cleared messages at once but paints new ones on a 50ms throttle, so clearing every frame flashes an empty console. Appended frames swap inside a single paint, and a leading spacer keeps the previous frame out of view. Scroll up to see earlier frames.

Frames are paced to about 15fps. Faster frames reset the DevTools throttle and are dropped.

## Run-length encoding

Matching cells merge into one `%c` span. Spans continue across newlines, and CSS strings are interned.

```js
console.log("%c▼ Text.js%c ready", "color:#ededed;font-weight:700", "color:#45a557");
```

## Chromium details

- Literal `%` is escaped as `%%`.
- URLs and `path:line` text get a word joiner so DevTools won't restyle them.
- Spans use longhand CSS only. DevTools copies every expanded property onto every line.
- Spans are tuned so backgrounds tile without gaps.

## Benchmarks

`packages/core/test/perf.test.ts` on a dense `100×32` dashboard, mean of 1,000 frames (Apple M5 Pro, Bun 1.4.4):

| Frame | Time | `%c` spans |
| :-- | --: | --: |
| Full repaint (layout, paint, encode) | **0.163ms** | 149 |
| One-row edit | **0.011ms** | 149 |
| Idle | **0.000ms** | 0 |

The [Status](/status) page runs the same pipeline in your browser. Run `text.stats()` in DevTools while a demo from the [Playground](/playground) is running.
