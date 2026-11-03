<!-- s:df706c7a4d -->
`eslint-plugin-textjs` detecta errores de Text.js en el editor: etiquetas DOM en componentes de consola, cajas dentro de texto, glifos que Menlo no tiene, llamadas sueltas a `console.log` y exportaciones de App Router que se ignoran en silencio.

<!-- s:0ecddf15e1 -->
Configuración inicial

<!-- s:5d60a92733 -->
El plugin admite ESLint 9 y 10 con configuración plana. Las reglas son sintácticas y no necesitan información de tipos ni `parserOptions.project`. Funciona cualquier analizador que entienda TypeScript y JSX.

<!-- s:b69abcef52 -->
Configuraciones

<!-- s:9cfe4adde3 -->
| Configuración | Qué activa |
| :-- | :-- |
| `textjs.configs.recommended` | Todas las reglas de corrección como errores; las reglas de consola, temporizadores y cadencia de fotogramas como advertencias |
| `textjs.configs.strict` | Todo como error, además de `prefer-use-keymap` como advertencia |

<!-- s:6c9781312c -->
También puedes elegir las reglas individualmente:

<!-- s:ec6eb92cf0 -->
Archivos de consola

<!-- s:04573fe453 -->
La mayoría de las reglas solo se aplican a archivos que se renderizan en la consola: archivos que importan un componente o hook (`Box`, `Text`, `useInput`, …) de `@textjs/app` o `@textjs/react`. Los archivos que importan `react-dom` o `@textjs/react/dom` son código de página y no se modifican, por lo que un sitio web puede combinar páginas DOM y apps de consola en un mismo proyecto. Importar una utilidad como `tokenize` o `parseMarkdown` no convierte un archivo en un archivo de consola.

<!-- s:96e9c86b58 -->
Las reglas de App Router se basan en el nombre del archivo (`page.tsx`, `layout.tsx`, `route.ts`, …) dentro de cualquier directorio `app/`, incluido `src/app/`. Si el tuyo tiene otro nombre, pasa `{ appDir: "routes" }` a `valid-route-module`, `valid-metadata` y `route-handler-exports`.

<!-- s:b66542635d -->
Reglas

