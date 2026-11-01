---
title: Laying out the console with Yoga
date: 2025-06-10
author: Adam
summary: Text.js runs Yoga in WebAssembly with a point scale factor of 1, so every box lands on a whole cell. Text is segmented with Intl.Segmenter and measured in cells.
---

Every Text.js frame is laid out by Yoga, the flexbox engine used by React Native, compiled to WebAssembly. Boxes and text share one Yoga tree. The console is a grid of character cells, so every position and size that comes out of it has to be a whole number of cells.

## One point is one cell

Yoga rounds its results to a pixel grid defined by the point scale factor. At 2, as on a Retina screen, edges can land on half points. Text.js loads Yoga once and sets the factor to 1:

```ts
export function initYoga(): Promise<Yoga> {
  if (yoga !== null) return Promise.resolve(yoga);
  if (yogaPromise === null) {
    yogaPromise = loadYoga().then((instance) => {
      yoga = instance;
      const config = instance.Config.create();
      config.setPointScaleFactor(1);
      config.setUseWebDefaults(false);
      yogaConfig = config;
      return instance;
    });
    yogaPromise.catch(() => {
      yogaPromise = null;
    });
  }
  return yogaPromise;
}
```

With a factor of 1, Yoga rounds every edge to a whole unit, and Text.js treats one unit as one cell. Yoga rounds the absolute position of each edge and derives sizes from the rounded edges, so neighboring boxes share an edge. Split an 81-column row into two `width="50%"` boxes and one gets 40 columns, the other 41, with no gap and no overlap.

Text.js applies the CSS defaults itself: `flexDirection` is `row` and `flexShrink` is `1`, as in a browser.

## Measuring text

Text nodes are Yoga leaves with a measure function. Yoga calls it with the width available, and Text.js returns the size of the text in cells:

```ts
private measure(width: number, widthMode: MeasureMode, _height: number, _heightMode: MeasureMode): { width: number; height: number } {
  const natural = this.naturalSize();
  if (widthMode === MeasureMode.Undefined || Number.isNaN(width)) return natural;
  const avail = Math.max(0, Math.floor(width));
  if (natural.width <= avail) {
    return { width: widthMode === MeasureMode.Exactly ? avail : natural.width, height: natural.height };
  }
  if ((this.props.wrap ?? "wrap") !== "wrap") return { width: avail, height: natural.height };
  const lines = this.getLines(avail);
  let maxLine = 0;
  for (const l of lines) if (l.width > maxLine) maxLine = l.width;
  return { width: widthMode === MeasureMode.Exactly ? avail : Math.min(avail, maxLine), height: lines.length };
}
```

Text that fits is returned at its natural size. Text that doesn't is wrapped at the available width, and its height is the number of lines. The node keeps its last wrap, so measuring the same width again doesn't wrap the text again.

## Measuring grapheme clusters

A string's `length` counts UTF-16 code units, which says little about how many cells it fills. Text is first split into grapheme clusters with `Intl.Segmenter`, so `e` followed by a combining accent is one cluster, and so is an emoji sequence joined with zero-width joiners. Each cluster is then given a width:

| Text | Cells | Why |
| :-- | --: | :-- |
| `abc` | 3 | One cell per character |
| `你好` | 4 | East Asian wide characters take two |
| `🚀` | 2 | Emoji presentation takes two |
| `é` (`e` + U+0301) | 1 | Combining marks take none |
| `─│┌▼←⠋` | 6 | Box drawing, geometric shapes, arrows and braille are pinned to one |

Borders, the `▼` mark, arrows and spinner frames are always measured as one cell, so a box border never pushes its contents out of line.

Printable ASCII skips segmentation, and other widths are cached per code point and per cluster.

## Wrapping

`<Text>` takes a `wrap` mode:

- `wrap` (the default) breaks at spaces, and inside a word when the word is wider than the line.
- `nowrap` keeps one line and lets the box clip it.
- `truncate-end`, `truncate-middle` and `truncate-start` keep one line and replace what doesn't fit with `…`.

Truncation counts cells too, so a line of Chinese text is cut on a character boundary, and the ellipsis takes exactly one cell.

## In practice

Here a 30-column sidebar sits next to a panel that takes the remaining width:

```tsx
<Box flexDirection="row" width="100%" height="100%">
  <Box width={30} flexDirection="column" border="rounded" title="Sessions" overflow="hidden">
    <Text wrap="truncate-end">session-03 · refactor the renderer pipeline</Text>
  </Box>
  <Box flexGrow={1} flexDirection="column" border="single" title="Conversation" paddingX={1}>
    <Text>Message 0: 你好 🚀</Text>
  </Box>
</Box>
```

In a 100-column console the sidebar takes 30 columns including its border, and the conversation panel takes the other 70. A border is one cell on each side, so the session title is truncated at 28 cells.
