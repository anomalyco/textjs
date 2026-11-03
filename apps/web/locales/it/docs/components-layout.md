<!-- s:19797c0276 -->
Queste primitive dispongono la griglia di celle con Yoga flexbox.

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
Il contenitore del layout.

<!-- s:b2726c7ef5 -->
| Prop | Descrizione |
| :-- | :-- |
| `className` | Utility per le celle |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | Testo inserito nel bordo superiore |
| `bg` / `fg` | Colore dello sfondo e del testo |
| `overflow` | `hidden` o `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
Testo in linea. I componenti `<Text>` annidati diventano span con stili.

<!-- s:d078a242d3 -->
| Prop | Descrizione |
| :-- | :-- |
| `color` | Colore del testo |
| `bold` `italic` `underline` `dim` | Attributi |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
Una colonna scorrevole. `stickyScroll` mantiene lo scorrimento in fondo man mano che il contenuto cresce.

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
Un overlay centrato che oscura il contenuto sottostante e trattiene il focus.

<!-- s:7a128a8b11 -->
Spacer, Divider e Badge

<!-- s:72e5d35050 -->
Helper per il layout

<!-- s:e76299d593 -->
Forme abbreviate per le disposizioni flex più comuni.

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
Due pannelli e un divisore. Con `resizable`, il divisore entra nell’ordine di tabulazione di `Tab` e `←` `→` lo ridimensionano (`Shift` per cinque celle).

<!-- s:2143924860 -->
`size` è una frazione (`0.3`) o un numero di celle (`24`). `direction="column"` impila i pannelli.
