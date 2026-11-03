<!-- s:b3d5e86364 -->
Text.js es un framework de React para apps que se renderizan en la consola de DevTools con `console.log`.

<!-- s:34bf1ea7dd -->
La vista previa es interactiva. Haz clic en ella y pulsa `↑`.

<!-- s:0bccbd98be -->
Qué incluye

<!-- s:d3708efc68 -->
- **React 19**: renderizado concurrente, Suspense y límites de error.
- **App Router**: layouts, páginas, segmentos dinámicos y manejadores de ruta.
- **Layout de Yoga**: flexbox en WebAssembly, ajustado a celdas enteras.
- **Turbolog**: una llamada a `console.log` por cada fotograma modificado.
- **Interfaz de la consola**: la página aloja únicamente un panel de enfoque y un campo de entrada oculto.

<!-- s:5ae438610c -->
Funcionamiento

<!-- s:75f47f9f8c -->
El estado fluye hacia abajo: React, luego el layout, luego un búfer de celdas y luego la consola.

<!-- s:25c55610d2 -->
Los fotogramas sin cambios se omiten, así que las apps inactivas no registran nada en la consola.

<!-- s:3a5d9cbc49 -->
Siguientes pasos

<!-- s:b849362c77 -->
- [Instalación](/docs/installation): crea tu primera app.
- [Enrutamiento](/docs/routing): páginas, layouts y navegación.
- [Turbolog](/docs/turbolog-engine): cómo se codifican los fotogramas.
- [OpenCode](/docs/opencode): una interfaz de usuario de terminal para un agente, creada con Text.js.
