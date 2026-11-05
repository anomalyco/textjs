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

<!-- s:195573d803 -->
Carga al detectar intención de usar la consola (experimental)

<!-- s:97014ecad1 -->
`@textjs/core/experimental` exporta `onConsoleIntent` para páginas que descargan su app de consola solo cuando un visitante quiere usarla. Llama a tu función una vez, con el motivo:

<!-- s:444b1ebdd7 -->
| Motivo | Cuándo |
| :-- | :-- |
| `dock` | DevTools está acoplado al cargar la página o se acopla después. Text.js lo detecta a partir del tamaño de la ventana |
| `shortcut` | El visitante pulsa F12 o Ctrl+Shift+J, I, C o K, o ⌘⌥J, I, C o K en un Mac. El navegador sigue abriendo DevTools |
| `engage` | Un clic principal en un elemento que coincide con `engageSelector`, Enter o Space en un botón `[data-textjs-engage]`, o un tamaño elegido en `<ViewportControl>` antes de que se inicie la app. Los clics en enlaces, botones y campos de formulario dentro de un elemento coincidente no cuentan, salvo que también tengan `data-textjs-engage` |
| `session` | Algo de lo anterior ya ocurrió en esta pestaña, por lo que una recarga inicia la app de inmediato |
| `manual` | Llamaste a `trigger()` en el objeto de control devuelto |

<!-- s:894b97fac4 -->
DevTools abierto en su propia ventana desde un menú del navegador no se refleja en el tamaño de la ventana. Esos visitantes inician la app desde un elemento `engage`, y `session` hace que siga iniciándose al recargar esa pestaña.

<!-- s:06cdcf713e -->
No se activa nada automáticamente en pantallas táctiles. Llama a `trigger()` desde tu propio control.

<!-- s:d7006796c2 -->
| Opción | Descripción |
| :-- | :-- |
| `engageSelector` | Elementos que inician la app al hacer clic (por defecto `[data-textjs-engage], [data-textjs-focus-pad], text-console`). `false` no añade listeners |
| `persist` | Recuerda la intención de la pestaña en `sessionStorage` bajo `CONSOLE_INTENT_KEY` (por defecto `true`) |
| `prefetch` | Se llama como máximo una vez, cuando el puntero o el foco entra en un elemento `engageSelector` |
| `idlePrefetch` | También llama a `prefetch` cuando el navegador está inactivo después de `load` (por defecto `false`) |

<!-- s:4460da3205 -->
`prefetch` nunca se ejecuta en pantallas táctiles, con el ahorro de datos activado ni en conexiones más lentas que 4G. `canPrefetchConsole()` devuelve el resultado de la misma comprobación. El método `dispose()` del objeto de control elimina todos los listeners.

<!-- s:9128a9d98f -->
`<ViewportControl>` funciona antes de que exista la raíz de la consola. Elegir un tamaño lo guarda, activa `engage` para que `onConsoleIntent` inicie la app y aplica el tamaño una vez que se establece `root`. Consulta [Cambios incompatibles](/docs/support-policy#breaking-changes) para saber cómo se versionan las exportaciones experimentales.
