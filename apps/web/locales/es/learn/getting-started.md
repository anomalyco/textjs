<!-- s:b7512b6ff1 -->
A lo largo de diez capítulos crearás **Acme Deploys**, un panel de despliegues que se renderiza en la consola de DevTools. Cada capítulo termina con la app exactamente como la deja tu código, ejecutándose en directo en la consola de esta página.

<!-- s:630c586fd9 -->
Crear la app

<!-- s:fd9f176938 -->
`create-text-app` genera la estructura de un proyecto con App Router, TypeScript y la CLI `text`.

<!-- s:9eee556b8f -->
Abre `http://localhost:3000` y después [abre la consola del navegador](/docs/installation#open-the-console). La página muestra un área de enfoque. Tu app se renderiza en la consola.

<!-- s:7d69bcfbda -->
Tu primera página

<!-- s:77df233a57 -->
Cada ruta es un archivo `page.tsx` en `app/`. Sustituye la página inicial por la tarjeta de título del panel:

<!-- s:efd190e3b6 -->
Guarda el archivo. Fast Refresh vuelve a dibujar el fotograma y conserva el estado de tu componente.

<!-- s:f5e9f4301c -->
Responder a una tecla

<!-- s:a9111ae891 -->
`useInput` recibe cada pulsación de tecla mientras la página tiene el foco. Cuenta los saludos:

<!-- s:c766a57c22 -->
Eso es una app completa de Text.js. Tiene estado de React, una caja de layout y un `console.log` por cada fotograma modificado, y no registra nada mientras está inactiva.
