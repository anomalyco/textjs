<!-- s:04615ef523 -->
`text build` genera un `dist/` portátil. Un adaptador lo convierte en la salida que espera una plataforma.

<!-- s:087f8d3137 -->
Adaptadores

<!-- s:04908c6c09 -->
| Adaptador | Salida | Ejecución |
| :-- | :-- | :-- |
| *(ninguno)* | `dist/` + `dist/.text/server` | `text start` (Node) |
| `static` | `dist/` | Cualquier alojamiento estático |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel (Build Output API v3) |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
El adaptador también puede obtenerse de `TEXTJS_ADAPTER`. Cuando `text build` se ejecuta en Vercel (`VERCEL=1`) o Cloudflare Pages (`CF_PAGES=1`), se selecciona automáticamente el adaptador correspondiente.

<!-- s:9d8df946e5 -->
Los adaptadores de servidor (`bun`, `vercel` y `cloudflare`) ejecutan la misma secuencia que `text start`: [middleware](/docs/middleware), `rewrites`, [manejadores de ruta](/docs/route-handlers) con la [caché de rutas](/docs/caching), recursos estáticos y, después, el documento de la consola para las URL de páginas. Los clientes de terminal como curl reciben en su lugar el primer fotograma de la página como texto ANSI. En `vercel` y `cloudflare`, esto solo cubre las páginas estáticas (consulta [curl y los clientes de terminal](/docs/curl)). Los adaptadores de servidor sirven archivos con hash en `/assets/` con `Cache-Control: public, max-age=31536000, immutable`.

<!-- s:1a5ee098c6 -->
Estático

<!-- s:9ebd0d2866 -->
Úsalo para alojamientos sin servidor, como GitHub Pages, S3 o una CDN. Los manejadores de ruta `GET` con `dynamic = "force-static"` o `revalidate` se prerenderizan en archivos: `app/api/feed.json/route.ts` se convierte en `dist/api/feed.json`. Se escribe una copia de `index.html` en `404.html` para que los enlaces profundos abran la app de consola. Los alojamientos estáticos no pueden distinguir curl de un navegador, por lo que curl recibe la página HTML.

<!-- s:1e90536a2a -->
La compilación falla y enumera todos los motivos si la app necesita un servidor: `middleware.ts`, [rutas renderizadas en el servidor](/docs/server-rendering), manejadores de ruta dinámicos, manejadores de ruta con segmentos dinámicos o métodos distintos de `GET`. Configura `rewrites` en el alojamiento en su lugar.

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
El adaptador `bun` escribe un único servidor autónomo que no necesita `node_modules` en tiempo de ejecución. Lee `PORT` (por defecto, `3000`) y `HOSTNAME` (por defecto, `0.0.0.0`), y nunca sirve `server.js` ni `.text/`. Es un proceso de larga duración, por lo que también aloja [rutas renderizadas en el servidor](/docs/server-rendering) (`export const runtime = "server"`) y sus sesiones activas, como `text start`. Úsalo en un contenedor:

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
O envía los cambios a un repositorio Git conectado a Vercel: la compilación ejecuta `text build`, detecta Vercel y escribe `.vercel/output`.

<!-- s:3ee6894582 -->
| Salida | Contenido |
| :-- | :-- |
| `static/` | La compilación del cliente (bajo `basePath`) |
| `functions/_textjs/server.func` | Una función de Node.js 22 que sirve todos los manejadores de ruta, con streaming |
| `functions/_middleware.func` | Middleware de enrutamiento Edge: `middleware.ts` y rutas canónicas para cada app |
| `config.json` | Cabeceras de recursos, reglas de coincidencia del middleware, reescrituras, rutas de manejadores y el documento de la consola |

<!-- s:3f3ba93b7d -->
El middleware edge usa el protocolo `x-middleware-next` / `x-middleware-rewrite`, por lo que las sustituciones de cabeceras y las reescrituras se producen en el enrutador de Vercel antes de llegar a la función o a la CDN. Todas las reglas de coincidencia comparten un patrón `src` de ruta. Las solicitudes que no cubre ninguna regla omiten el middleware, salvo que su ruta pueda no estar en forma canónica (escapes porcentuales, caracteres que codifica un analizador de URL, `//`, segmentos `.` o `..`, una barra final). El middleware compara entonces la ruta canónica, comprueba `has` / `missing` y reescribe la solicitud a esa ruta para que Vercel la enrute del mismo modo. Las apps sin `middleware.ts` reciben la misma función edge, que solo realiza la reescritura. Como cada compilación incluye una función Edge, despliega desde una cuenta de Vercel con sesión iniciada: los despliegues anónimos (`vercel deploy --temporary`) no aceptan funciones Edge.

<!-- s:b5af065e25 -->
La función del manejador es interna. Cada ruta de manejador le pasa la ruta coincidente en la cabecera de solicitud `x-textjs-path`. Esa cabecera se elimina de todas las solicitudes antes y después del middleware, y el middleware edge nunca reenvía ninguna (del cliente ni de `middleware.ts`), por lo que solo las rutas de manejadores pueden establecerla. Las solicitudes a `/_textjs/*` devuelven `404` sin ejecutar la función, antes y después del middleware y las reescrituras. Las rutas generadas distinguen entre mayúsculas y minúsculas al buscar coincidencias, como las reglas de coincidencia y las reescrituras en los demás alojamientos.

