<!-- s:c351b288ae -->
`text mcp` ejecuta tu directorio `app/` sin interfaz gráfica, dentro del mismo proceso, y lo sirve mediante el [Model Context Protocol](https://modelcontextprotocol.io) para que los agentes de programación puedan usarlo sin DevTools. El agente navega, pulsa teclas, lee fotogramas como texto sin formato y llama a manejadores de ruta.

<!-- s:c66b3eaae7 -->
`text mcp` necesita Bun. Si se inicia con Node, vuelve a ejecutarse con Bun cuando `bun` está en tu `PATH`, y falla con `TX019` en caso contrario. Los clientes MCP lo inician por ti, así que rara vez lo ejecutas manualmente.

<!-- s:0ecddf15e1 -->
Configuración

<!-- s:91bda9ef42 -->
Cada cliente inicia `text mcp` desde el directorio de tu proyecto. Usa `bunx --bun` para que los archivos de ruta se ejecuten como TypeScript.

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
O inclúyelo en un commit para el equipo:

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
Para un proyecto en un subdirectorio, añade al final la ruta: `["--bun", "text", "mcp", "apps/console"]`.

<!-- s:0b27734b46 -->
Herramientas

<!-- s:93ae76f73d -->
| Herramienta | Descripción |
| :-- | :-- |
| `list_routes` | Páginas y manejadores de ruta en `app/`, y la ubicación actual |
| `navigate` | Añadir o reemplazar una ruta, o ir `back` / `forward` |
| `read_frame` | El fotograma como texto, con ruta, tamaño, foco y cursor. `styles: true` añade colores y atributos por span |
| `press` | Combinaciones de teclas: `"down"`, `"ctrl+k"`, `"shift+tab"`, `"tab tab enter"`, `"down*3"` |
| `type` | Escribir texto con una pulsación por carácter (hasta 2000; usa `paste` para más). `submit: true` pulsa Enter al terminar |
| `paste` | Un evento de pegado, como `⌘V` |
| `scroll` | Desplazamiento con la rueda del ratón por `rows` (y `cols`). Un `<ScrollBox>` se desplaza con la rueda sin tener el foco del teclado |
| `resize` | Establecer el tamaño de la cuadrícula en columnas y filas |
| `inspect_tree` | El árbol de componentes con sus límites en pantalla y todos los identificadores que pueden recibir el foco |
| `find` | Límites de cada coincidencia y el componente que hay debajo |
| `wait_for` | Esperar a que aparezca o desaparezca texto, o a que la app quede inactiva |
| `logs` | Salida capturada de `console.*` y errores de React |
| `fetch` | Llamar a un manejador `route.ts` dentro del mismo proceso. Los cuerpos se leen hasta `maxBytes`; los flujos de eventos, durante `streamMs`, y luego se cancelan |
| `reload` | Volver a importar la app después de editar archivos |

<!-- s:526235e5c5 -->
Las herramientas de entrada devuelven el nuevo fotograma, así que el agente no necesita una llamada independiente a `read_frame` después de cada tecla. El fotograma actual y la lista de rutas también están disponibles como los recursos `text://frame` y `text://routes`.

<!-- s:c30236f97d -->
Un intercambio típico:

<!-- s:45e18bfa25 -->
Fotogramas e inactividad

<!-- s:f2e8fe0f06 -->
Antes de que cualquier herramienta lea un fotograma, espera a que la app quede inactiva: ningún fotograma programado, ningún `fetch` en curso y ningún commit ni fotograma durante 50 ms. Así, el agente ve el resultado de su entrada, en lugar de un fotograma a mitad de una actualización.

<!-- s:fbad6f5c1a -->
Un `<Spinner>` o un gráfico que se actualiza una vez por segundo sigue contando como inactivo entre actualizaciones, por lo que las páginas con animaciones siguen siendo legibles. Una app que se renderiza con una frecuencia superior a una vez cada 50 ms nunca queda inactiva. Las lecturas dejan de esperar tras 1,5 segundos (`settleMs` cambia este valor), vuelcan el último fotograma y lo marcan como `busy`. `wait_for` sin texto espera a la inactividad, con su propio `quietMs`, y devuelve un error si nunca llega.

<!-- s:c5250c2f7a -->
Las coordenadas son celdas con índice desde cero: `x` es la columna, `y` la fila. Los caracteres anchos, como los CJK y los emojis, ocupan dos columnas.

<!-- s:7ff82431c5 -->
Errores y registros

<!-- s:6e07cf8702 -->
stdout transporta el protocolo. La salida de `console.*` de tu app, las llamadas sueltas a `process.stdout.write` y los errores de React se envían a `logs`, numerados para que un agente pueda solicitar solo las entradas nuevas con `since`. Cuando se han registrado errores desde la última lectura, la cabecera del siguiente fotograma lo indica.

<!-- s:9102068439 -->
Los fallos se devuelven como errores de herramienta, nunca como un cierre inesperado. Una herramienta que supera el tiempo límite se cancela antes de ejecutar la siguiente llamada, de modo que una llamada lenta nunca escribe en el fotograma de la siguiente llamada. Los errores con un código de Text.js lo conservan, por ejemplo `TX007` para una tecla desconocida. Si la app no se carga, cada herramienta explica el motivo. Corrige el archivo y llama a `reload`.

<!-- s:d3ad6f781e -->
Opciones

<!-- s:c9c30c0da4 -->
| Opción | Descripción |
| :-- | :-- |
| `--path <pathname>` | Primera ruta (por defecto `/`) |
| `--cols` / `--rows` | Tamaño de la cuadrícula (por defecto: `viewport` en `text.config.ts`; en su defecto, 100×32) |
| `--theme <name>` | Tema predefinido |
| `--no-config` | Ignorar `text.config.ts` |
| `--verbose` | Escribir también los registros capturados en stderr |

<!-- s:5ae438610c -->
Funcionamiento

<!-- s:7c71219a13 -->
`text mcp` ejecuta tu app del mismo modo que [`text run`](/docs/terminal): cada módulo de ruta se importa al inicio, el App Router usa un historial en memoria y las llamadas `fetch("/api/…")` del mismo origen ejecutan tus manejadores dentro del mismo proceso. Los fotogramas se envían a una cuadrícula de celdas fuera de pantalla en lugar de a una terminal. Las páginas renderizadas en el servidor (`export const runtime = "server"`) y sus componentes `async function` se renderizan dentro del mismo proceso, como en `text dev`, y el fotograma se lee una vez que se resuelven.

<!-- s:c965dcc0e4 -->
`reload` desmonta la app, elimina todos los módulos del proyecto de la caché de módulos de Bun (incluidos los archivos fuera de `app/`), vuelve a explorar `app/` y monta de nuevo la app en la ubicación actual.

<!-- s:19d6f0da69 -->
Para integrar el servidor en tu propio proceso o usar otro transporte:

<!-- s:68c8d3995f -->
Límites

<!-- s:910af21777 -->
- La app se ejecuta en Bun, no en un navegador. `window` y `document` no están definidos, como en `text run`.
- Cada servidor ejecuta una app con una cuadrícula. Cada cliente MCP inicia su propio servidor.
- `text mcp` ejecuta su propia copia de la app sin interfaz gráfica. No puede conectarse a una pestaña del navegador abierta con `text dev`.
