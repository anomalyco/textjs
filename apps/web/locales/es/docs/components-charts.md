<!-- s:8f99ab8d5a -->
Los gráficos se dibujan con elementos de bloque. Las barras usan ocho niveles por celda, y las líneas usan una cuadrícula de 2×2 puntos por celda.

<!-- s:9bd48fe162 -->
`<LineChart>`

<!-- s:79abfce919 -->
Gráficos de líneas con matriz de puntos, eje Y y leyenda.

<!-- s:977778a73f -->
| Prop | Descripción |
| :-- | :-- |
| `series` | `{ data, label?, color? }[]` |
| `data` | Forma abreviada para una serie |
| `height` | Filas (por defecto `8`) |
| `min` / `max` | Límites fijos (por defecto: los datos) |
| `axis` | Eje Y con etiquetas de mínimo / máximo |
| `formatValue` | Etiquetas del eje (por defecto `1.2k`) |
| `marker` | `quadrant` (por defecto) o `braille` |

<!-- s:3827b070cb -->
`braille` agrupa 2×4 puntos por celda. Úsalo en terminales: Menlo, la fuente de la consola de DevTools en macOS, no tiene braille, y los glifos de sustitución son más anchos que una celda.

<!-- s:a1d8752203 -->
Los colores predeterminados de las series son `accent`, `success`, `warning`, `info` y `danger`.

<!-- s:58352890aa -->
`<BarChart>`

<!-- s:d57e6053f7 -->
Barras horizontales con etiquetas y valores alineados, con una precisión de un octavo de celda.

<!-- s:2d6e002278 -->
`<Sparkline>`

<!-- s:4bb495c66f -->
Llena su ancho con los puntos más recientes. Un valor de `height` superior a `1` renderiza un área rellena.

<!-- s:9b515e6ed1 -->
`sparkline(values)` devuelve el mismo sparkline como una cadena.

<!-- s:ddc43709d7 -->
`<ProgressBar>`

<!-- s:5455ef1226 -->
| Prop | Descripción |
| :-- | :-- |
| `value` / `max` | Progreso (omitir para indeterminado) |
| `variant` | `block` (suave) `line` `thin` |
| `width` | Celdas (por defecto: rellenar) |
| `label` | Texto inicial |
| `formatValue` | Texto final (por defecto `42%`) |

<!-- s:39c076d22f -->
Las barras indeterminadas se desplazan al ritmo de los fotogramas del renderizador y se detienen cuando se pausa la salida.

<!-- s:d5174cb2b9 -->
`<Gradient>`

<!-- s:2239584d9f -->
Interpolación de color por celda. Las cadenas de varias líneas comparten un gradiente, por lo que se combina con `<AsciiFont>`.

<!-- s:99155d62a4 -->
Gradientes con nombre: `geist` `dusk` `ocean` `mono` `ember`.

<!-- s:22dc53f52a -->
`<Image>`

<!-- s:35a4098e50 -->
Las consolas de Chromium y Firefox dibujan la imagen como un sprite de píxeles. El pixel art (256 colores o menos, sin píxeles parcialmente transparentes) conserva hasta 8 × 16 píxeles por celda, y las fotos hasta 4 × 8. Safari, las terminales, las copias en texto plano y las páginas con [`runtime = "server"`](/docs/server-rendering) reciben medios bloques `▀`: cada celda contiene dos píxeles, el superior en primer plano y el inferior en el fondo. Pasa `renderMode="halfblock"` para dibujar medios bloques en todas partes, como hacía `<Image>` en 1.3.

<!-- s:70bb4fc454 -->
| Prop | Descripción |
| :-- | :-- |
| `src` | URL de la imagen (solo en el navegador) |
| `pixels` | RGBA sin procesar como `{ width, height, data }`, 4 bytes por píxel en orden de filas |
| `width` / `height` | Ancho en celdas, alto en filas. Pasa uno para mantener la relación de aspecto, o ninguno para obtener 1 × 2 píxeles por celda (`src` se escala hasta un máximo de 256 × 256 px) |
| `fit` | `contain` (por defecto), `cover` o `fill` |
| `alt` | Texto que se muestra mientras carga `src` o si falla |
| `renderMode` | `auto` (por defecto: sprite donde se admite, medios bloques `▀` en los demás casos) o `halfblock` |

<!-- s:c106665c64 -->
`<Image>` también acepta propiedades de layout.

<!-- s:20dac26bff -->
`src` se carga a través de un canvas, por lo que las imágenes de otros orígenes necesitan CORS. `pixels` acepta RGBA sin procesar en cualquier entorno, incluida la terminal.

<!-- s:4e3b06ef0e -->
Una imagen también se dibuja con medios bloques en Chromium y Firefox cuando no puede ser un único sprite:

<!-- s:00d2e660eb -->
- Dos imágenes una al lado de otra en las mismas filas, como en una galería.
- Una foto con texto al lado. El pixel art junto a texto sigue siendo un sprite.
- Una imagen recortada por una caja con `overflow="hidden"`, o parcialmente cubierta por otra caja.
- Píxeles transparentes sobre texto o sobre más de un color de fondo.

<!-- s:dd4fefaac0 -->
`<Pixels>` (experimental)

<!-- s:71eeeca05d -->
`@textjs/react/experimental` exporta `<Pixels>` para búferes de fotogramas `0xRRGGBBAA` en tiempo real, como los de juegos, emuladores y vídeo. Escribe los píxeles empaquetados directamente en `source.data` e incrementa `frame` para volver a pintar.

<!-- s:2d12b69e81 -->
| Prop | Descripción |
| :-- | :-- |
| `source` | `{ width, height, data: Uint32Array }` en orden `0xRRGGBBAA` |
| `frame` | Contador de fotogramas; incrementar después de modificar `source.data` |
| `width` / `height` | Tamaño de la caja en celdas y filas |
| `fit` | `contain` (por defecto) o `fill` |
| `pixelAspect` | Ancho mostrado dividido por el alto de un píxel de origen (por defecto `1`) |
| `palette` | Paleta `PackedColor[]` opcional para cuantizar los colores |
| `sample` | Filtro para la alternativa de medios bloques: `nearest` (por defecto) o `average` |
| `renderMode` | `auto` (por defecto: sprite donde se admite, medios bloques `▀` en los demás casos) o `halfblock` |

<!-- s:2164b4fe56 -->
`renderMode="auto"` dibuja un sprite pixelado en Chromium, y en Firefox según las reglas de estilo de su consola (sin pruebas de rendimiento), y recurre a medios bloques `▀` en Safari, terminales, copias en texto plano y páginas con [`runtime = "server"`](/docs/server-rendering). Pasa `renderMode="halfblock"` para dibujar medios bloques en todas partes.

<!-- s:5d2bbbc47b -->
Para dibujar píxeles sin React, importa `drawPixels` de `@textjs/core/experimental` junto con `DrawPixelsOptions`, `PixelSource`, `PixelFit`, `PixelSample`, `PixelRenderMode`, `PixelEncoding` y `PixelRect`. Su opción `encoding: "rgba"` conserva más de 256 colores y transparencia alfa gradual para imágenes estáticas, y `fallback` pinta tus propias celdas donde no se pueda mostrar el sprite. Consulta [Cambios incompatibles](/docs/support-policy#breaking-changes) para saber cómo se versionan las exportaciones experimentales.
