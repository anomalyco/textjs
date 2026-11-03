<!-- s:f9337b40e7 -->
Text.js incluye hooks para temporizadores, animación, medición y persistencia. Los temporizadores y las animaciones siguen el ritmo de fotogramas del renderizador.

<!-- s:43bb49a7a4 -->
Temporizadores

<!-- s:15335858dd -->
Ambos llaman siempre al callback más reciente. `null` los detiene.

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame` se ejecuta una vez por intervalo de fotograma. Text.js emite unos 15 fotogramas por segundo, por lo que animar más rápido consume CPU en fotogramas que nunca se registran en la consola. Los bucles comparten un temporizador por frecuencia y se detienen mientras la salida está en pausa.

<!-- s:faffc1716f -->
`useTween` y `useSpring`

<!-- s:e1a9665d36 -->
Ambos devuelven un número que se anima hacia el valor objetivo y dejan de actualizarse cuando se estabilizan. `easings` contiene `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo` y otros.

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
El layout se calcula después de que React confirma los cambios, por lo que las dimensiones llegan un fotograma después. Solo se vuelve a renderizar cuando cambia el tamaño.

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | Columnas |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
Los puntos de ruptura se expresan en columnas. Pasa tus propios umbrales como argumento.

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage` almacena JSON en `localStorage`, y en memoria fuera del navegador. Los hooks que comparten una clave se mantienen sincronizados, también entre pestañas.

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` es un límite de foco invisible. Con `trap`, `Tab` y `useInput` permanecen dentro de él, igual que en un `<Modal>` sin la capa superpuesta.
