<!-- s:00c66df67a -->
Text.js 0.1 ya tiene etiqueta. Es la primera versión con las tres capas: `@textjs/core` dibuja fotogramas en la consola, `@textjs/react` renderiza React 19 en esos fotogramas y `textjs` añade un App Router y una CLI.

<!-- s:1aa5bba86a -->
El App Router

<!-- s:4631fd1deb -->
Las rutas son carpetas en `app/` y siguen las convenciones del App Router de Next.js. Esta es la plantilla `dashboard` de `create-text-app`:

<!-- s:18fa0019a3 -->
Un layout envuelve todas las páginas que contiene y conserva su estado durante la navegación. `<Link>` acepta un `shortcut`, por lo que una sola tecla permite seguir el enlace, y `activeClassName` aplica estilos al enlace de la ruta actual:

<!-- s:5587be498a -->
Los segmentos dinámicos funcionan igual que en Next.js. `[id]` se convierte en un parámetro, `[...slug]` captura el resto de la ruta y `[[...slug]]` también coincide con la ruta padre. Los segmentos estáticos tienen prioridad sobre los dinámicos, y los grupos de rutas como `(marketing)` organizan los archivos sin añadir nada a la URL.

<!-- s:3a9a93d850 -->
`loading.tsx` y `error.tsx` envuelven un segmento en un límite de Suspense y un límite de errores. El componente de error recibe el error y una función `reset`:

<!-- s:142b529e3f -->
Los manejadores de ruta se encuentran en `app/api` y devuelven una `Response` estándar:

<!-- s:fe0c29445c -->
El enrutador mantiene `window.location` sincronizado mediante `history.pushState`, por lo que funcionan «Atrás», «Adelante» y los enlaces profundos, y `metadata.title` se escribe en `document.title`. La app dibuja en la consola y la página aloja un panel de foco que recoge la entrada.

<!-- s:6109f13d80 -->
La CLI

<!-- s:bbc9d4be2d -->
- `text dev` inicia Vite con React Fast Refresh. Al guardar un archivo, la consola se actualiza en el mismo sitio.
- `text build` genera una compilación de producción de la app y sus manejadores de ruta.
- `text start` sirve la compilación y los manejadores de ruta.

<!-- s:1e1161891f -->
`create-text-app` crea la estructura de un proyecto a partir de la plantilla `starter` o `dashboard`.

<!-- s:e2a33d088a -->
El inspector

<!-- s:cdb3155210 -->
Pulsa `` Ctrl+` `` o `F2` en una app en ejecución para abrir el inspector `[▼]` dentro de la consola. Muestra la ruta coincidente y sus parámetros, el tamaño del fotograma, el número de spans y los tiempos de cada fase, y el número de fotogramas que omitió el filtro de cambios. `W` dibuja el layout de Yoga como una estructura de alambre.

<!-- s:c2600ceabc -->
También en 0.1

<!-- s:289b0a9973 -->
`@textjs/react` incluye componentes en PascalCase (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), utilidades de `className` al estilo de Tailwind que funcionan en celdas y temas. El layout se ejecuta con Yoga en WebAssembly.

<!-- s:8ad0f2154c -->
La lista completa está en el [registro de cambios](/changelog#v0-1-0).
