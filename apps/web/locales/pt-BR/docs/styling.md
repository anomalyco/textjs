<!-- s:581711536b -->
Estilize componentes com utilitários de `className` ou props tipadas. Apps Text.js não têm folhas de estilo.

<!-- s:e0ac1db626 -->
Utilitários

<!-- s:2de571e2bf -->
`className` aceita utilitários no estilo Tailwind. Uma unidade equivale a uma célula.

<!-- s:785b2c3db0 -->
| Categoria | Exemplos |
| :-- | :-- |
| Layout | `flex-row` `grow` `items-center` `gap-1` |
| Espaçamento | `p-1` `px-2` `mt-1` |
| Bordas | `border` `rounded` `border-accent` |
| Cor | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
Props tipadas

<!-- s:4963259a42 -->
Cada utilitário tem uma prop. As props têm prioridade sobre `className`.

<!-- s:15a3834a24 -->
Cores

<!-- s:d333dad27a -->
Use valores hexadecimais, nomes do Tailwind ou tokens do tema como `fg`, `muted`, `surface`, `accent`, `success` e `danger`. Os tokens seguem o tema ativo.

<!-- s:087abce968 -->
Temas

<!-- s:abba2a3188 -->
Cinco predefinições vêm incluídas: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight` e `amberCrt`.

<!-- s:5dc490305b -->
Viewports responsivos

<!-- s:419fb844db -->
Por padrão, os apps preenchem o console acoplado do DevTools (`viewport.responsive`) e se redimensionam conforme você arrasta o painel. Organize o layout com flex e consulte o tamanho quando precisar:

<!-- s:3d847eadf9 -->
A página só consegue detectar um painel acoplado. O DevTools desacoplado, o zoom do DevTools e a barra lateral do Console são invisíveis para ela, então o app usa `viewport.width × viewport.height` (padrão `120×36`) ou um tamanho que você fixa:
