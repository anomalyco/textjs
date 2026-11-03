<!-- s:06b0e11de4 -->
Estos campos se controlan con el teclado y gestionan su propio foco.

<!-- s:1d0d345c65 -->
Foco

<!-- s:bc06482880 -->
`Tab` y `Shift+Tab` alternan el foco. `autoFocus` toma el foco al montarse.

<!-- s:fca23dd943 -->
Los editores con foco consumen las pulsaciones de teclas, por lo que escribir `1` nunca activa un atajo global.

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
Campo de una sola línea con edición al estilo de readline.

<!-- s:88cdcfc0ea -->
| Prop | Descripción |
| :-- | :-- |
| `value` / `onChange` | Valor controlado |
| `onSubmit` | Función que se llama al pulsar `Enter` |
| `placeholder` | Texto que se muestra cuando el campo está vacío |
| `mask` | Carácter de enmascaramiento para datos secretos |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
Editor de varias líneas. `Enter` envía el contenido, `Shift+Enter` añade un salto de línea.

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
Lista de opciones controlada con el teclado, con búsqueda difusa opcional.

<!-- s:70fe7d6c9b -->
| Prop | Descripción |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | Función que se llama al pulsar `Enter` |
| `searchable` | Filtrado de opciones al escribir |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
Cursor sin foco

<!-- s:f0552feed5 -->
Cuando la página pierde el foco, los cursores se congelan y los fotogramas se detienen, para que puedas seleccionar y copiar texto de la consola.
