<!-- s:b3d5e86364 -->
Text.js è un framework React per app che eseguono il rendering nella console di DevTools con `console.log`.

<!-- s:34bf1ea7dd -->
L’anteprima è interattiva. Fai clic e premi `↑`.

<!-- s:0bccbd98be -->
Funzionalità incluse

<!-- s:d3708efc68 -->
- **React 19**: rendering concorrente, Suspense ed error boundary.
- **App Router**: layout, pagine, segmenti dinamici e route handler.
- **Layout Yoga**: flexbox in WebAssembly, allineato a celle intere.
- **Turbolog**: una chiamata a `console.log` per ogni frame modificato.
- **Interfaccia della console**: la pagina ospita solo un pannello del focus e un input nascosto.

<!-- s:5ae438610c -->
Funzionamento

<!-- s:75f47f9f8c -->
Lo stato scorre verso il basso: React, poi il layout, poi un buffer di celle, poi la console.

<!-- s:25c55610d2 -->
I frame invariati vengono saltati, quindi le app inattive non scrivono nulla nella console.

<!-- s:3a5d9cbc49 -->
Prossimi passi

<!-- s:b849362c77 -->
- [Installazione](/docs/installation): crea la tua prima app.
- [Routing](/docs/routing): pagine, layout e navigazione.
- [Turbolog](/docs/turbolog-engine): come vengono codificati i frame.
- [OpenCode](/docs/opencode): una TUI per agenti creata con Text.js.
