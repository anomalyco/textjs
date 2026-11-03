<!-- s:19797c0276 -->
Ces primitives organisent la grille de cellules avec Yoga flexbox.

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
Le conteneur de layout.

<!-- s:b2726c7ef5 -->
| Prop | Description |
| :-- | :-- |
| `className` | Classes utilitaires pour les cellules |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | Texte incrusté dans la bordure supérieure |
| `bg` / `fg` | Couleur du fond et du texte |
| `overflow` | `hidden` ou `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
Texte en ligne. Les éléments `<Text>` imbriqués deviennent des spans stylisés.

<!-- s:d078a242d3 -->
| Prop | Description |
| :-- | :-- |
| `color` | Couleur du texte |
| `bold` `italic` `underline` `dim` | Attributs |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
Une colonne défilante. `stickyScroll` maintient le défilement en bas à mesure que le contenu augmente.

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
Une superposition centrée qui assombrit le contenu sous-jacent et retient le focus.

<!-- s:7a128a8b11 -->
Spacer, Divider et Badge

<!-- s:72e5d35050 -->
Utilitaires de layout

<!-- s:e76299d593 -->
Des raccourcis pour les dispositions flex courantes.

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
Deux volets et un séparateur. Avec `resizable`, le séparateur rejoint l’ordre de tabulation de `Tab` et les touches `←` `→` le déplacent (`Shift` pour cinq cellules).

<!-- s:2143924860 -->
`size` est une fraction (`0.3`) ou un nombre de cellules (`24`). `direction="column"` empile les volets.
