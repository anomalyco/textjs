<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.js é um framework React para apps que renderizam no console do navegador.

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · Português (Brasil) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)
<!-- /i18n:languages -->

[Documentação](https://textjs.org/pt-br/docs) · [Aprender](https://textjs.org/pt-br/learn) · [Playground](https://textjs.org/pt-br/playground) · [OpenCode](https://textjs.org/pt-br/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## Início rápido

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Abra [localhost:3000](http://localhost:3000) e [abra o console do navegador](https://textjs.org/pt-br/docs/installation#open-the-console). Text.js requer Bun 1.2+ ou Node.js 22+ e Chrome, Edge, Firefox ou Safari em um computador.

## Exemplo

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

Cada quadro tem seu layout calculado com Yoga, é codificado por comprimento de sequência em spans `%c` e escrito em um único `console.log`. Um quadro sem células alteradas não registra nada. [`ARCHITECTURE.md`](../../ARCHITECTURE.md) descreve o pipeline de renderização.

## Pacotes

| Pacote | Versão | Descrição |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, a CLI `text` e manipuladores de rota |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciliador, componentes e hooks |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Buffer de células, layout e o driver de console `%c` |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Analisador e renderizador de fontes FIGlet |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Ponte local entre textjs.org/opencode e um servidor OpenCode |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Gerador de projetos |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Regras do ESLint para apps Text.js |

As extensões para o editor e o navegador também ficam aqui:

- [`packages/vscode-textjs`](../../packages/vscode-textjs): a [extensão do VS Code](https://textjs.org/pt-br/docs/vscode), com prévia ao vivo, geração de estrutura do App Router e links para códigos de erro
- [`packages/devtools-extension`](../../packages/devtools-extension): a [extensão do Chrome DevTools](https://textjs.org/pt-br/docs/devtools-extension), com árvore de componentes, inspetor de quadros e linha do tempo

## Desenvolvimento

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

O site roda em [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](../../CONTRIBUTING.md) descreve os outros apps, os scripts de testes de ponta a ponta e o processo de lançamento.

## Contribuir

Relatos de bugs e pull requests são bem-vindos. Leia [CONTRIBUTING.md](../../CONTRIBUTING.md) primeiro e relate problemas de segurança conforme descrito em [SECURITY.md](../../SECURITY.md).

## Licença

[MIT](../../LICENSE). Os arquivos de terceiros incluídos mantêm suas próprias licenças: as fontes FIGlet em [`packages/font`](../../packages/font/NOTICE) (BSD 3-Clause) e as fontes em `apps/web` e `merch/fonts` (SIL Open Font License 1.1).
