<!-- s:32f8804e6b -->
Text.js es un framework de React para apps que se renderizan en la consola del navegador.

<!-- s:814ee9e9d7 -->
[Documentación](https://textjs.org/docs) · [Aprender](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:9535b10be9 -->
Inicio rápido

<!-- s:c7a467af05 -->
Abre [localhost:3000](http://localhost:3000) y [abre la consola del navegador](https://textjs.org/docs/installation#open-the-console). Text.js requiere Bun 1.2+ o Node.js 22+ y Chrome, Edge, Firefox o Safari en un equipo de escritorio.

<!-- s:9bf34f44c9 -->
Ejemplo

<!-- s:3f1f0605f9 -->
El layout de cada fotograma se calcula con Yoga, se codifica por longitud de secuencia en spans `%c` y se escribe en un único `console.log`. Un fotograma sin cambios en sus celdas no registra nada. [`ARCHITECTURE.md`](ARCHITECTURE.md) describe el proceso de renderizado.

<!-- s:8b78543399 -->
Paquetes

<!-- s:cf0456d221 -->
| Paquete | Versión | Descripción |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, la CLI `text` y manejadores de ruta |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciliador, componentes y hooks |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Búfer de celdas, layout y el controlador de consola `%c` |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Analizador y renderizador de fuentes FIGlet |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Puente local entre textjs.org/opencode y un servidor de OpenCode |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Generador de proyectos |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Reglas de ESLint para apps de Text.js |

<!-- s:8b249e49fa -->
Las extensiones del editor y del navegador también se encuentran aquí:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): la [extensión de VS Code](https://textjs.org/docs/vscode), con una vista previa en vivo, generación de estructura para App Router y enlaces a códigos de error
- [`packages/devtools-extension`](packages/devtools-extension): la [extensión de Chrome DevTools](https://textjs.org/docs/devtools-extension), con un árbol de componentes, un inspector de fotogramas y una línea de tiempo

<!-- s:08b48c3d0b -->
Desarrollo

<!-- s:5facd29c1d -->
El sitio se ejecuta en [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](CONTRIBUTING.md) describe las otras apps, los scripts de pruebas de extremo a extremo y el proceso de publicación.

<!-- s:47964f2d9e -->
Contribuir

<!-- s:b236bea0a4 -->
Los informes de errores y las solicitudes de cambios son bienvenidos. Lee primero [CONTRIBUTING.md](CONTRIBUTING.md) e informa de los problemas de seguridad como se describe en [SECURITY.md](SECURITY.md).

<!-- s:6c549a56db -->
Licencia

<!-- s:a950c8684e -->
[MIT](LICENSE). Los archivos de terceros incluidos conservan sus propias licencias: las fuentes FIGlet en [`packages/font`](packages/font/NOTICE) (BSD 3-Clause) y las fuentes en `apps/web` y `merch/fonts` (SIL Open Font License 1.1).
