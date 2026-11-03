<!-- s:5a6798e6a5 -->
Hoy lanzamos Text.js 1.0, el framework de consola para la web.

<!-- s:e4787165f5 -->
Text.js renderiza apps de React 19 dentro de la consola de Chrome DevTools, con layouts, enrutamiento, foco, entrada de datos, formularios, gráficos y Markdown en streaming dibujados con `console.log`.

<!-- s:48b184a262 -->
Novedades de 1.0

<!-- s:7f7f2a9a76 -->
- **El App Router.** `layout.tsx`, `page.tsx`, `[param]`, `loading.tsx`, `error.tsx`, `not-found.tsx` y `api/*/route.ts`, sincronizados con `window.location`. Sigue las convenciones del App Router de Next.js.
- **Turbolog.** Yoga flexbox organiza una cuadrícula de celdas, un `CellBuffer` de arrays tipados la almacena y un codificador de longitud de secuencias la convierte en una única llamada a `console.log(format, ...css)`. Los fotogramas inactivos no hacen llamadas a la consola.
- **Un kit de componentes.** `Box`, `Text`, `ScrollBox`, `Input`, `Select`, `Tabs`, `Markdown`, `Diff`, `List` virtualizada, `Table`, `Tree`, gráficos, diálogos, notificaciones y una paleta de comandos `Ctrl+K` de `useKeymap`.
- **Fotogramas añadidos al final.** Los fotogramas se añaden al final, debajo del anterior, para que la consola no parpadee en blanco entre fotogramas. Más información en [Turbolog: eliminar el parpadeo](/blog/turbolog-eliminating-the-flash).
- **Texto de derecha a izquierda.** El hebreo y el árabe se renderizan en orden visual con conformación de caracteres árabes, mediante una implementación de UAX #9 que supera los 770.241 casos de `BidiTest.txt`. Consulta [Texto de derecha a izquierda en la consola](/blog/right-to-left-text).
- **Una consola adaptable.** Text.js se ajusta al panel acoplado de DevTools, incluidos el zoom de la página y una barra de herramientas que se distribuye en varias líneas. Cuando está desacoplado, usa `120×36` como alternativa.
- **`text run`.** La misma app de App Router se renderiza en una terminal real.
- **Herramientas para agentes y editores.** `text mcp` sirve tu app a agentes de programación mediante el Model Context Protocol, y la extensión Text.js DevTools añade un panel junto a «Consola». `eslint-plugin-textjs` y una extensión de VS Code también forman parte de 1.0.

<!-- s:b71c4a16bc -->
Un cambio de nombre

<!-- s:b47aa37902 -->
El paquete del framework ahora es `@textjs/next`. El nombre `textjs` ya estaba ocupado en npm. Actualiza tus importaciones:

<!-- s:e4005009f1 -->
**Actualización, 1.0.2:** el paquete ahora es `@textjs/app`, y `@textjs/next` está obsoleto. Para cambiar, ejecuta `bun remove @textjs/next && bun add @textjs/app` e importa desde `@textjs/app`.

<!-- s:5b35a47b90 -->
Cifras

<!-- s:2ee54da34c -->
En un panel denso de `100×32` (46 nodos de texto, 149 spans `%c`), medido con `packages/core/test/perf.test.ts`:

<!-- s:9729def172 -->
| Fotograma | Media |
| :-- | --: |
| Repintado completo (layout, pintado, codificación) | 0,163 ms |
| Edición de una fila (al escribir) | 0,011 ms |
| Inactivo | 0,000 ms, 0 llamadas a la consola |

<!-- s:2fee8c4c3d -->
Un fotograma sin cambios retorna antes de asignar memoria para una cadena, por lo que los fotogramas inactivos registran 0,000 ms.

<!-- s:a0fa47c98f -->
Probar

<!-- s:aeb9cc2b5d -->
Abre [textjs.org](/) y pulsa ⌘⌥J (Ctrl+Shift+J en Windows y Linux). El sitio ejecuta una app de Text.js en tu consola, con una vista por página. El [Playground](/playground) tiene un panel, Markdown en streaming y Snake. [OpenCode](/opencode) se conecta a tu servidor local de OpenCode.

<!-- s:31dd2e762c -->
La lista completa de cambios está en el [registro de cambios](/changelog), y el código fuente está en [GitHub](https://github.com/anomalyco/textjs).