<!-- s:5e18b8a450 -->
Las pruebas del adaptador ejecutan esta salida contra una emulación local del enrutador de Vercel. Su comportamiento para las coincidencias de `src`, las capturas de `dest`, las transformaciones de cabeceras y las rutas `status` se comprobó con despliegues reales; el middleware Edge no se comprobó, porque no puede desplegarse de forma anónima.

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
La salida usa el modo avanzado de Pages:

<!-- s:9f0923168f -->
| Archivo | Propósito |
| :-- | :-- |
| `_worker.js` | Middleware, reescrituras, manejadores de ruta y el documento de la consola |
| `_routes.json` | Envía todas las solicitudes al worker. Sin middleware ni `basePath`, `/assets/*` permanece en la CDN estática de Pages |
| `_headers` | Caché inmutable para `/assets/*` (se añade al final de tu archivo) |
| `404.html` | Hace que Pages responda con `404` para los archivos que faltan en lugar de servir la app (se conserva si ya tienes uno) |

<!-- s:9bc2b010d1 -->
`.text/` (bundles del servidor y manifiestos de compilación) se elimina de `dist/`, ya que Pages publica el directorio tal cual.

<!-- s:1200dbc88d -->
Activa la opción de compatibilidad `nodejs_compat` en el proyecto de Pages (Configuración → Tiempo de ejecución) o en `wrangler.toml`; la caché de datos usa `AsyncLocalStorage`. Los archivos estáticos se sirven a través del enlace `ASSETS`, y la revalidación en segundo plano usa `ctx.waitUntil()`.

<!-- s:0bb76cfebb -->
Con middleware, todas las solicitudes ejecutan el worker, incluidos los recursos con hash, para que el middleware vea todas las rutas por las que se puede acceder a un archivo. Cada solicitud que ejecuta el worker es una invocación de Functions y cuenta para tu cuota de solicitudes de Workers. Para una carga de página, eso equivale al documento más cada archivo que solicita (2 para una pequeña app de prueba con un bundle de JavaScript; más para apps con más archivos). En el plan Workers Free, Pages sirve archivos estáticos sin el worker una vez agotada la cuota diaria, lo que omite el middleware. Si el middleware protege algo en `dist/`, establece Configuración → Tiempo de ejecución → Permitir / bloquear en caso de fallo en **Bloquear en caso de fallo**.

<!-- s:600050383d -->
Actualización

<!-- s:e8733a2bfb -->
Las correcciones de seguridad de `@textjs/app` solo llegan a un despliegue después de volver a compilarlo y desplegarlo:

<!-- s:c74adc728a -->
- Vercel: despliega el nuevo `.vercel/output`.
- Cloudflare Pages: despliega el nuevo `dist/`, con `_worker.js` y `_routes.json`.
- Bun: despliega todo el nuevo `dist/` (`server.js`, recursos y bundles de sesiones activas) y reinicia el servidor.
- `text start`: ejecuta `text build` y reinicia.

<!-- s:8047727085 -->
Los despliegues anteriores siguen siendo accesibles en sus propias URL (por ejemplo, las URL de vista previa de Vercel y Cloudflare Pages). Elimínalos o protégelos con el control de acceso de la plataforma.

<!-- s:f5e077273b -->
Rutas renderizadas en el servidor

<!-- s:049ef31493 -->
Las [rutas renderizadas en el servidor](/docs/server-rendering) mantienen una sesión por pestaña abierta, por lo que necesitan un servidor de larga duración: `text start` o el adaptador `bun`. Los adaptadores `static`, `vercel` y `cloudflare` hacen fallar la compilación con `TX030` cuando una página exporta `runtime = "server"`.

<!-- s:eb19728e6b -->
Detrás de un proxy

<!-- s:21a17d0b45 -->
`text start` escucha en `127.0.0.1` y, mientras escucha en la interfaz de bucle local, solo responde a `localhost`, `*.localhost` y hosts con dirección IP (protección contra DNS rebinding). Los demás hosts reciben un `403` con `TX028`. Pon la configuración pública en `text.config.ts`:

<!-- s:43bd5471c8 -->
Sin `origin` ni `trustProxy`, `request.url` se construye a partir de la cabecera `Host` validada sobre `http`.

<!-- s:689cebe287 -->
Limitaciones

<!-- s:f45e3fb003 -->
- `proxy` en `text.config.ts` solo se ejecuta en `text dev` y `text start`; los adaptadores no lo incluyen. Usa `rewrites`, que admiten todos los adaptadores de servidor.
- Cada instancia sin servidor tiene su propia caché en memoria. Consulta [Caché](/docs/caching#platform-notes).
- Las `rewrites` que usan grupos de expresiones regulares sin procesar se convierten en rutas de Vercel en la medida de lo posible; los parámetros con nombre (`:slug`, `:path*`) son exactos.
