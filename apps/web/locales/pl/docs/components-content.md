<!-- s:e580113c76 -->
Te komponenty renderują Markdown, kod, różnice i duże litery na siatce komórek.

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
Markdown przystosowany do strumieniowania. Przekaż rosnący ciąg znaków, a klatka pozostanie stabilna.

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
Podświetlanie składni dla `ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go` i innych języków.

<!-- s:e75addc84e -->
| Prop | Opis |
| :-- | :-- |
| `language` | Identyfikator języka |
| `showLineNumbers` | Margines z numerami wierszy |
| `highlightLines` | Wiersze do podświetlenia |
| `maxHeight` | Przycięcie ze stopką „więcej wierszy” |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
Różnice w formacie unified lub obliczane na podstawie `{ before, after }`.

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
Warianty: `dots`, `pulse`, `matrix`, `line` i `braille` (dla terminali; Menlo nie ma glifów brajlowskich). Timery zatrzymują się podczas pauzy.

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
Duże pikselowe litery do nagłówków.

<!-- s:d3f90f7b9b -->
Użyj `font="compact"`, aby uzyskać wariant o wysokości 3 wierszy. Przekaż font FIGlet z pakietu [`@textjs/font`](/docs/fonts), na przykład `font={slant}`, aby uzyskać litery w stylu FIGlet.
