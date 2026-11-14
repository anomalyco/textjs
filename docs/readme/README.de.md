<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

<a href="https://opencode.ai"><picture><source media="(prefers-color-scheme: dark)" srcset="https://opencode.ai/brand/badges/opencode-built-with-g-dark-20.svg"><img alt="Built with OpenCode" src="https://opencode.ai/brand/badges/opencode-built-with-g-light-20.svg" height="20" /></picture></a>

Text.js ist ein React-Framework für Apps, die in der Browser-Konsole rendern.

[Dokumentation](https://textjs.org/de/docs) · [Lernen](https://textjs.org/de/learn) · [Playground](https://textjs.org/de/playground) · [OpenCode](https://textjs.org/de/opencode)

<img src="../../brand/share/2-console-frame.png" alt="Eine Text.js-App, gerendert in der Konsole der Chrome DevTools" width="720" />

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · Deutsch · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [<span dir="rtl">العربية</span>](README.ar.md) · [<span dir="rtl">עברית</span>](README.he.md) · [<span dir="rtl">فارسی</span>](README.fa.md) · [<span dir="rtl">اردو</span>](README.ur.md)
<!-- /i18n:languages -->

</div>

## Schnellstart

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Öffne [localhost:3000](http://localhost:3000) und [die Browser-Konsole](https://textjs.org/de/docs/installation#open-the-console). Text.js benötigt Bun 1.2+ oder Node.js 22+ und Chrome, Edge, Firefox oder Safari auf dem Desktop.

## Beispiel

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

Jeder Frame erhält sein Layout mit Yoga, wird per Lauflängenkodierung in `%c`-Spans umgewandelt und mit einem einzigen `console.log` ausgegeben. Ein Frame ohne geänderte Zellen gibt nichts aus. [`ARCHITECTURE.md`](../../ARCHITECTURE.md) beschreibt die Rendering-Pipeline.

## Pakete

| Paket | Version | Beschreibung |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, die `text`-CLI und Route-Handler |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | Reconciler, Komponenten und Hooks |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | Zellenpuffer, Layout und der `%c`-Konsolentreiber |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | Parser und Renderer für FIGlet-Schriften |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | Lokale Brücke zwischen textjs.org/opencode und einem OpenCode-Server |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | Projektgenerator |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | ESLint-Regeln für Text.js-Apps |

Auch die Editor- und Browser-Erweiterungen liegen hier:

- [`packages/vscode-textjs`](../../packages/vscode-textjs): die [VS-Code-Erweiterung](https://textjs.org/de/docs/vscode), mit Live-Vorschau, Gerüsten für den App Router und Links zu Fehlercodes
- [`packages/devtools-extension`](../../packages/devtools-extension): die [Chrome-DevTools-Erweiterung](https://textjs.org/de/docs/devtools-extension), mit Komponentenbaum, Frame-Inspektor und Zeitleiste

## Entwicklung

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

Die Website läuft unter [localhost:3000](http://localhost:3000). [CONTRIBUTING.md](../../CONTRIBUTING.md) beschreibt die anderen Apps, die End-to-End-Skripte und den Release-Prozess.

## Mitwirken

Fehlerberichte und Pull Requests sind willkommen. Lies zuerst [CONTRIBUTING.md](../../CONTRIBUTING.md) und melde Sicherheitsprobleme wie in [SECURITY.md](../../SECURITY.md) beschrieben.

## Lizenz

[MIT](../../LICENSE). Mitgelieferte Dateien von Drittanbietern behalten ihre eigenen Lizenzen: die FIGlet-Schriften in [`packages/font`](../../packages/font/NOTICE) (BSD 3-Clause) und die Schriften unter `apps/web` und `merch/fonts` (SIL Open Font License 1.1).
