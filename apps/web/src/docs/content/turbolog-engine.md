Turbolog turns each React commit into one `console.log` call, or none if no cell changed.

## Goals

1. **One call per changed frame.**
2. **Zero calls when idle.** An unchanged frame returns before it builds a string.
3. **Few style arguments.** 149 `%c` spans for the 3,200 cells of a dense `100×32` dashboard.

## Pipeline

```text
React ─▶ Yoga ─▶ CellBuffer ─▶ row-hash gate ─▶ RLE ─▶ console.log
```

## CellBuffer

The frame lives in flat typed arrays for characters, colors and attributes, allocated once.

## Dirty gate

Each row is hashed. If nothing changed, the driver returns early:

```ts
if (frame === null) return SKIPPED; // 0 console calls
console.log(frame.format, ...frame.args);
```

## Frame swap

Turbolog appends frames and clears the console only on the first frame, after `invalidate()`, at idle once 100 frames are stacked, and at 300. DevTools removes cleared messages at once but paints new ones on a 50ms throttle, so clearing every frame flashes an empty console. Appended frames swap inside a single paint, and a zero-width curtain span keeps the previous frame out of view. Scroll up to see earlier frames.

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

## Firefox and Safari

Chromium lays out each line of a `%c` span as an inline block. Firefox and Safari keep spans inline, so they ignore vertical margins and wrap long rows. `CssConsoleDriver` detects the browser with CSS feature checks and, for those two consoles, sets a 14px line height with no margins, turns off wrapping with `text-wrap-mode: nowrap` and pushes earlier frames out of view with a `line-height: 100vh` curtain. Fitting the console leaves room for Firefox's source link column. Safari puts Menlo first in the font stack, because its pages can't use a user-installed SF Mono that Web Inspector may draw with. Pass `browser` to `createConsoleRoot` to pick a console yourself.

## Benchmarks

`packages/core/test/perf.test.ts` on a dense `100×32` dashboard, mean of 1,000 frames (Apple M5 Pro, Bun 1.4.4):

| Frame | Time | `%c` spans |
| :-- | --: | --: |
| Full repaint (layout, paint, encode) | **0.163ms** | 149 |
| One-row edit | **0.011ms** | 149 |
| Idle | **0.000ms** | 0 |

The [Status](/status) page runs the same pipeline in your browser. Run `text.stats()` in DevTools while a demo from the [Playground](/playground) is running.
