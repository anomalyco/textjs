<!-- s:d3c8cb679e -->
`<List>`, `<Table>` y `<Tree>` muestran grandes conjuntos de datos. Solo se renderizan las filas visibles.

<!-- s:44ffd1d0a7 -->
Navegación

<!-- s:e3dca4574c -->
`<List>`, `<Table>` y `<Tree>` comparten un modelo de navegación por teclado.

<!-- s:cdac0643be -->
| Teclas | Acción |
| :-- | :-- |
| `↑` `↓` / `j` `k` | Desplazarse |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | Avanzar o retroceder una página, media página |
| `Home` `End` / `g` `G` | Ir al principio, al final |
| `↵` | `onSelect` |
| Rueda | Mover el cursor |

<!-- s:1c65c42a4d -->
Por defecto, ocupan todo el espacio de su contenedor padre. Pasa `height` para fijar el número de filas.

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
Una lista virtualizada. Las filas tienen una altura de una celda.

<!-- s:3408e68b29 -->
| Propiedad | Descripción |
| :-- | :-- |
| `items` | Cualquier array |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | Elemento omitido por el cursor |
| `height` | Filas visibles (por defecto: ocupar todo el espacio) |
| `highlightedIndex` / `onHighlight` | Cursor controlado |
| `vimKeys` | `j` `k` `g` `G` (por defecto `true`) |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
Las columnas se reparten el ancho restante salvo que definan `width`. Los encabezados y las celdas usan las mismas reglas flex, por lo que siempre quedan alineados.

<!-- s:e9719839f0 -->
| Campo de columna | Descripción |
| :-- | :-- |
| `key` | Identificador y función de acceso por defecto |
| `width` / `grow` | Número fijo de celdas o proporción del espacio restante |
| `align` | `left` `right` `center` |
| `value` | Valor para mostrar y ordenar |
| `render` | Contenido personalizado de la celda |
| `compare` | Ordenación personalizada |

<!-- s:045ee40857 -->
Ordenación

<!-- s:d04de39344 -->
Con `sortable`, pulsa el número de una columna para ordenar por ella (otra vez para invertir el orden), `s` para recorrer las columnas y `S` para invertir la dirección. La ordenación es estable. Contrólala con `sort` y `onSortChange`.

<!-- s:6d625a19ed -->
Selección

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` añade una columna de casillas de selección; `Space` alterna la selección de la fila resaltada. Usa `selectedKeys` y `onSelectionChange` para controlarla, y `getRowKey` para obtener claves estables.

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
Un árbol expandible con guías.

<!-- s:eeb148154f -->
`→` expande una rama o entra en ella. `←` contrae una rama o salta al nodo padre. `Space` alterna entre expandir y contraer. `flattenTree(data, expanded)` expone las filas visibles si necesitas tu propio renderizador.