<!-- s:c1b57ad8e2 -->
| Regla | Recomendada | Corrección |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | error | sugerencia |
| [`no-box-in-text`](#no-box-in-text) | error | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | error | corrección automática, sugerencia |
| [`no-console-in-components`](#no-console-in-components) | advertencia | sugerencia |
| [`prefer-use-interval`](#prefer-use-interval) | advertencia | sugerencia |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | advertencia | |
| [`prefer-use-keymap`](#prefer-use-keymap) | solo en modo estricto | |
| [`valid-route-module`](#valid-route-module) | error | |
| [`valid-metadata`](#valid-metadata) | error | |
| [`route-handler-exports`](#route-handler-exports) | error | sugerencia |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`, `<span>`, los elementos personalizados y otras etiquetas DOM no existen en la consola. El reconciliador solo reconoce sus propios nodos anfitriones y lanza `TX003` ante cualquier otro.

<!-- s:bd7c3e0318 -->
La sugerencia sustituye la etiqueta por el componente más cercano (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) y añade la importación.

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` es una secuencia de spans con estilo; no puede contener una caja. Anidar `<Box>` o cualquier componente cuya raíz sea una caja (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) lanza `TX004` durante el renderizado. Esta regla lo detecta en el editor, incluso dentro de `&&`, ternarios, fragmentos y `.map()`.

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js distribuye cada carácter en una cuadrícula de celdas fijas. Los glifos que Menlo, la fuente de la consola de DevTools en macOS, no tiene se renderizan con una fuente alternativa más ancha que una celda, por lo que todas las celdas posteriores se desplazan.

<!-- s:a58a59c2f8 -->
- **Braille** (U+2800–U+28FF, los fotogramas clásicos del indicador de carga de terminal): usa caracteres de bloque o cuadrante (`▘▝▗▖`), `<Spinner variant="dots">` o `marker="quadrant"` en los gráficos. Configura `{ allowBraille: true }` para apps que solo se ejecuten con `text run` en una terminal.
- **Símbolos y flechas diversos** (U+2B00–U+2BFF, como el cuadrado pequeño U+2B1D): las sugerencias ofrecen el equivalente en Menlo (`·`, `●`, `←`).
- **Presentación como emoji en símbolos de una celda** (`▶` o `↩` seguidos de U+FE0F): el selector de variación los convierte en emojis de dos celdas mientras la cuadrícula reserva una. La corrección automática lo elimina.

<!-- s:8c0c49dfb7 -->
Los emojis anchos (`🚀`, `✅`) funcionan bien: Text.js los mide como dos celdas.

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
Cada fotograma es un `console.log`. Tus propios registros quedan entre fotogramas, el siguiente los desplaza fuera de la vista y quedan ocultos bajo la vista anclada al final. `console.clear()` borra la propia app.

<!-- s:0011d5dcff -->
Muestra mensajes en la interfaz con `useToast()` o un `<ScrollBox>` de registros, o inspecciona el estado en el panel de desarrollo `[▼]` (`` Ctrl+` ``). Con `logger`, la sugerencia reescribe `console.warn(…)` como `log.warn(…)`. Se omiten los archivos de pruebas y los renderizados de `@textjs/app/testing`.

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
Un `setInterval` directo en un componente necesita un efecto, una limpieza y una referencia para evitar un estado obsoleto. `useInterval` se encarga de las tres cosas, y `null` lo detiene.

<!-- s:894ec09a45 -->
Para animaciones, `useAnimationFrame` sigue la cadencia de fotogramas del renderizador y se detiene mientras la salida está en pausa. Consulta [Hooks de utilidad](/docs/utility-hooks).

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js emite como máximo un fotograma cada 66 ms (unos 15 fps). Un intervalo de 16 ms renderiza cuatro veces por cada fotograma emitido; los fotogramas adicionales se agrupan y solo consumen CPU. Detecta retardos de `setInterval`/`useInterval` inferiores a `minInterval` (por defecto `66`) y `useAnimationFrame` con `fps` superior a 15.

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
Comparar `e.key` a mano funciona, pero los atajos son invisibles. `useKeymap` coloca asignaciones etiquetadas en `<KeyHelp>`, `<KeyHints>` (asignaciones con `hint: true`) y la paleta de comandos, gestiona secuencias como `g g` y detiene la propagación de las teclas coincidentes. Detecta manejadores de `useInput` que comparan dos o más literales de tecla (`minKeys`) y omite los manejadores que leen `e.input` para la escritura.

<!-- s:05d39412dc -->
Consulta [Atajos de teclado](/docs/keyboard).

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- Los archivos `page`, `layout`, `loading`, `error` y `not-found` deben exportar un componente por defecto (`TX015`).
- `export const dynamic` debe ser `"auto"`, `"force-static"` o `"force-dynamic"` (`TX031`). Text.js no admite `"error"` de Next.js. Se lee de páginas, layouts y manejadores de ruta. En páginas y layouts, escríbelo como un literal de cadena simple: `text build` lo lee del código fuente sin ejecutar el módulo.

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata se combina a partir de los layouts y después de la página (o `not-found`). La regla detecta lo que el enrutador ignoraría en silencio:

<!-- s:fe9ebcbc0c -->
- `metadata` o `generateMetadata` en archivos `loading` o `error`
- ambas exportaciones en un archivo
- `async generateMetadata`: se llama de forma síncrona, por lo que una Promise nunca establece el título
- un `title` que no sea una cadena ni `{ default, template?, absolute? }`, o una clave mal escrita
- `title.template` sin `%s`, o en una página, donde no tiene efecto
- una `description` que no sea una cadena

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
Los archivos `route.ts` solo responden a los métodos HTTP que exportan: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` y `OPTIONS`. Nunca se llama a `get` en minúsculas ni a `Post` (las solicitudes reciben `405`); la sugerencia cambia el nombre. Se notifican las exportaciones predeterminadas, los manejadores que no son funciones y otras exportaciones, salvo `dynamic` y `revalidate` de la [configuración del segmento de ruta](/docs/caching). Mueve el código compartido a `lib/`, o enumera los nombres adicionales con `{ allow: [...] }`.
