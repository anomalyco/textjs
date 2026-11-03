<!-- s:5b67b32177 -->
Almacena en caché las respuestas de los manejadores de ruta y los datos, y revalídalos periódicamente o bajo demanda. Las entradas obsoletas se sirven de inmediato mientras se ejecuta una actualización en segundo plano.

<!-- s:be697310c8 -->
Manejadores de ruta

<!-- s:e85fc29fe2 -->
Los manejadores de ruta `GET` son dinámicos por defecto. Activa la caché con la configuración del segmento de ruta:

<!-- s:e4ccf65c67 -->
| Exportación | Comportamiento |
| :-- | :-- |
| *(ninguna)* | Se ejecuta en cada solicitud |
| `dynamic = "force-static"` | Se almacena en caché hasta que se revalida |
| `revalidate = N` | Se almacena en caché; queda obsoleto tras `N` segundos |
| `revalidate = 0` o `dynamic = "force-dynamic"` | Se ejecuta en cada solicitud |

<!-- s:274c053db6 -->
Otros valores de `dynamic` fallan con `TX031`. Eso incluye `"error"` de Next.js, porque Text.js no puede detectar cuándo un manejador lee la solicitud.

<!-- s:0fae4045f6 -->
Los manejadores con caché tienen una entrada por nombre de ruta, y su `request` es como sería durante la compilación: sin cadena de consulta, cabeceras, cookies ni cuerpo. Lee esos datos en un manejador dinámico. Solo se almacenan en caché `GET` y `HEAD`. Las respuestas con un estado `5xx`, una cabecera `Set-Cookie` o `Cache-Control: private` / `no-store` se devuelven, pero nunca se almacenan.

<!-- s:b618d4732f -->
Cabeceras

<!-- s:c0a6cf7351 -->
Las respuestas almacenadas en caché incluyen:

<!-- s:b5f8cfecb4 -->
| Cabecera | Valor |
| :-- | :-- |
| `x-textjs-cache` | `MISS`, `HIT` o `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>`, o `s-maxage=31536000` para `force-static` |

<!-- s:c1fb73c64a -->
Cuando el [middleware](/docs/middleware) establece cookies, aplica reescrituras o sobrescribe las cabeceras de la solicitud, la cabecera generada pasa a ser `private, no-cache, no-store, max-age=0, must-revalidate`, para que las cachés compartidas nunca reutilicen una decisión específica de un visitante. Se conserva cualquier cabecera `Cache-Control` establecida por el manejador.

<!-- s:ae27ba22c7 -->
En `text dev`, se aplica la configuración del segmento, pero no se almacena nada, por lo que cada solicitud ejecuta el manejador.

<!-- s:64841df645 -->
Caché de datos

<!-- s:2187e2262b -->
Almacena en caché cualquier función asíncrona con `unstable_cache` de `@textjs/app/cache`:

<!-- s:4c26e099ff -->
La clave se compone de las partes de la clave y los argumentos, codificados por valor (los argumentos `undefined` y `null`, `Map`, `Set`, `Date` y `URL` se mantienen diferenciados). Sin partes de clave, el código fuente de la función y el lugar donde se creó la identifican; pasa partes de clave siempre que la función capture valores de su entorno, por ejemplo, cuando se crea por solicitud o en un bucle. Los resultados se serializan como JSON, por lo que cada llamada devuelve una copia nueva (y los objetos `Date` se devuelven como cadenas); un resultado que no se pueda serializar lanza una excepción. `cache(fn, { key, tags, revalidate })` acepta los mismos ajustes como objeto de opciones.

<!-- s:608eee0e9b -->
Dentro de un manejador de ruta con caché, las entradas de datos propagan sus etiquetas y su `revalidate` más corto a la ruta: revalidar `"posts"` también actualiza `/api/posts`. Una llamada de datos con `revalidate: 0` hace que la ruta sea dinámica.

<!-- s:5537f337ee -->
Servir datos obsoletos mientras se revalidan

<!-- s:7d23e84252 -->
Una vez que la antigüedad de una entrada supera `revalidate`:

<!-- s:d4dd1966dd -->
1. La siguiente solicitud recibe el valor obsoleto de inmediato (`STALE`).
2. Se ejecuta una actualización en segundo plano; las solicitudes concurrentes la comparten.
3. Si la actualización lanza una excepción, se sigue sirviendo el valor obsoleto y se registra el error.

<!-- s:e6db7819cc -->
En Vercel y Cloudflare, las actualizaciones en segundo plano se registran con `waitUntil()`. Las entradas con más de un año de antigüedad siempre se recalculan en primer plano.

<!-- s:5854b096d2 -->
Revalidación bajo demanda

<!-- s:686aa7f2f3 -->
| Llamada | Invalidación |
| :-- | :-- |
| `revalidateTag("posts")` | Todo lo etiquetado con `posts`; la siguiente solicitud recalcula el valor |
| `revalidateTag("posts", "max")` | Lo marca como obsoleto; la siguiente solicitud recibe el valor obsoleto mientras se actualiza |
| `revalidatePath("/api/feed")` | Esa ruta |
| `revalidatePath("/api/posts/[id]")` | Todas las rutas de una ruta dinámica |
| `revalidatePath("/api", "layout")` | Todo lo que está bajo `/api` |

<!-- s:b132bd50eb -->
Ambas devuelven una promesa. Con el almacén en memoria, la invalidación es inmediata; usa `await` cuando un [almacén personalizado](#custom-cache-stores) sea asíncrono.

<!-- s:2aab4b4d00 -->
Almacenes de caché personalizados

<!-- s:7bee24a364 -->
El almacén predeterminado es un LRU en memoria (1000 entradas, unos 50 MB) por instancia del servidor. Para compartir una caché entre instancias, apunta `cacheHandler` a un módulo que exporte un `CacheStore` como exportación predeterminada:

<!-- s:593c57fca5 -->
Las entradas son JSON sin más. Como alternativa, `setCacheStore(store)` instala un almacén en tiempo de ejecución.

<!-- s:fe2404de51 -->
Notas sobre plataformas

<!-- s:5418a08901 -->
- Cada instancia serverless (funciones de Vercel, isolates de Cloudflare) tiene su propia caché en memoria. `Cache-Control: s-maxage` permite que la CDN de la plataforma también almacene respuestas en caché; la revalidación bajo demanda no purga una CDN. Usa un `cacheHandler` compartido cuando `revalidateTag` deba llegar a todas las instancias.
- Cloudflare requiere la opción `nodejs_compat` (la caché usa `AsyncLocalStorage`). Consulta [Desplegar](/docs/deploying).
