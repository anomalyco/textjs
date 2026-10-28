`next/font`, for FIGlet. `@textjs/font` parses FIGfont 2 (`.flf`) files and lays them out exactly like the `figlet` program, down to the last smushed underscore. Fonts are plain ES modules: import one and only that one ships.

```tsx#fonts
import { FigletText } from "@textjs/font/react";
import { slant } from "@textjs/font/slant";

export default function Page() {
  return <FigletText font={slant} color="accent">Text.js</FigletText>;
}
```

## Installation

```bash
bun add @textjs/font
```

## Usage

`<FigletText>` takes a font and a string. Rows are measured in cells, so the lettering sits in flexbox layouts like any other `<Text>`.

```tsx
import { FigletText } from "@textjs/font/react";
import { big } from "@textjs/font/big";

<FigletText font={big} layout="fitted" columns={60} align="center" color="muted">
  Deployed
</FigletText>
```

[`<AsciiFont>`](/docs/components-content#asciifont) accepts the same fonts, keeping its built-in `block` and `compact` lettering:

```tsx
<AsciiFont text="Text.js" font={slant} color="accent" />
```

Outside React, `renderFiglet` returns one string per row:

```ts
import { renderFiglet } from "@textjs/font";
import { standard } from "@textjs/font/standard";

renderFiglet(standard, "Hello", { layout: "full" });
// ["  _   _          _   _         ", " | | | |   ___  | | | |   ___  ", …]
```

## Layout

Horizontal layout follows FIGlet's flags.

| `layout` | `figlet` | Effect |
| :-- | :-- | :-- |
| `"default"` | `-s` | The font's layout, usually smushed |
| `"full"` | `-W` | Full width; characters never touch |
| `"fitted"` | `-k` | Kerning; characters move together until they touch |
| `"smushed"` | `-S` | Smushing with the font's rules, even for fitted fonts |
| `"universal"` | `-o` | Later characters overlap earlier ones |
| `0`–`63` | `-m` | Explicit smush mode |

All six horizontal smushing rules are implemented: equal character, underscore, hierarchy, opposite pair, big X and hardblank.

`verticalLayout` applies to multi-line text. FIGlet 2.2.5 never stacks lines closer, so the default is `"full"`; `"fitted"`, `"smushed"` and `"universal"` implement the five vertical rules, including vertical line supersmushing, and `"default"` uses the font's.

## Wrapping and alignment

`columns` (or `width` in `renderFiglet`) wraps at word breaks, then mid-word, exactly where `figlet -w` would. `align` is `"left"`, `"center"` or `"right"`; without a width, rows align within the widest row. Right-to-left fonts such as `ivrit` print right to left and align right; override with `direction`.

## Bundled fonts

| Import | Rows | Notes |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | FIGlet's default |
| `@textjs/font/slant`, `smslant` | 6, 5 | Italic |
| `@textjs/font/small` | 5 | Compact |
| `@textjs/font/big` | 8 | Includes Greek |
| `@textjs/font/banner` | 8 | `#` lettering, Katakana and Cyrillic |
| `@textjs/font/block`, `lean` | 8 | Outline, upright and slanted |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | Drop shadow |
| `@textjs/font/script`, `smscript` | 7, 5 | Cursive |
| `@textjs/font/mini` | 4 | Tiny |
| `@textjs/font/bubble`, `digital` | 4, 3 | Letters in circles and boxes |
| `@textjs/font/ivrit` | 6 | Hebrew, right to left |
| `@textjs/font/term` | 1 | Input as-is |

Every glyph is printable ASCII or Latin-1, so each sub-character is exactly one cell in DevTools' Menlo. `@textjs/font/all` exports them all, plus `BUNDLED_FONTS` for galleries. Fonts parse on first render, not on import.

## Custom fonts

Any FIGfont works. Fetch it, then parse it:

```ts
import { parseFont } from "@textjs/font";

const doom = parseFont(await (await fetch("/fonts/doom.flf")).text(), "Doom");
```

The parser reads the header, comment lines, hardblanks, endmarks, the 102 required characters and code-tagged characters in decimal, octal or hex. TOIlet `.tlf` fonts render as plain text. Prefer fonts drawn with ASCII or box-drawing characters; braille and emoji are not one cell wide in Menlo.

## Licensing

The bundled fonts are the FIGlet 2.2.5 distribution fonts, byte for byte, under FIGlet's BSD 3-Clause license. Each keeps its credits in its comment lines, available at runtime as `font.comment`. Popular fonts without a redistribution grant, such as Doom, Larry 3D, ANSI Shadow and Calvin S, are not bundled.

## Verified against `figlet`

The test suite replays 273 outputs recorded from the real `figlet` 2.2.5 binary: every bundled font in every layout mode, wrapping, justification, right-to-left text, paragraph mode and FIGlet's own regression input. Each one matches character for character.
