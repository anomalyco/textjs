<!-- s:fe58dc6ae4 -->
Cada fotograma de Text.js es una llamada a `console.log`. Hasta la versión 0.4, cada fotograma también iba precedido de `console.clear()`. Bajo carga, la consola parpadeaba y quedaba vacía entre fotogramas.

<!-- s:7a82fe5fe2 -->
Medir un parpadeo

<!-- s:1d16f5a106 -->
Para medirlo, creamos `bench/devtools`. Inicia Chrome for Testing, abre la interfaz real de DevTools como una página y la instrumenta:

<!-- s:4da6ef7009 -->
- En cada `requestAnimationFrame` de la interfaz de DevTools, comprueba si hay un fotograma completo de 32 filas en el área visible de la consola. Los repintados sin uno se consideran repintados en blanco.
- Después decodifica los fotogramas de `Page.startScreencast` para confirmar el resultado en píxeles.
- Cada fotograma lleva `FRAME:<id> · T:<epochMs>` en la fila 0, para que la interfaz pueda determinar qué fotograma muestra y con cuánto retraso.

<!-- s:cb3c553c37 -->
Con `console.clear()` antes de cada fotograma, un panel de 100×32 a 15 fps quedaba en blanco en el **70,6 %** de los repintados de DevTools. A 60 fps, en el **81,1 %**.

<!-- s:7076ddd27d -->
La causa

<!-- s:1e65554dc0 -->
`ConsoleView` de DevTools gestiona las dos llamadas de forma distinta:

<!-- s:56484b5ac3 -->
1. `console.clear()` llama a `consoleCleared()`, que invalida el área visible **de forma síncrona**. Todos los mensajes desaparecen en la misma tarea.
2. `console.log()` llama a `addConsoleMessage()`, que solo programa una actualización mediante `viewportThrottler`, un `Throttler` con un tiempo de espera de **50 ms**.

<!-- s:8a656fe37a -->
Así, cada fotograma elimina el anterior en ese momento y pinta el nuevo más tarde. A 15 fps, durante unos 50 de cada 66 ms no se muestra nada.

<!-- s:8bb24ac9a4 -->
Añadir fotogramas al final

<!-- s:1092cc0920 -->
Desde la versión 0.4, Turbolog añade los fotogramas al final. DevTools se mantiene al final de la consola, de modo que el nuevo fotograma sustituye al anterior en un solo repintado. Un span inicial de ancho cero con `margin-top:100vh` (la cortina) desplaza los fotogramas anteriores fuera de la vista y termina su propia línea para que el enlace al código fuente de DevTools nunca reduzca el ancho de la fila 0.

<!-- s:6e8cb684de -->
La consola sigue teniendo que vaciarse en algún momento. Solo se borra en el primer fotograma, después de `invalidate()`, en reposo cuando se han acumulado 100 fotogramas y al alcanzar el límite estricto de 300.

<!-- s:58637d56ab -->
Ajustar el ritmo al limitador

<!-- s:14c65af87d -->
Enviar fotogramas más rápido de lo que DevTools puede pintarlos no acelera nada. Un registro que llega mientras el limitador está pendiente lo reinicia, por lo que se descartan fotogramas: a 60 fps, DevTools pintó 67 de los 295 fotogramas emitidos. Turbolog espacia los fotogramas al menos **66 ms**, unos 15 fps, y sigue renderizando las entradas discretas de forma síncrona cuando el intervalo lo permite.

<!-- s:8a90fd55c3 -->
Romper el bloqueo de fase

<!-- s:e96505e7a5 -->
Los borrados también añadían unos 50 ms de retraso a cada fotograma posterior. Tras un borrado, DevTools inserta una fila sintética `Console was cleared`. Esta ocupa el turno inmediato del limitador y desplaza el siguiente fotograma al temporizador de 50 ms, y con una cadencia constante de 66 ms, todos los fotogramas posteriores quedan sujetos a ese temporizador.

<!-- s:57527b9818 -->
Ahora el renderizador espera **110 ms** una sola vez después de cada borrado. A partir de ahí, cada fotograma llega más de 50 ms después de que termine la actualización anterior y sigue la vía inmediata de DevTools. La mediana del retraso de visualización pasó de **63 ms a 10,4 ms**.

<!-- s:003645d0bf -->
Resultados

<!-- s:10870bf188 -->
`bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5`, panel de 100×32, interfaz real de DevTools:

<!-- s:9ee75054af -->
| Modo | FPS | Repintados en blanco | Pintados / emitidos | Retraso p50 |
| :-- | --: | --: | --: | --: |
| Borrado por fotograma | 15 | 70,6 % | 70 / 75 | 60,4 ms |
| **Añadir al final (1.0)** | **15** | **1,0 %** | **74 / 75** | **10,4 ms** |
| Borrado por fotograma | 60 | 81,1 % | 45 / 300 | 9,8 ms |
| Añadir al final, sin regular el ritmo | 60 | 0,8 % | 67 / 295 | 31,2 ms |

<!-- s:1e5ad0090a -->
El 1 % restante corresponde al primer fotograma, que borra la consola a propósito. Sus repintados en blanco son la fila `Console was cleared`, no una consola vacía.

<!-- s:315471c65a -->
Menos propiedades por span

<!-- s:e210e7e85d -->
El código fuente de DevTools reveló otro coste. Copia cada *propiedad individual* de un estilo `%c` en cada contenedor de línea, de modo que las propiedades abreviadas `font:` y `margin:` se expandían a unas 33 propiedades por span. Ahora los spans solo usan propiedades individuales, unas 7 por span, con colores hexadecimales.

<!-- s:5b341c4930 -->
El modo de añadir al final se publicó en Text.js 0.4, y la corrección del bloqueo de fase se publica en la versión 1.0. Ninguno requiere cambios en el código de la aplicación.
