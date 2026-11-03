<!-- s:d3c8cb679e -->
`<List>`, `<Table>` et `<Tree>` affichent de grands jeux de données. Seules les lignes visibles sont rendues.

<!-- s:44ffd1d0a7 -->
Navigation

<!-- s:e3dca4574c -->
`<List>`, `<Table>` et `<Tree>` partagent les mêmes commandes clavier.

<!-- s:cdac0643be -->
| Touches | Action |
| :-- | :-- |
| `↑` `↓` / `j` `k` | Déplacement |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | Page, demi-page |
| `Home` `End` / `g` `G` | Premier, dernier |
| `↵` | `onSelect` |
| Molette | Déplacement du curseur |

<!-- s:1c65c42a4d -->
Ils remplissent leur parent par défaut. Passez `height` pour fixer le nombre de lignes.

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
Une liste virtualisée. Chaque ligne a une hauteur d’une cellule.

<!-- s:3408e68b29 -->
| Prop | Description |
| :-- | :-- |
| `items` | Tableau quelconque |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | Élément ignoré par le curseur |
| `height` | Lignes visibles (par défaut : remplissage) |
| `highlightedIndex` / `onHighlight` | Curseur contrôlé |
| `vimKeys` | `j` `k` `g` `G` (par défaut `true`) |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
Les colonnes se partagent la largeur restante, sauf si elles définissent `width`. Les en-têtes et les cellules utilisent les mêmes règles flex et restent donc toujours alignés.

<!-- s:e9719839f0 -->
| Champ de colonne | Description |
| :-- | :-- |
| `key` | Identifiant et accesseur par défaut |
| `width` / `grow` | Nombre fixe de cellules ou part de l’espace restant |
| `align` | `left` `right` `center` |
| `value` | Valeur d’affichage et de tri |
| `render` | Contenu personnalisé de la cellule |
| `compare` | Tri personnalisé |

<!-- s:045ee40857 -->
Tri

<!-- s:d04de39344 -->
Avec `sortable`, appuyez sur le numéro d’une colonne pour trier selon celle-ci (une seconde fois pour inverser l’ordre), sur `s` pour parcourir les colonnes et sur `S` pour inverser le sens du tri. Le tri est stable. Contrôlez-le avec `sort` et `onSortChange`.

<!-- s:6d625a19ed -->
Sélection

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` ajoute une colonne de cases à cocher ; `Space` sélectionne ou désélectionne la ligne surlignée. Utilisez `selectedKeys` et `onSelectionChange` pour contrôler la sélection, et `getRowKey` pour obtenir des clés stables.

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
Une arborescence dépliable avec des lignes de guidage.

<!-- s:eeb148154f -->
`→` déplie une branche ou y entre. `←` replie une branche ou passe au parent. `Space` bascule entre les deux états. `flattenTree(data, expanded)` expose les lignes visibles si vous avez besoin de votre propre moteur de rendu.
