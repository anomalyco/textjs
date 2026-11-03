<!-- s:e4dabd0578 -->
Yoga, el motor flexbox que usa React Native, compilado a WebAssembly, calcula el layout de cada fotograma de Text.js. Las cajas y el texto comparten un único árbol de Yoga. La consola es una cuadrícula de celdas de caracteres, por lo que todas las posiciones y tamaños resultantes deben ser un número entero de celdas.

<!-- s:9c86e1b16d -->
Un punto equivale a una celda

<!-- s:9026ebff4f -->
Yoga redondea sus resultados a una cuadrícula de píxeles definida por el factor de escala de puntos. Con un factor de 2, como en una pantalla Retina, los bordes pueden situarse en medios puntos. Text.js carga Yoga una vez y establece el factor en 1:

<!-- s:f5193c7abd -->
Con un factor de 1, Yoga redondea cada borde a una unidad entera, y Text.js trata cada unidad como una celda. Yoga redondea la posición absoluta de cada borde y calcula los tamaños a partir de los bordes redondeados, de modo que las cajas adyacentes comparten un borde. Divide una fila de 81 columnas en dos cajas con `width="50%"` y una tendrá 40 columnas y la otra 41, sin huecos ni solapamientos.

<!-- s:4f9619621a -->
Text.js aplica por su cuenta los valores predeterminados de CSS: `flexDirection` es `row` y `flexShrink` es `1`, como en un navegador.

<!-- s:5240062c19 -->
Medición del texto

<!-- s:25f0052f43 -->
Los nodos de texto son hojas de Yoga con una función de medición. Yoga la llama con el ancho disponible, y Text.js devuelve el tamaño del texto en celdas:

<!-- s:a543588dc9 -->
El texto que cabe se devuelve con su tamaño natural. El texto que no cabe se ajusta al ancho disponible, y su altura es el número de líneas. El nodo conserva su último ajuste de línea, por lo que volver a medir el mismo ancho no vuelve a ajustar el texto.

<!-- s:3c253fdc4c -->
Medición de grupos de grafemas

<!-- s:7d52c4b9c9 -->
La propiedad `length` de una cadena cuenta unidades de código UTF-16, lo que dice poco sobre cuántas celdas ocupa. Primero se divide el texto en grupos de grafemas con `Intl.Segmenter`, de modo que una `e` seguida de un acento combinante forma un grupo, al igual que una secuencia de emojis unidos mediante caracteres de unión de ancho cero. Después se asigna un ancho a cada grupo:

<!-- s:f36acd4206 -->
| Texto | Celdas | Motivo |
| :-- | --: | :-- |
| `abc` | 3 | Una celda por carácter |
| `你好` | 4 | Los caracteres anchos de Asia oriental ocupan dos |
| `🚀` | 2 | La presentación como emoji ocupa dos |
| `é` (`e` + U+0301) | 1 | Las marcas combinantes no ocupan ninguna |
| `─│┌▼←⠋` | 6 | Los caracteres de dibujo de cajas, las formas geométricas, las flechas y el braille tienen un ancho fijo de una celda |

<!-- s:75d5c21868 -->
Los bordes, la marca `▼`, las flechas y los fotogramas del indicador de carga siempre se miden como una celda, por lo que el borde de una caja nunca desalinea su contenido.

<!-- s:cee20acd8c -->
El ASCII imprimible omite la segmentación, y los demás anchos se guardan en caché por punto de código y por grupo.

<!-- s:5f37d5a215 -->
Ajuste de línea

<!-- s:b59adefd34 -->
`<Text>` acepta un modo `wrap`:

<!-- s:0ad0b36724 -->
- `wrap` (el valor predeterminado) inserta saltos en los espacios y dentro de una palabra cuando esta es más ancha que la línea.
- `nowrap` mantiene una sola línea y deja que la caja la recorte.
- `truncate-end`, `truncate-middle` y `truncate-start` mantienen una sola línea y sustituyen lo que no cabe por `…`.

<!-- s:73ec8f197a -->
El truncamiento también cuenta celdas, por lo que una línea de texto en chino se corta entre caracteres, y los puntos suspensivos ocupan exactamente una celda.

<!-- s:1d11d6a370 -->
En la práctica

<!-- s:50e47bf264 -->
Aquí, una barra lateral de 30 columnas se sitúa junto a un panel que ocupa el ancho restante:

<!-- s:f9394d30d6 -->
En una consola de 100 columnas, la barra lateral ocupa 30 columnas incluido su borde, y el panel de conversación ocupa las otras 70. Un borde ocupa una celda a cada lado, por lo que el título de la sesión se trunca a las 28 celdas.
