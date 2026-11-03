<!-- s:e580113c76 -->
Questi componenti visualizzano Markdown, codice, diff e caratteri grandi sulla griglia di celle.

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
Markdown compatibile con lo streaming. Passa una stringa che cresce e il frame resta stabile.

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
Evidenziazione della sintassi per `ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go` e altri linguaggi.

<!-- s:e75addc84e -->
| Prop | Descrizione |
| :-- | :-- |
| `language` | Identificatore del linguaggio |
| `showLineNumbers` | Margine con i numeri di riga |
| `highlightLines` | Righe da colorare |
| `maxHeight` | Troncamento con un piè di pagina «altre righe» |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
Diff unificati o calcolati da `{ before, after }`.

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
Varianti: `dots`, `pulse`, `matrix`, `line` e `braille` (per i terminali; Menlo non ha glifi braille). I timer si fermano durante la pausa.

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
Caratteri grandi in pixel per le intestazioni.

<!-- s:d3f90f7b9b -->
Usa `font="compact"` per una variante a 3 righe. Passa un font FIGlet da [`@textjs/font`](/docs/fonts), come `font={slant}`, per i caratteri figlet.
