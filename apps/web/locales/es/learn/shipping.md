<!-- s:09c9709272 -->
`text build` genera un cliente estático y, si tienes manejadores de ruta, un servidor para `text start`.

<!-- s:b09ff23eb8 -->
Compilación

<!-- s:34d9f1bf54 -->
`text start` sirve la compilación y ejecuta tus manejadores de ruta. Funciona en cualquier servidor con Bun 1.2+ o Node.js 22+.

<!-- s:5f36ef31f1 -->
Metadata

<!-- s:c6b213e15a -->
Define el título de la pestaña del navegador en el layout raíz. Las páginas pueden sobrescribirlo.

<!-- s:0467501ecc -->
Alojamiento estático

<!-- s:f5f06a38ae -->
Sin manejadores de ruta, la compilación es un sitio estático convencional. Cada ruta estática tiene su propio archivo HTML. Las rutas dinámicas como `/deployments/[id]` se sirven mediante `index.html`.

<!-- s:c33282e322 -->
En Vercel y Cloudflare Pages, `text build` detecta la plataforma y escribe esa regla de respaldo automáticamente. Otros servicios de alojamiento estático necesitan una regla de reescritura. En Netlify, añade un archivo `_redirects` a `public/`:

<!-- s:ec502dd4e6 -->
Netlify sirve los archivos existentes antes de aplicar la regla, por lo que los recursos y las rutas prerenderizadas no se ven afectados.

<!-- s:0b1dc034aa -->
Antes de desplegar

<!-- s:463de18e39 -->
- Desactiva **Conservar registro** en la configuración de la consola. Tus usuarios también deben tenerlo desactivado.
- Prueba tamaños estrechos como 80×24. DevTools acoplado al lateral genera una cuadrícula estrecha.
- Ejecuta `bun test`.

<!-- s:c5fa27231d -->
Pulsa `Enter` en la consola para desplegar. Después, solicita tu certificado.
