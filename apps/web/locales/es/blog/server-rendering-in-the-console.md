<!-- s:f0ba49aa8c -->
Text.js 0.4 añadió un segundo lugar donde renderizar una página. Por defecto, el árbol de React de una página se ejecuta en la pestaña del navegador. Una página que exporta `runtime = "server"` se ejecuta en el servidor, y el navegador recibe sus fotogramas.

<!-- s:1a12ccffbb -->
`Load` es un componente `async function`. En el servidor, suspende su renderizado en el `<Suspense>` o `loading.tsx` más cercano hasta que se resuelve su promesa, y puede leer archivos, bases de datos y módulos `node:*` directamente. Los componentes asíncronos cargan datos y no pueden usar hooks. Los componentes normales que los rodean conservan los hooks, el foco, `useInput`, `<Link>` y `useRouter()`, que se comportan igual en ambos entornos de ejecución.

<!-- s:f6c454b214 -->
Lo que descarga el navegador

<!-- s:6764f4bb25 -->
Una página renderizada en el servidor no envía React, Yoga ni tus rutas. El navegador carga un reproductor de fotogramas de unos 21 kB con gzip, que contiene un `CellBuffer` y el mismo `CssConsoleDriver` que usa el renderizador del cliente. Mantiene la misma cadencia de 15 fps, por lo que un fotograma renderizado en el servidor produce la misma llamada a `console.log` que produciría el cliente.

<!-- s:c1c4090983 -->
El protocolo

<!-- s:20c7e299b3 -->
Cada pestaña abre su propia sesión en el servidor: una raíz de React, un historial del enrutador en memoria y un búfer de celdas. Un único endpoint gestiona ambas direcciones:

<!-- s:0cce1c98cc -->
El servidor solo envía las filas cuyo hash ha cambiado desde el último fotograma que recibió esa conexión. Cada fila se envía como segmentos de texto asociados a una tabla de estilos que solo permite añadir entradas al final. Los grafemas anchos, las agrupaciones de emojis y los colores translúcidos llegan intactos.

<!-- s:bff22f361e -->
Los fotogramas se separan al menos 66 ms, y cada uno se compara con lo último que aceptó el socket. Cuando una conexión lenta deja de vaciar su búfer, se omiten los estados intermedios y el siguiente fotograma salta al estado más reciente.

<!-- s:f0809ea8c7 -->
Si se interrumpe el flujo, el reproductor vuelve a conectarse con su identificador de sesión en la cabecera `x-textjs-live` y reanuda la misma sesión desde un nuevo fotograma clave, con su estado intacto. Los identificadores de sesión son valores aleatorios de 192 bits que se guardan en memoria, nunca en la URL. Una sesión sin conexión deja de renderizar y se desmonta tras 30 segundos.

<!-- s:2c75bd5d29 -->
Ambos endpoints rechazan las solicitudes entre sitios, y cada evento de entrada se valida con un esquema fijo. Una sesión acepta como máximo 64 eventos por POST y unos 240 por segundo.

<!-- s:a36b73dab0 -->
Componentes asíncronos y datos

<!-- s:2620366315 -->
La promesa de cada componente asíncrono se almacena en caché por sesión, con una clave basada en el componente y sus props, de modo que un nuevo intento de renderizado reutiliza la solicitud que ya está en curso. La caché se vacía cuando cambia la ruta y cuando llamas a `router.refresh()`:

<!-- s:64ce138e40 -->
Los módulos exclusivos del servidor se nombran `*.server.ts`. La compilación falla si el código que se envía al navegador importa uno de ellos o un módulo integrado `node:*`, e indica qué módulo lo importa.

<!-- s:981308ad14 -->
Prerenderizado parcial

<!-- s:9142a7d770 -->
El prerenderizado parcial funciona sin servidor. Ahora `text build` renderiza cada ruta estática una vez e inserta su primer fotograma en el HTML de la ruta como un pequeño `<script>` clásico, para que la consola se pinte antes de que se cargue cualquier módulo.

<!-- s:d51b081ec7 -->
La estructura inicial es todo lo que se renderiza de forma síncrona. Un límite `<Suspense>` que sigue esperando muestra su contenido alternativo, incluidos los componentes asíncronos, y `fetch()` nunca se resuelve mientras se renderiza la estructura inicial.

<!-- s:33ba4145a3 -->
Cuando se inicia JavaScript, el renderizador del cliente o el reproductor de fotogramas transmite el fotograma real. Como 0.4 también añade fotogramas al final en lugar de borrar, el renderizador que realiza la hidratación se inicia con `initialClear: false` y escribe debajo de la estructura inicial, y su cortina desplaza esa estructura fuera de la vista en el mismo repintado de DevTools. La consola se borra exactamente una vez, a cargo de la estructura inicial.

<!-- s:f6986897ee -->
La estructura inicial se renderiza con el tamaño de `viewport` configurado, `120 × 36` por defecto, porque la compilación no puede conocer el tamaño de la consola del visitante. Con `viewport.responsive` activado, el primer fotograma en vivo se ajusta al tamaño de la consola acoplada. Las rutas dinámicas no renderizan ninguna estructura inicial, y `ppr: false` en `text.config.ts` desactiva el prerenderizado.

<!-- s:c61865edfd -->
Elegir un entorno de ejecución

<!-- s:aa5baec7ef -->
El entorno de ejecución del cliente sigue siendo el predeterminado. Las pulsaciones de teclas se pintan en la misma tarea, y la app se despliega en cualquier alojamiento estático. El entorno de ejecución del servidor es adecuado para paneles y vistas de administración que leen datos privados, y para rutas cuyas dependencias no quieres incluir en el paquete del navegador. Una app puede combinar ambos, y navegar entre ellos carga la URL de destino como un documento nuevo.

<!-- s:68f8c75df7 -->
La referencia completa está en [Renderizado en el servidor](/docs/server-rendering).
