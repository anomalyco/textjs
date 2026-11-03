<!-- s:bd59ce7974 -->
Text.js ahora renderiza hebreo, árabe, persa y otras escrituras de derecha a izquierda en el orden correcto, con las letras árabes unidas, en la misma cuadrícula de celdas que todo lo demás.

<!-- s:4673b00c8b -->
Cada párrafo elige su dirección base a partir de su primer carácter fuerte, como hace `dir="auto"` en HTML, y los párrafos de derecha a izquierda se alinean a la derecha. En un `<Text>` anidado, `dir` aísla el span como lo hace `<bdi>`, de modo que un nombre de usuario de dirección desconocida no puede reordenar el texto que lo rodea.

<!-- s:9026fc3194 -->
El algoritmo

<!-- s:f13f3bb4af -->
La compatibilidad con texto de derecha a izquierda es una implementación del algoritmo bidireccional de Unicode (UAX #9, Unicode 18.0), escrita desde cero en `@textjs/core`. Resuelve los niveles de incrustación de cada párrafo, incluidas las incrustaciones explícitas y los aislamientos, los tipos débiles y neutros y los paréntesis emparejados. Después, cada línea ajustada se reordena por separado y los caracteres con reflejo se intercambian en los niveles de derecha a izquierda, de modo que `(abc)` sigue siendo `(abc)` dentro del hebreo.

<!-- s:82ed91ab82 -->
Unicode publica dos archivos de conformidad para el algoritmo. Ambos están incluidos en el repositorio, comprimidos con gzip, y la suite de pruebas ejecuta todos los casos:

<!-- s:0f8ff8c469 -->
- `BidiTest.txt` enumera las entradas como secuencias de clases bidi, cada una con las direcciones de párrafo a las que se aplica. Text.js supera los 770.241 casos.
- `BidiCharacterTest.txt` enumera cadenas reales con los niveles y el orden esperados. Text.js supera los 91.707.

<!-- s:3939cd5f43 -->
Del orden lógico a las celdas

<!-- s:e682972504 -->
Una línea de texto de derecha a izquierda pasa por cuatro pasos antes de llegar a la consola:

<!-- s:a497c14c9c -->
1. **Ajustar en orden lógico.** Las líneas se dividen donde lo harían en un texto de izquierda a derecha, según el ancho de las celdas.
2. **Reordenar cada línea.** Los niveles resueltos determinan el orden de visualización de los grafemas de la línea.
3. **Dar forma al árabe.** Las letras adoptan sus formas contextuales (aislada, inicial, medial, final) de los bloques de formas de presentación árabes. Una letra ocupa una celda, y las formas unidas se mantienen aunque haya un cursor o un cambio de color en medio de una palabra.
4. **Fijar el orden.** Las celdas ahora contienen glifos en el orden de visualización.

<!-- s:5d1156720d -->
El último paso existe porque DevTools aplicaría bidi al texto una segunda vez y volvería a invertirlo. Un estilo `%c` no puede desactivar ese comportamiento, porque el saneador de DevTools elimina `direction` y `unicode-bidi`. Por eso, el controlador envuelve cada span que contiene caracteres de derecha a izquierda en `LRO` y `PDF` (U+202D y U+202C), lo que fuerza la visualización de izquierda a derecha de exactamente lo que contienen las celdas.

<!-- s:aba313fc71 -->
Un desfase de media celda

<!-- s:1109446b98 -->
Ni SF Mono ni Menlo tienen glifos hebreos o árabes, por lo que el navegador recurre a una fuente alternativa para cada carácter. En macOS es Courier New, también monoespaciada, con 7,2012 px por glifo a 12 px frente a los 7,2246 px de Menlo. Es un 0,3 % más estrecha, suficiente para desplazar una fila completa de hebreo alrededor de media celda.

<!-- s:dc26e96bdd -->
`CssConsoleDriver` mide cada span de derecha a izquierda con un canvas que usa la fuente de la consola, con el mismo mecanismo de fuentes alternativas de Blink que DevTools, y añade al span la diferencia exacta en LayoutUnits (1/64 px). Cada span acaba teniendo el mismo ancho que las celdas de la cuadrícula que ocupa. Un span se reduce como máximo media celda, de modo que una fuente alternativa mucho más ancha se desborda en lugar de superponerse al siguiente span.

<!-- s:b0d2e5e9d2 -->
`bun bench/devtools/bidi-shot.ts` mide el resultado en la interfaz real de DevTools, en un fotograma de 64×21 con líneas en hebreo, en árabe, mixtas y con emojis dentro del hebreo:

<!-- s:e6a33dfaa2 -->
| Fotograma | Desfase del borde derecho entre filas |
| :-- | --: |
| Celdas registradas sin fijar el orden | 14,5 px |
| Orden fijado, sin ajuste de ancho | 2,22 px |
| Controlador distribuido | 0,156 px |
| Control: cada glifo RTL sustituido por `x` | 1,67 px |

<!-- s:d03d5a84a3 -->
El control es el mismo fotograma con texto latino. El controlador distribuido se alinea mejor que el control porque los emojis dentro de los spans de derecha a izquierda se ajustan junto con ellos.

<!-- s:d37099863b -->
El texto de izquierda a derecha no cambia

<!-- s:41ce31b66a -->
El texto sin caracteres de derecha a izquierda omite todo este proceso. La comprobación se hace mientras se segmentan los grafemas, con una comparación por grafema, y el texto exclusivamente de izquierda a derecha se dibuja por la misma ruta que antes, por lo que sus fotogramas de consola son idénticos byte a byte.

<!-- s:a8fff567e6 -->
El texto de derecha a izquierda está disponible en Text.js 1.0. [Internacionalización](/docs/internationalization) cubre la entrada, la edición, los terminales y la API.
