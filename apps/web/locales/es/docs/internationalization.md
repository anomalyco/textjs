<!-- s:43751f7845 -->
Text.js renderiza hebreo, árabe, persa y otras escrituras de derecha a izquierda en el orden correcto, alineadas con la cuadrícula de celdas, en DevTools, terminales y réplicas DOM. Implementa el algoritmo bidireccional de Unicode (UAX #9, Unicode 18.0) y supera las suites oficiales de conformidad: los 770.241 casos de `BidiTest.txt` (cada entrada en cada dirección de párrafo) y los 91.707 casos de `BidiCharacterTest.txt`.

<!-- s:7c0d8f9883 -->
Dirección

<!-- s:0c7b144a82 -->
Cada párrafo (cada línea de un `<Text>` separada por `\n`) elige su dirección base a partir de su primer carácter fuerte, como hace `dir="auto"` en HTML. Los párrafos de derecha a izquierda se alinean a la derecha por defecto.

<!-- s:c17beb4498 -->
| `align` | Párrafo de izquierda a derecha | Párrafo de derecha a izquierda |
| :-- | :-- | :-- |
| `"start"` (predeterminado) | izquierda | derecha |
| `"end"` | derecha | izquierda |
| `"left"` / `"center"` / `"right"` | según lo indicado | según lo indicado |

<!-- s:6db8fa68bb -->
En un `<Text>` anidado, `dir` aísla el span como el `<bdi>` de HTML: su contenido se distribuye de forma independiente y no puede reordenar el texto que lo rodea. Úsalo para nombres, títulos y otros textos de dirección desconocida proporcionados por los usuarios.

<!-- s:68088feb2d -->
Proceso de renderizado

<!-- s:d401630cda -->
1. **Dividir las líneas en orden lógico.** Las líneas se dividen exactamente igual que en el texto de izquierda a derecha, según el ancho de las celdas.
2. **Reordenar cada línea.** El algoritmo resuelve los niveles de incrustación de todo el párrafo (incrustaciones explícitas y aislamientos, tipos débiles y neutros, signos de cierre y apertura emparejados); después, cada línea resultante se reordena por separado (reglas L1–L2). Los signos de cierre y apertura y otros caracteres reflejados se intercambian en los niveles de derecha a izquierda (L4), por lo que `(abc)` sigue siendo `(abc)` dentro del hebreo.
3. **Dar forma al árabe.** Las letras adoptan sus formas contextuales (aislada, inicial, medial, final) de los bloques Arabic Presentation Forms, calculadas en orden lógico dentro de cada tramo de nivel de la línea (ZWJ y ZWNJ cuentan en la posición que ocupan). Cada letra ocupa una celda, las formas unidas se conservan al cruzar cualquier límite de span (un cursor, un cambio de color) y la consola nunca tiene que darles forma.
4. **Fijar el orden.** Las celdas contienen ahora glifos en orden de visualización. Los navegadores y muchas terminales les aplicarían bidi una segunda vez, así que los controladores fijan el orden:

<!-- s:153724c967 -->
| Salida | Cómo se fija el orden |
| :-- | :-- |
| DevTools (`CssConsoleDriver`) | Los spans que contienen caracteres de derecha a izquierda se envuelven en `LRO … PDF` (U+202D / U+202C). El sanitizador de `%c` de DevTools elimina `direction` y `unicode-bidi`. |
| Terminales (`AnsiDriver`, `text run`) | Las filas con texto de derecha a izquierda se envuelven en `LRO … PDF` para las terminales que aplican bidi por línea. `renderToTerminal` cambia al modo explícito BDSM de ECMA-48 (`CSI 8 l`, respetado por las terminales basadas en VTE) una vez al entrar y vuelve al modo implícito (`CSI 8 h`) al salir; los fotogramas individuales de `renderToAnsi` que contienen texto de derecha a izquierda empiezan con `CSI 8 l`. Pasa `bidi: "none"` para emitir las celdas tal cual. |
| Réplicas DOM (`<ConsoleMirror>`) | La réplica usa `direction: ltr` (para que una página anfitriona RTL no pueda invertirla), y los spans que contienen texto de derecha a izquierda reciben `unicode-bidi: bidi-override`. |

<!-- s:5b312c5079 -->
`<Box title>`, `<Box bottomTitle>` y `<Divider title>` siguen los mismos pasos (`drawLogicalText(buffer, x, y, text, …)` dibuja cualquier línea individual de esta manera), por lo que sus etiquetas se muestran en orden y con las letras unidas.

<!-- s:3b67946601 -->
El texto sin caracteres de derecha a izquierda omite todo este proceso. Un modelo de texto exclusivamente de izquierda a derecha se detecta mientras se segmentan sus grafemas (una comparación por grafema) y se dibuja mediante la ruta sin cambios; los fotogramas de la consola son idénticos byte a byte.

<!-- s:26ac17c25a -->
Anchos de celda

<!-- s:552e751976 -->
La pila de fuentes incluida es `"SF Mono", Menlo, "Cascadia Mono", Consolas, monospace`. Ninguna de estas fuentes tiene glifos hebreos o árabes, por lo que los navegadores recurren a una fuente alternativa para cada carácter. En macOS es Courier New, que es monoespaciada a 0,6 em: 7,2012 px por glifo a 12 px frente a los 7,2246 px de Menlo. Es un 0,3 % más estrecha, lo suficiente para desplazar una fila completa de hebreo aproximadamente media celda.

<!-- s:851f84e769 -->
`CssConsoleDriver` mide cada span de derecha a izquierda con un canvas que usa la fuente de la consola (con la misma conformación de Blink y sustitución de fuentes que usa DevTools) y luego añade un relleno equivalente a la diferencia exacta en LayoutUnit (1/64 px). El span termina con el mismo ancho que las celdas de la cuadrícula que ocupa (un grafema ancho, como un emoji, cuenta como dos). Un span se contrae como máximo media celda, de modo que una fuente alternativa proporcional (Times New Roman junto a Cascadia Mono en Windows) desborda en vez de permitir que el siguiente span se superponga a sus glifos. Mediciones en la interfaz real de DevTools (Chromium 151) sobre un fotograma de 64×21 con líneas en hebreo, árabe, mixtas y con emojis en hebreo, y títulos de cajas RTL (`bun bench/devtools/bidi-shot.ts`):

<!-- s:45d1be4db4 -->
| Fotograma | Desviación del borde derecho entre filas |
| :-- | --: |
| Celdas registradas sin fijar el orden | 14,5 px (DevTools reordena y vuelve a dar forma) |
| Orden fijado, sin ajuste de ancho | 2,22 px |
| Controlador incluido | 0,156 px |
| Control: mismas celdas, con cada glifo RTL sustituido por `x` | 1,67 px |

<!-- s:a7ec844aae -->
El fotograma del controlador incluido coincide con el control íntegramente latino en todas las filas salvo la de emojis, donde obtiene un mejor resultado: los emojis se ajustan junto con el span de derecha a izquierda que los rodea (0,03 px), mientras que la fila de emojis de izquierda a derecha del control no se ajusta (1,66 px).

<!-- s:318b8b5f4c -->
DevTools dibuja cada span `%c` con `contain: paint` y ajusta cada uno a los píxeles del dispositivo por separado, por lo que, cuando dos fondos se encuentran en una posición fraccionaria, el píxel entre ambos puede no asignarse a ninguno y dejar una línea de 1 px. En Chrome y Edge, un span con fondo lo extiende 1 px por debajo de su vecino opaco de la derecha, y un span ajustado añade ese píxel a su relleno. Ninguno de los cuatro fotogramas anteriores muestra esa línea.

<!-- s:7deafc8e74 -->
Pasa `measureText: false` para desactivar el ajuste, o proporciona tu propia función de medición `(text, bold, italic) => px`.

<!-- s:f088ff48f9 -->
Entrada y edición

<!-- s:6aca925fed -->
`<Input>` y `<Textarea>` mantienen un cursor lógico. Las teclas de flecha recorren el texto en el orden de almacenamiento, por lo que, en texto de derecha a izquierda, ← se mueve visualmente a la derecha. El cursor de bloque se sitúa sobre el carácter lógico que cubre, dondequiera que lo coloque la reordenación. Dentro de un tramo de derecha a izquierda, es la celda a la izquierda del carácter anterior. La selección también es un intervalo lógico, por lo que su resaltado puede cubrir celdas no contiguas en líneas de dirección mixta. El desplazamiento horizontal de un `<Input>` de una sola línea sigue la columna lógica, por lo que un valor largo de derecha a izquierda puede desplazar el cursor fuera de la vista. Un cursor sobre un espacio o al final del texto se dibuja como un espacio de no separación aislado, de modo que permanece neutro y nunca se une a los números de ninguno de sus lados.

<!-- s:68c8d3995f -->
Limitaciones

<!-- s:fbb8008232 -->
- **Separadores de párrafo.** Las líneas se dividen en `\n`. U+2029 y otros separadores de párrafo terminan un párrafo bidi, pero no inician una línea nueva.
- **Tabulaciones.** Las tabulaciones se expanden a espacios antes de que se ejecute bidi, por lo que actúan como espacios en blanco (WS), no como separadores de segmento (S).
- **Conformación.** Solo se da forma a las letras con formas de presentación: árabe, persa, urdu y las demás letras de U+FB50–U+FDFF y U+FE70–U+FEFF. Lam-alef se mantiene como dos letras unidas en dos celdas, en lugar de la ligadura de un solo glifo. El siríaco, el N'Ko y otras escrituras con letras unidas conservan sus formas nominales.
- **Copia.** El texto copiado de la consola está en orden de visualización (con las marcas `LRO`/`PDF`), no en orden lógico.
- **Terminales.** Las terminales que ignoran tanto BDSM como `LRO` y ejecutan su propio bidi (por ejemplo, con bidi activado en iTerm2) pueden volver a reordenar las filas de derecha a izquierda.
- **Réplicas DOM.** `<ConsoleMirror>` no ajusta los anchos, por lo que los tramos de derecha a izquierda pueden desviarse hasta un 0,3 % de su ancho.

<!-- s:40caf66c4d -->
API

<!-- s:03607f875b -->
`resolveLevels(types, codePoints, direction)`, `applyLineRules` y `reorderIndices` exponen el propio algoritmo: las reglas P1–I2, L1 y L2.
