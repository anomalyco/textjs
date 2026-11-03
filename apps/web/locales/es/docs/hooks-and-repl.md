<!-- s:674f346b70 -->
Los hooks conectan los componentes con la entrada, el foco y el área visible.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| Campo | Descripción |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Texto producido por la tecla |
| `ctrl` `meta` `shift` `alt` | Modificadores |
| `stopPropagation()` | Detener los controladores de menor prioridad |

<!-- s:0764796164 -->
Los atajos del navegador como `⌘⌥J` y `⌘R` siempre se dejan pasar.

<!-- s:550c6a7dd5 -->
`usePaste` y `useWheel` aceptan las mismas opciones. `ambient` no tiene efecto en `useWheel`.

<!-- s:9248f9b147 -->
| Opción | Descripción |
| :-- | :-- |
| `isActive` | `false` desactiva el controlador sin desmontarlo (por defecto, `true`) |
| `priority` | Las prioridades más altas se ejecutan primero (por defecto, `0`). Los componentes con foco usan `FOCUSED_INPUT_PRIORITY` (`10`) |
| `global` | Seguir recibiendo entrada mientras esté abierto un `<Modal>` fuera de este componente (por defecto, `false`) |
| `ambient` | No contar este controlador para el [aviso de foco](#usepagefocus) (por defecto, `false`) |

<!-- s:e4e842287a -->
El atajo de Dev Overlay (`F2` o `` Ctrl+` ``) es ambiental, por lo que una página sin otra entrada de teclado no muestra el aviso.

<!-- s:617ae1bfe8 -->
`usePaste` y `useWheel`

<!-- s:61e72f6177 -->
`useKeyState` (experimental)

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` exporta `useKeyState` para rastrear las teclas físicas que se mantienen pulsadas mediante `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`). Consultar `keys.isDown(code)` o leer `keys.pressed` no provoca nuevos renderizados de React. Pasa un callback para reaccionar a las pulsaciones y liberaciones de teclas en el momento en que ocurren.

<!-- s:d9e1465ae0 -->
Las teclas que se mantienen pulsadas se liberan automáticamente cuando la página pierde el foco. Consulta [Cambios incompatibles](/docs/support-policy#breaking-changes) para saber cómo se versionan las exportaciones experimentales.

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` devuelve si la página tiene el foco. Las pulsaciones de teclas llegan a la app solo mientras lo tiene. Es el mismo valor que `useViewport().focused`, pero solo vuelve a renderizar cuando cambia el foco.

<!-- s:e1075d4220 -->
Mientras la página no tiene el foco y la app tiene un controlador `useInput` o `usePaste`, un hook `useKeyState` o un destino de foco al que se puede llegar con Tab, la última fila del fotograma de la consola se convierte en una barra ámbar que dice «Haz clic en la página para usar el teclado». Los controladores marcados como [`ambient`](#useinput) no cuentan. El aviso no aparece en una terminal, en las pruebas ni en las réplicas integradas. Cada vez que aparece el aviso, parpadea durante unos 6 segundos, a menos que esté activada la opción de movimiento reducido del sistema. Para decidir cuándo se muestra, establece `focusHint: false` en `text.config.ts` o `createConsoleRoot` y renderiza `<FocusHint>`:

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
El REPL de `window.text`

<!-- s:420cc7f125 -->
Cada app añade funciones auxiliares a `window.text`. Escríbelas en la línea de entrada de DevTools.
