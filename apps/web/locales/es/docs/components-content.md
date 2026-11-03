<!-- s:e580113c76 -->
Estos componentes renderizan Markdown, código, diferencias y letras grandes en la cuadrícula de celdas.

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
Markdown compatible con streaming. Pasa una cadena que crece y el fotograma se mantiene estable.

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
Resaltado de sintaxis para `ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go` y más.

<!-- s:e75addc84e -->
| Propiedad | Descripción |
| :-- | :-- |
| `language` | Identificador del lenguaje |
| `showLineNumbers` | Margen para números de línea |
| `highlightLines` | Líneas que colorear |
| `maxHeight` | Recorte con un pie de «más líneas» |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
Diferencias unificadas o calculadas a partir de `{ before, after }`.

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
Variantes: `dots`, `pulse`, `matrix`, `line` y `braille` (para terminales; Menlo no tiene glifos braille). Los temporizadores se detienen durante la pausa.

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
Letras grandes de píxeles para encabezados.

<!-- s:d3f90f7b9b -->
Usa `font="compact"` para una variante de 3 filas. Pasa una fuente FIGlet de [`@textjs/font`](/docs/fonts), como `font={slant}`, para obtener letras figlet.
