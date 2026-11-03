<!-- s:d2d5ef69d7 -->
Esta página explica durante cuánto tiempo recibe correcciones cada línea de versiones de Text.js y qué se considera un cambio incompatible.

<!-- s:80371443b7 -->
Líneas de versiones

<!-- s:19aa9fdfd3 -->
| Estado | Recibe | Duración |
| :-- | :-- | :-- |
| Activa | Funcionalidades, correcciones, parches de seguridad | Hasta la siguiente versión mayor |
| LTS de mantenimiento | Correcciones críticas y parches de seguridad | 12 meses después del lanzamiento de la siguiente versión mayor |
| Fin de vida útil | Nada | — |

<!-- s:d5987f6ecf -->
Solo recibe parches la última versión menor de cada versión mayor: cuando se publica `1.5.0`, las correcciones se incorporan a `1.5.x`, no a `1.4.x`. Cuando se publica `2.0.0`, la última versión menor de `1.x` se convierte en la línea LTS de mantenimiento y se publica con las etiquetas de distribución `lts` y `v1-lts`.

<!-- s:6a7ba75ff1 -->
| Versión | Estado | Con soporte hasta |
| :-- | :-- | :-- |
| 1.x | Activa | 12 meses después de 2.0.0 |

<!-- s:d71377bf9c -->
Correcciones en LTS

<!-- s:043b92b499 -->
- Vulnerabilidades de seguridad en los paquetes de Text.js
- Cierres inesperados, pérdida de datos y fallos de compilación sin una solución alternativa
- Compatibilidad con nuevas versiones de Chrome, Edge, Firefox y Safari que impidan el renderizado en la consola
- Compatibilidad con entornos de ejecución y destinos de despliegue con soporte

<!-- s:e01d1121d2 -->
Las nuevas funcionalidades, las mejoras de rendimiento y las refactorizaciones se incorporan solo a la línea activa.

<!-- s:d1c69ba9bc -->
Cambios incompatibles

<!-- s:82596fcd52 -->
Estos elementos solo cambian en una versión mayor, tras una advertencia de obsolescencia en al menos una versión menor:

<!-- s:4ca9fd7807 -->
- Exportaciones públicas de `@textjs/app`, `@textjs/react` y `@textjs/core`, incluidas `@textjs/app/server` y `@textjs/app/cache`
- Opciones de `text.config.ts`, comandos y opciones de la CLI `text`
- Convenciones de archivos en `app/`, `middleware.ts` y configuración de segmentos de ruta
- Estructuras de salida de los adaptadores (`.vercel/output`, `_worker.js`, `dist/server.js`)

<!-- s:3a8ad71311 -->
No se incluyen: las API marcadas como experimentales o `unstable_`, incluido todo lo que se encuentra en `@textjs/core/experimental` y `@textjs/react/experimental` (pueden cambiar en una versión menor, con notas en el registro de cambios), los elementos internos como `@textjs/core/internal`, las cabeceras `x-middleware-*` y los metadatos de compilación de `.text/`, las versiones canary y las cadenas de formato y el CSS exactos de `console.log` (los fotogramas siguen siendo visualmente idénticos; su codificación puede volverse más rápida).

<!-- s:5c7d9aae9b -->
Soporte de entornos de ejecución

<!-- s:30122ce1bb -->
| Entorno de ejecución | Versiones compatibles |
| :-- | :-- |
| DevTools de Chrome / Edge | Versión estable actual y las dos anteriores |
| Consolas de Firefox y Safari | Versión estable actual |
| Node.js | Versiones LTS activas y de mantenimiento (`text start`, funciones de Vercel) |
| Bun | Última 1.x |
| Cloudflare Workers | `compatibility_date` del 1 de enero de 2025 o posterior, `nodejs_compat` |

<!-- s:509c18536b -->
Dejar de admitir una versión de un entorno de ejecución que ha llegado al final de su vida útil no es un cambio incompatible.

<!-- s:52543dba9b -->
Seguridad

<!-- s:2aff0514c5 -->
Informa de las vulnerabilidades de forma privada a [security@textjs.org](mailto:security@textjs.org) o mediante los [avisos de seguridad de GitHub](https://github.com/anomalyco/textjs/security/advisories/new). Las correcciones se publican para todas las líneas con soporte al mismo tiempo, y el aviso se publica cuando las versiones con los parches ya están en npm.

<!-- s:b933131934 -->
Consulta [Canales de publicación](/docs/release-channels) para saber cómo se generan las versiones y las etiquetas de distribución.
