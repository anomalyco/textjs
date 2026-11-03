<!-- s:da329a4f1b -->
Los manejadores de ruta definen endpoints de API en el directorio `app` con las API web `Request` y `Response`.

<!-- s:895d99d1b5 -->
Convención

<!-- s:ac1d1b9fcb -->
Exporta `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` u `OPTIONS`. Los manejadores se ejecutan en `text dev`, `text start` y cada [adaptador de despliegue](/docs/deploying) de servidor, después del [middleware](/docs/middleware). Almacena en caché los manejadores `GET` con la [configuración de segmentos de ruta](/docs/caching).

<!-- s:53eeba0ff3 -->
Manejadores dinámicos

<!-- s:bfa759b36e -->
Los valores de `params` se decodifican. Una ruta con una barra o barra inversa codificada (`%2F`, `%5C`) recibe un `400`, así que pasa los ID que puedan contener `/` en un parámetro de consulta o codifícalos como base64url.

<!-- s:6c694827e4 -->
Streaming

<!-- s:734a652dda -->
Devuelve un `ReadableStream` para los eventos enviados por el servidor:

<!-- s:9ff4b304cc -->
Reescrituras

<!-- s:7ca1bb6854 -->
El servidor actúa como proxy para los destinos externos, por lo que el navegador no hace ninguna solicitud entre orígenes.

<!-- s:82320e9df7 -->
Proxy para un demonio local

<!-- s:7730eaa5fb -->
Usa `proxy` para acceder a un proceso en tu equipo:

<!-- s:c00af013ff -->
Así se conecta la [plantilla de OpenCode](/docs/opencode) a un servidor local.
