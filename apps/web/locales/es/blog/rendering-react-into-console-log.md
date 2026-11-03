<!-- s:16c98cd381 -->
Text.js renderiza apps de React en la consola de DevTools de Chrome. Salvo un campo de entrada oculto, la página no tiene interfaz de usuario. Cada fotograma de la app es una sola llamada a `console.log`.

<!-- s:fe9cd991d4 -->
La consola como pantalla

<!-- s:5ae20a07fc -->
`console.log` acepta una cadena de formato. Cada `%c` aplica el CSS del siguiente argumento al texto que le sigue, hasta el siguiente `%c`:

<!-- s:2822a0243c -->
Estos estilos permiten definir colores, fondos, negrita, cursiva y subrayado, y la fuente de la consola es monoespaciada (Menlo en macOS). Con una fuente monoespaciada y colores que pueden cambiar en cada secuencia de caracteres, la consola funciona como una cuadrícula de celdas de caracteres con estilo. En ella se pueden dibujar bordes, paneles, campos de entrada y gráficos.

<!-- s:585742694b -->
Un fotograma es una cuadrícula de celdas

<!-- s:04a12244bc -->
El renderizador guarda cada fotograma en un `CellBuffer`. Los caracteres se almacenan en un array tipado, los colores de primer plano y de fondo en otros dos, y los atributos como la negrita y el subrayado en un cuarto. Los arrays se asignan una sola vez para un tamaño determinado y se reutilizan en cada fotograma.

<!-- s:2ff86351b3 -->
Para registrar un fotograma, el controlador recorre cada fila y agrupa en secuencias las celdas vecinas que comparten un estilo. Cada secuencia se convierte en un span `%c`, y las filas se unen con `\n`. Nuestro panel de prueba de 100×32, con 3200 celdas, se codifica en unos 200 spans.

<!-- s:48a9b4f008 -->
Una llamada por fotograma

<!-- s:aa2cafe395 -->
Registrar cada fila como un mensaje independiente no funciona. Cada mensaje tiene su propio borde y enlace al código fuente en DevTools, y DevTools agrupa los mensajes consecutivos idénticos tras un contador de repeticiones, por lo que dos filas idénticas de una tabla se fusionarían en una. Un fotograma registrado como un solo mensaje se mantiene en una sola pieza.

<!-- s:ea38228d16 -->
Primero hay que escapar dos elementos del texto. Un `%` literal se escribe como `%%`, para que un texto como `100%` no pueda consumir un argumento de estilo. DevTools también convierte las URL en enlaces y las repinta con sus propios colores, por lo que se añade un word joiner (U+2060), que no tiene anchura, a `://` y `www.`:

<!-- s:ec8783435a -->
Los fotogramas sin cambios no registran nada

<!-- s:8b7f1f9d06 -->
Se calcula un hash de cada fila del búfer. Si ningún hash ha cambiado desde el último fotograma, el controlador retorna antes de construir una cadena y no toca la consola. Una app que espera una entrada no hace ninguna llamada.

<!-- s:43c3523265 -->
Cuando una fila cambia, el controlador borra la consola y registra el nuevo fotograma:

<!-- s:5b584e930a -->
Solo se vuelven a codificar las filas cuyo hash ha cambiado. Las demás reutilizan los spans del fotograma anterior.

<!-- s:99a3c4d459 -->
Entrada

<!-- s:e95aae4719 -->
La consola no recibe pulsaciones de teclas, así que la página las recoge. Un `<textarea>` oculto recibe las pulsaciones de teclas, el contenido pegado y la composición IME, y los convierte en eventos de teclado para la app. Al hacer clic en la página, este campo recibe el foco.

<!-- s:88cae4fc43 -->
Próximos pasos

<!-- s:cb5f6bd294 -->
Los prototipos 0.0.x de `@textjs/core` en npm incluyen todo en un solo paquete. Text.js 0.1 traslada el renderizador descrito aquí a `@textjs/core` y el reconciler de React a `@textjs/react`, y añade un App Router.
