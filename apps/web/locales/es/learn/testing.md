<!-- s:329a4263b5 -->
`@textjs/app/testing` renderiza tu app fuera de pantalla, pulsa teclas y devuelve el fotograma como texto sin formato. Las pruebas se ejecutan sin navegador ni DevTools.

<!-- s:22ea22bed4 -->
Tu primera prueba

<!-- s:79e830f1ed -->
La página solicita `/api/deployments`, que no tiene servidor al ejecutar `bun test`, por lo que `beforeEach` sustituye `fetch` por una simulación con los mismos datos. `render` usa una cuadrícula de 80×24 por defecto. `lastFrame()` devuelve el fotograma completo como texto, `lines()` lo devuelve fila por fila y `cell(x, y)` te da el carácter y los colores de una sola celda.

<!-- s:e8fdbe8cac -->
Pulsar teclas

<!-- s:8db83c740c -->
`press` acepta las mismas cadenas de teclas que `useKeymap`. Cada llamada se ejecuta dentro de `act()` y procesa los fotogramas resultantes, de modo que la siguiente aserción ve la actualización.

<!-- s:7c6ee6548f -->
La tabla dibuja `›` delante de la fila resaltada, así que la prueba de ↓ encuentra esa fila y comprueba su commit. Los dígitos ordenan por una columna, y la cuarta columna es Build.

<!-- s:5350d592a4 -->
Ejecutar las pruebas

<!-- s:88993d5c83 -->
Funciona con cualquier ejecutor que admita pruebas `async`: Bun, Vitest o Jest. En la consola, pulsa `Enter` para ejecutar la suite y `f` para hacer que falle una prueba y ver cómo se muestra el fallo.

<!-- s:26f93acae3 -->
Instantáneas

<!-- s:b458212c22 -->
`toAnsi()` devuelve el fotograma como ANSI con color verdadero, lo que permite crear instantáneas que también detectan regresiones de color:
