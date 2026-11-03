Text.js renders Hebrew, Arabic, Persian and other right-to-left scripts in the correct order, aligned to the cell grid, in DevTools, terminals and DOM mirrors. It implements the Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0) and passes the official conformance suites: all 770,241 `BidiTest.txt` cases (every input in every paragraph direction) and all 91,707 `BidiCharacterTest.txt` cases.

```tsx#bidi
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

## Direction

Every paragraph (each line of a `<Text>` separated by `\n`) picks its own base direction from its first strong character, as `dir="auto"` does in HTML. Right-to-left paragraphs align right by default.

```tsx
<Text>שלום</Text>                {/* auto: RTL, right-aligned */}
<Text dir="rtl">hello!</Text>     {/* "!hello", right-aligned */}
<Text dir="ltr">שלום!</Text>      {/* LTR paragraph: "םולש!" reads correctly left of the "!" */}
<Text align="left">שלום</Text>    {/* RTL order, pinned to the left edge */}
```

| `align` | Left-to-right paragraph | Right-to-left paragraph |
| :-- | :-- | :-- |
| `"start"` (default) | left | right |
| `"end"` | right | left |
| `"left"` / `"center"` / `"right"` | as written | as written |

On a nested `<Text>`, `dir` isolates the span like HTML's `<bdi>`: its content is laid out on its own and cannot reorder the text around it. Use it for user-supplied names, titles and other text of unknown direction.

```tsx
<Text>user <Text dir="auto">{name}</Text> replied 3 times</Text>
// name = "שלום!"  →  user !םולש replied 3 times   (isolated: "!" ends the name)
// without dir     →  user םולש! replied 3 times   ("!" resolves with the Latin text around it)
```

## How it renders

1. **Wrap in logical order.** Lines break exactly as they do for left-to-right text, by cell width.
2. **Reorder each line.** The algorithm resolves embedding levels for the whole paragraph (explicit embeddings and isolates, weak and neutral types, paired brackets), then each wrapped line is reordered on its own (rules L1–L2). Brackets and other mirrored characters swap at right-to-left levels (L4), so `(abc)` stays `(abc)` inside Hebrew.
3. **Shape Arabic.** Letters take their contextual forms (isolated, initial, medial, final) from the Arabic Presentation Forms blocks, computed in logical order within each level run of the line (ZWJ and ZWNJ count where they sit). One letter is one cell, joined forms survive any span boundary (a cursor, a color change), and the console never has to shape them.
4. **Pin the order.** Cells now hold glyphs in display order. Browsers and many terminals would run bidi over them a second time, so drivers lock the order:

| Output | How the order is pinned |
| :-- | :-- |
| DevTools (`CssConsoleDriver`) | Spans containing right-to-left characters are wrapped in `LRO … PDF` (U+202D / U+202C). DevTools' `%c` sanitizer drops `direction` and `unicode-bidi`. |
| Terminals (`AnsiDriver`, `text run`) | Rows with right-to-left text are wrapped in `LRO … PDF` for terminals that run bidi per line. `renderToTerminal` switches to ECMA-48 BDSM explicit mode (`CSI 8 l`, honored by VTE-based terminals) once on entry and back to implicit mode (`CSI 8 h`) on exit; one-shot `renderToAnsi` frames that contain right-to-left text start with `CSI 8 l`. Pass `bidi: "none"` to emit cells as-is. |
| DOM mirrors (`<ConsoleMirror>`) | The mirror is `direction: ltr` (so an RTL host page can't flip it), and spans containing right-to-left text get `unicode-bidi: bidi-override`. |

`<Box title>`, `<Box bottomTitle>` and `<Divider title>` go through the same steps (`drawLogicalText(buffer, x, y, text, …)` draws any single line this way), so their labels display in order and joined.

Text without right-to-left characters skips all of this. A pure left-to-right text model is detected while its graphemes are segmented (one comparison per grapheme) and paints through the unchanged path; console frames are byte-identical.

## Cell widths

The shipping font stack is `"SF Mono", Menlo, "Cascadia Mono", Consolas, monospace`. None of these fonts has Hebrew or Arabic glyphs, so browsers fall back per character. On macOS that is Courier New, which is monospaced at 0.6 em: 7.2012 px per glyph at 12 px against Menlo's 7.2246 px. It's 0.3% narrower, enough to drift a full row of Hebrew by about half a cell.

`CssConsoleDriver` measures each right-to-left span with a canvas in the console font (the same Blink shaping and font fallback DevTools uses), then pads it by the exact LayoutUnit (1/64 px) difference. The span ends up as wide as the grid cells it covers (a wide grapheme such as an emoji counts two). A span is pulled in by at most half a cell, so a proportional fallback font (Times New Roman next to Cascadia Mono on Windows) overflows instead of letting the next span overlap its glyphs. Measured in the real DevTools frontend (Chromium 151) on a 64×21 frame of Hebrew, Arabic, mixed and emoji-in-Hebrew lines and RTL box titles (`bun bench/devtools/bidi-shot.ts`):

| Frame | Right-edge drift across rows |
| :-- | --: |
| Cells logged without pinning | 14.5 px (DevTools reorders and re-shapes) |
| Pinned, no width fitting | 2.22 px |
| Shipping driver | 0.156 px |
| Control: same cells, every RTL glyph replaced by `x` | 1.67 px |

The shipping frame matches the all-Latin control on every row except the emoji one, where it does better: emoji are fitted with the right-to-left span around them (0.03 px), while the control's left-to-right emoji row isn't fitted (1.66 px).

DevTools paints every `%c` span with `contain: paint` and snaps each one to device pixels separately, so where two backgrounds meet at a fractional position the pixel between them can go to neither, leaving a 1 px hairline. In Chrome and Edge, a span with a background extends it 1 px under an opaque right neighbour, and a fitted span adds that pixel to its padding. None of the four frames above shows a hairline.

Pass `measureText: false` to turn fitting off, or supply your own `(text, bold, italic) => px` measurer.

## Input and editing

`<Input>` and `<Textarea>` keep a logical cursor. Arrow keys move through the text in storage order, so in right-to-left text ← moves visually right. The block cursor sits on the logical character it covers, wherever reordering puts it. Within a right-to-left run that's the cell to the left of the previous character. Selection is a logical range too, and its highlight can therefore cover non-contiguous cells in mixed-direction lines. The horizontal scroll of a single-line `<Input>` follows the logical column, so a long right-to-left value can scroll the cursor out of view. A cursor on a space or at the end of the text is drawn as an isolated no-break space, so it stays neutral and never joins the numbers on either side.

## Limits

- **Paragraph separators.** Lines split at `\n`. U+2029 and other paragraph separators end a bidi paragraph but don't start a new line.
- **Tabs.** Tabs expand to spaces before bidi runs, so they act as whitespace (WS), not segment separators (S).
- **Shaping.** Only letters with presentation forms are shaped: Arabic, Persian, Urdu and the other letters in U+FB50–U+FDFF and U+FE70–U+FEFF. Lam-alef stays as two joined letters in two cells, not the one-glyph ligature. Syriac, N'Ko and other joining scripts keep their nominal forms.
- **Copying.** Text copied from the console is in display order (with the `LRO`/`PDF` marks), not logical order.
- **Terminals.** Terminals that ignore both BDSM and `LRO` and run their own bidi (for example with bidi enabled in iTerm2) may reorder right-to-left rows again.
- **DOM mirrors.** `<ConsoleMirror>` doesn't fit widths, so right-to-left runs there can drift by up to 0.3% of their width.

## API

```ts
import { reorderLine, paragraphDirection, resolveLevels, bidiClass, shapeArabicCodePoints } from "@textjs/core";

