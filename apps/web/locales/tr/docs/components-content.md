<!-- s:e580113c76 -->
Bu bileşenler hücre ızgarasında Markdown, kod, farklar ve büyük harfler render eder.

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
Akışa uygun Markdown. Büyüyen bir dize iletin; kare sabit kalır.

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
`ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go` ve daha fazlası için sözdizimi vurgulama.

<!-- s:e75addc84e -->
| Prop | Açıklama |
| :-- | :-- |
| `language` | Dil kimliği |
| `showLineNumbers` | Satır numarası alanı |
| `highlightLines` | Renklendirilecek satırlar |
| `maxHeight` | “Daha fazla satır” alt bilgisiyle kırpma |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
Birleşik farklar veya `{ before, after }` üzerinden hesaplanan farklar.

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
Varyantlar: `dots`, `pulse`, `matrix`, `line` ve `braille` (terminaller için; Menlo’da braille glifleri yoktur). Duraklatıldığında zamanlayıcılar durur.

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
Başlıklar için büyük piksel harfler.

<!-- s:d3f90f7b9b -->
3 satırlık varyant için `font="compact"` kullanın. FIGlet harfleri için [`@textjs/font`](/docs/fonts) paketinden `font={slant}` gibi bir FIGlet yazı tipi iletin.
