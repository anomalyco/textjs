<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.js est un framework React pour les applications qui s’affichent dans la console du navigateur.

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · Français · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [⁨العربية⁩](README.ar.md) · [⁨עברית⁩](README.he.md) · [⁨فارسی⁩](README.fa.md) · [⁨اردو⁩](README.ur.md)
<!-- /i18n:languages -->

[Documentation](https://textjs.org/fr/docs) · [Apprendre](https://textjs.org/fr/learn) · [Playground](https://textjs.org/fr/playground) · [OpenCode](https://textjs.org/fr/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## Démarrage rapide

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Ouvrez [localhost:3000](http://localhost:3000) et [ouvrez la console du navigateur](https://textjs.org/fr/docs/installation#open-the-console). Text.js nécessite Bun 1.2+ ou Node.js 22+ et Chrome, Edge, Firefox ou Safari sur ordinateur.

## Exemple

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

Le layout de chaque frame est calculé avec Yoga, puis la frame est encodée par plages en spans `%c` et écrite en un seul appel à `console.log`. Une frame sans cellule modifiée n’écrit rien dans la console. [`ARCHITECTURE.md`](../../ARCHITECTURE.md) décrit le pipeline de rendu.

## Paquets

| Paquet | Version | Description |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, CLI `text` et gestionnaires de route |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Réconciliateur, composants et hooks |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Tampon de cellules, layout et pilote de console `%c` |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Analyseur et moteur de rendu de polices FIGlet |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Passerelle locale entre textjs.org/opencode et un serveur OpenCode |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Générateur de projets |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Règles ESLint pour les applications Text.js |

Les extensions pour l’éditeur et le navigateur se trouvent également ici :

- [`packages/vscode-textjs`](../../packages/vscode-textjs) : l’[extension VS Code](https://textjs.org/fr/docs/vscode), avec un aperçu en direct, la génération de structures App Router et des liens vers les codes d’erreur
- [`packages/devtools-extension`](../../packages/devtools-extension) : l’[extension Chrome DevTools](https://textjs.org/fr/docs/devtools-extension), avec un arbre de composants, un inspecteur de frames et une chronologie

## Développement

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

Le site s’exécute à l’adresse [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](../../CONTRIBUTING.md) décrit les autres applications, les scripts de test de bout en bout et le processus de publication.

## Contribuer

Les signalements de bugs et les pull requests sont les bienvenus. Lisez d’abord [CONTRIBUTING.md](../../CONTRIBUTING.md) et signalez les problèmes de sécurité comme indiqué dans [SECURITY.md](../../SECURITY.md).

## Licence

[MIT](../../LICENSE). Les fichiers tiers inclus conservent leurs propres licences : les polices FIGlet dans [`packages/font`](../../packages/font/NOTICE) (BSD 3-Clause) et les polices dans `apps/web` et `merch/fonts` (SIL Open Font License 1.1).
