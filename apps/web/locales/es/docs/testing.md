<!-- s:9f5667f5e7 -->
`@textjs/app/testing` (o `@textjs/react/testing`) renderiza tu app fuera de pantalla, pulsa teclas y devuelve el fotograma como texto. Las pruebas se ejecutan sin navegador ni DevTools.

<!-- s:9bc71b1ad2 -->
Funciona con cualquier ejecutor que admita pruebas `async`, incluidos Bun, Vitest y Jest.

<!-- s:f7898e6b92 -->
Renderizado

<!-- s:fc969a7928 -->
| Método | Descripción |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | Montaje fuera de pantalla (80×24 por defecto) |
| `lastFrame()` | El fotograma como texto plano |
| `lines()` | El fotograma como un array de filas |
| `frames` | Todos los fotogramas distintos hasta el momento |
| `toAnsi()` | ANSI de color verdadero, para instantáneas |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | `{ x, y }` de la primera coincidencia |
| `rerender(el)` / `unmount()` | Actualización o desmontaje |

<!-- s:893f22353a -->
`renderToString(el, options)` renderiza una vez y devuelve el texto.

<!-- s:99a3c4d459 -->
Entrada

<!-- s:105149560b -->
Cada llamada se ejecuta dentro de `act()` y procesa los fotogramas resultantes, de modo que la siguiente aserción ve la actualización.

<!-- s:1f65c071dc -->
Tiempo

<!-- s:ab365d9403 -->
Las animaciones, los indicadores de carga y las notificaciones emergentes usan temporizadores reales, por lo que `wait` y `waitFor` son la forma fiable de observarlos.

<!-- s:26f93acae3 -->
Instantáneas

<!-- s:05724c9883 -->
Los fotogramas se recortan por la derecha y por abajo, de modo que las instantáneas no cambian por los espacios en blanco.
