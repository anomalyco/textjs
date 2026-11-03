Charts are drawn with block elements. Bars use eight levels per cell, and lines use a 2×2 dot grid per cell.

```tsx#charts
<LineChart
  height={6}
  series={[
    { label: "p50", data: p50 },
    { label: "p95", data: p95, color: "muted" },
  ]}
  formatValue={(v) => `${Math.round(v)}ms`}
/>
<BarChart data={[{ label: "iad1", value: 1240 }, { label: "sfo1", value: 860 }]} />
<Sparkline data={requests} />
<ProgressBar label="Build" value={0.42} />
```

## `<LineChart>`

Dot-matrix line plots with a y-axis and legend.

| Prop | Description |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | Shorthand for one series |
| `height` | Rows (default `8`) |
| `min` / `max` | Fixed bounds (default: the data) |
| `axis` | Y-axis with min / max labels |
| `formatValue` | Axis labels (default `1.2k`) |
| `marker` | `quadrant` (default) or `braille` |

`braille` packs 2×4 dots per cell. Use it in terminals: Menlo, the DevTools console font on macOS, has no braille, and the fallback glyphs are wider than a cell.

Series colors default to `accent`, `success`, `warning`, `info` and `danger`.

## `<BarChart>`

Horizontal bars with aligned labels and values, at one-eighth-cell precision.

```tsx
<BarChart data={regions} max={2000} formatValue={(v) => `${v} req/s`} />
```

## `<Sparkline>`

Fills its width with the latest points. `height` above `1` renders a filled area.

```tsx
<Sparkline data={throughput} height={3} />
```

`sparkline(values)` returns the same sparkline as a string.

## `<ProgressBar>`

| Prop | Description |
| :-- | :-- |
| `value` / `max` | Progress (omit for indeterminate) |
| `variant` | `block` (smooth) `line` `thin` |
| `width` | Cells (default: fill) |
| `label` | Leading text |
| `formatValue` | Trailing text (default `42%`) |

Indeterminate bars sweep at the renderer's frame pace and stop when output is paused.

## `<Gradient>`

Per-cell color interpolation. Multi-line strings share one gradient, so it pairs with `<AsciiFont>`.

```tsx
<Gradient colors={["#ff4d8d", "#3291ff"]} bold>▼ Text.js</Gradient>
<Gradient colors="dusk">{renderAsciiFont("SHIP").join("\n")}</Gradient>
```

Named gradients: `geist` `dusk` `ocean` `mono` `ember`.

## `<Image>`

Renders an image as a pixelated sprite in Chromium and Firefox consoles, and falls back to `▀` half-blocks (two pixels per cell, top in the foreground and bottom in the background) in Safari, terminals and plain-text copies.

```tsx
<Image src="/avatar.png" width={24} />
<Image pixels={{ width, height, data }} height={8} fit="cover" />
```

`src` loads through a canvas, so cross-origin images need CORS. `pixels` takes raw RGBA anywhere, including the terminal.

## `<Pixels>` (experimental)

`@textjs/react/experimental` exports `<Pixels>` for live `0xRRGGBBAA` framebuffers such as games, emulators and video. Write packed pixels into `source.data` in place and increment `frame` to repaint.

```tsx
import { Pixels, type PixelSource } from "@textjs/react/experimental";

const source: PixelSource = { width: 320, height: 200, data: new Uint32Array(320 * 200) };

<Pixels source={source} frame={frame} width={80} height={25} pixelAspect={5 / 6} />
```

| Prop | Description |
| :-- | :-- |
| `source` | `{ width, height, data: Uint32Array }` in `0xRRGGBBAA` order |
| `frame` | Frame counter; increment after mutating `source.data` |
| `width` / `height` | Box size in cells and rows |
| `fit` | `contain` (default) or `fill` |
| `pixelAspect` | Displayed width divided by height of one source pixel (default `1`) |
| `palette` | Optional `PackedColor[]` palette to quantize colors against |
| `sample` | Half-block fallback filter: `nearest` (default) or `average` |
| `renderMode` | `auto` (default) or `halfblock` |

For custom scene nodes without React, `@textjs/core/experimental` exports `drawPixels(buffer, options)` along with `DrawPixelsOptions`, `PixelSource` and `PixelFit`. Exports under `/experimental` may change in a minor release.
