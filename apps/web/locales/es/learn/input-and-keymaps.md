<!-- s:0e310a2cb9 -->
Las pulsaciones de teclas llegan a tu app a través de un campo de entrada oculto en la página, por lo que la página necesita tener el foco. Por eso, todas las apps de Text.js te piden que primero hagas clic en la página. Una vez que tiene el foco, cada tecla que pulsas se envía a React.

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:eab63471a6 -->
`useInput` es el hook de bajo nivel que has usado hasta ahora. Recibe un `KeyEvent` con una `key` normalizada (`"up"`, `"return"`, `"escape"`), el carácter escrito en `input`, y `ctrl`, `alt`, `shift` y `meta`.

<!-- s:bc64f58619 -->
Llama a `e.stopPropagation()` para impedir que una tecla llegue a los manejadores situados más abajo en el árbol.

<!-- s:d899f69427 -->
Mapas de teclas

<!-- s:9b0867a5d5 -->
Cuando una pantalla tenga más de un par de teclas, descríbelas con `useKeymap`. Las asignaciones son cadenas: `"up, k"` es cualquiera de las dos teclas, `"g g"` es una secuencia y `"ctrl+k"` una combinación simultánea. Las asignaciones con etiqueta también aparecen en `<KeyHelp>`, `<KeyHints>` y la paleta de comandos.

<!-- s:8a9f2678dd -->
Por ahora, `DEPLOYMENTS` es un array normal en `lib/deployments.ts`. En el capítulo 6, pasa a estar detrás de un manejador de ruta.

<!-- s:c2982612c3 -->
La capa de ayuda

<!-- s:5001b36935 -->
`<KeyHelp />` escucha `?` y abre un modal que muestra, agrupadas, todas las asignaciones con etiqueta que están activas en ese momento. Pulsa `?` en la consola y luego `?` o `q` para cerrarlo. Las asignaciones dentro de un modal retienen el foco, por lo que la lista que queda debajo deja de responder hasta que se cierra.

<!-- s:1d0d345c65 -->
Foco

<!-- s:27a5e2c6bc -->
Los componentes como `<Input>`, `<Select>` y `<Table>` solo reciben pulsaciones de teclas mientras tienen el foco. `Tab` mueve el foco entre ellos; `useFocus()` y `useFocusManager()` te permiten hacerlo por tu cuenta.
