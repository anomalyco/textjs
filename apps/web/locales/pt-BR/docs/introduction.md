<!-- s:b3d5e86364 -->
Text.js é um framework React para apps que renderizam no console do DevTools com `console.log`.

<!-- s:34bf1ea7dd -->
A prévia é interativa. Clique nela e pressione `↑`.

<!-- s:0bccbd98be -->
Recursos incluídos

<!-- s:d3708efc68 -->
- **React 19**: renderização concorrente, Suspense e limites de erro.
- **App Router**: layouts, páginas, segmentos dinâmicos e manipuladores de rota.
- **Layout Yoga**: flexbox em WebAssembly, ajustado a células inteiras.
- **Turbolog**: uma chamada a `console.log` por quadro alterado.
- **Interface do console**: a página contém apenas uma área de foco e um campo de entrada oculto.

<!-- s:5ae438610c -->
Funcionamento

<!-- s:75f47f9f8c -->
O estado flui de cima para baixo: React, depois o layout, depois um buffer de células e depois o console.

<!-- s:25c55610d2 -->
Quadros sem alterações são ignorados, então apps ociosos não registram nada no console.

<!-- s:3a5d9cbc49 -->
Próximos passos

<!-- s:b849362c77 -->
- [Instalação](/docs/installation): crie seu primeiro app.
- [Roteamento](/docs/routing): páginas, layouts e navegação.
- [Turbolog](/docs/turbolog-engine): como os quadros são codificados.
- [OpenCode](/docs/opencode): uma TUI de agente criada com Text.js.
