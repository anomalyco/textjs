---
title: Right-to-left text in the console
date: 2026-10-06
author: Adam
summary: Text.js implements the Unicode Bidirectional Algorithm and passes all 770,241 BidiTest.txt cases. Hebrew and Arabic render in visual order with Arabic shaping, aligned to the cell grid.
---

Text.js now renders Hebrew, Arabic, Persian and other right-to-left scripts in the correct order, with Arabic letters joined, on the same cell grid as everything else.

```tsx
import { Box, Text } from "@textjs/react";

export default function Page() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text>שלום עולם! זהו טקסט בעברית.</Text>
      <Text>مرحبا بالعالم! هذا نص عربي.</Text>
      <Text>Order #1234 (<Text color="accent">שלום</Text>) total: 25.50 ₪</Text>
      <Text>user <Text dir="auto" color="success">שלום!</Text> replied 3 times</Text>
    </Box>
  );
}
```

Each paragraph picks its base direction from its first strong character, as `dir="auto"` does in HTML, and right-to-left paragraphs align right. On a nested `<Text>`, `dir` isolates the span the way `<bdi>` does, so a user name of unknown direction can't reorder the text around it.

## The algorithm

Right-to-left support is an implementation of the Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0), written from scratch in `@textjs/core`. It resolves embedding levels for each paragraph, including explicit embeddings and isolates, weak and neutral types and paired brackets. Then each wrapped line is reordered on its own, and mirrored characters swap at right-to-left levels, so `(abc)` stays `(abc)` inside Hebrew.

Unicode publishes two conformance files for the algorithm. Both are checked into the repository, gzipped, and the test suite runs every case:

- `BidiTest.txt` lists inputs as sequences of bidi classes, each with the paragraph directions it applies to. Text.js passes all 770,241 cases.
- `BidiCharacterTest.txt` lists real strings with expected levels and order. Text.js passes all 91,707.

```ts
for (const [bit, dir] of [[1, -1], [2, 0], [4, 1]] as const) {
  if ((bitset & bit) === 0) continue;
  cases++;
  const r = run(types, null, dir);
  const gotLevels = fmtLevels(r.levels);
  const gotOrder = r.order.join(" ");
  if (gotLevels !== levels || gotOrder !== reorder) {
    if (failures.length < 20) failures.push(`${input.trim()} [dir ${dir}]: levels ${gotLevels} (want ${levels}), order ${gotOrder} (want ${reorder})`);
    else failures.push("");
  }
}
```

## From logical order to cells

A line of right-to-left text goes through four steps before it reaches the console:

1. **Wrap in logical order.** Lines break where they would for left-to-right text, by cell width.
2. **Reorder each line.** The resolved levels decide the display order of the line's graphemes.
3. **Shape Arabic.** Letters take their contextual forms (isolated, initial, medial, final) from the Arabic Presentation Forms blocks. One letter is one cell, and joined forms survive a cursor or a color change in the middle of a word.
4. **Pin the order.** The cells now hold glyphs in display order.

The last step exists because DevTools would run bidi over the text a second time and reverse it again. A `%c` style can't turn that off, because DevTools' sanitizer drops `direction` and `unicode-bidi`. So the driver wraps every span that contains right-to-left characters in `LRO` and `PDF` (U+202D and U+202C), which forces left-to-right display of exactly what the cells hold.

## Half a cell of drift

Neither SF Mono nor Menlo has Hebrew or Arabic glyphs, so the browser falls back per character. On macOS that is Courier New, also monospaced, at 7.2012px per glyph at 12px against Menlo's 7.2246px. It is 0.3% narrower, enough to drift a full row of Hebrew by about half a cell.

`CssConsoleDriver` measures each right-to-left span with a canvas in the console font, which uses the same Blink font fallback as DevTools, and pads the span by the exact difference in LayoutUnits (1/64px). Every span ends up as wide as the grid cells it covers. A span is pulled in by at most half a cell, so a much wider fallback font overflows instead of overlapping the next span.

`bun bench/devtools/bidi-shot.ts` measures the result in the real DevTools frontend, on a 64×21 frame of Hebrew, Arabic, mixed and emoji-in-Hebrew lines:

| Frame | Right-edge drift across rows |
| :-- | --: |
| Cells logged without pinning | 14.5px |
| Pinned, no width fitting | 2.22px |
| Shipping driver | 0.156px |
| Control: every RTL glyph replaced by `x` | 1.67px |

The control is the same frame with Latin text. The shipping driver lines up better than the control because emoji inside right-to-left spans are fitted with them.

## Left-to-right text is unchanged

Text without right-to-left characters skips all of this. The check happens while graphemes are segmented, one comparison per grapheme, and pure left-to-right text paints through the same path as before, so its console frames are byte-identical.

Right-to-left text ships in Text.js 1.0. [Internationalization](/docs/internationalization) covers input, editing, terminals and the API.
