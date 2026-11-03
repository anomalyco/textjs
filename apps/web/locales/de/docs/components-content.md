<!-- s:e580113c76 -->
Diese Komponenten rendern Markdown, Code, Diffs und große Schrift auf dem Zellenraster.

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
Streaming-sicheres Markdown. Übergib eine wachsende Zeichenkette und der Frame bleibt stabil.

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
Syntaxhervorhebung für `ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go` und weitere Sprachen.

<!-- s:e75addc84e -->
| Prop | Beschreibung |
| :-- | :-- |
| `language` | Sprach-ID |
| `showLineNumbers` | Zeilennummernspalte |
| `highlightLines` | Farbig hervorzuhebende Zeilen |
| `maxHeight` | Begrenzung mit der Fußzeile „weitere Zeilen“ |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
Unified-Diffs oder aus `{ before, after }` berechnet.

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
Varianten: `dots`, `pulse`, `matrix`, `line` und `braille` (für Terminals; Menlo hat keine Braille-Glyphen). Timer stoppen während einer Pause.

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
Große Pixelschrift für Überschriften.

<!-- s:d3f90f7b9b -->
Verwende `font="compact"` für eine Variante mit 3 Zeilen. Übergib für FIGlet-Schrift eine FIGlet-Schriftart aus [`@textjs/font`](/docs/fonts), etwa `font={slant}`.
