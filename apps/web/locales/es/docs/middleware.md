<!-- s:88013af27d -->
El middleware ejecuta código antes de que se complete una solicitud. Puede redirigir, reescribir, establecer cabeceras y cookies, o devolver una respuesta por sí mismo.

<!-- s:895d99d1b5 -->
Convención

<!-- s:9e6d75b727 -->
Crea `middleware.ts` en la raíz del proyecto (o en `src/`), junto a `app/`. Exporta una función `middleware` (o una exportación predeterminada) y un `config` opcional.

<!-- s:a4d39cdaaf -->
El middleware se ejecuta antes que los [manejadores de ruta](/docs/route-handlers), los archivos estáticos y las páginas de consola, en `text dev`, `text start` y cada [adaptador de despliegue](/docs/deploying) de servidor. Usa las API web `Request` y `Response`, por lo que el mismo archivo se ejecuta en Node, Bun, Vercel Edge y Cloudflare Workers.

<!-- s:dda0880da2 -->
Coincidencia de rutas

<!-- s:1e1ec8c339 -->
Sin un `config.matcher`, el middleware se ejecuta para cada solicitud. Los patrones de coincidencia usan la misma sintaxis que Next.js:

<!-- s:473d472bc8 -->
| Patrón | Coincidencias |
| :-- | :-- |
| `/about` | `/about` y `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, pero no `/a` |
| `/user/:id(\\d+)` | `/user/42`, pero no `/user/ada` |
| `/((?!api/).*)` | Todo excepto `/api/*` |

<!-- s:256aeeefbc -->
Añade condiciones con `has` y `missing` (cabecera, cookie, consulta o host):

<!-- s:d756420343 -->
Los patrones se aplican a la ruta de acceso sin `basePath`. En `text dev`, las solicitudes de módulos del propio Vite (`/@vite/*`, archivos fuente) nunca ejecutan el middleware.

<!-- s:75cd7297e6 -->
Cada host determina una ruta de acceso canónica antes de ejecutar el middleware y la usa para la coincidencia de patrones, `request.nextUrl` y la búsqueda de rutas, manejadores y archivos. Se decodifican las secuencias de escape con porcentaje y se vuelve a codificar la ruta tal como la escribe `new URL()`, se resuelven los segmentos `.` y `..`, y se eliminan las barras repetidas y finales. `/ad%6din//users/` llega al middleware como `/admin/users`, mientras que `/café` se mantiene como `/caf%C3%A9`. Un patrón escrito con una barra final, como `/admin/`, coincide con `/admin`. Las solicitudes cuya ruta contiene una barra o barra inversa codificada (`%2F`, `%5C`), un carácter de control o una codificación con porcentaje no válida reciben un `400`. Las rutas distinguen entre mayúsculas y minúsculas: `/Admin` no coincide con `/admin`, y los archivos estáticos solo se sirven con su nombre exacto.

<!-- s:3f5746eb4e -->
Incluye en los patrones las URL en las que se sirve un archivo, no solo su nombre. Cloudflare Pages también sirve `report.html` en `/report`, por lo que un patrón para `/report.html` no protege `/report`. Enumera ambas, `matcher: ["/report", "/report.html"]`, o guarda los archivos protegidos en un directorio y usa un patrón que lo cubra, como `/reports/:path*` para los archivos de `public/reports/`.

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | Efecto |
| :-- | :-- |
| `NextResponse.next()` | Continuar a la ruta |
| `NextResponse.redirect(url, status?)` | `307` de forma predeterminada; `url` debe ser absoluta |
| `NextResponse.rewrite(url)` | Servir otra ruta; los orígenes externos se sirven mediante un proxy |
| `NextResponse.json(body, init?)` | Responder con JSON |
| `new Response(...)` | Responder con cualquier contenido |

<!-- s:a8292924c3 -->
No devuelvas nada para continuar sin cambios. `next()` y `rewrite()` aceptan `{ status }` para cambiar el estado de la respuesta final. Solo las respuestas creadas por `NextResponse.next()` / `NextResponse.rewrite()` controlan el enrutamiento: cualquier otra `Response`, incluida una devuelta por `fetch()`, se envía al cliente tal cual, con sus cabeceras `x-middleware-*` eliminadas.

<!-- s:583e778785 -->
`request.nextUrl` excluye `basePath` de `pathname`, mientras que sus valores `href` y `toString()` lo incluyen. Para permanecer dentro de la app, clónalo: `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

<!-- s:b618d4732f -->
Cabeceras

<!-- s:37748fa2c3 -->
Pasa `request.headers` para cambiar lo que reciben los manejadores posteriores, y `headers` para añadir cabeceras de respuesta:

<!-- s:60bf4677c2 -->
Las cabeceras de respuesta del middleware se añaden a la respuesta final, salvo que el manejador de ruta establezca la misma cabecera.

<!-- s:ef657b8fe3 -->
Cookies

<!-- s:5d3635224b -->
`request.cookies` lee la cabecera `Cookie`; `response.cookies` escribe `Set-Cookie`.

<!-- s:4a7b6bbf62 -->
Las cookies establecidas en una respuesta de `next()` o `rewrite()` también son visibles para el manejador de ruta en la misma solicitud.

<!-- s:a65a1ce099 -->
Trabajo en segundo plano

<!-- s:de593dc070 -->
El segundo argumento tiene `waitUntil()`, que mantiene activos los entornos de ejecución sin servidor después de enviar la respuesta:

<!-- s:63e13e87b3 -->
Notas

<!-- s:971c06c875 -->
- Las páginas renderizadas en el cliente se renderizan en el navegador, por lo que una reescritura a otra página cambia el archivo que se sirve, no la ruta que renderiza la app de consola. Las reescrituras a manejadores de ruta, archivos estáticos y orígenes externos se comportan como se espera.
- El middleware puede leer el cuerpo de la solicitud; los manejadores de ruta siguen recibiéndolo. El cuerpo de las solicitudes excluidas por un patrón nunca se modifica ni se lee.
- `request.url` siempre tiene el origen del servidor: los destinos de solicitud como `//other.host/x` se normalizan a una sola barra inicial.
- El [adaptador estático](/docs/deploying#static) no puede ejecutar middleware.
