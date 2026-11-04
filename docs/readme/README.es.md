<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.js es un framework de React para apps que se renderizan en la consola del navegador.

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · Español · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [⁨العربية⁩](README.ar.md) · [⁨עברית⁩](README.he.md) · [⁨فارسی⁩](README.fa.md) · [⁨اردو⁩](README.ur.md)
<!-- /i18n:languages -->

[Documentación](https://textjs.org/es/docs) · [Aprender](https://textjs.org/es/learn) · [Playground](https://textjs.org/es/playground) · [OpenCode](https://textjs.org/es/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## Inicio rápido

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Abre [localhost:3000](http://localhost:3000) y [abre la consola del navegador](https://textjs.org/es/docs/installation#open-the-console). Text.js requiere Bun 1.2+ o Node.js 22+ y Chrome, Edge, Firefox o Safari en un equipo de escritorio.

## Ejemplo

```tsx
// app/page.tsx
import { useState } from "react";
import { Box, Text, useInput } from "@textjs/app";

export default function Page() {
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });

  return (
    <Box className="flex-col border rounded p-1">
      <Text bold>▼ Hello, console</Text>
      <Text color="muted">count = {count}</Text>
    </Box>
  );
}
```

El layout de cada fotograma se calcula con Yoga, se codifica por longitud de secuencia en spans `%c` y se escribe en un único `console.log`. Un fotograma sin cambios en sus celdas no registra nada. [`ARCHITECTURE.md`](../../ARCHITECTURE.md) describe el proceso de renderizado.

## Paquetes

| Paquete | Versión | Descripción |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, la CLI `text` y manejadores de ruta |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciliador, componentes y hooks |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Búfer de celdas, layout y el controlador de consola `%c` |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Analizador y renderizador de fuentes FIGlet |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Puente local entre textjs.org/opencode y un servidor de OpenCode |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Generador de proyectos |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Reglas de ESLint para apps de Text.js |

Las extensiones del editor y del navegador también se encuentran aquí:

- [`packages/vscode-textjs`](../../packages/vscode-textjs): la [extensión de VS Code](https://textjs.org/es/docs/vscode), con una vista previa en vivo, generación de estructura para App Router y enlaces a códigos de error
- [`packages/devtools-extension`](../../packages/devtools-extension): la [extensión de Chrome DevTools](https://textjs.org/es/docs/devtools-extension), con un árbol de componentes, un inspector de fotogramas y una línea de tiempo

## Desarrollo

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

El sitio se ejecuta en [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](../../CONTRIBUTING.md) describe las otras apps, los scripts de pruebas de extremo a extremo y el proceso de publicación.

## Contribuir

Los informes de errores y las solicitudes de cambios son bienvenidos. Lee primero [CONTRIBUTING.md](../../CONTRIBUTING.md) e informa de los problemas de seguridad como se describe en [SECURITY.md](../../SECURITY.md).

## Licencia

[MIT](../../LICENSE). Los archivos de terceros incluidos conservan sus propias licencias: las fuentes FIGlet en [`packages/font`](../../packages/font/NOTICE) (BSD 3-Clause) y las fuentes en `apps/web` y `merch/fonts` (SIL Open Font License 1.1).
