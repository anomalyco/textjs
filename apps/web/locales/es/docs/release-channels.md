<!-- s:b808ed6cd6 -->
Text.js se distribuye mediante tres dist-tags de npm. Todos los paquetes (`@textjs/app`, `@textjs/react`, `@textjs/core`, `@textjs/font`, `@textjs/opencode`, `create-text-app` y `eslint-plugin-textjs`) se versionan de forma sincronizada, por lo que un único número de versión describe todo el framework.

<!-- s:a2c3664770 -->
Canales

<!-- s:6b5c5ba172 -->
| Canal | dist-tag | Versión | Instalación |
| :-- | :-- | :-- | :-- |
| Estable | `latest` | `1.0.x` | `bun add @textjs/app` |
| Canary | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| LTS | `lts`, `v1-lts` | Se publica tras el lanzamiento de `2.0.0` | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
Usa el canal estable en producción. Usa canary para probar correcciones y funcionalidades el día que llegan a `dev`. Cuando exista una línea LTS, úsala si actualizas una vez al año.

<!-- s:abc686bd76 -->
Estable

<!-- s:df32c144c0 -->
Las versiones estables siguen el [versionado semántico](https://semver.org): las versiones de parche corrigen errores, las menores añaden funcionalidades compatibles con versiones anteriores y las mayores pueden introducir incompatibilidades en las API tras un periodo de obsolescencia. Una versión estable procede de una canary que ha superado todas las pruebas y se publica con certificación de procedencia de npm.

<!-- s:7307c50761 -->
Canary

<!-- s:db409040ca -->
Cada envío a `dev` en el repositorio oficial pasa por una comprobación de tipos y pruebas, y se publica como la siguiente versión de parche con el sufijo `-canary.N`:

<!-- s:d8b8cffefe -->
| `latest` | Envío a `dev` | Versión publicada |
| :-- | :-- | :-- |
| `1.0.0` | primero | `1.0.1-canary.0` |
| `1.0.0` | segundo | `1.0.1-canary.1` |
| `1.0.1` | siguiente | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N` continúa a partir de la canary más alta que ya existe en npm, por lo que los números nunca se repiten. Las versiones canary no se guardan en commits del repositorio. Añade `[skip canary]` al mensaje de un commit para omitir una publicación.

<!-- s:762894d754 -->
Las versiones canary son compilaciones de `dev`, la rama en la que se integra cada pull request. Pueden cambiar o eliminar API aún no publicadas sin previo aviso. Fija una versión canary exacta si dependes de una.

<!-- s:6999c4e986 -->
Procedencia

<!-- s:18722b1d6c -->
Las versiones se publican desde GitHub Actions con `npm publish --provenance`, que vincula cada archivo tar con el commit y el flujo de trabajo exactos que lo generaron. Verifica un paquete con:

<!-- s:57d2e7b18d -->
Publicar una versión

<!-- s:a3217d58a6 -->
Los responsables del mantenimiento actualizan de forma sincronizada la versión de todos los paquetes del espacio de trabajo con los scripts de publicación:

<!-- s:614a1ea872 -->
`release:version` reescribe cada `package.json` y las constantes que reflejan su versión (`VERSION`, `rendererVersion` del reconciliador), se niega a ejecutarse cuando las versiones de los paquetes han dejado de coincidir, y `--dry-run` muestra el plan. `release:publish` compila, empaqueta (resolviendo `workspace:*`), aplica `publishConfig`, se niega a publicar una versión preliminar en `latest` o una versión estable en `canary`, y omite las versiones que ya existen en npm.

<!-- s:ec6955472a -->
Consulta la [Política de soporte](/docs/support-policy) para saber durante cuánto tiempo se mantiene cada línea de versiones.
