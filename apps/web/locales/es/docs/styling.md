<!-- s:581711536b -->
Aplica estilos a los componentes con utilidades de `className` o props tipadas. Las apps de Text.js no tienen hojas de estilo.

<!-- s:e0ac1db626 -->
Utilidades

<!-- s:2de571e2bf -->
`className` acepta utilidades al estilo de Tailwind. Una unidad equivale a una celda.

<!-- s:785b2c3db0 -->
| Categoría | Ejemplos |
| :-- | :-- |
| Layout | `flex-row` `grow` `items-center` `gap-1` |
| Espaciado | `p-1` `px-2` `mt-1` |
| Bordes | `border` `rounded` `border-accent` |
| Color | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
Props tipadas

<!-- s:4963259a42 -->
Cada utilidad tiene una prop. Las props tienen prioridad sobre `className`.

<!-- s:15a3834a24 -->
Colores

<!-- s:d333dad27a -->
Usa valores hexadecimales, nombres de Tailwind o tokens del tema como `fg`, `muted`, `surface`, `accent`, `success` y `danger`. Los tokens siguen el tema activo.

<!-- s:087abce968 -->
Temas

<!-- s:abba2a3188 -->
Se incluyen cinco temas predefinidos: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight` y `amberCrt`.

<!-- s:5dc490305b -->
Viewports adaptables

<!-- s:419fb844db -->
Las apps ocupan por defecto toda la consola acoplada de DevTools (`viewport.responsive`) y cambian de tamaño al arrastrar el panel. Organiza el layout con flex y consulta el tamaño cuando lo necesites:

<!-- s:3d847eadf9 -->
La página solo puede detectar un panel acoplado. No puede detectar DevTools desacoplado, el zoom de DevTools ni la barra lateral de «Consola», por lo que la app usa `viewport.width × viewport.height` (por defecto `120×36`) o un tamaño que fijes:
