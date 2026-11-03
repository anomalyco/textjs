<!-- s:d3c8cb679e -->
`<List>`, `<Table>` e `<Tree>` exibem grandes conjuntos de dados. Apenas as linhas visíveis são renderizadas.

<!-- s:44ffd1d0a7 -->
Navegação

<!-- s:e3dca4574c -->
`<List>`, `<Table>` e `<Tree>` compartilham o mesmo modelo de navegação por teclado.

<!-- s:cdac0643be -->
| Teclas | Ação |
| :-- | :-- |
| `↑` `↓` / `j` `k` | Mover |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | Avançar ou recuar uma página, meia página |
| `Home` `End` / `g` `G` | Ir para o primeiro, o último |
| `↵` | `onSelect` |
| Roda do mouse | Mover o cursor |

<!-- s:1c65c42a4d -->
Por padrão, eles preenchem o elemento pai. Passe `height` para definir um número fixo de linhas.

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
Uma lista virtualizada. As linhas têm uma célula de altura.

<!-- s:3408e68b29 -->
| Prop | Descrição |
| :-- | :-- |
| `items` | Qualquer array |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | Ignorado pelo cursor |
| `height` | Linhas visíveis (padrão: preencher) |
| `highlightedIndex` / `onHighlight` | Cursor controlado |
| `vimKeys` | `j` `k` `g` `G` (padrão `true`) |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
As colunas compartilham a largura restante, a menos que definam `width`. Cabeçalhos e células usam as mesmas regras de flex, por isso ficam sempre alinhados.

<!-- s:e9719839f0 -->
| Campo da coluna | Descrição |
| :-- | :-- |
| `key` | ID e acessor padrão |
| `width` / `grow` | Células fixas ou fração do espaço restante |
| `align` | `left` `right` `center` |
| `value` | Valor de exibição e ordenação |
| `render` | Conteúdo personalizado da célula |
| `compare` | Ordenação personalizada |

<!-- s:045ee40857 -->
Ordenação

<!-- s:d04de39344 -->
Com `sortable`, pressione o número de uma coluna para ordenar por ela (novamente para inverter), `s` para alternar entre colunas e `S` para inverter a direção. A ordenação é estável. Controle-a com `sort` e `onSortChange`.

<!-- s:6d625a19ed -->
Seleção

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` adiciona uma coluna de caixas de seleção; `Space` alterna a seleção da linha destacada. Use `selectedKeys` e `onSelectionChange` para controlar a seleção, e `getRowKey` para chaves estáveis.

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
Uma árvore expansível com guias.

<!-- s:eeb148154f -->
`→` expande ou entra em um ramo. `←` recolhe ou vai para o nó pai. `Space` alterna entre expandido e recolhido. `flattenTree(data, expanded)` expõe as linhas visíveis se você precisar de um renderizador próprio.
