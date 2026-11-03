<!-- s:19797c0276 -->
Estas primitivas organizan la cuadrícula de celdas con Yoga flexbox.

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
El contenedor de layout.

<!-- s:b2726c7ef5 -->
| Prop | Descripción |
| :-- | :-- |
| `className` | Utilidades de celda |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | Texto incrustado en el borde superior |
| `bg` / `fg` | Color de fondo y de texto |
| `overflow` | `hidden` o `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
Texto en línea. Los componentes `<Text>` anidados se convierten en spans con estilos.

<!-- s:d078a242d3 -->
| Prop | Descripción |
| :-- | :-- |
| `color` | Color del texto |
| `bold` `italic` `underline` `dim` | Atributos |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
Una columna con desplazamiento. `stickyScroll` mantiene el desplazamiento al final a medida que crece el contenido.

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
Una capa superpuesta centrada que atenúa lo que hay debajo y retiene el foco.

<!-- s:7a128a8b11 -->
Spacer, Divider y Badge

<!-- s:72e5d35050 -->
Utilidades de layout

<!-- s:e76299d593 -->
Formas abreviadas para disposiciones flex habituales.

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
Dos paneles y un divisor. Con `resizable`, el divisor se incorpora al orden de `Tab` y `←` `→` lo redimensionan (`Shift` para cinco celdas).

<!-- s:2143924860 -->
`size` es una fracción (`0.3`) o un número de celdas (`24`). `direction="column"` apila los paneles.
