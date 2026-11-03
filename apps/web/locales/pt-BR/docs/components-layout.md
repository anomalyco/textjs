<!-- s:19797c0276 -->
Essas primitivas organizam a grade de células com Yoga flexbox.

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
O contêiner de layout.

<!-- s:b2726c7ef5 -->
| Prop | Descrição |
| :-- | :-- |
| `className` | Utilitários de células |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | Texto inserido na borda superior |
| `bg` / `fg` | Cor de fundo e do texto |
| `overflow` | `hidden` ou `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
Texto em linha. Elementos `<Text>` aninhados se tornam spans estilizados.

<!-- s:d078a242d3 -->
| Prop | Descrição |
| :-- | :-- |
| `color` | Cor do texto |
| `bold` `italic` `underline` `dim` | Atributos |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
Uma coluna com rolagem. `stickyScroll` mantém a rolagem no fim conforme o conteúdo cresce.

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
Uma sobreposição centralizada que escurece o conteúdo abaixo e mantém o foco dentro dela.

<!-- s:7a128a8b11 -->
Spacer, Divider e Badge

<!-- s:72e5d35050 -->
Auxiliares de layout

<!-- s:e76299d593 -->
Atalhos para disposições flex comuns.

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
Dois painéis e um divisor. Com `resizable`, o divisor entra na ordem de `Tab` e `←` `→` o redimensionam (`Shift` para cinco células).

<!-- s:2143924860 -->
`size` é uma fração (`0.3`) ou um número de células (`24`). `direction="column"` empilha os painéis.
