<!-- s:5f3abb073d -->
Los clientes HTTP de terminal reciben el primer fotograma de una página como texto ANSI de color verdadero en lugar del documento HTML. No necesitas configurar nada.

<!-- s:f501ff55e0 -->
Solicitudes que reciben un fotograma

<!-- s:3384141bb9 -->
Una solicitud recibe un fotograma cuando se cumplen todas estas condiciones:

<!-- s:05a334e510 -->
- el método es `GET` o `HEAD`;
- el `User-Agent` empieza por `curl/`, `Wget/`, `wget2/`, `HTTPie/` o `xh/`;
- la cabecera `Accept` está ausente o no menciona `text/html`.

<!-- s:4af297e372 -->
Los navegadores, los rastreadores y las vistas previas de enlaces reciben la página HTML. Para obtener el HTML con curl, solicítalo:

<!-- s:03dba887a9 -->
El fotograma se elige en el punto en que se serviría la página: después del [middleware](/docs/middleware), de `rewrites` y de los [manejadores de ruta](/docs/route-handlers), y nunca para archivos o rutas cuyo último segmento contiene un punto. Las redirecciones del middleware, los códigos `401`, las cabeceras y las reescrituras se aplican a curl igual que a los navegadores. `/api/health` sigue ejecutando su manejador y `/robots.txt` sigue sirviendo el archivo.

<!-- s:e0c4f5f416 -->
Contenido del fotograma

<!-- s:50fa4581ec -->
El fotograma es el primer renderizado de la página, como en una [estructura prerenderizada](/docs/server-rendering#partial-prerendering): cada límite `<Suspense>` que sigue esperando muestra su contenido alternativo. Los componentes de servidor asíncronos no se ejecutan y `fetch()` nunca se resuelve, por lo que los datos cargados en efectos permanecen en su estado de carga.

<!-- s:08efeec61a -->
- **Tamaño:** 80 × 24 celdas. Una app con un área de visualización fija (`viewport.responsive: false`) usa `viewport.width × viewport.height` en su lugar.
- **Colores:** códigos de escape SGR de 24 bits en el `viewport.theme` de la app. Cada fila termina con un restablecimiento y el fotograma termina con un salto de línea.
- **Estado:** `200`, o `404` con la página de recurso no encontrado de la app cuando no hay ninguna página que coincida o la página llama a `notFound()`. Una página que llama a `redirect()` durante el renderizado sirve HTML.

<!-- s:1125803eb1 -->
Las respuestas son `text/plain; charset=utf-8` con `Vary: User-Agent, Accept` y `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, de modo que las cachés compartidas nunca almacenan un fotograma para servirlo a un navegador. La página HTML en una ruta donde curl recibe un fotograma lleva la misma cabecera `Vary`.

<!-- s:0e2aba0a67 -->
Dónde funciona

<!-- s:d40234848f -->
| Entorno de alojamiento | Páginas estáticas | Páginas dinámicas, rutas desconocidas |
| :-- | :-- | :-- |
| `text dev` | Renderizadas bajo demanda | Renderizadas bajo demanda |
| `text start`, `bun` | Prerenderizadas por `text build` | Renderizadas bajo demanda |
| `vercel`, `cloudflare` | Prerenderizadas por `text build` | Página HTML |
| `static` | Página HTML | Página HTML |

<!-- s:11c905d6a6 -->
Las páginas renderizadas en el servidor necesitan `text start` o `bun` (consulta [Despliegue](/docs/deploying#server-rendered-routes)).

<!-- s:2cdc6d454b -->
Los alojamientos estáticos no pueden responder de forma distinta a cada cliente, por lo que el adaptador `static` no admite fotogramas. En Vercel y Cloudflare, los fotogramas de las páginas estáticas se incluyen en la compilación. Las páginas dinámicas (`[id]`, `force-dynamic`) sirven HTML allí, porque los adaptadores `vercel` y `cloudflare` no despliegan un renderizador.

<!-- s:022d3d5541 -->
`text start` y `bun dist/server.js` renderizan las páginas restantes bajo demanda con `.text/server/live.mjs` y conservan los últimos 128 fotogramas durante 10 segundos. Cada servidor renderiza como máximo 20 páginas sin caché cada 10 segundos. Una vez superado ese límite, curl recibe la página HTML hasta que se renueva la cuota. Si no se puede cargar `live.mjs` en el servidor, por ejemplo porque un módulo de página lee `window` en el nivel superior, esas páginas sirven HTML.

<!-- s:2500855fbd -->
`text build` informa de los fotogramas prerenderizados:

<!-- s:37f210b46a -->
Configuración

<!-- s:ac46338e16 -->
Cambia el tamaño para toda la app o desactiva los fotogramas:

<!-- s:36fb2e113c -->
Una página puede cambiar su propio tamaño o servir HTML también a las terminales:

<!-- s:11c75396f6 -->
Los tamaños se limitan a 1–500 celdas. Con `ansi: false` en `text.config.ts`, se ignoran las exportaciones de las páginas.

<!-- s:17ae9b44af -->
HTTP sin cifrar

<!-- s:e9b0dd23eb -->
curl no sigue las redirecciones a menos que pases `-L`. Vercel redirige las solicitudes `http://` a `https://`, al igual que Cloudflare con **Usar siempre HTTPS** activado, por lo que `curl http://…` imprime la redirección en lugar del fotograma. Comparte URL `https://`.

<!-- s:740b32f53f -->
Servidores personalizados

<!-- s:144c78c64b -->
`@textjs/app/ansi` exporta las funciones auxiliares de detección y respuesta para servidores y funciones que no ejecutan `text start` ni un adaptador:

<!-- s:ed621ccb22 -->
`wantsAnsi(request)` también acepta `(method, headers)` con `Headers` de la Web o `IncomingHttpHeaders` de Node. `frameToAnsi(buffer, { theme })` codifica un `CellBuffer` renderizado del mismo modo que el framework.
