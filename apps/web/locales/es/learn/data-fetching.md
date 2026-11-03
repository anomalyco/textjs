<!-- s:23fef6717c -->
Acme Deploys necesita datos reales. Los manejadores de ruta se encuentran junto a tus páginas en `app/`, usan las API web `Request` y `Response`, y se ejecutan con `text dev` y `text start`. Comparten el origen de la app, por lo que las solicitudes no necesitan configuración de CORS.

<!-- s:c6876ef862 -->
Un manejador de ruta

<!-- s:b226d3ca25 -->
Llámalo desde la línea de entrada de la consola mientras `text dev` se ejecuta:

<!-- s:9ce3eb974c -->
Obtener datos en una página

<!-- s:c02131685f -->
Obtén los datos en un efecto y muestra un `<Spinner>` hasta que lleguen. `r` vuelve a obtenerlos; `n` envía un nuevo despliegue, que aparece en estado de compilación y pasa a estar listo cuando termina la compilación.

<!-- s:34de603227 -->
Estados de carga y error

<!-- s:8b95fe08be -->
En lugar de gestionar `loading` a mano, se muestra un `loading.tsx` situado junto a la página mientras esta se suspende, y `error.tsx` captura cualquier error que lance. Ambos son componentes normales:

<!-- s:6c694827e4 -->
Transmisión de datos

<!-- s:c16e24a117 -->
Los manejadores pueden devolver un `ReadableStream`, que permite transmitir los registros de compilación al panel línea por línea. Consulta [Manejadores de ruta](/docs/route-handlers) para obtener información sobre eventos enviados por el servidor y el uso de un proxy para un demonio local.
