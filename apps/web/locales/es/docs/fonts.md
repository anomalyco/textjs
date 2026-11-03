<!-- s:dd02562b57 -->
`@textjs/font` analiza archivos FIGfont 2 (`.flf`) y los distribuye exactamente como el programa `figlet`. Cada fuente es un módulo ES, por lo que solo se incluyen las fuentes que importas.

<!-- s:a15d12503b -->
Instalación

<!-- s:63bfd61a05 -->
Uso

<!-- s:fdffc4b786 -->
`<FigletText>` recibe una fuente y una cadena. Las filas se miden en celdas, por lo que las letras encajan en layouts flexbox como cualquier otro `<Text>`.

<!-- s:a85abebd7c -->
[`<AsciiFont>`](/docs/components-content#asciifont) acepta las mismas fuentes y conserva sus estilos de letras integrados `block` y `compact`:

<!-- s:9fc6ab3e8b -->
Fuera de React, `renderFiglet` devuelve una cadena por fila:

<!-- s:1ab8b509e0 -->
Layout

<!-- s:d143897d5b -->
El layout horizontal sigue las opciones de FIGlet.

<!-- s:115b8ae91e -->
| `layout` | `figlet` | Efecto |
| :-- | :-- | :-- |
| `"default"` | `-s` | El layout de la fuente, normalmente con fusión |
| `"full"` | `-W` | Ancho completo; los caracteres nunca se tocan |
| `"fitted"` | `-k` | Ajuste de espaciado; los caracteres se acercan hasta tocarse |
| `"smushed"` | `-S` | Fusión según las reglas de la fuente, incluso para fuentes con espaciado ajustado |
| `"universal"` | `-o` | Los caracteres posteriores se superponen a los anteriores |
| `0`–`63` | `-m` | Modo de fusión explícito |

<!-- s:d9f3601792 -->
Se implementan las seis reglas de fusión horizontal: carácter igual, guion bajo, jerarquía, par opuesto, X grande y espacio inseparable.

<!-- s:889b1e19ef -->
`verticalLayout` se aplica al texto de varias líneas. FIGlet 2.2.5 nunca reduce la separación entre líneas, por lo que el valor predeterminado es `"full"`; `"fitted"`, `"smushed"` y `"universal"` implementan las cinco reglas verticales, incluida la superfusión de líneas verticales, y `"default"` usa las de la fuente.

<!-- s:d4ec30b173 -->
Ajuste de línea y alineación

<!-- s:f799453d05 -->
`columns` (o `width` en `renderFiglet`) ajusta las líneas entre palabras y después dentro de ellas, exactamente donde lo haría `figlet -w`. `align` puede ser `"left"`, `"center"` o `"right"`; sin un ancho, las filas se alinean dentro de la fila más ancha. Las fuentes de derecha a izquierda, como `ivrit`, se imprimen de derecha a izquierda y se alinean a la derecha; cambia este comportamiento con `direction`.

<!-- s:f8ccfce091 -->
Fuentes incluidas

<!-- s:15e0b8eca7 -->
| Importación | Filas | Notas |
| :-- | :-- | :-- |
| `@textjs/font/standard` | 6 | Predeterminada de FIGlet |
| `@textjs/font/slant`, `smslant` | 6, 5 | Inclinada |
| `@textjs/font/small` | 5 | Compacta |
| `@textjs/font/big` | 8 | Caracteres griegos incluidos |
| `@textjs/font/banner` | 8 | Letras con `#`, katakana y cirílico |
| `@textjs/font/block`, `lean` | 8 | Contorno, vertical e inclinado |
| `@textjs/font/shadow`, `smshadow` | 5, 4 | Sombra paralela |
| `@textjs/font/script`, `smscript` | 7, 5 | Manuscrita |
| `@textjs/font/mini` | 4 | Diminuta |
| `@textjs/font/bubble`, `digital` | 4, 3 | Letras en círculos y recuadros |
| `@textjs/font/ivrit` | 6 | Hebreo, de derecha a izquierda |
| `@textjs/font/term` | 1 | Entrada sin cambios |

<!-- s:a8ecd7e9c1 -->
Cada glifo es ASCII imprimible o Latin-1, por lo que cada subcarácter ocupa exactamente una celda en la fuente Menlo de DevTools. `@textjs/font/all` exporta todas las fuentes, además de `BUNDLED_FONTS` para galerías. Las fuentes se analizan en el primer renderizado, no al importarlas.

<!-- s:74ff0f95fa -->
Fuentes personalizadas

<!-- s:093892bc6a -->
Cualquier FIGfont funciona. Descárgala y después analízala:

<!-- s:c2f4ef471e -->
El analizador lee la cabecera, las líneas de comentarios, los espacios inseparables, las marcas de fin, los 102 caracteres obligatorios y los caracteres etiquetados con códigos en decimal, octal o hexadecimal. Las fuentes TOIlet `.tlf` se renderizan como texto sin formato. Elige preferentemente fuentes dibujadas con ASCII o caracteres de dibujo de recuadros; el braille y los emojis no ocupan una sola celda de ancho en Menlo.

<!-- s:f64649f401 -->
Licencias

<!-- s:adad99f0de -->
Las fuentes incluidas son las de la distribución FIGlet 2.2.5, byte por byte, bajo la licencia BSD de 3 cláusulas de FIGlet. Cada una conserva sus créditos en sus líneas de comentarios, disponibles en tiempo de ejecución como `font.comment`. No se incluyen fuentes populares sin permiso de redistribución, como Doom, Larry 3D, ANSI Shadow y Calvin S.

<!-- s:2a50d4cddc -->
Verificación con `figlet`

<!-- s:111c132fa2 -->
La suite de pruebas reproduce 273 salidas registradas del binario real de `figlet` 2.2.5: cada fuente incluida en cada modo de layout, ajuste de línea, justificación, texto de derecha a izquierda, modo de párrafo y la entrada de regresión del propio FIGlet. Todas coinciden exactamente.
