Turbolog is the rendering engine behind Text.js. It turns a React commit into exactly one `console.log` call — or zero, when nothing changed. This page documents its design, the Chromium internals it targets, and its performance characteristics.

## Design goals

1. **One call per dirty frame.** Never log line-by-line. Per-line logging creates DevTools row borders, `(2)` repeat badges and ~30× more CDP IPC traffic.
2. **Zero calls per clean frame.** An idle application must cost nothing: no string allocation, no `console.clear()`, no `console.log()`.
3. **Bounded style arguments.** A `100×32` frame has 3,200 cells. It should need fewer than 100 `%c` arguments.

## The pipeline

```text
React commit ─▶ SceneNode graph ─▶ Yoga layout ─▶ paintScene() ─▶ CellBuffer
                                                                    │
         console.log(format, ...css) ◀─ assemble() ◀─ compileRow() ◀┴─ row-hash gate
```

## CellBuffer

The frame lives in flat typed arrays, one slot per cell:

| Array | Type | Contents |
| :-- | :-- | :-- |
| `chars` | `Uint32Array` | Code point, or a grapheme-pool index for ZWJ / multi-codepoint emoji |
| `fg` | `Uint32Array` | Packed `0xRRGGBBAA` foreground |
| `bg` | `Uint32Array` | Packed `0xRRGGBBAA` background (alpha-blended on write) |
| `attrs` | `Uint16Array` | Bold, dim, italic, underline, strikethrough, inverse, allow-link, wide-continuation |

A `100×32` buffer is 3,200 cells × 14 bytes ≈ **44.8 KB**, allocated once and reused for the lifetime of the app.

## The row-hash dirty gate

After painting, Turbolog computes a 32-bit FNV-style hash per row and compares it with the previous committed frame. Only rows whose hash changed are re-scanned. If **no** row changed, the driver returns before allocating a single string:

```ts
const { frame } = this.encode(buffer);
if (frame === null) return SKIPPED; // 0 allocations, 0 console calls
console.clear();
console.log(frame.format, ...frame.args);
```

## Run-length encoding

Each dirty row is scanned left to right. Consecutive cells with identical `(fg, bg, attrs)` merge into one span. Each span becomes `%c` + text in the format string and one CSS string in the arguments:

```js
console.log(
  "%c▼ Text.js%c 0.2 (Turbolog)%c\n%cReady in 412ms",
  "color:#ededed;font-weight:700;background:#111113",
  "color:#6b6b70;background:#111113",
  "background:#0a0a0a",
  "color:#45a557;background:#0a0a0a",
);
```

### Cross-newline span merging

When the first span of a row has the same style as the last span of the previous row, Turbolog emits `\n` *inside* the open span instead of starting a new one. Large uniform regions — backgrounds, panels, code blocks — collapse into a single argument across many lines.

### Style interning

CSS strings are interned in a `Map<bigint, string>` keyed by the packed style. A steady-state frame allocates **zero** new CSS strings.

## Chromium edge-case defenses

Turbolog is tuned against Chromium's `ConsoleViewMessage.ts`, the class that formats console messages in DevTools.

### `%` escaping

Every literal `%` in cell text is escaped as `%%`. Without this, user text like `"100%"` or `"%s"` would consume a style argument and shift every subsequent span's colors.

### Linkifier style hijacking

DevTools auto-links URLs inside `%c` spans and forces its own link color with `!important` (`_applyForcedVisibleStyle`). Turbolog inserts a `\u2060` word joiner after `://` and in `www.` — `https:\u2060//` — which defeats the linkifier while remaining visually identical. Cells rendered with `allowLink` (`<Link>`) are left linkable on purpose.

### Seamless multi-row backgrounds

`%c` spans are `display: inline-block` with calibrated `font-family`, `font-size`, `line-height` and zero vertical margin, so background colors tile across `<br>` boundaries with no 1px gaps.

### Unfocused cursor freeze

When `document.hasFocus()` is false, blinking cursors become static `▯` blocks and timers stop, so `console.clear()` stops firing while the user selects text in DevTools.

## Benchmarks

Measured on an M3 Pro, Chrome 131, `100×32` grid, median of 1,000 frames:

| Scenario | Layout | Raster | Encode | Total | `%c` args |
| :-- | --: | --: | --: | --: | --: |
| Idle (no changes) | 0.04ms | 0.03ms | 0.01ms | **0.08ms** | 0 (gated) |
| Counter increment | 0.06ms | 0.05ms | 0.07ms | **0.18ms** | 41 |
| Dashboard tick | 0.11ms | 0.09ms | 0.12ms | **0.32ms** | 88 |
| Snake @ 60fps | 0.07ms | 0.08ms | 0.10ms | **0.25ms** | 64 |
| Full repaint (theme switch) | 0.12ms | 0.14ms | 0.31ms | **0.57ms** | 92 |

| Metric | Line-by-line logging | Turbolog |
| :-- | --: | --: |
| `console.log` calls / frame | 32 | **1** |
| `%c` arguments / frame | 3,200 | **~41–92** |
| Calls when idle | 32 | **0** |
| CSS strings allocated / frame | 3,200 | **0** (interned) |

> **Good to know:** You can reproduce these numbers on this page. Open DevTools and run `text.stats()`, or open the RLE Inspector on the [Playground](/playground).
