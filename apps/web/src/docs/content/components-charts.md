Charts drawn with block elements: eight levels per cell for bars, a 2×2 dot grid per cell for lines.

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

`sparkline(values)` returns the same thing as a string.

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

Half-block pixels: each cell holds two, top in the foreground and bottom in the background.

```tsx
<Image src="/avatar.png" width={24} />
<Image pixels={{ width, height, data }} height={8} fit="cover" />
```

`src` loads through a canvas, so cross-origin images need CORS. `pixels` takes raw RGBA anywhere, including the terminal.
