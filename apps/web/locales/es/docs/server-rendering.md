<!-- s:5c794493de -->
Renderiza el árbol de React de una ruta en el servidor y transmite sus fotogramas a la consola. Prerenderiza el primer fotograma de cada ruta estática en su HTML.

<!-- s:f5f9690d9e -->
Dos entornos de ejecución

<!-- s:26b5b0c1e5 -->
Cada página se renderiza en uno de dos lugares:

<!-- s:2b217df435 -->
| | Cliente (predeterminado) | Servidor (`runtime = "server"`) |
| --- | --- | --- |
| El árbol de React se ejecuta en | La pestaña del navegador | `text dev` / `text start` / el adaptador `bun` (Bun o Node) |
| El navegador descarga | La app completa: React, Yoga WASM, tus rutas | El reproductor de fotogramas, unos 21 kB con gzip |
| Acceso a datos | `fetch()` a manejadores de ruta | Directamente: bases de datos, archivos, `node:*`, secretos |
| Componentes asíncronos | Usa `use()` o efectos | Se admiten componentes `async function` |
| Latencia de las pulsaciones | Misma tarea, síncrona | Un viaje de ida y vuelta al servidor |
| Funciona en un alojamiento estático | Sí | No, necesita `text start` o `bun dist/server.js` |

<!-- s:7b06d151a6 -->
Ambos entornos de ejecución producen los mismos fotogramas. El reproductor de fotogramas codifica las celdas con el mismo `CssConsoleDriver` y mantiene el mismo ritmo de unos 15 fps, por lo que un fotograma renderizado en el servidor coincide byte por byte con la llamada a `console.log` del cliente.

<!-- s:70a0b18bdd -->
Activación

<!-- s:660b2936b0 -->
Exporta `runtime` desde una página:

<!-- s:567f4b3d2b -->
`runtime` se lee por página, como una exportación de cadena estática (se admite una anotación de tipo, `as const` o una reexportación; un valor calculado no). Los layouts, `loading.tsx`, `error.tsx` y `not-found.tsx` se renderizan donde se renderiza su página: un layout compartido por páginas de cliente y de servidor se ejecuta en ambos lugares y se envía al navegador, mientras que los layouts y los límites de un segmento que solo contiene páginas de servidor permanecen en el servidor. Los hooks, el foco, `useInput`, `<Link>` y `useRouter()` se comportan igual que en el cliente.

<!-- s:43c4fa1dac -->
Cuándo usar cada uno

<!-- s:ac38ce3c55 -->
Usa el entorno de ejecución de **cliente** (el predeterminado) para:

<!-- s:ced9e65891 -->
- Interfaces con mucha escritura donde cada pulsación debe dibujarse en la misma tarea, como editores y filtros.
- Apps que se despliegan en un alojamiento estático o una CDN.
- Herramientas que pueden funcionar sin conexión.

<!-- s:54292284aa -->
Usa el entorno de ejecución de **servidor** para:

<!-- s:bb8a20e6e2 -->
- Paneles y vistas de administración que leen bases de datos, archivos, colas o API privadas. Las credenciales permanecen en el servidor.
- Rutas con dependencias pesadas (SDK, analizadores, tablas de sintaxis) que no quieres incluir en el paquete del navegador.
- Páginas que deben cargar rápido en redes lentas. El navegador descarga el reproductor de 21 kB (gzip) en lugar de la app completa.

<!-- s:920f4ad7e8 -->
Puedes combinar entornos de ejecución en una app. Al navegar entre ellos, la URL de destino se carga como un documento nuevo. El paquete del navegador sustituye cada página de servidor por un módulo mínimo, por lo que los módulos del servidor y todo lo que importan nunca se envían al cliente.

<!-- s:2de98cc507 -->
Nombra los módulos exclusivos del servidor como `*.server.ts`. La compilación falla si el código que se envía al navegador (una página de cliente o un layout que usa una página de cliente) importa un módulo `*.server.*` o un módulo integrado `node:*`, e indica qué módulo realiza la importación.

