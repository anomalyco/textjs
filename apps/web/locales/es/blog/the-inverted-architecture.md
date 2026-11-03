<!-- s:710c25737e -->
En un framework DOM, los componentes se convierten en nodos DOM que el navegador distribuye y pinta en la página. En Text.js, los componentes se convierten en celdas, y cada fotograma de celdas que cambia se convierte en una llamada a `console.log` en DevTools. A esto lo llamamos arquitectura invertida.

<!-- s:d00a01bf6f -->
El flujo de procesamiento

<!-- s:12c6e8f741 -->
Cada etapa existe porque la consola es una pantalla poco habitual. Es monoespaciada y está orientada a filas, recibe estilos mediante `%c` y DevTools decide cuándo se repinta.

<!-- s:db7daa7cf2 -->
reconciler

<!-- s:f3cdc101e1 -->
`@textjs/react` es un reconciler de React 19 (`react-reconciler@0.34.0`) con dos elementos anfitriones, `tx-box` y `tx-text`, además de instancias de texto para los hijos de tipo cadena. Todo lo que importas, desde `<Box>` hasta `<Markdown>`, se construye sobre ellos. Los commits se programan con `requestAnimationFrame`, y una pulsación de tecla o un pegado se renderiza de forma síncrona en la misma tarea.

<!-- s:1ab8b509e0 -->
Layout

<!-- s:c4d7c2c9e5 -->
Yoga, compilado a WebAssembly, distribuye el árbol con `pointScaleFactor = 1`, de modo que cada caja ocupa celdas enteras. El texto se mide con `Intl.Segmenter` y tablas de anchura de caracteres de Asia oriental, por lo que `你好` ocupa cuatro celdas y `🚀` ocupa dos. Si una edición no puede cambiar el tamaño de un nodo de texto, no se vuelve a consultar a Yoga.

<!-- s:28cb69fc5d -->
CellBuffer

<!-- s:895fd57e22 -->
El fotograma es una cuadrícula de arrays tipados cuya memoria se reserva una sola vez: caracteres en un `Uint32Array`, colores de primer plano y de fondo empaquetados como `0xRRGGBBAA`, y atributos como una máscara de bits `Uint16Array`. El pintado escribe en esos arrays y registra qué filas ha tocado.

<!-- s:2a9b8dd7b1 -->
El filtro

<!-- s:1cdfa61881 -->
Cada fila tiene un hash FNV-1a de 32 bits en caché. Solo se recalcula el hash de las filas escritas desde el último fotograma. Si ninguna fila ha cambiado, el controlador retorna antes de construir una cadena y no hace ninguna llamada a la consola. Un indicador de carga en una pestaña oculta no tiene ningún coste porque no se actualiza.

<!-- s:a36177ad5b -->
Codificación por longitud de secuencias

<!-- s:c372fac68d -->
Las filas modificadas se vuelven a recorrer para agruparlas en secuencias de estilo idéntico, y cada secuencia se convierte en un span `%c`. Las secuencias continúan a través de los saltos de línea. Las cadenas CSS se almacenan en un conjunto compartido con identificadores de estilo enteros, por lo que la ruta crítica nunca construye la misma cadena dos veces. Un panel de 100×32 tiene 3200 celdas y 149 spans.

<!-- s:922d9e42bd -->
La cadena de formato también protege frente a dos comportamientos de DevTools. Un `%` literal se escribe como `%%`. Se coloca un word joiner después de `://`, dentro de `www.` y en `path:line`, para que DevTools no convierta tu texto en un enlace y lo repinte con sus propios colores.

<!-- s:f55ed8e2b0 -->
Una llamada

<!-- s:b57bb25475 -->
Cada fotograma modificado es una sola llamada:

<!-- s:e3e37e3616 -->
Los fotogramas se añaden al final, se sincronizan con el limitador de 50 ms de DevTools y se intercambian dentro de un único pintado. [Turbolog: eliminar el parpadeo](/blog/turbolog-eliminating-the-flash) explica esa parte.

<!-- s:99a3c4d459 -->
Entrada

<!-- s:e569f67f37 -->
La consola no puede recibir pulsaciones de teclas, así que las recibe la página. Un `<textarea>` oculto recoge las teclas, el pegado y la composición IME, y los eventos `wheel` desplazan los componentes `ScrollBox`. En textjs.org, las páginas de Playground y OpenCode son una gran superficie de enfoque. Abre la consola y luego haz clic en la página para escribir.

<!-- s:7db6aa160c -->
Lo que ve la página

<!-- s:03e00f4b44 -->
La página no puede leer el tamaño de la consola, solo el de su propia ventana, así que Text.js lo infiere: un panel acoplado reduce `innerWidth` o `innerHeight` mientras `outer*` permanece igual, y cada hipótesis de acoplamiento se resuelve para los niveles de zoom de Chrome. Gana la que mejor encaja. Las constantes (56 px de relleno horizontal, 104 px de interfaz de la consola y una separación entre filas de 14 px) se midieron en la interfaz real de DevTools.
