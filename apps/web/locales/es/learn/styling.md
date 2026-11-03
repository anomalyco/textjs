<!-- s:d7ae3c23f0 -->
Cada celda tiene un carácter, un color de primer plano, un fondo y un conjunto de atributos. Text.js los compila en spans CSS `%c`, por lo que la consola muestra colores reales, negrita y cursiva.

<!-- s:45433c474e -->
Atributos de texto

<!-- s:32c37753d8 -->
`<Text>` acepta `bold`, `dim`, `italic`, `underline` y `strikethrough`. Los elementos `<Text>` anidados se convierten en spans con estilos dentro de una misma línea.

<!-- s:661b7c60b6 -->
Tokens de tema

<!-- s:f312d78237 -->
La prop `color` acepta valores hexadecimales, nombres de colores sin modificadores (`emerald`) y tokens de tema; los tonos de la paleta de Tailwind se aplican mediante clases (`text-emerald-400`). Los tokens siguen el tema activo, así que dales preferencia para cualquier uso semántico. Añade un componente de estado:

<!-- s:4d4d36a0bd -->
Una tarjeta de despliegue

<!-- s:108bb076c9 -->
`bg-surface` hace que la tarjeta destaque sobre el fondo. El identificador del despliegue adopta el color del estado, se muestra en cursiva durante la compilación y se tacha si hay un error.

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` termina los mensajes de commit largos con `…` en lugar de continuarlos en una segunda fila.

<!-- s:087abce968 -->
Temas

<!-- s:8f993e0ab8 -->
Text.js incluye cinco temas: Geist Dark, OpenCode Dark, Tokyo Night, Amber CRT y Geist Light. Pulsa `t` en la consola para alternar entre ellos. Todo el fotograma se vuelve a dibujar con la nueva paleta, porque cada color anterior es un token.
