<!-- s:cf6b8fc694 -->
Hasta ahora, una app de Text.js gestionaba las teclas en `useInput` y las enumeraba una segunda vez, a mano, en un pie de página con `<KeyHint>`. `useKeymap` sustituye ambas cosas con una sola declaración.

<!-- s:8ec88859eb -->
Al pulsar `j` se ejecuta `next`. En macOS, `<KeyHints>` muestra `j/↓ Next` y `⌃S Save` en el pie de página, porque esas asignaciones definen `hint`. `?` abre una pantalla de ayuda con las cuatro, agrupadas bajo Navegación, y `Ctrl+K` abre una paleta que permite buscarlas.

<!-- s:c7c1123a0d -->
Sintaxis de teclas

<!-- s:e9843726ad -->
| Sintaxis | Significado |
| :-- | :-- |
| `ctrl+k` | Modificadores: `ctrl`, `alt`, `shift`, `meta` y `mod` |
| `mod+k` | `⌘` o `Ctrl`, según cuál se mantenga pulsada |
| `j, down` | Alternativas |
| `g g` | Una secuencia, con hasta 1 segundo entre teclas |
| `G` | La mayúscula implica `Shift` |
| `?` | Las teclas imprimibles coinciden con el carácter |

<!-- s:5d4b81956d -->
Una asignación es un manejador o un objeto con `label`, `group`, `hint`, `command`, `disabled` y `noRepeat`. `command: false` excluye de la paleta una asignación con etiqueta. Las asignaciones sin etiqueta funcionan, pero no aparecen en la pantalla de ayuda ni en la paleta.

<!-- s:7beff5bd29 -->
Enrutamiento

<!-- s:5f000bf949 -->
Cada mapa de teclas registra un manejador de `useInput`, por lo que se aplican las reglas de entrada existentes. Un `<Input>` con el foco gestiona las teclas primero, porque los editores escuchan con prioridad 10 y los mapas de teclas con prioridad 0. Una tecla que coincide detiene la propagación. Un `<Modal>` abierto desactiva las asignaciones externas, salvo que el mapa de teclas pase `global: true`.

<!-- s:a6076c8127 -->
Las secuencias se reconocen dentro de ese manejador. Una tecla que inicia una secuencia queda pendiente y detiene la propagación, y la secuencia se reinicia cuando la siguiente tecla llega después de más de `sequenceTimeout` (1000 ms de forma predeterminada):

<!-- s:aa0a9c8615 -->
Un registro por raíz

<!-- s:8a689d7ce6 -->
Las asignaciones con etiqueta se publican en un registro que pertenece a la raíz de la consola. `<KeyHelp>`, `<KeyHints>` y `<CommandPalette>` leen de él, y tus propios componentes también pueden hacerlo mediante `useKeymapBindings()`. Mientras un modal está abierto, el registro devuelve solo las asignaciones de su interior, de modo que la pantalla de ayuda enumera las teclas que funcionan en ese momento.

<!-- s:ab5f364d60 -->
Los mapas de teclas suelen escribirse en línea, lo que crea un objeto nuevo en cada renderizado. Para mantener un coste bajo, un mapa de teclas vuelve a publicar sus etiquetas solo cuando cambia su forma visible:

<!-- s:fa6b5ba7b8 -->
Los manejadores se leen de una referencia cuando llega una tecla, por lo que un cierre nuevo en cada renderizado nunca queda desactualizado.

<!-- s:1b173acf33 -->
La pantalla de ayuda y la paleta

<!-- s:15201cd425 -->
`<KeyHelp>` se abre con `?` y enumera por grupo todas las asignaciones activas con etiqueta. `keys` y `title` cambian la tecla de activación y el encabezado.

<!-- s:8a5c3a3297 -->
`<CommandPalette>` se abre con `Ctrl+K` o `Ctrl+P`. Busca coincidencias aproximadas entre tus `commands` y todas las asignaciones con etiqueta, y resalta las letras coincidentes. Se cierra antes de ejecutar un comando, de modo que un comando puede abrir su propio modal.

<!-- s:bea7ebdffb -->
`formatKeys` renderiza una asignación para mostrarla. `formatKeys("ctrl+shift+p")` devuelve `⌃⇧P` en macOS y `ctrl+shift+P` en los demás sistemas, y `<Kbd>` renderiza una sola tecla con el mismo formato.

<!-- s:d068dd2764 -->
`useKeymap`, `<KeyHelp>`, `<KeyHints>`, `<StatusBar>` y `<CommandPalette>` se incluyen en Text.js 1.0. La referencia está en [Teclado](/docs/keyboard).
