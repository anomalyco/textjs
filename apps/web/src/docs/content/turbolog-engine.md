Turbolog turns each React commit into one `console.log` call — or none.

## Goals

1. **One call per dirty frame.** Never log line by line.
2. **Zero calls when idle.** No allocation, no clear, no log.
3. **Few style arguments.** Under 100 `%c` spans for 3,200 cells.

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

`100×32` grid, Chrome, median of 1,000 frames:

| Scenario | Total | `%c` args |
| :-- | --: | --: |
| Idle | **0.08ms** | 0 |
| Counter | **0.18ms** | 41 |
| Dashboard | **0.32ms** | 88 |
| Full repaint | **0.57ms** | 92 |

Run `text.stats()` in DevTools while a demo from the [Playground](/playground) is running.
