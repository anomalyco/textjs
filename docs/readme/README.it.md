<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.js è un framework React per app che eseguono il rendering nella console del browser.

[Documentazione](https://textjs.org/it/docs) · [Impara](https://textjs.org/it/learn) · [Playground](https://textjs.org/it/playground) · [OpenCode](https://textjs.org/it/opencode)

<img src="../../brand/share/2-console-frame.png" alt="Un’app Text.js renderizzata nella console di Chrome DevTools" width="720" />

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · Italiano · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [<span dir="rtl">العربية</span>](README.ar.md) · [<span dir="rtl">עברית</span>](README.he.md) · [<span dir="rtl">فارسی</span>](README.fa.md) · [<span dir="rtl">اردو</span>](README.ur.md)
<!-- /i18n:languages -->

</div>

## Avvio rapido

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Apri [localhost:3000](http://localhost:3000) e [apri la console del browser](https://textjs.org/it/docs/installation#open-the-console). Text.js richiede Bun 1.2+ o Node.js 22+ e Chrome, Edge, Firefox o Safari su desktop.

## Esempio

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

Il layout di ogni frame è calcolato con Yoga, codificato in span `%c` con codifica run-length e scritto con un unico `console.log`. Un frame senza celle modificate non scrive nulla nella console. [`ARCHITECTURE.md`](../../ARCHITECTURE.md) descrive la pipeline di rendering.

## Pacchetti

| Pacchetto | Versione | Descrizione |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, la CLI `text` e i route handler |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciler, componenti e hook |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Buffer di celle, layout e driver `%c` della console |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Parser e renderer di font FIGlet |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Ponte locale tra textjs.org/opencode e un server OpenCode |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Generatore di progetti |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Regole ESLint per le app Text.js |

Qui si trovano anche le estensioni per l’editor e il browser:

- [`packages/vscode-textjs`](../../packages/vscode-textjs): l’[estensione VS Code](https://textjs.org/it/docs/vscode), con un’anteprima in tempo reale, la generazione della struttura per App Router e link ai codici di errore
- [`packages/devtools-extension`](../../packages/devtools-extension): l’[estensione Chrome DevTools](https://textjs.org/it/docs/devtools-extension), con un albero dei componenti, un ispettore dei frame e una timeline

## Sviluppo

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

Il sito è disponibile su [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](../../CONTRIBUTING.md) descrive le altre app, gli script end-to-end e il processo di rilascio.

## Contribuire

Le segnalazioni di bug e le pull request sono benvenute. Leggi prima [CONTRIBUTING.md](../../CONTRIBUTING.md) e segnala i problemi di sicurezza come descritto in [SECURITY.md](../../SECURITY.md).

## Licenza

[MIT](../../LICENSE). I file di terze parti inclusi mantengono le proprie licenze: i font FIGlet in [`packages/font`](../../packages/font/NOTICE) (BSD 3-Clause) e i font in `apps/web` e `merch/fonts` (SIL Open Font License 1.1).
