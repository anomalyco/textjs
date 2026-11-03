<!-- s:ce06f5c491 -->
El App Router asigna URLs a los archivos de `app/` siguiendo las convenciones del App Router de Next.js. La barra de direcciones y el historial del navegador se mantienen sincronizados, por lo que los botones de atrás y adelante y los enlaces profundos funcionan mientras la interfaz se renderiza en la consola.

<!-- s:00fe1aba85 -->
Los archivos son rutas

<!-- s:8bae70ad43 -->
Mueve la lista a su propia ruta y añade una página de configuración:

<!-- s:141a7c73d4 -->
Un layout shared

<!-- s:cffa0eef2d -->
`layout.tsx` envuelve cada página y mantiene su estado durante la navegación. Coloca la barra superior y la navegación en él.

<!-- s:9d98f5e58a -->
`shortcut` vincula una sola tecla al enlace. Pulsa `1`, `2` y `3` en la consola; la URL de una app real cambiaría con cada una.

<!-- s:53af99b059 -->
Volver atrás

<!-- s:d77cce0a86 -->
`useRouter()` permite navegar desde el código. Vincula `Backspace` a `router.back()` en el layout:

<!-- s:c2b3ba00ff -->
Segmentos dinámicos

<!-- s:6a1dcfdf25 -->
Las carpetas `[id]` reciben su valor en `params`:

<!-- s:8294e77b63 -->
En un alojamiento estático, los segmentos dinámicos como este necesitan una reescritura a `index.html`. El capítulo 10 lo explica.
