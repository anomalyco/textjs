<!-- s:3c9b7877c3 -->
Text.js 0.3 añadió `@textjs/font`, un analizador y renderizador de fuentes FIGlet. Incluye las 17 fuentes de la distribución FIGlet 2.2.5, cada una en un módulo ES, y su salida coincide exactamente con la del binario `figlet` 2.2.5.

<!-- s:ffc9f0eae5 -->
Por qué FIGlet

<!-- s:3ff2fd01df -->
`<AsciiFont>` incluye dos estilos de letras, `block` y `compact`, desde la versión 0.1. FIGlet es el estándar para este tipo de letras desde 1991, y existen cientos de fuentes `.flf`. La compatibilidad con el formato permite incorporar cualquiera de ellas a una app de consola.

<!-- s:7fdbff5714 -->
Una fuente FIGlet es un archivo de texto plano. Una línea de cabecera establece la altura, el carácter hardblank y las reglas de layout; después, cada carácter se dibuja como un bloque de filas con una marca de fin al final de cada fila. En sus layouts predeterminados, FIGlet desplaza cada carácter hacia la izquierda hasta que toca el anterior y después usa las reglas de fusión de la fuente para decidir si los dos subcaracteres que se tocan se fusionan en uno.

<!-- s:4c761bba4d -->
Modos de layout

<!-- s:3f1c38cf92 -->
`figlet` tiene cinco layouts horizontales, y `renderFiglet` acepta los mismos cinco mediante `layout`:

<!-- s:51f1b95b8f -->
| `layout` | `figlet` | Efecto |
| :-- | :-- | :-- |
| `"default"` | `-s` | Layout propio de la fuente, normalmente con fusión |
| `"full"` | `-W` | Ancho completo; los caracteres nunca se tocan |
| `"fitted"` | `-k` | Acercamiento de los caracteres hasta que se tocan |
| `"smushed"` | `-S` | Fusión según las reglas de la fuente |
| `"universal"` | `-o` | Superposición de los caracteres posteriores sobre los anteriores |

<!-- s:7a1307992e -->
Un número de -1 a 63 indica directamente un modo de layout `-m`: `-1` corresponde al ancho completo, `0` al ajuste hasta el contacto y de `1` a `63` se seleccionan reglas de fusión. Están implementadas las seis reglas de fusión horizontal: carácter igual, guion bajo, jerarquía, par opuesto, X grande y hardblank. El analizador también admite el resto del formato: líneas de comentarios, caracteres etiquetados con códigos en decimal, octal y hexadecimal, el glifo de carácter ausente y fuentes de derecha a izquierda como `ivrit`.

<!-- s:0c920c94d3 -->
El ajuste de línea también sigue a FIGlet. `width` divide el texto entre palabras, y dentro de una palabra cuando esta supera el ancho de la línea, donde lo haría `figlet -w`. `figlet -w 80` imprime como máximo 79 columnas, por lo que `-w N` corresponde a `width: N - 1`.

<!-- s:729dda48fc -->
Coincidencia con el binario

<!-- s:385fe807a8 -->
`packages/font/test/fixtures/references.json` contiene 273 salidas generadas al ejecutar el `figlet` 2.2.5 real con cada fuente incluida en cada modo de layout, con ajuste de línea, justificación, texto de derecha a izquierda, modo de párrafo y la entrada de regresión del propio FIGlet con las opciones de su `run-tests.sh`. Cada caso almacena los argumentos, la entrada y la salida exacta, y la prueba vuelve a convertir la línea de comandos en opciones:

<!-- s:d31215cb4b -->
Las 273 coinciden. Para regenerar los datos de prueba, añade `figlet` 2.2.5 a tu `PATH` y ejecuta `bun run --cwd packages/font references`.

<!-- s:9854b41cbc -->
Fuentes en la cuadrícula de celdas

<!-- s:ede6764977 -->
Todas las fuentes incluidas dibujan con caracteres ASCII imprimibles o Latin-1, por lo que cada subcarácter ocupa exactamente una celda en Menlo y se alinea con la cuadrícula. `<FigletText>` mide sus filas en celdas, por lo que las letras se sitúan en un layout flexbox como cualquier otro `<Text>`, y `columns` y `align` ajustan las líneas y las justifican dentro de su caja.

<!-- s:3cedd51e92 -->
Cada fuente tiene su propio módulo, por lo que una app solo distribuye las fuentes que importa, y cada fuente se analiza en el primer renderizado en lugar de al importarla. `@textjs/font/all` exporta todas las fuentes para las galerías.

<!-- s:9d54eeef4f -->
Cualquier otra FIGfont se puede obtener y analizar en tiempo de ejecución:

<!-- s:f64649f401 -->
Licencias

<!-- s:67e882f6b4 -->
Las fuentes incluidas son idénticas byte a byte a las de `figlet-2.2.5.tar.gz` y se distribuyen bajo la licencia BSD de 3 cláusulas de FIGlet. Cada una conserva sus créditos en sus líneas de comentarios, disponibles en `font.comment`. No se incluyen fuentes populares sin permiso de redistribución, como Doom, Larry 3D, ANSI Shadow y Calvin S.

<!-- s:ee98166722 -->
La referencia completa está en [Fuentes](/docs/fonts).
