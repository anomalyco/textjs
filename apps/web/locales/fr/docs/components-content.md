<!-- s:e580113c76 -->
Ces composants affichent du Markdown, du code, des diffs et de grands caractères sur la grille de cellules.

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
Markdown adapté au streaming. Passez une chaîne qui s’allonge et la frame reste stable.

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
Coloration syntaxique pour `ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go` et d’autres langages.

<!-- s:e75addc84e -->
| Prop | Description |
| :-- | :-- |
| `language` | Identifiant du langage |
| `showLineNumbers` | Gouttière des numéros de ligne |
| `highlightLines` | Lignes à colorer |
| `maxHeight` | Troncature avec un pied de bloc « lignes supplémentaires » |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
Diffs unifiés ou calculés à partir de `{ before, after }`.

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
Variantes : `dots`, `pulse`, `matrix`, `line` et `braille` (pour les terminaux ; Menlo ne possède pas de glyphes braille). Les minuteurs s’arrêtent pendant la pause.

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
Grands caractères en pixels pour les en-têtes.

<!-- s:d3f90f7b9b -->
Utilisez `font="compact"` pour une variante sur 3 lignes. Passez une police FIGlet de [`@textjs/font`](/docs/fonts), comme `font={slant}`, pour un lettrage FIGlet.
