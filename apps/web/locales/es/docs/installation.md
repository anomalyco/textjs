<!-- s:98c33b0a07 -->
Requisitos

<!-- s:16d53f1055 -->
- [Bun](https://bun.sh) 1.2+ o Node.js 22+
- Chrome, Edge, Firefox o Safari en un equipo de escritorio

<!-- s:d7f4dad213 -->
Crear una app

<!-- s:b32738e24d -->
Elige una plantilla (`starter`, `dashboard` u `opencode`) y luego inicia el servidor de desarrollo:

<!-- s:21fb743289 -->
Abrir la consola

<!-- s:14e4fdc5be -->
Visita `http://localhost:3000` y abre la consola.

<!-- s:a370660339 -->
| Navegador | macOS | Windows / Linux |
| :-- | :-- | :-- |
| Chrome, Edge, Arc, Brave | `⌘` `⌥` `J` | `Ctrl` `Shift` `J` |
| Firefox | `⌘` `⌥` `K` | `Ctrl` `Shift` `K` |
| Safari | `⌘` `⌥` `C` | Solo macOS |

<!-- s:de7134a591 -->
En Safari, primero activa **Mostrar funciones para desarrolladores web** en Configuración → Avanzado.

<!-- s:8f6c6cf39e -->
Haz clic en la página para darle el foco y luego escribe. Acoplar DevTools en la parte inferior permite obtener la cuadrícula más ancha.

<!-- s:9807a8b582 -->
Configuración de la consola

<!-- s:803094bd72 -->
Desactiva **Conservar registro** en la configuración de la consola. Text.js añade al final un mensaje por fotograma y borra la consola para liberar los fotogramas antiguos. Con «Conservar registro» activado, DevTools ignora el borrado y los fotogramas antiguos se acumulan.

<!-- s:35e7d1d33e -->
Configuración manual

<!-- s:ff78ccae69 -->
Sin el framework

<!-- s:26f8520062 -->
Monta cualquier árbol de React en la consola desde un sitio existente:
