<!-- s:263d7e4a86 -->
La extensión de DevTools de Text.js añade un panel **Text.js** junto a «Consola». Inspecciona la app que se renderiza en la consola.

<!-- s:becd3b25ff -->
- **Componentes:** el árbol de React de cada raíz de consola, con props, hooks, claves y los nodos de escena `tx-box` / `tx-text` que hay detrás, distribuidos en celdas.
- **Fotograma:** el fotograma actual como cuadrícula de celdas. Pasa el cursor sobre una celda para ver qué componente la pintó. Haz clic para seleccionar el nodo. Se resalta en la consola en vivo.
- **Cronología:** tiempos de React, layout, pintado y codificación por fotograma, fotogramas omitidos frente a emitidos, cadencia de fotogramas y spans `%c`.
- **Controles:** pausar y reanudar la salida, activar o desactivar la vista de contornos del layout, fijar o ajustar el tamaño de la cuadrícula, copiar el fotograma como texto.

<!-- s:98304b8243 -->
Instalación

<!-- s:2452819f12 -->
La extensión se compila desde `packages/devtools-extension` y se carga sin empaquetar:

<!-- s:3754c750b3 -->
1. Abre `chrome://extensions` y activa **Modo de desarrollador**.
2. Haz clic en **Cargar descomprimida** y selecciona `packages/devtools-extension/dist`.
3. Recarga tu app y abre DevTools. El panel **Text.js** aparece cuando la página crea una raíz de consola.

<!-- s:e0c59fa53a -->
La compilación también genera `release/textjs-devtools-<version>.zip`, listo para Chrome Web Store.

<!-- s:364bc3ef6f -->
Componentes

<!-- s:e1204a3559 -->
Selecciona un componente para ver sus props, sus hooks en orden de llamada (`State`, `Ref`, `Memo`, `Effect`, etc., con sus valores actuales) y el nodo de escena que renderiza, con su posición, tamaño y márgenes internos de la caja en celdas. Al pasar el cursor sobre una fila, se resalta el nodo en la consola. **Nodos anfitriones** muestra u oculta los elementos `tx-box` y `tx-text` entre componentes.

<!-- s:77b62adc9c -->
El árbol se actualiza después de los commits mientras el panel está abierto. Los valores son resúmenes para su visualización, no objetos en vivo.

<!-- s:a0d819048c -->
Fotograma

<!-- s:2cceea6000 -->
El inspector de fotogramas dibuja el búfer de celdas del renderizador: cada glifo, color de primer plano, fondo y atributo. Al pasar el cursor sobre una celda, se muestran su carácter y sus colores, el nodo de escena situado sobre ella en el orden de pintado (respetando `overflow`, los desplazamientos de scroll y `zIndex`) y los componentes que renderizaron ese nodo. Al hacer clic, se selecciona el nodo en **Componentes** y se resalta en la consola en vivo con la capa de resaltado del propio renderizador.

<!-- s:57a8990372 -->
Cronología

<!-- s:2187cf7a17 -->
Cada barra es un fotograma del renderizador:

<!-- s:f53def4922 -->
| Fase | Medición |
| --- | --- |
| React | Trabajo síncrono de React ejecutado al inicio del fotograma |
| Layout | Layout de Yoga |
| Pintado | Rasterización de la escena en el búfer de celdas |
| Codificación | Construcción de la cadena de formato `%c` y llamada a `console.log()` |

<!-- s:9b988f3cfb -->
Los fotogramas omitidos se dibujan atenuados: nada cambió, así que no se registró nada. El gráfico de cadencia muestra el intervalo entre fotogramas emitidos frente al intervalo mínimo de 66 ms.

<!-- s:8abccb04ec -->
La medición de tiempos termina en `console.log()`. El formato y el pintado del mensaje se procesan dentro de DevTools y no se pueden observar desde la página, por lo que la cronología no los muestra. Los renderizados concurrentes que se confirman entre fotogramas se cuentan como commits, pero no se mide su duración.

<!-- s:5ae438610c -->
Funcionamiento

<!-- s:1dda342130 -->
Al igual que React DevTools, la extensión instala un hook global antes de que se ejecute la página:

<!-- s:5a865fb9ae -->
Cada raíz de consola se registra en él al crearse. Sin la extensión, el hook no existe, y cada raíz solo comprueba su presencia una vez y no hace ningún trabajo por fotograma. Con la extensión instalada pero el panel cerrado, cada fotograma cuesta una lectura de propiedad. Los árboles y los fotogramas solo se calculan cuando el panel los solicita.

<!-- s:843fc9a8ad -->
Los mensajes siguen el recorrido página → script de contenido → service worker → panel. Los scripts de contenido se ejecutan en cada página para que el hook exista antes de que arranque tu app. Ese es el único acceso que solicita la extensión. No carga código remoto ni envía nada fuera del equipo.

<!-- s:e425f181df -->
Privacidad

<!-- s:f2cd52a110 -->
La extensión no recopila datos. No hace solicitudes de red, no almacena nada y no tiene analíticas. Los árboles de componentes, los fotogramas y las mediciones de tiempo solo viajan entre la página y el panel de DevTools del mismo navegador, y se descartan al cerrar DevTools. **Copiar fotograma** escribe el texto del fotograma en tu portapapeles al hacer clic.

<!-- s:639d5ea4c0 -->
Limitaciones

<!-- s:153a772b79 -->
- Chrome y navegadores basados en Chromium, versión 111 o posterior.
- Las apps que se iniciaron antes de instalar la extensión necesitan una recarga.
- Solo se inspecciona el fotograma superior de una pestaña.
- Los tiempos proceden de `performance.now()`, cuya precisión los navegadores reducen a unos 0,1 ms.
