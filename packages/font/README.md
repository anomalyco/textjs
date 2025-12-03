# @textjs/font

`next/font` for FIGlet. A complete FIGfont 2 (`.flf`) parser and renderer that matches the `figlet` program character for character, plus 17 bundled fonts, one module each.

```tsx
import { FigletText } from "@textjs/font/react";
import { slant } from "@textjs/font/slant";

<FigletText font={slant} color="accent">Text.js</FigletText>;
```

```
  ______          __      _
 /_  __/__  _  __/ /_    (_)____
  / / / _ \| |/_/ __/   / / ___/
 / / /  __/>  </ /__   / (__  )
/_/  \___/_/|_|\__(_)_/ /____/
                   /___/
```

## API

```ts
import { renderFiglet, parseFont } from "@textjs/font";
import { standard } from "@textjs/font/standard";

renderFiglet(standard, "Hello", { layout: "fitted", width: 60, align: "center" }); // string[]
standard.render("Hello"); // same, default options

const doom = parseFont(await (await fetch("/fonts/doom.flf")).text(), "Doom");
```

| Option | Values | Default |
| --- | --- | --- |
| `layout` | `"default"` (font's), `"full"` (`-W`), `"fitted"` (`-k`), `"smushed"` (`-S`), `"universal"` (`-o`), or a `-m` number | `"default"` |
| `verticalLayout` | `"full"`, `"fitted"`, `"smushed"`, `"universal"`, `"default"` (font's) | `"full"` (FIGlet 2.2.5 has no vertical layout) |
| `width` | maximum output columns; wraps at word breaks like `figlet -w width+1` | unlimited |
| `align` | `"left"`, `"center"`, `"right"` within `width`, or within the widest row | `"left"`, `"right"` for RTL fonts |
| `direction` | `"default"`, `"ltr"`, `"rtl"` | font's |
| `paragraph` | join single newlines (`-p`) | `false` |

`<AsciiFont font={slant} text="Text.js" />` from `@textjs/react` also accepts any loaded font.

Implemented: header and comment lines, hardblanks, endmarks, the 102 required characters, code-tagged characters (decimal, octal, hex, negative), the missing character (code 0), full width / fitting / smushing with all six horizontal rules and universal smushing, right-to-left printing, FIGlet's word wrapping and justification, and the five vertical rules plus supersmushing. TOIlet `tlf2a` fonts parse, rendered as plain text. Not implemented: control files (`.flc`), zipped fonts.

## Fonts

`standard`, `slant`, `small`, `smslant`, `big`, `banner`, `block`, `lean`, `shadow`, `smshadow`, `script`, `smscript`, `mini`, `bubble`, `digital`, `ivrit` (right to left), `term`. Import each from `@textjs/font/<name>`; `@textjs/font/all` exports every font and `BUNDLED_FONTS` for galleries. Fonts parse lazily on first render.

All glyphs use printable ASCII and Latin-1, so they stay cell-exact in Menlo/SF Mono. (`bubble`, `digital` and `term` draw input U+0080–U+009F as itself: C1 controls, which nobody types.)

## Licensing

The code is MIT. The fonts are the FIGlet 2.2.5 distribution fonts, byte-identical to `figlet-2.2.5.tar.gz`, under FIGlet's BSD 3-Clause license (`LICENSES/FIGLET.txt`); each keeps its credits in its comment lines (`font.comment`). Fonts without a redistribution grant (Doom, Larry 3D, ANSI Shadow, Calvin S, …) are not bundled. See `NOTICE`.

## Development

```bash
bun run --cwd packages/font generate     # fonts/*.flf → src/fonts/*.ts
bun run --cwd packages/font references   # needs `figlet` 2.2.5 on PATH
bun test packages/font
```

`test/fixtures/references.json` holds 273 outputs from the real `figlet` 2.2.5 binary (17 fonts × layouts × inputs, plus FIGlet's own regression input with its `run-tests.sh` flags); the test suite replays each one.