<!-- s:1c109f371d -->
El [middleware](/docs/middleware) protege las rutas de servidor igual que los documentos: se ejecuta para la ruta de destino antes de abrir una sesión, antes de cada navegación dentro de la sesión (`router.push`, Atrás y Adelante) y de nuevo cada vez que cambian las cookies de la sesión o `Authorization`. Cuando corresponde redirigir, rechazar o reescribir, el navegador carga la URL como un documento y el middleware responde a esa solicitud.

<!-- s:44ec23073a -->
Componentes asíncronos de servidor

<!-- s:491e80d70d -->
En el servidor, cualquier componente `async function` se suspende en el `<Suspense>` o `loading.tsx` más cercano hasta que se resuelve su promesa:

<!-- s:155b6ae10f -->
Cada promesa se almacena en caché por sesión con una clave basada en el componente y sus props, de modo que un renderizado reintentado reutiliza la solicitud que ya está en curso. La caché se borra cuando cambia la ruta y al llamar a `router.refresh()`. Para volver a acceder a los datos tras una entrada, llama a `router.refresh()`:

<!-- s:abfa753a7c -->
Las props que se pasan a los componentes asíncronos deben ser serializables: cadenas, números, objetos simples, arrays, `Date`, `URL`, `Map`, `Set` y elementos. Las props de función no forman parte de la clave (pasa datos, no callbacks). Cada sesión almacena en caché un máximo de 256 promesas. También puedes envolver un componente manualmente con `serverComponent(fn)` de `@textjs/app/server-components`.

<!-- s:55cf9764ac -->
Los hooks (`useState`, `useInput`, …) no funcionan dentro de un componente `async function`. Renderiza un componente normal a su alrededor o debajo para permitir la interacción.

<!-- s:5ae438610c -->
Funcionamiento

<!-- s:ec3e56dbc6 -->
- **Una sesión por pestaña.** Cada carga de página abre su propia sesión: una raíz de React, un historial del enrutador en memoria y un búfer de celdas en el servidor. Los identificadores de sesión son valores aleatorios de 192 bits que el navegador conserva solo en memoria.
- **Deltas de celdas.** El servidor envía solo las filas cuyo hash ha cambiado desde el último fotograma que recibió esa conexión. Cada fila se envía como secuencias de texto que hacen referencia a una tabla de estilos que solo admite añadir al final, y los grafemas anchos, las secuencias de emojis y los colores translúcidos se conservan exactamente.
- **Contrapresión.** Los fotogramas están separados por al menos 66 ms y cada uno se compara con lo último que aceptó el socket. Cuando una conexión lenta deja de consumir datos, se omiten los estados intermedios y el siguiente fotograma salta directamente al más reciente.
- **Reconexiones.** Si se interrumpe el flujo, el reproductor se reconecta con su identificador de sesión en la cabecera `x-textjs-live` (nunca en la URL) y reanuda la misma sesión, con su estado intacto, desde un nuevo fotograma clave. Se vuelven a aplicar las actualizaciones de la barra de direcciones que no se recibieron. Una sesión sin conexión deja de renderizar y se desmonta tras 30 segundos; si el servidor la ha olvidado, el reproductor abre una nueva.
- **Historial.** Atrás y Adelante desplazan ambos historiales el mismo número de entradas, y `router.back()` en el servidor también desplaza el historial del navegador.
- **Seguridad.** Ambos endpoints rechazan las solicitudes entre sitios (`Sec-Fetch-Site` y `Origin`; `X-Forwarded-Host` solo se tiene en cuenta con `server.trustProxy`). Las solicitudes POST de entrada necesitan un cuerpo JSON y la cabecera `x-textjs-live`. Cada evento se valida con un esquema fijo, y los destinos de navegación deben ser rutas de tu origen. Solo se pueden renderizar las páginas de tu manifiesto `app/`. Las sesiones están vinculadas a las cookies con las que se abrieron.
- **Límites.** Un máximo de 64 eventos por POST y unos 240 por segundo por sesión (`429` si se supera), un tiempo límite de 5 segundos para el cuerpo, 32 sesiones por dirección de cliente y `maxSessions` por proceso (se elimina primero la sesión que lleva más tiempo desconectada).

