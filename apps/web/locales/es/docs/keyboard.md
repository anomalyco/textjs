<!-- s:3bfcfe41ce -->
Declara los atajos una sola vez con `useKeymap`. Text.js los dirige, los enumera en una capa superpuesta con `?`, los muestra en el pie de página y permite buscarlos en una paleta de comandos.

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| Sintaxis | Significado |
| :-- | :-- |
| `ctrl+k` | Modificadores: `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` o `Ctrl`, según cuál se mantenga pulsada |
| `j, down` | Alternativas |
| `g g` | Una secuencia (1 segundo entre teclas) |
| `G` | La mayúscula implica `Shift` |
| `?` | Las teclas imprimibles coinciden con el carácter |

<!-- s:ef55b4b9de -->
Los valores son un manejador o una vinculación con `label`, `group`, `hint`, `disabled` y `noRepeat`. Las vinculaciones sin etiqueta funcionan, pero no aparecen en la capa de ayuda.

<!-- s:01f344cdbe -->
`useKeymapBindings()` devuelve las vinculaciones con etiqueta activas en ese momento, para tus propios pies de página y menús.

<!-- s:dd8af5eb69 -->
Los mapas de teclas pasan por `useInput`, así que se aplican las reglas habituales: los campos con el foco tienen prioridad, una tecla coincidente detiene la propagación y un `<Modal>` abierto desactiva las vinculaciones externas. Pasa `{ priority, global, isActive }` para cambiar este comportamiento.

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
Pulsa `?` para ver todas las vinculaciones con etiqueta, agrupadas. La lista muestra las que están activas donde se abrió.

<!-- s:3cebb95bfc -->
`<KeyHints>` y `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` muestra las vinculaciones marcadas con `hint: true` o los `items` explícitos. `<StatusBar>` es un pie de página de una fila con un espacio `right`.

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` renderiza una sola tecla. `formatKeys("ctrl+shift+p")` devuelve `⌃⇧P` en macOS y `ctrl+shift+P` en otras plataformas.

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K` (o `Ctrl+P`) abre un lanzador con búsqueda aproximada entre tus comandos y todas las vinculaciones con etiqueta, con las letras coincidentes resaltadas.

<!-- s:e88bab4eab -->
| Prop | Descripción |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | Atajo de apertura (por defecto `ctrl+k, ctrl+p`; `null` para desactivarlo) |
| `includeKeymap` | Inclusión de las vinculaciones del mapa de teclas (por defecto `true`) |
| `open` / `onOpenChange` | Controlado |

<!-- s:ddd093fe85 -->
La paleta se cierra antes de ejecutar un comando, por lo que los comandos pueden abrir sus propios modales. `fuzzyMatch` y `fuzzyFilter` se exportan para tus propias listas.
