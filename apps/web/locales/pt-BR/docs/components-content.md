<!-- s:e580113c76 -->
Esses componentes renderizam Markdown, código, diffs e letras grandes na grade de células.

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
Markdown seguro para streaming. Passe uma string que cresce e o quadro permanece estável.

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
Realce de sintaxe para `ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go` e mais.

<!-- s:e75addc84e -->
| Prop | Descrição |
| :-- | :-- |
| `language` | Identificador da linguagem |
| `showLineNumbers` | Margem com números de linha |
| `highlightLines` | Linhas a colorir |
| `maxHeight` | Recorte com rodapé de “mais linhas” |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
Diffs unificados ou calculados a partir de `{ before, after }`.

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
Variantes: `dots`, `pulse`, `matrix`, `line` e `braille` (para terminais; Menlo não tem glifos braille). Os temporizadores param durante a pausa.

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
Letras grandes em pixels para cabeçalhos.

<!-- s:d3f90f7b9b -->
Use `font="compact"` para uma variante de 3 linhas. Passe uma fonte FIGlet de [`@textjs/font`](/docs/fonts), como `font={slant}`, para letras em figlet.