<!-- s:981308ad14 -->
Prerenderizado parcial

<!-- s:294fed5642 -->
`text build` renderiza cada ruta estática una vez, con el tamaño de `viewport` configurado, e inserta ese primer fotograma en el HTML de la ruta como un pequeño `<script>` clásico. La consola se dibuja antes de que se cargue ningún módulo:

<!-- s:7eb15c9cc8 -->
1. **La estructura estática.** Todo lo que se renderiza de forma síncrona. Cada límite `<Suspense>` que sigue esperando muestra su contenido de respaldo, incluidos los componentes asíncronos de servidor (que no se ejecutan mientras se renderiza la estructura), `use()` y los módulos de carga diferida. `fetch()` nunca se resuelve mientras se renderiza la estructura, por lo que los datos cargados en efectos también permanecen en su estado de carga.
2. **Los huecos dinámicos.** Cuando arranca JavaScript, el renderizador del cliente o el reproductor de fotogramas transmite el fotograma real. Este se añade al final, debajo de la estructura, y la cortina del propio fotograma de hidratación desplaza la estructura fuera de la vista en el mismo repintado de DevTools. La estructura registra cuándo se dibujó, de modo que el primer fotograma de hidratación espera a que pase la ventana posterior al borrado de DevTools en lugar de activar su ruta lenta.

<!-- s:94c6827f2c -->
Durante la carga, solo la estructura borra la consola. El renderizador de hidratación se inicia en modo de añadir al final (`initialClear: false`), por lo que nada parpadea, y la estructura solo se dibuja en la ruta para la que se renderizó. Las rutas dinámicas (`[id]`, `force-dynamic`) no renderizan ninguna estructura.

<!-- s:1eef464bae -->
Desactívalo con `ppr: false` en `text.config.ts`. El prerenderizado ejecuta tus componentes durante la compilación, así que mantén el código de nivel superior de los módulos libre de variables globales exclusivas del navegador. Una ruta que lanza una excepción, llama a `redirect()` / `notFound()` o navega durante el prerenderizado no recibe ninguna estructura (nunca se incorpora una pantalla de error al HTML), y la compilación te indica el motivo.

<!-- s:c50a022df3 -->
La estructura se renderiza con `viewport.width × viewport.height` (por defecto, `120 × 36`) porque la compilación no puede conocer el tamaño de la consola del visitante; el fotograma de hidratación se ajusta después al tamaño de la consola real. La estructura es un `<script>` en línea: si una política de seguridad de contenido prohíbe los scripts en línea, permítelo mediante su hash o configura `ppr: false`.

<!-- s:ff96d35008 -->
Despliegue

<!-- s:e8a05a5448 -->
`text build` escribe los siguientes archivos:

<!-- s:8e75669ec0 -->
| Archivo | Finalidad |
| --- | --- |
| `index.html`, `<route>/index.html` | Rutas de cliente con sus estructuras. Funcionan en cualquier alojamiento estático. |
| `assets/player-[hash].js` | El reproductor de fotogramas. |
| `.text/server/live.mjs` | Las rutas de servidor, el App Router y el renderizador de consola. |
| `.text/pages/…`, `.text/live.html` | Documentos de las rutas de servidor. |
| `.text/ansi/…` | Primeros fotogramas para [curl y otros clientes de terminal](/docs/curl). |

<!-- s:5782e0e345 -->
`text start` y el [adaptador `bun`](/docs/deploying#bun) los sirven todos. Las rutas de servidor necesitan un proceso de larga duración: los adaptadores `static`, `vercel` y `cloudflare` hacen que la compilación falle (`TX030`).
