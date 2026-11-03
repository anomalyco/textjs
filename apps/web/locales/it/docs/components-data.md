<!-- s:d3c8cb679e -->
`<List>`, `<Table>` e `<Tree>` mostrano grandi insiemi di dati. Solo le righe visibili vengono renderizzate.

<!-- s:44ffd1d0a7 -->
Navigazione

<!-- s:e3dca4574c -->
`<List>`, `<Table>` e `<Tree>` condividono lo stesso modello di navigazione da tastiera.

<!-- s:cdac0643be -->
| Tasti | Azione |
| :-- | :-- |
| `↑` `↓` / `j` `k` | Spostamento |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | Pagina, mezza pagina |
| `Home` `End` / `g` `G` | Primo, ultimo |
| `↵` | `onSelect` |
| Rotella | Spostamento del cursore |

<!-- s:1c65c42a4d -->
Per impostazione predefinita riempiono il contenitore padre. Passa `height` per un numero fisso di righe.

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
Una lista virtualizzata. Le righe sono alte una cella.

<!-- s:3408e68b29 -->
| Prop | Descrizione |
| :-- | :-- |
| `items` | Qualsiasi array |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | Saltato dal cursore |
| `height` | Righe visibili (predefinito: riempimento) |
| `highlightedIndex` / `onHighlight` | Cursore controllato |
| `vimKeys` | `j` `k` `g` `G` (predefinito: `true`) |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
Le colonne condividono la larghezza rimanente, a meno che non impostino `width`. Intestazioni e celle usano le stesse regole flex, quindi restano sempre allineate.

<!-- s:e9719839f0 -->
| Campo della colonna | Descrizione |
| :-- | :-- |
| `key` | Identificatore e funzione di accesso predefinita |
| `width` / `grow` | Numero fisso di celle o quota dello spazio rimanente |
| `align` | `left` `right` `center` |
| `value` | Valore per visualizzazione e ordinamento |
| `render` | Contenuto personalizzato della cella |
| `compare` | Ordinamento personalizzato |

<!-- s:045ee40857 -->
Ordinamento

<!-- s:d04de39344 -->
Con `sortable`, premi il numero di una colonna per ordinare in base a essa (premilo di nuovo per invertire), `s` per passare da una colonna all’altra e `S` per invertire la direzione. L’ordinamento è stabile. Controllalo con `sort` e `onSortChange`.

<!-- s:6d625a19ed -->
Selezione

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` aggiunge una colonna di spunta; `Space` attiva o disattiva la selezione della riga evidenziata. Usa `selectedKeys` e `onSelectionChange` per controllarla, e `getRowKey` per chiavi stabili.

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
Un albero espandibile con linee guida.

<!-- s:eeb148154f -->
`→` espande un ramo o vi entra. `←` comprime un ramo o passa al padre. `Space` alterna espansione e compressione. `flattenTree(data, expanded)` espone le righe visibili se ti serve un renderer personalizzato.
