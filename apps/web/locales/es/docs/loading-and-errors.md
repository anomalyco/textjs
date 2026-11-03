<!-- s:510651334f -->
Los estados de carga y los límites de error se renderizan en la consola. Defínelos por segmento de ruta con `loading.tsx` y `error.tsx`.

<!-- s:28d65d04f2 -->
Interfaz de carga

<!-- s:d64d19effc -->
Añade `loading.tsx` para mostrar una interfaz alternativa mientras una página está suspendida.

<!-- s:4445f6cf6c -->
Errores

<!-- s:3834711277 -->
Añade `error.tsx` para capturar errores de renderizado. Recibe el error y una función `reset`.

<!-- s:5b439d0e88 -->
No encontrado

<!-- s:c01c20f824 -->
Llama a `notFound()` para renderizar el `not-found.tsx` más cercano.

<!-- s:dc40d65e00 -->
Redbox en la consola

<!-- s:2ec3bf8f2e -->
En desarrollo, los errores no capturados abren un panel superpuesto dentro de la consola con el mensaje y la ubicación en el código fuente. Al corregir el archivo, el panel se cierra.

<!-- s:35c9c3ef6b -->
Panel de desarrollo

<!-- s:e2a34a83d6 -->
En desarrollo, el botón `[▼]` en la esquina inferior izquierda de la consola es el panel de desarrollo. Pulsa `F2` o `` Ctrl+` `` para abrirlo e inspeccionar la ruta, los tiempos de los fotogramas y el layout. Desactívalo con `devIndicators: false`.
