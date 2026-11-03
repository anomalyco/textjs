<!-- s:b2d192945b -->
La consola es una cuadrícula de celdas. Text.js la distribuye con Yoga, el mismo motor flexbox que usa React Native, por lo que `<Box>` sigue las reglas de flexbox de CSS. Las unidades son celdas: `p-1` equivale a una columna y una fila de relleno.

<!-- s:029cc40e38 -->
Una barra superior

<!-- s:4708298213 -->
La mayoría de las pantallas son una columna: una barra de una fila y después todo lo demás. Dale a la barra una altura fija con `h-1` y deja que el contenido ocupe el resto con `grow`.

<!-- s:5f781355bb -->
`<Spacer>` es una caja que crece: todo lo que va después se desplaza hasta el borde derecho.

<!-- s:0c01f22e11 -->
Barra lateral y tarjetas

<!-- s:7bf034d9ab -->
Añade una barra lateral de ancho fijo con un borde derecho y tres tarjetas que compartan el ancho restante. `basis-0` con `grow` da a cada tarjeta una parte igual, independientemente de su contenido.

<!-- s:493f8816f0 -->
Pulsa `s` y `d` en la consola. Yoga recalcula el layout y solo se repintan las filas que han cambiado, por lo que mostrar u ocultar la barra lateral cuesta un único `console.log`.

<!-- s:66bd0231a6 -->
Adaptable por defecto

<!-- s:7d3f8e46eb -->
La cuadrícula se ajusta al panel acoplado de DevTools. Arrastra la consola para darle más ancho o altura y las tarjetas se redistribuyen. Cuando necesites puntos de ruptura, `useBreakpoint()` devuelve el actual, en celdas.