reorderLine("שלום (abc) 123!");          // "!123 (abc) םולש": one line in display order
reorderLine("مرحبا", "auto", { shape: true }); // presentation forms, display order
paragraphDirection("123 שלום");           // "rtl" (rules P2–P3)
```

`resolveLevels(types, codePoints, direction)`, `applyLineRules` and `reorderIndices` expose the algorithm itself: rules P1–I2, L1 and L2.

## Translating the focus pad

`<FocusPad>` from `@textjs/react/dom` (also rendered by `<TextCanvas>`) tells visitors to open the console, click the page and press a key. Its text is English by default. To translate it, pass `messages` with any of its strings. Keys you leave out keep their English text, listed in `defaultFocusPadMessages`.

```tsx
import { FocusPad, type FocusPadMessages } from "@textjs/react/dom";

const ja: Partial<FocusPadMessages> = {
  openConsole: "コンソールを開きます",
  step: (n, total) => `ステップ ${n}/${total}`,
  then: (action) => `次に、ここをクリックして${action}。`,
  shortcutOpens: (shortcut) => <>{shortcut}でコンソールが開きます。</>,
};

<FocusPad root={root} hints={[{ keys: "↑ ↓", label: "件数" }]} action="↑ ↓を押します" messages={ja} />;
```

A string that contains a value is a function that returns the whole sentence, so a translation can put the value anywhere in it. `then` gets the `action` prop, `shortcutOpens` gets the console shortcut as a keycap, and `step` gets the step number and the number of steps. `messages` also covers the labels screen readers announce and the console size control (`sizeControl`). `<ViewportControl>` and `<TextCanvas>` take the same `messages` prop. Keycaps such as ⌘⌥J, Ctrl+Shift+J and Enter aren't translated.
