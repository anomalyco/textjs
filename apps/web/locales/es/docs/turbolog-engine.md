<!-- s:aca2697522 -->
Turbolog convierte cada commit de React en una llamada a `console.log`, o ninguna si no ha cambiado ninguna celda.

<!-- s:d01b048a1d -->
Objetivos

<!-- s:53b8b34f5a -->
1. **Una llamada por fotograma modificado.**
2. **Cero llamadas en reposo.** Un fotograma sin cambios retorna antes de construir una cadena.
3. **Pocos argumentos de estilo.** 149 spans `%c` para las 3200 celdas de un panel denso de `100×32`.

<!-- s:e284ac0068 -->
Flujo de procesamiento

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:55cc83174a -->
El fotograma reside en arrays tipados planos para caracteres, colores y atributos, cuya memoria se reserva una sola vez.

<!-- s:6215aa69f7 -->
Filtro de cambios

<!-- s:617da960c4 -->
Se calcula el hash de cada fila. Si nada ha cambiado, el controlador retorna de inmediato:

<!-- s:524a0717a4 -->
Intercambio de fotogramas

<!-- s:3c7194b785 -->
Turbolog añade fotogramas al final y solo limpia la consola en el primer fotograma, después de `invalidate()`, en reposo cuando se acumulan 100 fotogramas y al llegar a 300. DevTools elimina de inmediato los mensajes borrados, pero limita el pintado de los nuevos a intervalos de 50 ms, por lo que limpiar cada fotograma hace que la consola parpadee vacía. Los fotogramas añadidos al final se intercambian en un único pintado, y un span de cortina de ancho cero mantiene el fotograma anterior fuera de la vista. Desplázate hacia arriba para ver los fotogramas anteriores.

<!-- s:7845be2cbb -->
Los fotogramas se regulan a unos 15 fps. Los fotogramas más rápidos reinician el límite de frecuencia de DevTools y se descartan.

<!-- s:a36177ad5b -->
Codificación por longitud de secuencia

<!-- s:d4079278eb -->
Las celdas coincidentes se fusionan en un único span `%c`. Los spans continúan a través de los saltos de línea, y las cadenas CSS se internan.

<!-- s:7fe20496b0 -->
Detalles de Chromium

<!-- s:ff8301db1f -->
- El carácter literal `%` se escapa como `%%`.
- Las URL y el texto `path:line` reciben un word joiner para que DevTools no cambie su estilo.
- Los spans solo usan propiedades CSS no abreviadas. DevTools copia cada propiedad expandida en cada línea.
- Los spans se ajustan para que los fondos se repitan sin huecos.

<!-- s:41e36e3179 -->
Firefox y Safari

<!-- s:8b2f3136a1 -->
Chromium distribuye cada línea de un span `%c` como un bloque en línea. Firefox y Safari mantienen los spans en línea, por lo que ignoran los márgenes verticales y dividen las filas largas en varias líneas. `CssConsoleDriver` detecta el navegador mediante comprobaciones de compatibilidad con funciones CSS y, para esas dos consolas, establece una altura de línea de 14 px sin márgenes, desactiva el ajuste de línea con `text-wrap-mode: nowrap` y desplaza los fotogramas anteriores fuera de la vista con una cortina `line-height: 100vh`. El ajuste a la consola deja espacio para la columna de enlaces al código fuente de Firefox. Safari coloca Menlo primero en la lista de fuentes, porque sus páginas no pueden usar una SF Mono instalada por el usuario que Web Inspector sí puede usar para renderizar. Pasa `browser` a `createConsoleRoot` para elegir tú la consola.

<!-- s:66b07a5809 -->
Pruebas de rendimiento

<!-- s:7eebf99828 -->
`packages/core/test/perf.test.ts` en un panel denso de `100×32`, media de 1000 fotogramas (Apple M5 Pro, Bun 1.4.4):

<!-- s:342771dd1f -->
| Fotograma | Tiempo | Spans `%c` |
| :-- | --: | --: |
| Repintado completo (layout, pintado, codificación) | **0,163 ms** | 149 |
| Edición de una fila | **0,011 ms** | 149 |
| Reposo | **0,000 ms** | 0 |

<!-- s:8c3bf89160 -->
La página de [Estado](/status) ejecuta el mismo flujo de procesamiento en tu navegador. Ejecuta `text.stats()` en DevTools mientras se ejecuta una demo del [Playground](/playground).
