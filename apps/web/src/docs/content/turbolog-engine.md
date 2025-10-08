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
console.clear();
console.log(frame.format, ...frame.args);
```

## Run-length encoding

Matching cells merge into one `%c` span. Spans continue across newlines, and CSS strings are interned.

```js
console.log("%c▼ Text.js%c ready", "color:#ededed;font-weight:700", "color:#45a557");
```

## Chromium details

- Literal `%` is escaped as `%%`.
- URLs get a word joiner so DevTools won't restyle them.
- Spans are tuned so backgrounds tile without gaps.

## Benchmarks

`100×32` grid, Chrome, median of 1,000 frames:

| Scenario | Total | `%c` args |
| :-- | --: | --: |
| Idle | **0.08ms** | 0 |
| Counter | **0.18ms** | 41 |
| Dashboard | **0.32ms** | 88 |
| Full repaint | **0.57ms** | 92 |

Run `text.stats()` in DevTools, or open the RLE Inspector in the [Playground](/playground).
